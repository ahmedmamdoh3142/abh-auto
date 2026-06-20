/**
 * app/api/admin/partners/[id]/route.ts — تفاصيل شركة واحدة (موسّع)
 *
 * يرجّع كل ما تحتاجه صفحة تقرير الشركة الاحترافية:
 *   • profile   — بيانات الشركة + الحساب
 *   • summary   — المالية: مبيعات، عمولة الشركة، صافيك، مدفوع، متبقّي…
 *   • monthly   — تجميع شهري (آخر 12 شهر) للرسم البياني
 *   • services  — تفصيل الخدمات المطلوبة (مرّات + مبيعات + عمولة الشركة)
 *   • bookings  — كل الحجوزات بتفاصيلها (مش آخر 12 بس)
 *
 * مفهوم العمولة: من حقّ الشركة. صافيك = total − commission.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { id: partnerId } = await (ctx as any).params;
    const locale = (await getLocale()) as Locale;
    if (!partnerId) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    // ── الملف + الملخّص المالي (من الـ view المحدّث) ──
    const sumRows = await query<any>(
      `SELECT s.*, p.contact_person, p.company_phone, p.company_email, p.tax_number, p.notes
         FROM v_partner_summary s
         JOIN partners p ON p.id = s.partner_id
        WHERE s.partner_id = $1`,
      [partnerId]
    );
    const s = sumRows[0];
    if (!s) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // ── تجميع شهري ──
    const monthly = await query<any>(
      `SELECT month, bookings_count, revenue, commission, net
         FROM v_partner_monthly
        WHERE partner_id = $1
        ORDER BY month DESC
        LIMIT 12`,
      [partnerId]
    );

    // ── تفصيل الخدمات ──
    const svcRows = await query<any>(
      `SELECT service_slug, name_snapshot, times_booked, revenue, commission
         FROM v_partner_service_breakdown
        WHERE partner_id = $1
        ORDER BY times_booked DESC, revenue DESC`,
      [partnerId]
    );

    // ── كل الحجوزات بتفاصيلها (مع بنود كل حجز) ──
    const bookingRows = await query<any>(
      `SELECT b.id, b.reference, b.vehicle_label, b.plate, b.brand_id, b.model,
              b.size_code, b.branch_code, b.scheduled_date, b.scheduled_time,
              b.subtotal, b.total, b.commission_total, b.payment_method_code, b.payment_status,
              b.status, b.created_at,
              COALESCE(
                (SELECT json_agg(json_build_object(
                    'slug', bi.service_slug,
                    'name', bi.name_snapshot,
                    'size', bi.size_code,
                    'unit', bi.unit_price,
                    'commission', bi.commission_snapshot
                  ) ORDER BY bi.id)
                 FROM booking_items bi WHERE bi.booking_id = b.id), '[]'
              ) AS items
         FROM bookings b
        WHERE b.partner_id = $1
        ORDER BY b.created_at DESC`,
      [partnerId]
    );

    return NextResponse.json({
      ok: true,
      profile: {
        partnerId: s.partner_id,
        companyName: s.company_name,
        isActive: s.is_active,
        accountName: s.account_name,
        accountEmail: s.account_email,
        accountPhone: s.account_phone ?? "",
        contactPerson: s.contact_person ?? "",
        companyPhone: s.company_phone ?? "",
        companyEmail: s.company_email ?? "",
        taxNumber: s.tax_number ?? "",
        notes: s.notes ?? "",
        partnerSince: s.partner_since ? new Date(s.partner_since).toISOString() : null,
      },
      summary: {
        bookingsCount: Number(s.bookings_count) || 0,
        revenueTotal: Number(s.revenue_total) || 0,
        commissionTotal: Number(s.commission_total) || 0,
        netTotal: Number(s.net_total) || 0,
        paidTotal: Number(s.paid_total) || 0,
        outstanding: Number(s.outstanding) || 0,
        lastBookingAt: s.last_booking_at ? new Date(s.last_booking_at).toISOString() : null,
        lastPayoutAt: s.last_payout_at ? new Date(s.last_payout_at).toISOString() : null,
      },
      monthly: monthly.map((m) => ({
        month: m.month,
        bookingsCount: Number(m.bookings_count) || 0,
        revenue: Number(m.revenue) || 0,
        commission: Number(m.commission) || 0,
        net: Number(m.net) || 0,
      })).reverse(),
      services: svcRows.map((x) => ({
        slug: x.service_slug,
        name: pick(x.name_snapshot, locale) || x.service_slug,
        timesBooked: Number(x.times_booked) || 0,
        revenue: Number(x.revenue) || 0,
        commission: Number(x.commission) || 0,
      })),
      bookings: bookingRows.map((b) => ({
        id: b.id,
        reference: b.reference,
        vehicle: b.vehicle_label || "—",
        plate: b.plate ?? "",
        model: b.model ?? "",
        size: b.size_code ?? "",
        branch: b.branch_code ?? "",
        date: b.scheduled_date ? new Date(b.scheduled_date).toISOString() : null,
        time: b.scheduled_time ?? "",
        subtotal: Number(b.subtotal) || 0,
        total: Number(b.total) || 0,
        commission: Number(b.commission_total) || 0,
        net: (Number(b.total) || 0) - (Number(b.commission_total) || 0),
        paymentStatus: b.payment_status ?? "",
        status: b.status,
        createdAt: b.created_at ? new Date(b.created_at).toISOString() : null,
        items: (b.items || []).map((it) => ({
          slug: it.slug,
          name: pick(it.name, locale) || it.slug,
          size: it.size,
          unit: Number(it.unit) || 0,
          commission: Number(it.commission) || 0,
        })),
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/partners/[id] failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
