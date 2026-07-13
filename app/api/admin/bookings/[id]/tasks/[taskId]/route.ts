/**
 * app/api/admin/bookings/[id]/tasks/[taskId]/route.ts — إدارة مهمة واحدة.
 *
 *   PATCH { action, ... }
 *     assign_tech   { technicianId }        → يخصّص فني للمهمة
 *     unassign_tech { technicianId }        → يزيل فني (لو لم يبدأ)
 *     set_time      { estimatedMinutes }    → يحدّد الوقت المقدّر
 *     issue_material{ itemId, quantity }    → يصرف خامة من الوسيط للمهمة (يخصم + حركة issue)
 *     return_material{ itemId }             → يرجّع خامة للوسيط (يلغي الصرف)
 *
 * صرف الخامة يخصم من المخزن الوسيط ويسجّل حركة issue مرتبطة بالمهمة.
 * يفشل لو الرصيد في الوسيط غير كافٍ.
 */
import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function warehouseId(code: string): Promise<number | null> {
  const r = await query<{ id: string }>(`SELECT id FROM warehouses WHERE code = $1 LIMIT 1`, [code]);
  return r[0] ? Number(r[0].id) : null;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id, taskId } = await ctx.params;
    const tid = Number(taskId);
    if (!id || !tid) return bad("id_required");

    const b = await request.json();
    const action = String(b.action ?? "");

    // نتأكد أن المهمة تخص هذا الحجز
    const t = await query<any>(`SELECT id, status FROM booking_tasks WHERE id = $1 AND booking_id = $2`, [tid, id]);
    if (!t[0]) return bad("not_found", 404);

    // ── تخصيص فني ──
    if (action === "assign_tech") {
      const technicianId = String(b.technicianId ?? "");
      if (!technicianId) return bad("tech_required");
      await query(
        `INSERT INTO task_technicians (task_id, technician_id) VALUES ($1, $2)
         ON CONFLICT (task_id, technician_id) DO NOTHING`,
        [tid, technicianId]
      );
      return NextResponse.json({ ok: true });
    }

    // ── إزالة فني ──
    if (action === "unassign_tech") {
      const technicianId = String(b.technicianId ?? "");
      if (!technicianId) return bad("tech_required");
      // لا نزيل فنيًا بدأ العمل فعلًا (له started_at)
      await query(
        `DELETE FROM task_technicians WHERE task_id = $1 AND technician_id = $2 AND started_at IS NULL`,
        [tid, technicianId]
      );
      return NextResponse.json({ ok: true });
    }

    // ── الوقت المقدّر ──
    if (action === "set_time") {
      const mins = b.estimatedMinutes == null ? null : Math.max(0, Number(b.estimatedMinutes) || 0);
      await query(`UPDATE booking_tasks SET estimated_minutes = $2, updated_at = now() WHERE id = $1`, [tid, mins]);
      return NextResponse.json({ ok: true });
    }

    // ── صرف خامة من الوسيط (ذرّي) ──
    if (action === "issue_material") {
      const itemId = Number(b.itemId);
      const quantity = Math.max(0, Number(b.quantity) || 0);
      if (!itemId || quantity <= 0) return bad("item_qty_required");

      const interId = await warehouseId("intermediate");
      if (!interId) return bad("no_warehouse");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // نتحقق من رصيد الوسيط
        const stock = await client.query(
          `SELECT COALESCE(quantity,0) AS q FROM warehouse_stock WHERE warehouse_id=$1 AND item_id=$2 FOR UPDATE`,
          [interId, itemId]
        );
        const have = Number(stock.rows[0]?.q) || 0;
        if (have < quantity) {
          await client.query("ROLLBACK"); client.release();
          return NextResponse.json({ ok: false, error: "insufficient_stock", have }, { status: 400 });
        }
        // سعر الخامة الحالي (للتكلفة)
        const priceRow = await client.query(`SELECT purchase_price FROM inventory_items WHERE id=$1`, [itemId]);
        const unitPrice = Number(priceRow.rows[0]?.purchase_price) || 0;

        // اخصم من الوسيط
        await client.query(
          `UPDATE warehouse_stock SET quantity = quantity - $3, updated_at=now() WHERE warehouse_id=$1 AND item_id=$2`,
          [interId, itemId, quantity]
        );
        // سجّل صرف على المهمة (لو موجود بالفعل نجمع الكمية)
        await client.query(
          `INSERT INTO task_materials (task_id, item_id, quantity, unit_price, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [tid, itemId, quantity, unitPrice, admin.id]
        );
        // حركة issue
        await client.query(
          `INSERT INTO stock_movements (item_id, from_warehouse, quantity, movement_type, unit_price, booking_task_id, note, created_by)
           VALUES ($1, $2, $3, 'issue', $4, $5, $6, $7)`,
          [itemId, interId, quantity, unitPrice, tid, "صرف على مهمة", admin.id]
        );
        await client.query("COMMIT"); client.release();
        return NextResponse.json({ ok: true });
      } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        client.release();
        throw e;
      }
    }

    // ── إرجاع خامة للوسيط (يلغي صرفًا) ──
    if (action === "return_material") {
      const materialId = Number(b.materialId); // id من task_materials
      if (!materialId) return bad("material_required");

      const interId = await warehouseId("intermediate");
      if (!interId) return bad("no_warehouse");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const m = await client.query(`SELECT item_id, quantity FROM task_materials WHERE id=$1 AND task_id=$2`, [materialId, tid]);
        if (!m.rows[0]) { await client.query("ROLLBACK"); client.release(); return bad("not_found", 404); }
        const itemId = Number(m.rows[0].item_id);
        const qty = Number(m.rows[0].quantity);
        // رجّع للوسيط
        await client.query(
          `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity) VALUES ($1, $2, $3)
           ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at=now()`,
          [interId, itemId, qty]
        );
        // احذف الصرف + سجّل حركة رجوع (transfer عكسي كـ adjust)
        await client.query(`DELETE FROM task_materials WHERE id=$1`, [materialId]);
        await client.query(
          `INSERT INTO stock_movements (item_id, to_warehouse, quantity, movement_type, booking_task_id, note, created_by)
           VALUES ($1, $2, $3, 'adjust', $4, $5, $6)`,
          [itemId, interId, qty, tid, "إرجاع خامة من مهمة", admin.id]
        );
        await client.query("COMMIT"); client.release();
        return NextResponse.json({ ok: true });
      } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        client.release();
        throw e;
      }
    }

    return bad("bad_action");
  } catch (err) {
    console.error("PATCH task failed:", err);
    return bad("server_error", 500);
  }
}