/**
 * app/admin/partners/page.tsx — تقارير الشركاء (SERVER) · v2
 * يعرض لكل شركة: مبيعاتها، عمولتها (من حقّها)، صافيك، المدفوع لها، والمتبقّي.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import PartnersClient from "./partners-client";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT partner_id, company_name, is_active, user_id, account_name, account_email, account_phone,
            partner_since, bookings_count, revenue_total, commission_total, net_total,
            paid_total, outstanding, last_booking_at, last_payout_at
       FROM v_partner_summary
      ORDER BY outstanding DESC, revenue_total DESC, company_name`
  );

  // إجماليات عامة (KPIs أعلى الصفحة)
  const totals = rows.reduce(
    (acc, r) => {
      acc.partners += 1;
      acc.bookings += Number(r.bookings_count) || 0;
      acc.revenue += Number(r.revenue_total) || 0;
      acc.commission += Number(r.commission_total) || 0;
      acc.net += Number(r.net_total) || 0;
      acc.paid += Number(r.paid_total) || 0;
      acc.outstanding += Number(r.outstanding) || 0;
      if (r.is_active) acc.active += 1;
      return acc;
    },
    { partners: 0, active: 0, bookings: 0, revenue: 0, commission: 0, net: 0, paid: 0, outstanding: 0 }
  );

  return (
    <PartnersClient
      locale={locale}
      totals={totals}
      partners={rows.map((r) => ({
        partnerId: r.partner_id,
        companyName: r.company_name,
        isActive: r.is_active,
        accountName: r.account_name,
        accountEmail: r.account_email,
        accountPhone: r.account_phone ?? "",
        partnerSince: r.partner_since ? new Date(r.partner_since).toISOString() : null,
        bookingsCount: Number(r.bookings_count) || 0,
        revenueTotal: Number(r.revenue_total) || 0,
        commissionTotal: Number(r.commission_total) || 0,
        netTotal: Number(r.net_total) || 0,
        paidTotal: Number(r.paid_total) || 0,
        outstanding: Number(r.outstanding) || 0,
        lastBookingAt: r.last_booking_at ? new Date(r.last_booking_at).toISOString() : null,
        lastPayoutAt: r.last_payout_at ? new Date(r.last_payout_at).toISOString() : null,
      }))}
    />
  );
}
