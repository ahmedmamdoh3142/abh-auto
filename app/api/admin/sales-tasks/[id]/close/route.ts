import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

const LOST_REASONS = new Set(["price", "timing", "no_response", "chose_competitor", "not_interested", "other"]);

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const b = await request.json();
const result = b.result === "won" ? "won" : b.result === "lost" ? "lost" : null;
if (!result) return NextResponse.json({ ok: false, error: "invalid_result" }, { status: 400 });

const reason = result === "lost" && LOST_REASONS.has(b.reason) ? b.reason : null;
if (result === "lost" && !reason) {
  return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 });
}
const note = b.note ? String(b.note).trim().slice(0, 1000) : null;

await query(
  `UPDATE sales_tasks
      SET stage        = $2::sales_task_stage,
          close_result = $3::sales_task_close_result,
          close_reason = $4,
          close_note   = $5,
          closed_by    = $6,
          closed_at    = now()
    WHERE id = $1`,
  [id, result, result, reason, note, admin.id]
);

    const label = result === "won"
      ? `✅ أُغلق التاسك: تم الحجز${note ? ` — ${note}` : ""}`
      : `❌ أُغلق التاسك: مرفوض (${reason})${note ? ` — ${note}` : ""}`;
    await query(
      `INSERT INTO sales_task_notes (task_id, author_id, author_name, body) VALUES ($1,$2,$3,$4)`,
      [id, admin.id, admin.name, label]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/sales-tasks/[id]/close failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}