/**
 * app/api/admin/bookings/[id]/tasks/[taskId]/comments/route.ts — محادثة المهمة (جانب المشرف).
 *   GET  → تعليقات المهمة + يعلّم رسائل الفني كمقروءة (من جهة المشرف).
 *   POST → المشرف يرد (تصل للفني كغير مقروءة).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id, taskId } = await ctx.params;
    const tid = Number(taskId);
    if (!id || !tid) return bad("id_required");

    // نتأكد أن المهمة تخص هذا الحجز
    const t = await query<any>(`SELECT 1 FROM booking_tasks WHERE id=$1 AND booking_id=$2`, [tid, id]);
    if (!t[0]) return bad("not_found", 404);

    // نعلّم رسائل الفنيين كمقروءة (من جهة المشرف)
    await query(
      `UPDATE task_comments c SET read_by_supervisor_at = now()
        WHERE c.task_id = $1 AND c.read_by_supervisor_at IS NULL
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = c.author_id AND u.role = 'technician')`,
      [tid]
    );

    const rows = await query<any>(
      `SELECT c.id, c.body, c.created_at, c.author_id, u.name AS author_name, u.role AS author_role
         FROM task_comments c JOIN users u ON u.id = c.author_id
        WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
      [tid]
    );
    const comments = rows.map((r) => ({
      id: Number(r.id), body: r.body, createdAt: r.created_at,
      authorName: r.author_name || "—",
      isMe: r.author_id === admin.id,
      fromTechnician: r.author_role === "technician",
    }));
    return NextResponse.json({ ok: true, comments });
  } catch (err) {
    console.error("GET admin task comments failed:", err);
    return bad("server_error", 500);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id, taskId } = await ctx.params;
    const tid = Number(taskId);
    if (!id || !tid) return bad("id_required");

    const t = await query<any>(`SELECT 1 FROM booking_tasks WHERE id=$1 AND booking_id=$2`, [tid, id]);
    if (!t[0]) return bad("not_found", 404);

    const b = await request.json();
    const body = String(b.body ?? "").trim();
    if (!body) return bad("empty");

    // رد المشرف: مقروء من جهته، غير مقروء عند الفني
    const ins = await query<any>(
      `INSERT INTO task_comments (task_id, author_id, body, read_by_supervisor_at)
       VALUES ($1, $2, $3, now()) RETURNING id, created_at`,
      [tid, admin.id, body]
    );
    return NextResponse.json({ ok: true, id: Number(ins[0].id), createdAt: ins[0].created_at });
  } catch (err) {
    console.error("POST admin task comment failed:", err);
    return bad("server_error", 500);
  }
}