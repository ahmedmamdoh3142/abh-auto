// app/api/payment/alinma/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { ALINMA_STATUS } from "@/lib/alinmapay";

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

  // (معدّل) البحث بقى بـ gateway_order_id مش reference
  const rows = await query<any>(
    `SELECT id, total, payment_status FROM bookings WHERE gateway_order_id = $1 LIMIT 1`,
    [orderId]
  );
  const booking = rows[0];
  if (!booking) {
    console.error("alinma webhook: booking not found", orderId);
    return NextResponse.json({ ok: true });
  }

  if (booking.payment_status === ALINMA_STATUS.paid) {
    return NextResponse.json({ ok: true });
  }

  const amountMatches = Math.abs(Number(booking.total) - Number(amount)) < 0.01;
  const finalStatus = success && amountMatches ? ALINMA_STATUS.paid : ALINMA_STATUS.failed;

  await query(
    `UPDATE bookings
       SET payment_status = $2, gateway_transaction_id = $3, gateway_response_code = $4
     WHERE id = $1`,
    [booking.id, finalStatus, transactionId, responseCode]
  );

  if (finalStatus === ALINMA_STATUS.paid) {
    await query(
      `UPDATE promo_redemptions SET paid_at = now() WHERE booking_id = $1 AND paid_at IS NULL`,
      [booking.id]
    ).catch((e) => console.error("promo_redemptions update failed:", e));
  }

  await query(
    `INSERT INTO work_order_events (booking_id, event, meta) VALUES ($1, $2, $3)`,
    [
      booking.id,
      finalStatus === ALINMA_STATUS.paid ? "gateway_webhook_success" : "gateway_webhook_failed",
      JSON.stringify({ transactionId, responseCode, amount, orderId, source: "webhook" }),
    ]
  ).catch((e) => console.error("work_order_events insert failed:", e));

  return NextResponse.json({ ok: true });
}