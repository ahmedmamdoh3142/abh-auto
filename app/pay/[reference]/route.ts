// app/pay/[reference]/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createPayRequest, generateGatewayOrderId, ALINMA_STATUS } from "@/lib/alinmapay";

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const { reference } = await params;

  const rows = await query<any>(
    `SELECT id, reference, total, payment_status, customer_email, customer_phone
       FROM bookings WHERE reference = $1 LIMIT 1`,
    [reference]
  );
  const booking = rows[0];

  if (!booking) {
    return NextResponse.redirect(`${appUrl}/booking/payment-failed`);
  }

  // لو اتدفع خلاص (من أي زيارة قبل كده) - نوقف هنا وما بنكلمش البوابة تاني
  if (booking.payment_status === ALINMA_STATUS.paid) {
    return NextResponse.redirect(`${appUrl}/booking/payment-success?ref=${booking.reference}`);
  }

  if (Number(booking.total) <= 0) {
    return NextResponse.redirect(`${appUrl}/booking/payment-failed?ref=${booking.reference}`);
  }

  // كل زيارة = معاملة جديدة (orderId جديد) عند AlinmaPay، عشان ما نصطدمش
  // بمعاملة قديمة "مفتوحة" علّقها العميل قبل كده.
  const receiptUrl = `${appUrl}/api/payment/alinma/callback`;
  const orderId = generateGatewayOrderId(booking.reference);

  try {
    const { linkUrl } = await createPayRequest({
      paymentType: "1",
      orderId,
      amount: Number(booking.total).toFixed(2),
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
         SET gateway_order_id = $2, payment_status = $3, payment_method_code = 'card'
       WHERE id = $1`,
      [booking.id, orderId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.redirect(linkUrl);
  } catch (err) {
    console.error("pay redirect: createPayRequest failed", err);
    return NextResponse.redirect(`${appUrl}/booking/payment-failed?ref=${booking.reference}`);
  }
}