/**
 * app/api/technician/tasks/route.ts — مهام الفني الحالي (المسجّل دخوله).
 *
 *   GET   → مهام الفني في الحجوزات التي بدأ تشغيلها (in_service). لكل مهمة:
 *           السيارة + الخدمة + الخامات المصروفة + حالة تكليفه (بدأ/أكّد).
 *   PATCH { taskId, action:'start'|'finish' }
 *           start  → يسجّل بدء الفني للمهمة (started_at)، وحالة المهمة in_progress.
 *           finish → يؤكّد انتهاء الفني (confirmed_done_at). لو كل الفنيين أكّدوا،
 *                    المهمة done. ولو كل مهام الحجز done، الحجز → quality_check.
 */
import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pick } from "@/lib/admin/i18n-json";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// نتأكد أن المستخدم الحالي فني
async function getTechnician() {
  const u = await getCurrentUser().catch(() => null);
  if (!u || u.role !== "technician") return null;
  return { id: u.id, name: u.name };
}

export async function GET(request: Request) {
  try {
    const tech = await getTechnician();
    if (!tech) return bad("unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "ar") as "ar" | "en";

    const rows = await query<any>(
      `SELECT t.id, t.name_snapshot, t.status, t.estimated_minutes,
              tt.started_at, tt.confirmed_done_at,
              b.id AS booking_id, b.work_order_no, b.reference, b.vehicle_label, b.plate, b.brand_id,
              COALESCE(b.customer_name, u.name) AS customer_name,
              COALESCE((
                SELECT json_agg(json_build_object('name', i.name, 'unit', i.unit, 'quantity', tm.quantity) ORDER BY tm.id)
                FROM task_materials tm JOIN inventory_items i ON i.id = tm.item_id
                WHERE tm.task_id = t.id
              ), '[]') AS materials,
              COALESCE((
                SELECT COUNT(*) FROM task_comments c
                WHERE c.task_id = t.id AND c.read_by_technician_at IS NULL AND c.author_id <> $1
              ), 0) AS unread
         FROM task_technicians tt
         JOIN booking_tasks t ON t.id = tt.task_id
         JOIN bookings b ON b.id = t.booking_id
         LEFT JOIN users u ON u.id = b.user_id
        WHERE tt.technician_id = $1
          AND b.work_stage IN ('in_service','quality_check')
        ORDER BY tt.confirmed_done_at NULLS FIRST, b.work_order_no, t.sort`,
      [tech.id]
    );

    const tasks = rows.map((r) => ({
      id: Number(r.id),
      name: pick(r.name_snapshot, locale) || "—",
      status: r.status,
      estimatedMinutes: r.estimated_minutes != null ? Number(r.estimated_minutes) : null,
      startedAt: r.started_at,
      confirmedAt: r.confirmed_done_at,
      bookingId: r.booking_id,
      workOrderNo: r.work_order_no,
      reference: r.reference,
      vehicle: r.vehicle_label || "—",
      plate: r.plate || "",
      brandId: r.brand_id || "",
      customer: r.customer_name || "—",
      materials: (Array.isArray(r.materials) ? r.materials : []).map((m: any) => ({ name: m.name, unit: m.unit, quantity: Number(m.quantity) || 0 })),
      unread: Number(r.unread) || 0,
    }));

    return NextResponse.json({ ok: true, tasks, technician: tech });
  } catch (err) {
    console.error("GET /api/technician/tasks failed:", err);
    return bad("server_error", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const tech = await getTechnician();
    if (!tech) return bad("unauthorized", 401);

    const b = await request.json();
    const taskId = Number(b.taskId);
    const action = String(b.action ?? "");
    if (!taskId) return bad("task_required");

    // نتأكد أن هذا الفني مكلّف بالمهمة
    const link = await query<any>(
      `SELECT tt.id, t.booking_id FROM task_technicians tt JOIN booking_tasks t ON t.id = tt.task_id
        WHERE tt.task_id = $1 AND tt.technician_id = $2`,
      [taskId, tech.id]
    );
    if (!link[0]) return bad("not_assigned", 403);
    const bookingId = link[0].booking_id;

    if (action === "start") {
      await query(`UPDATE task_technicians SET started_at = COALESCE(started_at, now()) WHERE task_id = $1 AND technician_id = $2`, [taskId, tech.id]);
      await query(`UPDATE booking_tasks SET status = 'in_progress', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1 AND status = 'pending'`, [taskId]);
      return NextResponse.json({ ok: true });
    }

    if (action === "finish") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // يؤكّد هذا الفني انتهاءه
        await client.query(`UPDATE task_technicians SET confirmed_done_at = now() WHERE task_id = $1 AND technician_id = $2`, [taskId, tech.id]);
        // لو كل الفنيين أكّدوا → المهمة done
        const pend = await client.query(
          `SELECT COUNT(*) AS n FROM task_technicians WHERE task_id = $1 AND confirmed_done_at IS NULL`, [taskId]
        );
        if (Number(pend.rows[0].n) === 0) {
          await client.query(`UPDATE booking_tasks SET status = 'done', finished_at = now(), updated_at = now() WHERE id = $1`, [taskId]);
        }
        // لو كل مهام الحجز done → الحجز quality_check
        const remaining = await client.query(
          `SELECT COUNT(*) AS n FROM booking_tasks WHERE booking_id = $1 AND status <> 'done'`, [bookingId]
        );
        if (Number(remaining.rows[0].n) === 0) {
          // نحدّث work_stage و stage معًا — العميل يشوف نفس التقدّم في حسابه.
          await client.query(
            `UPDATE bookings SET work_stage = 'quality_check', stage = GREATEST(stage, 2), updated_at = now() WHERE id = $1`,
            [bookingId]
          );
          await client.query(`INSERT INTO work_order_events (booking_id, event, actor_id) VALUES ($1, 'all_tasks_done', $2)`, [bookingId, tech.id]).catch(() => {});
        }
        await client.query("COMMIT"); client.release();
        return NextResponse.json({ ok: true });
      } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        client.release(); throw e;
      }
    }

    return bad("bad_action");
  } catch (err) {
    console.error("PATCH /api/technician/tasks failed:", err);
    return bad("server_error", 500);
  }
}