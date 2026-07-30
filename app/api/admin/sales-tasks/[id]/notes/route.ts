import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const b = await request.json();
    const body = String(b.body ?? "").trim();
    if (!body) return NextResponse.json({ ok: false, error: "empty_note" }, { status: 400 });

    await query(
      `UPDATE sales_tasks SET stage = 'contacted' WHERE id = $1 AND stage = 'new'`,
      [id]
    ).catch(() => {});

    const rows = await query<any>(
      `INSERT INTO sales_task_notes (task_id, author_id, author_name, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [id, admin.id, admin.name, body.slice(0, 2000)]
    );

    return NextResponse.json({ ok: true, id: rows[0].id, createdAt: rows[0].created_at });
  } catch (err) {
    console.error("POST /api/admin/sales-tasks/[id]/notes failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}