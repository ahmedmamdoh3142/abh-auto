/**
 * app/api/technician/tasks/[taskId]/comments/route.ts — محادثة المهمة (فني ↔ مشرف).
 *   GET  → تعليقات المهمة + يعلّم رسائل المشرف كمقروءة (من جهة الفني).
 *   POST → الفني يضيف تعليق (يصل للمشرف كغير مقروء).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function getTech() {
  const u = await getCurrentUser().catch(() => null);
  if (!u || u.role !== "technician") return null;
  return { id: u.id, name: u.name };
}

export async function GET(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const tech = await getTech();
    if (!tech) return bad("unauthorized", 401);
    const { taskId } = await ctx.params;
    const tid = Number(taskId);
    if (!tid) return bad("task_required");

    const link = await query<any>(`SELECT 1 FROM task_technicians WHERE task_id=$1 AND technician_id=$2`, [tid, tech.id]);
    if (!link[0]) return bad("not_assigned", 403);

    // نعلّم رسائل المشرف (اللي مش من الفني) كمقروءة
    await query(
      `UPDATE task_comments SET read_by_technician_at = now()
        WHERE task_id = $1 AND read_by_technician_at IS NULL
          AND author_id <> $2`,
      [tid, tech.id]
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
      isMe: r.author_id === tech.id,
      fromSupervisor: r.author_role !== "technician",
    }));
    return NextResponse.json({ ok: true, comments });
  } catch (err) {
    console.error("GET technician comments failed:", err);
    return bad("server_error", 500);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const tech = await getTech();
    if (!tech) return bad("unauthorized", 401);
    const { taskId } = await ctx.params;
    const tid = Number(taskId);
    if (!tid) return bad("task_required");

    const link = await query<any>(`SELECT 1 FROM task_technicians WHERE task_id=$1 AND technician_id=$2`, [tid, tech.id]);
    if (!link[0]) return bad("not_assigned", 403);

    const b = await request.json();
    const body = String(b.body ?? "").trim();
    if (!body) return bad("empty");

    // رسالة الفني: مقروءة من جهته، غير مقروءة عند المشرف
    const ins = await query<any>(
      `INSERT INTO task_comments (task_id, author_id, body, read_by_technician_at)
       VALUES ($1, $2, $3, now()) RETURNING id, created_at`,
      [tid, tech.id, body]
    );
    return NextResponse.json({ ok: true, id: Number(ins[0].id), createdAt: ins[0].created_at });
  } catch (err) {
    console.error("POST technician comment failed:", err);
    return bad("server_error", 500);
  }
}