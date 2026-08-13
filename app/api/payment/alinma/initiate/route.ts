// app/api/payment/alinma/initiate/route.ts
import { NextResponse } from "next/server";
import { createPayRequest, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { bookingId, amount, customer } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "missing_booking_id" }, { status: 400 });
    }

    const rows = await query<any>(
      `SELECT id, reference, total, payment_status, payment_method_code
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
      console.error("alinma initiate: amount mismatch", { bookingId, sent: amount, expected: booking.total });
      return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 400 });
    }

    const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/alinma/callback`;
    const orderId = generateGatewayOrderId(booking.reference);

    const { transactionId, linkUrl } = await createPayRequest({
      paymentType: "1",
      orderId,
      amount: Number(booking.total).toFixed(2),
      currency: "SAR",
      description: `ABH Auto booking ${booking.reference}`,
      customer: { ...customer, addressCountry: "SA", addressCity: "Jeddah" },
      receiptUrl,
    });

    await query(
      `UPDATE bookings
         SET gateway_order_id = $2,
             gateway_transaction_id = $3,
             payment_status = $4
       WHERE id = $1`,
      [bookingId, orderId, transactionId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.json({ ok: true, redirectUrl: linkUrl });
  } catch (err) {
    console.error("alinma initiate failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}