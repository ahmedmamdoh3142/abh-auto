/**
 * app/admin/page.tsx — نظرة عامة (SERVER) · v2
 * استعلامات غنية: إيراد محصّل + متوقّع، تريند شهري، شارت 14 يوم،
 * توزيع الحالات، تقسيم الدفع، أكثر الخدمات طلبًا، وأقرب الحجوزات بأسماء العملاء.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import OverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  const [counts] = await query<any>(
    `SELECT
       COALESCE((SELECT sum(total) FROM bookings WHERE payment_status='paid'),0)                                   AS collected,
       COALESCE((SELECT sum(total) FROM bookings WHERE status<>'cancelled'),0)                                     AS expected,
       COALESCE((SELECT sum(total) FROM bookings WHERE payment_status='paid' AND created_at >= date_trunc('month',now())),0)                                  AS month_rev,
       COALESCE((SELECT sum(total) FROM bookings WHERE payment_status='paid' AND created_at >= date_trunc('month',now()) - interval '1 month' AND created_at < date_trunc('month',now())),0) AS prev_month_rev,
       (SELECT count(*) FROM bookings WHERE status='upcoming')                                                     AS upcoming,
       (SELECT count(*) FROM bookings WHERE status='active')                                                       AS active,
       (SELECT count(*) FROM bookings WHERE status='completed')                                                    AS completed,
       (SELECT count(*) FROM bookings WHERE status='cancelled')                                                    AS cancelled,
       (SELECT count(*) FROM bookings WHERE created_at >= date_trunc('month',now()))                               AS month_count,
       (SELECT count(*) FROM bookings WHERE created_at >= date_trunc('month',now()) - interval '1 month' AND created_at < date_trunc('month',now())) AS prev_month_count,
       (SELECT count(*) FROM bookings WHERE scheduled_date = current_date)                                         AS today_count,
       (SELECT count(*) FROM bookings WHERE payment_status='paid')                                                 AS paid_count,
       (SELECT count(*) FROM bookings WHERE payment_status<>'paid' AND status<>'cancelled')                        AS unpaid_count,
       (SELECT count(*) FROM users WHERE role='member')                                                            AS members,
       (SELECT count(*) FROM users WHERE role='member' AND member_since >= date_trunc('month',now()))              AS new_members`
  );

  // شارت آخر 14 يوم (قيمة الحجوزات غير الملغاة حسب تاريخ الإنشاء)
  const series = await query<any>(
    `SELECT to_char(d::date,'YYYY-MM-DD') AS day,
            COALESCE((SELECT sum(total) FROM bookings b WHERE b.created_at::date = d::date AND b.status<>'cancelled'),0) AS value,
            (SELECT count(*) FROM bookings b WHERE b.created_at::date = d::date AND b.status<>'cancelled') AS cnt
     FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') d
     ORDER BY day`
  );

  // أكثر الخدمات طلبًا
  const topServices = await query<any>(
    `SELECT bi.service_slug AS slug, bi.name_snapshot AS name,
            count(*)::int AS cnt, COALESCE(sum(bi.line_total),0) AS revenue
     FROM booking_items bi
     JOIN bookings b ON b.id = bi.booking_id AND b.status<>'cancelled'
     GROUP BY bi.service_slug, bi.name_snapshot
     ORDER BY cnt DESC, revenue DESC
     LIMIT 5`
  );

  // أقرب الحجوزات
  const recent = await query<any>(
    `SELECT b.reference, b.vehicle_label, b.status, b.total, b.payment_status,
            b.scheduled_date, b.scheduled_time, b.plate, b.branch_code,
            COALESCE(u.name,'—') AS customer
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.status IN ('upcoming','active')
     ORDER BY b.scheduled_date NULLS LAST, b.created_at DESC
     LIMIT 6`
  );

  const branches = await query<any>(`SELECT code, name FROM branches`);
  const branchName: Record<string, string> = {};
  for (const br of branches) branchName[br.code] = pick(br.name, locale);

  const trend = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

  return (
    <OverviewClient
      locale={locale}
      counts={{
        collected: Number(counts?.collected) || 0,
        expected: Number(counts?.expected) || 0,
        upcoming: Number(counts?.upcoming) || 0,
        active: Number(counts?.active) || 0,
        completed: Number(counts?.completed) || 0,
        cancelled: Number(counts?.cancelled) || 0,
        monthCount: Number(counts?.month_count) || 0,
        todayCount: Number(counts?.today_count) || 0,
        paidCount: Number(counts?.paid_count) || 0,
        unpaidCount: Number(counts?.unpaid_count) || 0,
        members: Number(counts?.members) || 0,
        newMembers: Number(counts?.new_members) || 0,
        revTrend: trend(Number(counts?.month_rev) || 0, Number(counts?.prev_month_rev) || 0),
        countTrend: trend(Number(counts?.month_count) || 0, Number(counts?.prev_month_count) || 0),
      }}
      series={series.map((r) => ({ day: r.day, value: Number(r.value) || 0, cnt: Number(r.cnt) || 0 }))}
      topServices={topServices.map((s) => ({ name: pick(s.name, locale) || s.slug, cnt: s.cnt, revenue: Number(s.revenue) || 0 }))}
      recent={recent.map((r) => ({
        reference: r.reference,
        vehicle: r.vehicle_label || "—",
        status: r.status,
        payment: r.payment_status,
        total: Number(r.total) || 0,
        date: r.scheduled_date ? new Date(r.scheduled_date).toISOString().slice(0, 10) : "",
        time: r.scheduled_time || "",
        plate: r.plate || "",
        branch: branchName[r.branch_code] || "—",
        customer: r.customer || "—",
      }))}
    />
  );
}