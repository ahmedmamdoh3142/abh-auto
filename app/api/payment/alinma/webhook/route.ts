// app/api/payment/alinma/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { ALINMA_STATUS } from "@/lib/alinmapay";
import { recordPayment } from "@/lib/payments";

const MERCHANT_KEY = process.env.ALINMA_MERCHANT_KEY!;

function verifyWebhookSignature(payload: any): boolean {
  const raw = `${payload.transactionId}|${MERCHANT_KEY}|${payload.responseCode}|${Number(payload.amount).toFixed(2)}`;
  const expected = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  return expected === payload.signature;
}

export async function POST(request: Request) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!payload?.signature || !verifyWebhookSignature(payload)) {
    console.error("alinma webhook: invalid signature", payload?.orderId);
    return NextResponse.json({ ok: true });
  }

  const orderId = payload.orderId;
  const responseCode = payload.responseCode;
  const amount = payload.amount;
  const transactionId = payload.transactionId;
  const success = responseCode === "000" && payload.result === "SUCCESS";

  // (جديد) نفس منطق الـ callback — fallback بالـ reference لو gateway_order_id
  // اتكتب فوقه بمحاولة دفع تانية بعد ما اتولّدت المعاملة دي.
  let rows = await query<any>(
    `SELECT id, total, amount_paid, payment_status FROM bookings WHERE gateway_order_id = $1 LIMIT 1`,
    [orderId]
  );
  let booking = rows[0];

  if (!booking) {
    const refGuess = String(orderId || "").replace(/-[a-z0-9]+$/i, "");
    if (refGuess) {
      const fallbackRows = await query<any>(
        `SELECT id, total, amount_paid, payment_status FROM bookings WHERE reference = $1 LIMIT 1`,
        [refGuess]
      );
      booking = fallbackRows[0];
      if (booking) {
        console.warn("alinma webhook: matched booking via reference fallback", {
          orderId,
          refGuess,
          bookingId: booking.id,
        });
      }
    }
  }

  if (!booking) {
    console.error("alinma webhook: booking not found", orderId);
    return NextResponse.json({ ok: true });
  }

  if (booking.payment_status === ALINMA_STATUS.paid) {
    return NextResponse.json({ ok: true });
  }

  // (معدّل) نفس منطق الـ callback — المتبقي الفعلي وقتها هو المرجع للمطابقة.
  const total = Number(booking.total) || 0;
  const amountPaidBefore = Number(booking.amount_paid) || 0;
  const remainingExpected = Math.max(0, total - amountPaidBefore);
  const amountMatches = Math.abs(remainingExpected - Number(amount)) < 0.01;

  if (!success || !amountMatches) {
    await query(
      `UPDATE bookings
          SET payment_status = CASE WHEN payment_status = 'awaiting_gateway'::public.payment_status
                                     THEN (CASE WHEN $2 > 0 THEN 'partial'::public.payment_status ELSE 'pending'::public.payment_status END)
                                     ELSE payment_status END,
              gateway_transaction_id = $3,
              gateway_response_code = $4
        WHERE id = $1`,
      [booking.id, amountPaidBefore, transactionId, responseCode]
    );
    await query(
      `INSERT INTO work_order_events (booking_id, event, meta) VALUES ($1, 'gateway_webhook_failed', $2)`,
      [booking.id, JSON.stringify({ transactionId, responseCode, amount, orderId, source: "webhook" })]
    ).catch((e) => console.error("work_order_events insert failed:", e));

    return NextResponse.json({ ok: true });
  }

  try {
    await recordPayment({
      bookingId: booking.id,
      amount: Math.min(remainingExpected, Number(amount) || remainingExpected),
      method: "gateway",
      gatewayTransactionId: transactionId,
      gatewayOrderId: orderId,
    });
  } catch (e) {
    console.error("alinma webhook: recordPayment failed", e);
    await query(
      `UPDATE bookings SET gateway_transaction_id = $2, gateway_response_code = $3 WHERE id = $1`,
      [booking.id, transactionId, responseCode]
    ).catch(() => {});
  }

  await query(
    `UPDATE promo_redemptions SET paid_at = now() WHERE booking_id = $1 AND paid_at IS NULL`,
    [booking.id]
  ).catch((e) => console.error("promo_redemptions update failed:", e));

  await query(
    `INSERT INTO work_order_events (booking_id, event, meta) VALUES ($1, 'gateway_webhook_success', $2)`,
    [booking.id, JSON.stringify({ transactionId, responseCode, amount, orderId, source: "webhook" })]
  ).catch((e) => console.error("work_order_events insert failed:", e));

  return NextResponse.json({ ok: true });
}