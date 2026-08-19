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
import { matchBankBin } from "@/lib/bank-discount";
import { recordPayment, isPaymentMethod, type PaymentMethod } from "@/lib/payments";

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
      const wasPaid = cur[0].payment_status === "paid" || cur[0].payment_status === "partial";

      const rows = await query<any>(
        `UPDATE bookings
            SET status='cancelled',
                cancel_reason=$2,
                -- لو كان مدفوعًا: نعتبره مُسترَدًّا. غير كده نسيبه زي ما هو.
                payment_status = CASE WHEN payment_status IN ('paid'::public.payment_status,'partial'::public.payment_status)
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

    /* ── (سوبر أدمن فقط) تغيير الحالة يدويًا مع ضبط كل التوابع تلقائيًا ── */
    if (action === "force_status") {
      if (!admin.isSuperAdmin) return bad("forbidden_super_admin_only", 403);

      const target = String(b.status ?? "");
      if (!["upcoming", "active", "completed", "cancelled"].includes(target)) {
        return bad("status_required");
      }
      const reason = b.reason ? String(b.reason).trim() : "";
      if (target === "cancelled" && !reason) return bad("reason_required");

      const cur = await query<any>(
        `SELECT status, stage, work_stage, payment_status, work_order_no FROM bookings WHERE id = $1`,
        [id]
      );
      if (!cur[0]) return bad("not_found", 404);
      const wasPaid = cur[0].payment_status === "paid";

      let stage = cur[0].stage ?? 0;
      let workStage: string | null = cur[0].work_stage;
      let deliveredSet = false;

      if (target === "upcoming") {
        stage = 0; workStage = null;
      } else if (target === "active") {
        stage = Math.max(stage, 1);
        if (!workStage || workStage === "received") workStage = "in_service";
      } else if (target === "completed") {
        stage = 3; workStage = "ready"; deliveredSet = true;
      } else if (target === "cancelled") {
        // نسيب stage/work_stage زي ما هما (تاريخيًا) — بس نلغي البرومو ونرد الفلوس لو كان مدفوع
        await voidRedemptionForBooking(id).catch((e) => console.error("voidRedemption failed:", e));
      }

      const rows = await query<any>(
        `UPDATE bookings
            SET status = $2::booking_status,
                stage = $3,
                work_stage = $4,
                cancel_reason = CASE WHEN $2 = 'cancelled' THEN $5 ELSE cancel_reason END,
                payment_status = CASE WHEN $2 = 'cancelled' AND payment_status = 'paid'::public.payment_status
                                      THEN 'refunded'::public.payment_status
                                      ELSE payment_status END,
                delivered_at = CASE WHEN $6 THEN COALESCE(delivered_at, now()) ELSE delivered_at END,
                updated_at = now()
          WHERE id = $1
        RETURNING status, stage, work_stage, payment_status, cancel_reason`,
        [id, target, stage, workStage, reason || null, deliveredSet]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1,$2,$3,$4)`,
        [id, rows[0].status, rows[0].stage,
         `تغيير حالة يدوي (سوبر أدمن) بواسطة ${admin.name} → ${target}${reason ? ` — ${reason}` : ""}${target === "cancelled" && wasPaid ? " — تم رد المبلغ" : ""}`]
      ).catch(() => {});

      await query(
        `INSERT INTO work_order_events (booking_id, event, actor_id, meta)
         VALUES ($1, 'force_status', $2, $3::jsonb)`,
        [id, admin.id, JSON.stringify({ target, reason: reason || null })]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        booking: {
          status: rows[0].status,
          stage: rows[0].stage,
          workStage: rows[0].work_stage,
          payment: rows[0].payment_status,
          cancelReason: rows[0].cancel_reason || "",
        },
      });
    }

    /* ── تأكيد الدفع (العميل دفع فعليًا) — منفصل تمامًا عن تطبيق الخصم،
       الخصم (يدوي/بنكي) بيتطبّق مسبقًا عن طريق أكشن set_discount تحت،
       وهنا بس بنأكّد إن الفلوس استلمت فعلًا. ── */
    if (action === "confirm_pay") {
  const cur = await query<any>(
    `SELECT total, amount_paid, payment_status FROM bookings WHERE id = $1`,
    [id]
  );
  if (!cur[0]) return bad("not_found", 404);

  const total = Number(cur[0].total) || 0;
  const already = Number(cur[0].amount_paid) || 0;
  const remaining = Math.max(0, total - already);
  if (remaining <= 0.01) return bad("already_paid");

  const rawMethod = String(b.method ?? "");
  // isPaymentMethod بترفض "gateway" هنا عمدًا — الأدمن يسجّل كاش/كارت/تحويل/أخرى بس،
  // "gateway" مخصوصة للدفعات الجاية من AlinmaPay تلقائيًا.
  let method: PaymentMethod = "cash";
  if (rawMethod !== "gateway" && isPaymentMethod(rawMethod)) {
    method = rawMethod;
  }
  // لو ماجاش مبلغ في الطلب → يدفع كل المتبقي (سلوك «تأكيد الدفع» القديم)
  const requested = b.amount != null ? Math.round((Number(b.amount) || 0) * 100) / 100 : remaining;
  if (!(requested > 0)) return bad("amount_required");
  if (requested > remaining + 0.01) return bad("amount_exceeds_remaining");
  const note = b.note ? String(b.note).trim().slice(0, 300) : null;

  let result;
  try {
    result = await recordPayment({ bookingId: id, amount: requested, method, note, receivedBy: admin.id });
  } catch (e: any) {
    return bad(e?.message || "payment_failed");
  }

  const rows = await query<any>(
    `SELECT status, stage, total, manual_discount_kind, manual_discount_value, manual_discount_amount, manual_discount_reason
       FROM bookings WHERE id = $1`,
    [id]
  );

  await query(
    `INSERT INTO booking_status_history (booking_id, status, stage, note)
     VALUES ($1,$2,$3,$4)`,
    [
      id, rows[0].status, rows[0].stage ?? 0,
      result.paymentStatus === "paid"
        ? `تأكيد سداد كامل بواسطة ${admin.name} (${requested.toFixed(2)} ريال)`
        : `تسجيل دفعة جزئية بواسطة ${admin.name} — ${requested.toFixed(2)} ريال (متبقي ${result.remaining.toFixed(2)})`,
    ]
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    booking: {
      payment: result.paymentStatus,
      amountPaid: result.amountPaid,
      remaining: result.remaining,
      total: Number(rows[0].total) || 0,
      manualDiscountKind: rows[0].manual_discount_kind || "",
      manualDiscountValue: rows[0].manual_discount_value != null ? Number(rows[0].manual_discount_value) : 0,
      manualDiscountAmount: Number(rows[0].manual_discount_amount) || 0,
      manualDiscountReason: rows[0].manual_discount_reason || "",
    },
  });
}

    /* ── (جديد) تطبيق/تعديل/إزالة خصم على حجز موجود — بدون تأكيد دفع.
       يسمح بخصم يدوي (نسبة/مبلغ) أو خصم بنك العميل (BIN) — يستبدل أي خصم
       سابق تمامًا (زي منطق الحجز الجديد). الإجمالي بيتحدّث فورًا عشان لو
       الموظف طلع لينك دفع بعدها يبقى بالمبلغ الصح. ── */
    if (action === "set_discount") {
      const cur = await query<any>(
  `SELECT subtotal, towing_cost, total, promo_discount, manual_discount_amount, bank_discount_amount, payment_status, amount_paid
     FROM bookings WHERE id = $1`,
  [id]
);
if (!cur[0]) return bad("not_found", 404);
if (cur[0].payment_status === "paid" || Number(cur[0].amount_paid) > 0) return bad("already_paid");

      const beforePromo = (Number(cur[0].subtotal) || 0) + (Number(cur[0].towing_cost) || 0);
      const promoDiscount = Number(cur[0].promo_discount) || 0;
      const oldManual = Number(cur[0].manual_discount_amount) || 0;
      const oldBank = Number(cur[0].bank_discount_amount) || 0;
      // القيمة الثابتة (هدايا/خدمات مؤقتة) اللي فوق الإجمالي — بترجع بالمعادلة العكسية
      // من الإجمالي الحالي عشان تفضل ثابتة مهما اتغيّر الخصم.
      const extra = Math.max(0, (Number(cur[0].total) || 0) - beforePromo + promoDiscount + oldManual + oldBank);

      const bankDigitsRaw = b.bankCardDigits ? String(b.bankCardDigits).replace(/\D/g, "").slice(0, 8) : null;

      let manualKind: string | null = null;
      let manualValue: number | null = null;
      let manualAmount = 0;
      let manualReason: string | null = null;
      let bankAmount = 0;
      let bankCode: string | null = null;
      let bankBin: string | null = null;

      if (bankDigitsRaw) {
        const match = await matchBankBin(bankDigitsRaw);
        if (!match) return bad("bank_not_matched");
        bankCode = match.bankCode;
        bankBin = bankDigitsRaw;
        bankAmount = Math.round((beforePromo * match.percent) / 100);
      } else if (b.discount && (b.discount.kind === "percent" || b.discount.kind === "fixed")) {
        const rawValue = Math.max(0, Number(b.discount.value) || 0);
        if (rawValue <= 0) return bad("discount_required");
        const base = Math.max(0, beforePromo - promoDiscount);
        manualKind = b.discount.kind;
        manualValue = rawValue;
        manualReason = b.discount.reason ? String(b.discount.reason).trim().slice(0, 200) : null;
        manualAmount = manualKind === "percent"
          ? Math.round((base * Math.min(100, rawValue)) / 100)
          : Math.min(rawValue, base);
      } else if (b.clear !== true) {
        return bad("discount_required");
      }
      // b.clear === true → كل القيم فوق تفضل صفر/null → إزالة أي خصم.

      const newTotal = Math.max(0, beforePromo - promoDiscount - manualAmount - bankAmount) + extra;

      const rows = await query<any>(
        `UPDATE bookings
            SET total = $2,
                manual_discount_kind = $3,
                manual_discount_value = $4,
                manual_discount_amount = $5::numeric,
                manual_discount_reason = $6,
                manual_discount_by = CASE WHEN $5::numeric > 0 THEN $7::uuid ELSE NULL END,
                manual_discount_at = CASE WHEN $5::numeric > 0 THEN now() ELSE NULL END,
                bank_discount_amount = $8,
                bank_code = $9,
                bank_bin_matched = $10,
                updated_at = now()
          WHERE id = $1
        RETURNING total, manual_discount_kind, manual_discount_value, manual_discount_amount, manual_discount_reason,
                  bank_discount_amount, bank_code`,
        [id, newTotal, manualKind, manualValue, manualAmount, manualReason, admin.id, bankAmount, bankCode, bankBin]
      );
      if (!rows[0]) return bad("not_found", 404);

      await query(
        `INSERT INTO booking_status_history (booking_id, status, stage, note)
         VALUES ($1, (SELECT status FROM bookings WHERE id=$1), (SELECT stage FROM bookings WHERE id=$1), $2)`,
        [id, bankCode
          ? `تطبيق خصم عملاء البنك الأهلي (${bankCode}) بواسطة ${admin.name}`
          : manualAmount > 0
            ? `تطبيق خصم يدوي بواسطة ${admin.name} — ${manualKind === "percent" ? `${manualValue}%` : `${manualValue} ريال`} (${manualReason || "بدون سبب مذكور"})`
            : `إزالة الخصم بواسطة ${admin.name}`]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        booking: {
          total: Number(rows[0].total) || 0,
          manualDiscountKind: rows[0].manual_discount_kind || "",
          manualDiscountValue: rows[0].manual_discount_value != null ? Number(rows[0].manual_discount_value) : 0,
          manualDiscountAmount: Number(rows[0].manual_discount_amount) || 0,
          manualDiscountReason: rows[0].manual_discount_reason || "",
          manualDiscountBy: manualAmount > 0 ? admin.name : "",
          bankDiscountAmount: Number(rows[0].bank_discount_amount) || 0,
          bankCode: rows[0].bank_code || "",
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