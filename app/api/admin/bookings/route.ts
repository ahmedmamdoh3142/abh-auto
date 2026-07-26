/**
 * app/api/admin/bookings/route.ts
 * PATCH أكشنز:
 *   - cancel        : إلغاء بسبب اجباري → status='cancelled' + cancel_reason + history
 *                     لو كان الحجز مدفوعًا → payment_status='refunded' (رد الفلوس)
 *                     ويُلغى أي استخدام برومو مرتبط (يرجع للكود) + العمولة تطير تلقائيًا من الـviews.
 *   - stage         : تحديث مرحلة العمل (0..3) → تسحب الحالة تلقائيًا (active/completed)
 *   - reschedule    : تغيير scheduled_date / scheduled_time
 *   - confirm_pay   : تأكيد الدفع → payment_status='paid' + تأكيد استخدام البرومو
 *                     (دلوقتي بس تُحتسب عمولة الشريك وإحصائيات البرومو لهذا الحجز).
 * الكل يسجّل في booking_status_history.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { confirmRedemptionForBooking, voidRedemptionForBooking } from "@/lib/promo";

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

      // نقرأ الحالة الحالية أولًا لمعرفة هل كان مدفوعًا (عشان نرجّع الفلوس)
      const cur = await query<any>(
        `SELECT payment_status, stage FROM bookings WHERE id = $1`,
        [id]
      );
      if (!cur[0]) return bad("not_found", 404);
      const wasPaid = cur[0].payment_status === "paid";

      const rows = await query<any>(
        `UPDATE bookings
            SET status='cancelled',
                cancel_reason=$2,
                -- لو كان مدفوعًا: نعتبره مُسترَدًّا. غير كده نسيبه زي ما هو.
                payment_status = CASE WHEN payment_status = 'paid'::public.payment_status
                                      THEN 'refunded'::public.payment_status
                                      ELSE payment_status END,
                updated_at=now()
          WHERE id=$1
        RETURNING status, stage, cancel_reason, payment_status`,
        [id, reason]
      );
      if (!rows[0]) return bad("not_found", 404);

      // إلغاء أي استخدام برومو مرتبط بالحجز (يرجع العدّاد للكود ويحذف السجل)
      await voidRedemptionForBooking(id).catch((e) => console.error("voidRedemption failed:", e));

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,'cancelled',$2,$3)`,
        [id, rows[0].stage ?? 0,
         `أُلغِي بواسطة ${admin.name} — السبب: ${reason}${wasPaid ? " — تم رد المبلغ (refunded)" : ""}`]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        booking: { status: "cancelled", cancelReason: rows[0].cancel_reason, payment: rows[0].payment_status },
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

    /* ── تأكيد الدفع (العميل دفع في الفرع) — مع إمكانية إضافة خصم يدوي لحظة الدفع ── */
    if (action === "confirm_pay") {
      const cur = await query<any>(
        `SELECT payment_status, subtotal, towing_cost, promo_discount, manual_discount_amount, total
           FROM bookings WHERE id = $1`,
        [id]
      );
      if (!cur[0]) return bad("not_found", 404);
      const already = cur[0].payment_status === "paid";

      // (جديد) خصم يدوي اختياري يضيفه الموظف وقت تأكيد الدفع — نسبة أو مبلغ ثابت،
      // يُحسب في السيرفر من (الإجمالي الفرعي + النقل − أي خصم كود سابق).
      let discountKind: string | null = null;
      let discountValue: number | null = null;
      let discountAmount = Number(cur[0].manual_discount_amount) || 0;
      let discountReason: string | null = null;
      let applyingNewDiscount = false;

      const discountInput = b.discount;
      if (discountInput && (discountInput.kind === "percent" || discountInput.kind === "fixed")) {
        const rawValue = Math.max(0, Number(discountInput.value) || 0);
        if (rawValue > 0) {
          const base = Math.max(0, (Number(cur[0].subtotal) || 0) + (Number(cur[0].towing_cost) || 0) - (Number(cur[0].promo_discount) || 0));
          discountKind = discountInput.kind;
          discountValue = rawValue;
          discountReason = discountInput.reason ? String(discountInput.reason).trim().slice(0, 200) : null;
          discountAmount = discountInput.kind === "percent"
            ? Math.round((base * Math.min(100, rawValue)) / 100)
            : Math.min(rawValue, base);
          applyingNewDiscount = true;
        }
      }

      const newTotal = applyingNewDiscount
        ? Math.max(0, (Number(cur[0].total) || 0) - discountAmount)
        : Number(cur[0].total) || 0;

      const rows = await query<any>(
        `UPDATE bookings
            SET payment_status='paid'::public.payment_status,
                total = $2,
                manual_discount_kind = COALESCE($3, manual_discount_kind),
                manual_discount_value = COALESCE($4, manual_discount_value),
                manual_discount_amount = $5,
                manual_discount_reason = COALESCE($6, manual_discount_reason),
                manual_discount_by = CASE WHEN $7 THEN $8 ELSE manual_discount_by END,
                manual_discount_at = CASE WHEN $7 THEN now() ELSE manual_discount_at END,
                updated_at=now()
          WHERE id=$1
        RETURNING payment_status, status, stage, total, manual_discount_kind, manual_discount_value, manual_discount_amount, manual_discount_reason`,
        [id, newTotal, discountKind, discountValue, discountAmount, discountReason, applyingNewDiscount, admin.id]
      );
      if (!rows[0]) return bad("not_found", 404);

      // تأكيد استخدام البرومو لهذا الحجز (لو كان معلّقًا) — دلوقتي بس يُحتسب.
      if (!already) {
        await confirmRedemptionForBooking(id).catch((e) => console.error("confirmRedemption failed:", e));
      }

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage ?? 0,
         `تأكيد الدفع بواسطة ${admin.name}` +
           (applyingNewDiscount ? ` — خصم ${discountKind === "percent" ? `${discountValue}%` : `${discountValue} ريال`} (${discountReason || "بدون سبب مذكور"})` : "")]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        booking: {
          payment: rows[0].payment_status,
          total: Number(rows[0].total) || 0,
          manualDiscountKind: rows[0].manual_discount_kind || "",
          manualDiscountValue: rows[0].manual_discount_value != null ? Number(rows[0].manual_discount_value) : 0,
          manualDiscountAmount: Number(rows[0].manual_discount_amount) || 0,
          manualDiscountReason: rows[0].manual_discount_reason || "",
        },
      });
    }

    /* ── إضافة ملاحظة متابعة (مكالمة/واتساب/رسالة/شخصيًا/ملاحظة) ── */
    if (action === "followup_add") {
      const channel = ["call", "whatsapp", "sms", "in_person", "note"].includes(String(b.channel))
        ? String(b.channel) : "call";
      const note = String(b.note ?? "").trim();
      if (!note) return bad("note_required");

      const cur = await query<any>(`SELECT followup_status FROM bookings WHERE id = $1`, [id]);
      if (!cur[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_followups (booking_id, author_id, author_name, channel, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, admin.id, admin.name, channel, note]
      );

      let newStatus = cur[0].followup_status;
      if (newStatus === "none") {
        await query(`UPDATE bookings SET followup_status = 'open', updated_at = now() WHERE id = $1`, [id]);
        newStatus = "open";
      }

      const followups = await query<any>(
        `SELECT id, channel, note, author_name AS author, created_at AS "createdAt"
           FROM booking_followups WHERE booking_id = $1 ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({ ok: true, booking: { followupStatus: newStatus, followups } });
    }

    /* ── إقفال المتابعة بقرار نهائي إجباري ── */
    if (action === "followup_close") {
      const outcome = String(b.outcome ?? "");
      if (!["confirmed", "not_coming", "rescheduled", "no_response", "other"].includes(outcome)) {
        return bad("outcome_required");
      }
      const closeNote = b.note ? String(b.note).trim() : "";

      if (closeNote) {
        await query(
          `INSERT INTO booking_followups (booking_id, author_id, author_name, channel, note)
           VALUES ($1, $2, $3, 'note', $4)`,
          [id, admin.id, admin.name, closeNote]
        );
      }

      const rows = await query<any>(
        `UPDATE bookings
            SET followup_status = 'closed', followup_outcome = $2,
                followup_closed_at = now(), followup_closed_by = $3, updated_at = now()
          WHERE id = $1
        RETURNING followup_status, followup_outcome, followup_closed_at`,
        [id, outcome, admin.id]
      );
      if (!rows[0]) return bad("not_found", 404);

      const followups = await query<any>(
        `SELECT id, channel, note, author_name AS author, created_at AS "createdAt"
           FROM booking_followups WHERE booking_id = $1 ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({
        ok: true,
        booking: {
          followupStatus: rows[0].followup_status,
          followupOutcome: rows[0].followup_outcome,
          followupClosedAt: rows[0].followup_closed_at,
          followups,
        },
      });
    }

    /* ── إعادة فتح متابعة مقفولة ── */
    if (action === "followup_reopen") {
      const rows = await query<any>(
        `UPDATE bookings
            SET followup_status = 'open', followup_outcome = NULL,
                followup_closed_at = NULL, followup_closed_by = NULL, updated_at = now()
          WHERE id = $1
        RETURNING followup_status`,
        [id]
      );
      if (!rows[0]) return bad("not_found", 404);

      return NextResponse.json({ ok: true, booking: { followupStatus: rows[0].followup_status, followupOutcome: "", followupClosedAt: "" } });
    }


    /* ── تحديث المرحلة (0..3). 3 = مكتمل، وأي مرحلة أثناء "قادم" تنقله لـ "قيد التنفيذ" ── */
    if (b.stage != null) {
      const stage = Math.max(0, Math.min(3, Number(b.stage)));
      // نطابق work_stage الجديد مع الرقم القديم للحفاظ على الاتساق.
      const WORK_STAGE = ["received", "in_service", "quality_check", "ready"] as const;
      const workStage = WORK_STAGE[stage] ?? "received";
      const rows = await query<any>(
        `UPDATE bookings
            SET stage = $2,
                work_stage = $3,
                status = CASE
                  WHEN $2 >= 3 THEN 'completed'::booking_status
                  WHEN status = 'cancelled' THEN status
                  WHEN status = 'upcoming' THEN 'active'::booking_status
                  ELSE 'active'::booking_status
                END,
                updated_at = now()
          WHERE id = $1
        RETURNING status, stage, work_stage`,
        [id, stage, workStage]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage, `تحديث مرحلة (${stage}) بواسطة ${admin.name}`]
      ).catch(() => {});

      // سجل الحدث الجديد كمان
      await query(
        `INSERT INTO work_order_events (booking_id, event, actor_id, meta)
         VALUES ($1, 'stage_changed', $2, $3::jsonb)`,
        [id, admin.id, JSON.stringify({ stage, workStage })]
      ).catch(() => {});

      return NextResponse.json({ ok: true, booking: { status: rows[0].status, stage: rows[0].stage, workStage: rows[0].work_stage } });
    }

    return bad("no_op");
  } catch (err) {
    console.error("PATCH /api/admin/bookings failed:", err);
    return bad("server_error", 500);
  }
}