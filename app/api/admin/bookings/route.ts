/**
 * app/api/admin/bookings/route.ts
 * PATCH أكشنز:
 *   - cancel        : إلغاء بسبب اجباري → status='cancelled' + cancel_reason + history
 *   - stage         : تحديث مرحلة العمل (0..3) → تسحب الحالة تلقائيًا (active/completed)
 *   - reschedule    : تغيير scheduled_date / scheduled_time
 *   - confirm_pay   : تأكيد الدفع → payment_status='paid'
 * الكل يسجّل في booking_status_history.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const id = String(b.id ?? "");
    if (!id) return bad("id_required");

    const action = String(b.action ?? "");

    /* ── إلغاء بسبب اجباري ── */
    if (action === "cancel") {
      const reason = String(b.reason ?? "").trim();
      if (!reason) return bad("reason_required");

      const rows = await query<any>(
        `UPDATE bookings
            SET status='cancelled', cancel_reason=$2, updated_at=now()
          WHERE id=$1
        RETURNING status, stage, cancel_reason`,
        [id, reason]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,'cancelled',$2,$3)`,
        [id, rows[0].stage ?? 0, `أُلغِي بواسطة ${admin.name} — السبب: ${reason}`]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        booking: { status: "cancelled", cancelReason: rows[0].cancel_reason },
      });
    }

    /* ── إعادة جدولة الموعد ── */
    if (action === "reschedule") {
      const date = b.date ? String(b.date) : null;     // YYYY-MM-DD
      const time = b.time ? String(b.time) : null;
      if (!date || !time) return bad("datetime_required");

      const rows = await query<any>(
        `UPDATE bookings
            SET scheduled_date=$2, scheduled_time=$3, updated_at=now()
          WHERE id=$1
        RETURNING scheduled_date, scheduled_time, status, stage`,
        [id, date, time]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage ?? 0, `إعادة جدولة بواسطة ${admin.name} → ${date} ${time}`]
      ).catch(() => {});

      const d = rows[0].scheduled_date
        ? new Date(rows[0].scheduled_date).toISOString().slice(0, 10)
        : date;
      return NextResponse.json({ ok: true, booking: { date: d, time: rows[0].scheduled_time } });
    }

    /* ── تأكيد الدفع (العميل دفع في الفرع) ── */
    if (action === "confirm_pay") {
      const rows = await query<any>(
        `UPDATE bookings
            SET payment_status='paid'::payment_status, updated_at=now()
          WHERE id=$1
        RETURNING payment_status, status, stage`,
        [id]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage ?? 0, `تأكيد الدفع بواسطة ${admin.name}`]
      ).catch(() => {});

      return NextResponse.json({ ok: true, booking: { payment: rows[0].payment_status } });
    }

    /* ── تحديث المرحلة (0..3). 3 = مكتمل، وأي مرحلة أثناء "قادم" تنقله لـ "قيد التنفيذ" ── */
    if (b.stage != null) {
      const stage = Math.max(0, Math.min(3, Number(b.stage)));
      const rows = await query<any>(
        `UPDATE bookings
            SET stage = $2,
                status = CASE
                  WHEN $2 >= 3 THEN 'completed'::booking_status
                  WHEN status = 'cancelled' THEN status
                  WHEN status = 'upcoming' THEN 'active'::booking_status
                  ELSE 'active'::booking_status
                END,
                updated_at = now()
          WHERE id = $1
        RETURNING status, stage`,
        [id, stage]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage, `تحديث مرحلة (${stage}) بواسطة ${admin.name}`]
      ).catch(() => {});

      return NextResponse.json({ ok: true, booking: { status: rows[0].status, stage: rows[0].stage } });
    }

    return bad("no_op");
  } catch (err) {
    console.error("PATCH /api/admin/bookings failed:", err);
    return bad("server_error", 500);
  }
}