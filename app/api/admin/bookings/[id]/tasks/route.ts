/**
 * app/api/admin/bookings/[id]/tasks/route.ts — مهام أمر العمل.
 *
 *   GET → يجلب مهام الحجز. لو لا مهام بعد (أول فتح)، يولّدها من الخدمات العادية
 *         (نستبعد custom) — مهمة لكل خدمة. يرجّع المهام + الفنيين المخصّصين +
 *         الخامات المصروفة لكل مهمة + الخامات المتاحة في المخزن الوسيط للصرف.
 *
 * التوليد يحدث مرة واحدة: لو المهام موجودة، لا نعيد توليدها (نحترم أي تعديل سابق).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";
import { pick } from "@/lib/admin/i18n-json";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "ar") as "ar" | "en";

    // نتأكد أن الحجز موجود
    const bk = await query<any>(`SELECT id, work_stage FROM bookings WHERE id = $1`, [id]);
    if (!bk[0]) return bad("not_found", 404);

    // هل توجد مهام بالفعل؟
    let tasks = await query<any>(`SELECT id FROM booking_tasks WHERE booking_id = $1`, [id]);

    // لا مهام → نولّدها من الخدمات العادية (نستبعد custom)
    if (tasks.length === 0) {
      const items = await query<any>(
        `SELECT id, service_id, service_slug, name_snapshot
           FROM booking_items
          WHERE booking_id = $1 AND service_slug <> 'custom'
          ORDER BY id`,
        [id]
      );
      let sort = 0;
      for (const it of items) {
        await query(
          `INSERT INTO booking_tasks (booking_id, booking_item_id, service_id, name_snapshot, status, sort)
           VALUES ($1, $2, $3, $4, 'pending', $5)`,
          [id, it.id, it.service_id, it.name_snapshot, sort++]
        );
      }
    }

    // نجلب المهام كاملة مع الفنيين + الخامات
    const rows = await query<any>(
      `SELECT t.id, t.name_snapshot, t.status, t.estimated_minutes, t.started_at, t.finished_at, t.sort,
              t.qc_status, t.qc_note, t.qc_at, t.rework_count,
              COALESCE((
                SELECT json_agg(json_build_object('id', tt.technician_id, 'name', u.name, 'startedAt', tt.started_at, 'confirmedAt', tt.confirmed_done_at) ORDER BY tt.id)
                FROM task_technicians tt JOIN users u ON u.id = tt.technician_id
                WHERE tt.task_id = t.id
              ), '[]') AS technicians,
              COALESCE((
                SELECT json_agg(json_build_object('materialId', tm.id, 'itemId', tm.item_id, 'name', i.name, 'unit', i.unit, 'quantity', tm.quantity) ORDER BY tm.id)
                FROM task_materials tm JOIN inventory_items i ON i.id = tm.item_id
                WHERE tm.task_id = t.id
              ), '[]') AS materials,
              COALESCE((
                SELECT COUNT(*) FROM task_comments c
                JOIN users cu ON cu.id = c.author_id
                WHERE c.task_id = t.id AND c.read_by_supervisor_at IS NULL AND cu.role = 'technician'
              ), 0) AS unread
         FROM booking_tasks t
        WHERE t.booking_id = $1
        ORDER BY t.sort, t.id`,
      [id]
    );

    const out = rows.map((t) => ({
      id: Number(t.id),
      name: pick(t.name_snapshot, locale) || "—",
      status: t.status,
      estimatedMinutes: t.estimated_minutes != null ? Number(t.estimated_minutes) : null,
      startedAt: t.started_at,
      finishedAt: t.finished_at,
      technicians: (Array.isArray(t.technicians) ? t.technicians : []).map((x: any) => ({ id: x.id, name: x.name, startedAt: x.startedAt, confirmedAt: x.confirmedAt })),
      materials: (Array.isArray(t.materials) ? t.materials : []).map((x: any) => ({ materialId: Number(x.materialId), itemId: Number(x.itemId), name: x.name, unit: x.unit, quantity: Number(x.quantity) || 0 })),
      unread: Number(t.unread) || 0,
      qcStatus: t.qc_status || null,
      qcNote: t.qc_note || null,
      reworkCount: Number(t.rework_count) || 0,
    }));

    // الخامات المتاحة في المخزن الوسيط (للصرف على المهام)
    const interStock = await query<any>(
      `SELECT i.id, i.name, i.unit, COALESCE(w.quantity,0) AS qty
         FROM inventory_items i
         JOIN warehouse_stock w ON w.item_id = i.id AND w.warehouse_id = (SELECT id FROM warehouses WHERE code='intermediate')
        WHERE i.is_active = true AND w.quantity > 0
        ORDER BY i.name->>'ar'`
    ).catch(() => []);
    const available = (interStock as any[]).map((r) => ({ id: Number(r.id), name: r.name, unit: r.unit, qty: Number(r.qty) || 0 }));

    // تايم لاين كامل: كل حدث في أمر العمل (مين عمل إيه وامتى)
    const events = await query<any>(
      `SELECT e.event, e.created_at, u.name AS actor_name, u.role AS actor_role
         FROM work_order_events e
         LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.booking_id = $1
        ORDER BY e.created_at ASC`,
      [id]
    ).catch(() => []);

    // نضيف أحداث الفنيين (بدء/إنهاء كل مهمة) من task_technicians
    const techEvents = await query<any>(
      `SELECT t.name_snapshot, u.name AS actor_name, tt.started_at, tt.confirmed_done_at
         FROM task_technicians tt
         JOIN booking_tasks t ON t.id = tt.task_id
         JOIN users u ON u.id = tt.technician_id
        WHERE t.booking_id = $1 AND (tt.started_at IS NOT NULL OR tt.confirmed_done_at IS NOT NULL)`,
      [id]
    ).catch(() => []);

    const timeline: any[] = [];
    for (const e of events as any[]) {
      timeline.push({ type: e.event, at: e.created_at, actor: e.actor_name || "—", role: e.actor_role || "" });
    }
    for (const te of techEvents as any[]) {
      const taskName = pick(te.name_snapshot, locale) || "—";
      if (te.started_at) timeline.push({ type: "task_started", at: te.started_at, actor: te.actor_name, role: "technician", task: taskName });
      if (te.confirmed_done_at) timeline.push({ type: "task_done", at: te.confirmed_done_at, actor: te.actor_name, role: "technician", task: taskName });
    }
    timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return NextResponse.json({ ok: true, tasks: out, workStage: bk[0].work_stage, availableMaterials: available, timeline });
  } catch (err) {
    console.error("GET /api/admin/bookings/[id]/tasks failed:", err);
    return bad("server_error", 500);
  }
}