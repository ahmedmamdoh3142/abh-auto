// app/api/payment/alinma/js-config/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildJsCheckoutConfig, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";

export async function POST(request: Request) {
  try {
    const { bookingId, amount } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "missing_booking_id" }, { status: 400 });
    }

    const rows = await query<any>(
      `SELECT id, reference, total, payment_status, payment_method_code, customer_email
         FROM bookings WHERE id = $1 LIMIT 1`,
      [bookingId]
    );
    const booking = rows[0];
    if (!booking) {
      return NextResponse.json({ ok: false, error: "booking_not_found" }, { status: 404 });
    }
    if (booking.payment_status === ALINMA_STATUS.paid) {
      return NextResponse.json({ ok: false, error: "already_paid" }, { status: 400 });
    }
    if (booking.payment_method_code !== "card") {
      return NextResponse.json({ ok: false, error: "wrong_payment_method" }, { status: 400 });
    }
    const amountMatches = Math.abs(Number(booking.total) - Number(amount)) < 0.01;
    if (!amountMatches) {
      console.error("js-config: amount mismatch", { bookingId, sent: amount, expected: booking.total });
      return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 400 });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/alinma/callback`;
    const orderId = generateGatewayOrderId(booking.reference);

    const config = buildJsCheckoutConfig({
      orderId,
      amount: Number(booking.total).toFixed(2),
      currency: "SAR",
      customerEmail: booking.customer_email || undefined,
      callbackUrl,
    });

    await query(
      `UPDATE bookings SET gateway_order_id = $2, payment_status = $3 WHERE id = $1`,
      [booking.id, orderId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("alinma js-config failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}