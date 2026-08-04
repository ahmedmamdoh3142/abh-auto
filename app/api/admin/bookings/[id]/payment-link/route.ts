// app/api/admin/bookings/[id]/payment-link/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { createPayRequest, ALINMA_STATUS } from "@/lib/alinmapay";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await query<any>(
    `SELECT id, reference, total, payment_status, customer_email, customer_phone
       FROM bookings WHERE id = $1 LIMIT 1`,
    [id]
  );
  const booking = rows[0];
  if (!booking) return NextResponse.json({ ok: false, error: "booking_not_found" }, { status: 404 });
  if (booking.payment_status === ALINMA_STATUS.paid) {
    return NextResponse.json({ ok: false, error: "already_paid" }, { status: 400 });
  }
  if (Number(booking.total) <= 0) {
    return NextResponse.json({ ok: false, error: "zero_amount" }, { status: 400 });
  }

  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/alinma/callback`;

  try {
    const { transactionId, linkUrl } = await createPayRequest({
      paymentType: "1",
      orderId: booking.reference,
      amount: Number(booking.total).toFixed(2),
      currency: "SAR",
      description: `ABH Auto booking ${booking.reference}`,
      customer: { email: booking.customer_email, mobile: booking.customer_phone, addressCountry: "SA", addressCity: "Jeddah" },
      receiptUrl,
    });

    await query(
      `UPDATE bookings
         SET gateway_transaction_id = $2, payment_status = $3, payment_method_code = 'card'
       WHERE id = $1`,
      [booking.id, transactionId, ALINMA_STATUS.awaitingGateway]
    );

    return NextResponse.json({ ok: true, linkUrl });
  } catch (err) {
    console.error("admin payment-link failed:", err);
    return NextResponse.json({ ok: false, error: "gateway_error" }, { status: 500 });
  }
}