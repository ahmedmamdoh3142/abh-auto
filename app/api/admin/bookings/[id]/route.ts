/**
 * app/api/admin/bookings/[id]/route.ts — حذف حجز نهائيًا (سوبر أدمن فقط).
 * يمسح كل ما يخص الحجز: المهام (وتوابعها)، الخدمات، الصور، التوقيعات،
 * سجل الحالة، أحداث أمر العمل، متابعات الحجز، استخدام البروموكود،
 * وأي رسائل واتساب مرتبطة — ثم الحجز نفسه. عملية لا يمكن التراجع عنها.
 */
import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { voidRedemptionForBooking } from "@/lib/promo";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return bad("unauthorized", 401);
    if (!admin.isSuperAdmin) return bad("forbidden_super_admin_only", 403);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const cur = await query<any>(`SELECT id FROM bookings WHERE id = $1`, [id]);
    if (!cur[0]) return bad("not_found", 404);

    // نلغي أي استخدام برومو أولًا (يرجّع العدّاد للكود بشكل صحيح)
    await voidRedemptionForBooking(id).catch(() => {});

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // مهام الحجز
      const taskRows = await client.query(`SELECT id FROM booking_tasks WHERE booking_id = $1`, [id]);
      const taskIds: number[] = taskRows.rows.map((r: any) => Number(r.id));

      if (taskIds.length > 0) {
        // نرجّع أي خامات مصروفة على المهام دي للمخزن الوسيط قبل الحذف
        const mats = await client.query(
          `SELECT id, item_id, quantity FROM task_materials WHERE task_id = ANY($1::bigint[])`,
          [taskIds]
        );
        const interW = await client.query(`SELECT id FROM warehouses WHERE code = 'intermediate' LIMIT 1`);
        const interId = interW.rows[0]?.id ?? null;
        for (const m of mats.rows) {
          if (interId) {
            await client.query(
              `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity) VALUES ($1,$2,$3)
               ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = now()`,
              [interId, m.item_id, m.quantity]
            );
          }
        }
        await client.query(`DELETE FROM stock_movements WHERE booking_task_id = ANY($1::bigint[])`, [taskIds]);
        await client.query(`DELETE FROM task_comments WHERE task_id = ANY($1::bigint[])`, [taskIds]);
        await client.query(`DELETE FROM task_materials WHERE task_id = ANY($1::bigint[])`, [taskIds]);
        await client.query(`DELETE FROM task_technicians WHERE task_id = ANY($1::bigint[])`, [taskIds]);
        await client.query(`DELETE FROM booking_tasks WHERE booking_id = $1`, [id]);
      }

      await client.query(`DELETE FROM booking_items WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM booking_bundle_gifts WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM booking_followups WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM booking_inspection_photos WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM booking_signatures WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM booking_status_history WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM work_order_events WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM promo_redemptions WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM whatsapp_messages WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM otp_codes WHERE booking_id = $1`, [id]);
      // طلبات صيانة مرتبطة (لو أي) — نفصلها بدل ما نمسحها بالكامل
      await client.query(
        `UPDATE maintenance_requests SET source_booking_id = NULL WHERE source_booking_id = $1`,
        [id]
      );
      await client.query(
        `UPDATE maintenance_requests SET resulting_booking_id = NULL WHERE resulting_booking_id = $1`,
        [id]
      );

      await client.query(`DELETE FROM bookings WHERE id = $1`, [id]);

      await client.query("COMMIT");
      client.release();
      return NextResponse.json({ ok: true });
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      client.release();
      throw e;
    }
  } catch (err) {
    console.error("DELETE /api/admin/bookings/[id] failed:", err);
    return bad("server_error", 500);
  }
}