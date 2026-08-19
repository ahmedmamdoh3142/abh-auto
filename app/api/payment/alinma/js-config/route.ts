// app/api/payment/alinma/js-config/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildJsCheckoutConfig, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "missing_booking_id" }, { status: 400 });
    }

    const rows = await query<any>(
      `SELECT id, reference, total, amount_paid, payment_status, payment_method_code, customer_email
         FROM bookings WHERE id = $1 LIMIT 1`,
      [bookingId]
    );
    const booking = rows[0];
    if (!booking) {
      return NextResponse.json({ ok: false, error: "booking_not_found" }, { status: 404 });
    }
    if (booking.payment_method_code !== "card") {
      return NextResponse.json({ ok: false, error: "wrong_payment_method" }, { status: 400 });
    }

    // (معدّل) نفس مبدأ initiate — المتبقي الفعلي محسوب سيرفر-سايد فقط.
    const total = Number(booking.total) || 0;
    const amountPaid = Number(booking.amount_paid) || 0;
    const remaining = Math.max(0, total - amountPaid);

    if (booking.payment_status === ALINMA_STATUS.paid || remaining <= 0.01) {
      return NextResponse.json({ ok: false, error: "already_paid" }, { status: 400 });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/alinma/callback`;
    const orderId = generateGatewayOrderId(booking.reference);

    const config = buildJsCheckoutConfig({
      orderId,
      amount: remaining.toFixed(2),
      currency: "SAR",
      customerEmail: booking.customer_email || undefined,
      callbackUrl,
    });

    await query(
      `UPDATE bookings
         SET gateway_order_id = $2,
             payment_status = CASE WHEN payment_status = 'partial'::public.payment_status
                                    THEN payment_status
                                    ELSE $3::public.payment_status END
       WHERE id = $1`,
      [booking.id, orderId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.json({ ok: true, config, amount: remaining });
  } catch (err) {
    console.error("alinma js-config failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}