// app/api/payment/alinma/callback/route.ts
import { NextResponse } from "next/server";
import { decryptFinalResponse, verifyResponseSignature, ALINMA_STATUS } from "@/lib/alinmapay";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const form = await request.formData();
  const data = form.get("data") as string;

  let payload: any;
  try {
    payload = decryptFinalResponse(data);
  } catch (e) {
    console.error("alinma decrypt failed:", e);
    return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
  }

  const orderId = payload?.orderDetails?.orderId;
  const responseCode = payload?.responseCode;
  const amount = payload?.amountDetails?.amount;
  const transactionId = payload?.transactionId;

  if (payload?.signature) {
    const valid = verifyResponseSignature({
      paymentId: transactionId,
      responseCode,
      amount,
      signature: payload.signature,
    });
    if (!valid) {
      console.error("alinma signature mismatch for order", orderId);
      return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
    }
  }

  const success = responseCode === "000";

  // (معدّل) البحث بقى بـ gateway_order_id مش reference، لأن orderId بقى
  // فريد لكل محاولة دفع مش ثابت على الحجز.
  const rows = await query<any>(
    `SELECT id, reference, total FROM bookings WHERE gateway_order_id = $1 LIMIT 1`,
    [orderId]
  );
  const booking = rows[0];
  if (!booking) {
    console.error("alinma callback: booking not found for order", orderId);
    return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
  }

  const amountMatches = Math.abs(Number(booking.total) - Number(amount)) < 0.01;
  const finalStatus = success && amountMatches ? ALINMA_STATUS.paid : ALINMA_STATUS.failed;

  await query(
    `UPDATE bookings
       SET payment_status = $2,
           gateway_transaction_id = $3,
           gateway_response_code = $4
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
    `INSERT INTO work_order_events (booking_id, event, meta)
     VALUES ($1, $2, $3)`,
    [
      booking.id,
      finalStatus === ALINMA_STATUS.paid ? "gateway_payment_success" : "gateway_payment_failed",
      JSON.stringify({ transactionId, responseCode, amount, orderId }),
    ]
  ).catch((e) => console.error("work_order_events insert failed:", e));

  // نستخدم reference (مش orderId) في الـ redirect عشان يبقى واضح للعميل
  return NextResponse.redirect(
    finalStatus === ALINMA_STATUS.paid
      ? `${appUrl}/booking/payment-success?ref=${booking.reference}`
      : `${appUrl}/booking/payment-failed?ref=${booking.reference}`
  );
}