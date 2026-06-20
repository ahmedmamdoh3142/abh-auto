/**
 * app/api/partner/me/route.ts — تقرير الشركة لنفسها (Portal)
 *
 * يتحقّق أن المستخدم الحالي شريك نشط، ثم يرجّع تقريره المالي الكامل:
 *   summary (مبيعاته/عمولته/المدفوع/المتبقّي) + monthly + services + كل الحجوزات.
 *
 * لا يكشف صافيك أنت (net) للشركة — تركيزها على عمولتها هي وما سُدِّد لها.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "next-intl/server";

function pickLoc(json: any, locale: string): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  return json[locale] ?? json.ar ?? json.en ?? "";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const locale = await getLocale();

    // الشريك المرتبط بالمستخدم (نشط)
    const pr = await query<any>(
      `SELECT id, company_name, created_at, is_active
         FROM partners WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [user.id]
    );
    const partner = pr[0];
    if (!partner) return NextResponse.json({ ok: false, error: "not_partner" }, { status: 403 });
    const partnerId = partner.id;

    // الملخّص المالي
    const sumRows = await query<any>(
      `SELECT bookings_count, revenue_total, commission_total, paid_total, outstanding,
              last_booking_at, last_payout_at
         FROM v_partner_summary WHERE partner_id = $1`,
      [partnerId]
    );
    const s = sumRows[0] ?? {};

    // شهري
    const monthly = await query<any>(
      `SELECT month, bookings_count, revenue, commission
         FROM v_partner_monthly WHERE partner_id = $1 ORDER BY month DESC LIMIT 12`,
      [partnerId]
    );

    // الخدمات
    const svc = await query<any>(
      `SELECT service_slug, name_snapshot, times_booked, revenue, commission
         FROM v_partner_service_breakdown WHERE partner_id = $1
        ORDER BY times_booked DESC, revenue DESC`,
      [partnerId]
    );

    // الحجوزات بتفاصيلها
    const bookings = await query<any>(
      `SELECT b.id, b.reference, b.vehicle_label, b.plate, b.model, b.size_code, b.branch_code,
              b.scheduled_date, b.scheduled_time, b.total, b.commission_total,
              b.payment_status, b.status, b.created_at,
              COALESCE(
                (SELECT json_agg(json_build_object(
                    'name', bi.name_snapshot, 'size', bi.size_code,
                    'unit', bi.unit_price, 'commission', bi.commission_snapshot
                  ) ORDER BY bi.id)
                 FROM booking_items bi WHERE bi.booking_id = b.id), '[]'
              ) AS items
         FROM bookings b
        WHERE b.partner_id = $1
        ORDER BY b.created_at DESC`,
      [partnerId]
    );

    // سجل الدفعات اللي استلمتها الشركة
    const payouts = await query<any>(
      `SELECT amount, method, reference, proof_image, paid_at FROM partner_commission_payouts WHERE partner_id = $1 ORDER BY paid_at DESC`,
      [partnerId]
    );

    return NextResponse.json({
      ok: true,
      company: { name: partner.company_name, since: partner.created_at ? new Date(partner.created_at).toISOString() : null },
      summary: {
        bookingsCount: Number(s.bookings_count) || 0,
        revenueTotal: Number(s.revenue_total) || 0,    // إجمالي ما دفعته للحجوزات
        commissionTotal: Number(s.commission_total) || 0, // عمولتها
        paidTotal: Number(s.paid_total) || 0,          // ما استلمته من عمولتها
        outstanding: Number(s.outstanding) || 0,       // المتبقّي لها
        lastBookingAt: s.last_booking_at ? new Date(s.last_booking_at).toISOString() : null,
        lastPayoutAt: s.last_payout_at ? new Date(s.last_payout_at).toISOString() : null,
      },
      monthly: monthly.map((m) => ({
        month: m.month,
        bookingsCount: Number(m.bookings_count) || 0,
        revenue: Number(m.revenue) || 0,
        commission: Number(m.commission) || 0,
      })).reverse(),
      services: svc.map((x) => ({
        name: pickLoc(x.name_snapshot, locale) || x.service_slug,
        timesBooked: Number(x.times_booked) || 0,
        revenue: Number(x.revenue) || 0,
        commission: Number(x.commission) || 0,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        vehicle: b.vehicle_label || "—",
        plate: b.plate ?? "",
        size: b.size_code ?? "",
        branch: b.branch_code ?? "",
        date: b.scheduled_date ? new Date(b.scheduled_date).toISOString() : null,
        time: b.scheduled_time ?? "",
        total: Number(b.total) || 0,
        commission: Number(b.commission_total) || 0,
        paymentStatus: b.payment_status ?? "",
        status: b.status,
        createdAt: b.created_at ? new Date(b.created_at).toISOString() : null,
        items: (b.items || []).map((it: any) => ({
          name: pickLoc(it.name, locale) || "",
          size: it.size,
          unit: Number(it.unit) || 0,
          commission: Number(it.commission) || 0,
        })),
      })),
      payouts: payouts.map((p) => ({
      amount: Number(p.amount) || 0,
      method: p.method ?? "",
      reference: p.reference ?? "",
      proofImage: p.proof_image ?? "",   // ← جديد
      paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null,
    })),
    });
  } catch (err) {
    console.error("GET /api/partner/me failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
