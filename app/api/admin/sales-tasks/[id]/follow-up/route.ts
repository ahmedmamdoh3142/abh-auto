import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const b = await request.json();
    const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null;
    if (!date) return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
    const note = b.note ? String(b.note).trim().slice(0, 1000) : null;

    const cur = await query<any>(
      `SELECT follow_up_date, follow_up_cancelled_at FROM sales_tasks WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!cur[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const wasActive = !!cur[0].follow_up_date && !cur[0].follow_up_cancelled_at;

    await query(
      `UPDATE sales_tasks
          SET follow_up_date = $2::date,
              follow_up_note = $3,
              follow_up_set_by = $4,
              follow_up_set_at = now(),
              follow_up_cancelled_at = NULL,
              follow_up_cancel_reason = NULL,
              follow_up_cancelled_by = NULL
        WHERE id = $1`,
      [id, date, note, admin.id]
    );

    const label = `📅 ${wasActive ? "إعادة جدولة المتابعة" : "تحديد متابعة"} بتاريخ ${date}${note ? ` — ${note}` : ""}`;
    await query(
      `INSERT INTO sales_task_notes (task_id, author_id, author_name, body) VALUES ($1,$2,$3,$4)`,
      [id, admin.id, admin.name, label]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/sales-tasks/[id]/follow-up failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const b = await request.json().catch(() => ({}));
    const reason = b.reason ? String(b.reason).trim().slice(0, 500) : null;
    if (!reason) return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 });

    const cur = await query<any>(
      `SELECT follow_up_date, follow_up_cancelled_at FROM sales_tasks WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!cur[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!cur[0].follow_up_date || cur[0].follow_up_cancelled_at) {
      return NextResponse.json({ ok: false, error: "no_active_follow_up" }, { status: 400 });
    }
    const prevDate = cur[0].follow_up_date;

    await query(
      `UPDATE sales_tasks
          SET follow_up_cancelled_at = now(),
              follow_up_cancel_reason = $2,
              follow_up_cancelled_by = $3
        WHERE id = $1`,
      [id, reason, admin.id]
    );

    const label = `🚫 إلغاء المتابعة (كانت محدّدة ${prevDate}): ${reason}`;
    await query(
      `INSERT INTO sales_task_notes (task_id, author_id, author_name, body) VALUES ($1,$2,$3,$4)`,
      [id, admin.id, admin.name, label]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/sales-tasks/[id]/follow-up failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}