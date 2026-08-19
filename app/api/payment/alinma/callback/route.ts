// app/api/payment/alinma/callback/route.ts
import { NextResponse } from "next/server";
import { decryptFinalResponse, verifyResponseSignature, ALINMA_STATUS } from "@/lib/alinmapay";
import { query } from "@/lib/db";
import { recordPayment } from "@/lib/payments";

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

  const rows = await query<any>(
    `SELECT id, reference, total, amount_paid, payment_status
       FROM bookings WHERE gateway_order_id = $1 LIMIT 1`,
    [orderId]
  );
  const booking = rows[0];
  if (!booking) {
    console.error("alinma callback: booking not found for order", orderId);
    return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
  }

  // (معدّل) المبلغ اللي بيرجع من الجيت واي بيتقارن بالمتبقي الفعلي وقت
  // إنشاء المعاملة (مش إجمالي الحجز)، لأن اللينك بقى بيتولّد بالمتبقي.
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
      `INSERT INTO work_order_events (booking_id, event, meta) VALUES ($1, 'gateway_payment_failed', $2)`,
      [booking.id, JSON.stringify({ transactionId, responseCode, amount, orderId })]
    ).catch((e) => console.error("work_order_events insert failed:", e));

    return NextResponse.redirect(`${appUrl}/booking/payment-failed?ref=${booking.reference}`);
  }

  // نجاح فعلي — نسجّل دفعة (كاملة أو جزئية حسب المتبقي الفعلي وقتها) بدل
  // ما نفرض payment_status='paid' مباشرة.
  try {
    await recordPayment({
      bookingId: booking.id,
      amount: Math.min(remainingExpected, Number(amount) || remainingExpected),
      method: "gateway",
      gatewayTransactionId: transactionId,
      gatewayOrderId: orderId,
    });
  } catch (e) {
    console.error("alinma callback: recordPayment failed", e);
    // حتى لو فشل تسجيل الدفعة لسبب سباق (race)، سجّل الاستجابة الخام على الأقل
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
    `INSERT INTO work_order_events (booking_id, event, meta)
     VALUES ($1, 'gateway_payment_success', $2)`,
    [booking.id, JSON.stringify({ transactionId, responseCode, amount, orderId })]
  ).catch((e) => console.error("work_order_events insert failed:", e));

  return NextResponse.redirect(`${appUrl}/booking/payment-success?ref=${booking.reference}`);
}