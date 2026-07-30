import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const rows = await query<any>(
    `SELECT id, author_id, author_name, body, created_at FROM sales_task_notes WHERE task_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  return NextResponse.json({ ok: true, notes: rows.map((r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, body: r.body, createdAt: r.created_at })) });
}