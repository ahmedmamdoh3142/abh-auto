/**
 * app/api/admin/technicians/route.ts — قائمة الفنيين مع عدد المهام النشطة لكل واحد.
 * النشطة = مهام حالتها pending أو in_progress ومخصّصة له ولم يؤكّد انتهاءها.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const rows = await query<any>(
      `SELECT u.id, u.name, u.job_title,
              COALESCE((
                SELECT COUNT(*)
                FROM task_technicians tt
                JOIN booking_tasks t ON t.id = tt.task_id
                WHERE tt.technician_id = u.id
                  AND tt.confirmed_done_at IS NULL
                  AND t.status IN ('pending','in_progress')
              ), 0) AS active_tasks
         FROM users u
        WHERE u.role = 'technician'
        ORDER BY active_tasks ASC, u.name`
    );

    const technicians = rows.map((r) => ({
      id: r.id,
      name: r.name || "—",
      jobTitle: r.job_title || "",
      activeTasks: Number(r.active_tasks) || 0,
    }));
    return NextResponse.json({ ok: true, technicians });
  } catch (err) {
    console.error("GET /api/admin/technicians failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}