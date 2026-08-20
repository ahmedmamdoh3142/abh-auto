// app/pay/[reference]/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createPayRequest, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const { reference } = await params;

  const rows = await query<any>(
    `SELECT id, reference, total, amount_paid, payment_status, customer_email, customer_phone,
            gateway_order_id, updated_at
       FROM bookings WHERE reference = $1 LIMIT 1`,
    [reference]
  );
  const booking = rows[0];

  if (!booking) {
    return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
  }

  const total = Number(booking.total) || 0;
  const amountPaid = Number(booking.amount_paid) || 0;
  const remaining = Math.max(0, total - amountPaid);

  if (booking.payment_status === ALINMA_STATUS.paid || remaining <= 0.01) {
    return NextResponse.redirect(`${appUrl}/booking/payment-success?ref=${booking.reference}`);
  }

  // (جديد) لو فيه معاملة اتولّدت من أقل من دقيقتين ولسه awaiting_gateway،
  // منولدش وحدة جديدة — نوريه إنه لسه قيد المعالجة بدل ما نكسر التتبع
  // بكتابة gateway_order_id جديد فوق القديم اللي رد الـ callback بتاعه
  // ممكن يكون في الطريق.
  const secondsSinceUpdate = booking.updated_at
    ? (Date.now() - new Date(booking.updated_at).getTime()) / 1000
    : Infinity;
  if (
    booking.payment_status === ALINMA_STATUS.awaitingGateway &&
    booking.gateway_order_id &&
    secondsSinceUpdate < 120
  ) {
    return NextResponse.redirect(`${appUrl}/booking/payment-pending?ref=${booking.reference}`);
  }

  const receiptUrl = `${appUrl}/api/payment/alinma/callback`;
  const orderId = generateGatewayOrderId(booking.reference);

  try {
    const { linkUrl } = await createPayRequest({
      paymentType: "1",
      orderId,
      amount: remaining.toFixed(2),
      currency: "SAR",
      description: `ABH Auto booking ${booking.reference}`,
      customer: {
        email: booking.customer_email,
        mobile: booking.customer_phone,
        addressCountry: "SA",
        addressCity: "Jeddah",
      },
      receiptUrl,
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

    return NextResponse.redirect(linkUrl);
  } catch (err) {
    console.error("pay redirect: createPayRequest failed", err);
    return NextResponse.redirect(`${appUrl}/booking/payment-failed?ref=${booking.reference}`);
  }
}