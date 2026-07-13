/**
 * app/api/admin/bookings/[id]/qc/route.ts — فحص الجودة.
 *
 *   PATCH { taskId, action:'approve'|'reject', note? }
 *     approve → المهمة معتمدة. لو كل المهام اعتُمدت → الحجز 'ready' (جاهز للتسليم).
 *     reject  → المهمة ترجع للفني: status='in_progress'، تأكيدات الفنيين تُلغى،
 *               الحجز يرجع 'in_service'، ويُسجَّل سبب الرفض (يراه الفني في مهمته).
 *
 * الرفض يزيد rework_count (لقياس جودة الفني لاحقًا).
 */
import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminWithPerm("bookings");
    if (!admin) return bad("unauthorized", 401);

    const { id } = await ctx.params;
    if (!id) return bad("id_required");

    const b = await request.json();
    const taskId = Number(b.taskId);
    const action = String(b.action ?? "");
    const note = b.note ? String(b.note).trim() : null;
    if (!taskId) return bad("task_required");

    const t = await query<any>(`SELECT id, status FROM booking_tasks WHERE id=$1 AND booking_id=$2`, [taskId, id]);
    if (!t[0]) return bad("not_found", 404);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (action === "approve") {
        await client.query(
          `UPDATE booking_tasks SET qc_status='approved', qc_note=$2, qc_at=now(), qc_by=$3, updated_at=now() WHERE id=$1`,
          [taskId, note, admin.id]
        );
        // كل المهام معتمدة؟ → الحجز جاهز للتسليم
        const pend = await client.query(
          `SELECT COUNT(*) AS n FROM booking_tasks WHERE booking_id=$1 AND (qc_status IS DISTINCT FROM 'approved')`,
          [id]
        );
        if (Number(pend.rows[0].n) === 0) {
          await client.query(
            `UPDATE bookings SET work_stage='ready', stage=GREATEST(stage,3), updated_at=now() WHERE id=$1`,
            [id]
          );
          await client.query(
            `INSERT INTO work_order_events (booking_id, event, actor_id) VALUES ($1,'qc_passed',$2)`,
            [id, admin.id]
          ).catch(() => {});
        }
        await client.query("COMMIT"); client.release();
        return NextResponse.json({ ok: true });
      }

      if (action === "reject") {
        if (!note) { await client.query("ROLLBACK"); client.release(); return bad("note_required"); }

        // المهمة ترجع للفني
        await client.query(
          `UPDATE booking_tasks
              SET qc_status='rejected', qc_note=$2, qc_at=now(), qc_by=$3,
                  status='in_progress', finished_at=NULL,
                  rework_count = rework_count + 1, updated_at=now()
            WHERE id=$1`,
          [taskId, note, admin.id]
        );
        // نلغي تأكيدات الفنيين (يأكّدوا تاني بعد الإصلاح)
        await client.query(
          `UPDATE task_technicians SET confirmed_done_at = NULL WHERE task_id = $1`,
          [taskId]
        );
        // الحجز يرجع قيد التشغيل
        await client.query(
          `UPDATE bookings SET work_stage='in_service', stage=LEAST(stage,1), updated_at=now() WHERE id=$1`,
          [id]
        );
        // نضيف سبب الرفض كتعليق للفني (غير مقروء عنده)
        await client.query(
          `INSERT INTO task_comments (task_id, author_id, body, read_by_supervisor_at)
           VALUES ($1, $2, $3, now())`,
          [taskId, admin.id, `⚠️ ${note}`]
        ).catch(() => {});
        await client.query(
          `INSERT INTO work_order_events (booking_id, event, actor_id, meta) VALUES ($1,'qc_rejected',$2,$3::jsonb)`,
          [id, admin.id, JSON.stringify({ taskId, note })]
        ).catch(() => {});

        await client.query("COMMIT"); client.release();
        return NextResponse.json({ ok: true });
      }

      await client.query("ROLLBACK"); client.release();
      return bad("bad_action");
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      client.release(); throw e;
    }
  } catch (err) {
    console.error("PATCH qc failed:", err);
    return bad("server_error", 500);
  }
}