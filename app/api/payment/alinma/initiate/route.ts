// app/api/payment/alinma/initiate/route.ts
import { NextResponse } from "next/server";
import { createPayRequest, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { bookingId, customer } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "missing_booking_id" }, { status: 400 });
    }

    const rows = await query<any>(
      `SELECT id, reference, total, amount_paid, payment_status, payment_method_code
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

    // (معدّل) المبلغ بقى دايمًا المتبقي الفعلي المحسوب سيرفر-سايد — مبقاش
    // بياخد amount من الكلاينت خالص، عشان محدش يقدر يبعت مبلغ مغلوط.
    const total = Number(booking.total) || 0;
    const amountPaid = Number(booking.amount_paid) || 0;
    const remaining = Math.max(0, total - amountPaid);

    if (booking.payment_status === ALINMA_STATUS.paid || remaining <= 0.01) {
      return NextResponse.json({ ok: false, error: "already_paid" }, { status: 400 });
    }

    const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/alinma/callback`;
    const orderId = generateGatewayOrderId(booking.reference);

    const { transactionId, linkUrl } = await createPayRequest({
      paymentType: "1",
      orderId,
      amount: remaining.toFixed(2),
      currency: "SAR",
      description: `ABH Auto booking ${booking.reference}`,
      customer: { ...customer, addressCountry: "SA", addressCity: "Jeddah" },
      receiptUrl,
    });

    await query(
      `UPDATE bookings
         SET gateway_order_id = $2,
             gateway_transaction_id = $3,
             payment_status = CASE WHEN payment_status = 'partial'::public.payment_status
                                    THEN payment_status
                                    ELSE $4::public.payment_status END
       WHERE id = $1`,
      [bookingId, orderId, transactionId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.json({ ok: true, redirectUrl: linkUrl, amount: remaining });
  } catch (err) {
    console.error("alinma initiate failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}