/**
 * app/api/account/bookings/route.ts — تعديل/إلغاء حجوزات العميل من حسابه.
 *   PATCH  { id, date?, time? }            → إعادة جدولة (للحجوزات القادمة فقط)
 *   DELETE ?id=...&reason=...              → إلغاء بسبب إجباري (طلب 5)
 *
 * يتحقّق أن الحجز يخص المستخدم الحالي. عند الإلغاء:
 *   • لو مدفوع → payment_status='refunded'
 *   • يُلغى أي استخدام برومو مرتبط (يرجع للكود)
 *   • العمولة (لو شريك) تطير تلقائيًا من الـviews لأن status صار 'cancelled'
 *   • يُسجَّل السبب في cancel_reason + booking_status_history
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { voidRedemptionForBooking } from "@/lib/promo";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** نحدّد صف الحجز بالـid سواء كان معرّف داخلي (uuid) أو reference (ABH-XXXXX). */
async function findOwnedBooking(idOrRef: string, userId: string) {
  const rows = await query<any>(
    `SELECT id, user_id, status, payment_status, stage
       FROM bookings
      WHERE (id::text = $1 OR reference = $1) AND user_id = $2
      LIMIT 1`,
    [idOrRef, userId]
  );
  return rows[0] ?? null;
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return bad("unauthorized", 401);

    const body = await request.json();
    const idOrRef = String(body.id ?? "");
    if (!idOrRef) return bad("id_required");

    const bk = await findOwnedBooking(idOrRef, user.id);
    if (!bk) return bad("not_found", 404);
    if (bk.status !== "upcoming") return bad("not_editable");

    const date = body.date ? String(body.date) : null;
    const time = body.time ? String(body.time) : null;
    if (!date && !time) return bad("no_op");

    await query(
      `UPDATE bookings
          SET scheduled_date = COALESCE($2, scheduled_date),
              scheduled_time = COALESCE($3, scheduled_time),
              updated_at = now()
        WHERE id = $1`,
      [bk.id, date, time]
    );

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1,$2,$3,$4)`,
      [bk.id, bk.status, bk.stage ?? 0, `إعادة جدولة بواسطة العميل`]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/account/bookings failed:", err);
    return bad("server_error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return bad("unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const idOrRef = searchParams.get("id") || "";
    const reason = (searchParams.get("reason") || "").trim();
    if (!idOrRef) return bad("id_required");
    if (!reason) return bad("reason_required"); // (طلب 5) السبب إجباري

    const bk = await findOwnedBooking(idOrRef, user.id);
    if (!bk) return bad("not_found", 404);
    if (bk.status === "cancelled") return NextResponse.json({ ok: true }); // already
    // العميل يقدر يلغي القادم/الجاري فقط (مش المكتمل)
    if (bk.status === "completed") return bad("not_cancellable");

    const wasPaid = bk.payment_status === "paid";

    await query(
      `UPDATE bookings
          SET status='cancelled',
              cancel_reason=$2,
              payment_status = CASE WHEN payment_status = 'paid'::public.payment_status
                                    THEN 'refunded'::public.payment_status
                                    ELSE payment_status END,
              updated_at=now()
        WHERE id=$1`,
      [bk.id, reason]
    );

    await voidRedemptionForBooking(bk.id).catch((e) => console.error("voidRedemption failed:", e));

    await query(
      `INSERT INTO booking_status_history (booking_id, status, stage, note)
       VALUES ($1,'cancelled',$2,$3)`,
      [bk.id, bk.stage ?? 0,
       `أُلغِي بواسطة العميل — السبب: ${reason}${wasPaid ? " — تم رد المبلغ (refunded)" : ""}`]
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account/bookings failed:", err);
    return bad("server_error", 500);
  }
}