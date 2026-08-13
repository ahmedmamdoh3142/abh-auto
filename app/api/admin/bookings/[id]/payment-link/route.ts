// app/api/admin/bookings/[id]/payment-link/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { ALINMA_STATUS } from "@/lib/alinmapay";

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


  try {
    // منولّدش معاملة عند AlinmaPay هنا خالص — اللينك اللي بيتبعت للعميل
    // بقى ثابت على دومين بتاعنا، وهو اللي بيولّد المعاملة (نضيفة كل مرة)
    // لحظة ما العميل يدخل عليه فعليًا. شوف app/pay/[reference]/route.ts
    const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${booking.reference}`;

    return NextResponse.json({ ok: true, linkUrl });
  } catch (err: any) {
    console.error("admin payment-link failed:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "gateway_error" }, { status: 500 });
  }
}