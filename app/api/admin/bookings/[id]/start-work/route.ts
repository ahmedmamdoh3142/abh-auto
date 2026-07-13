/**
 * app/api/admin/bookings/[id]/start-work/route.ts — بدء تشغيل أمر العمل.
 * ينقل الحجز لمرحلة in_service بعد التخصيص. يشترط أن كل مهمة لها فني واحد على الأقل.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    // نتأكد أن كل مهمة لها فني واحد على الأقل
    const unassigned = await query<any>(
      `SELECT COUNT(*) AS n FROM booking_tasks t
        WHERE t.booking_id = $1
          AND NOT EXISTS (SELECT 1 FROM task_technicians tt WHERE tt.task_id = t.id)`,
      [id]
    );
    if (Number(unassigned[0]?.n) > 0) return bad("tasks_unassigned");

    await query(
      `UPDATE bookings
          SET work_stage = 'in_service', stage = GREATEST(stage, 1), work_order_started = true, updated_at = now()
        WHERE id = $1`,
      [id]
    );
    await query(
      `INSERT INTO work_order_events (booking_id, event, actor_id) VALUES ($1, 'work_started', $2)`,
      [id, admin.id]
    ).catch(() => {});

    return NextResponse.json({ ok: true, workStage: "in_service" });
  } catch (err) {
    console.error("POST start-work failed:", err);
    return bad("server_error", 500);
  }
}