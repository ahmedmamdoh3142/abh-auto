/**
 * app/admin/page.tsx — نظرة عامة (SERVER) · v5
 * ──────────────────────────────────────────────────────────────────────
 * • شارت «التحصيل» بدل قيمة الحجوزات: نوزّع المبلغ المُحصَّل (payment_status='paid')
 *   على وقت التحصيل الفعلي — من booking_status_history (سطر «تأكيد الدفع»)،
 *   ولو مفيش (مدفوع أونلاين وقت الحجز) بنرجع لـ created_at.
 * • تريند الإيراد المحصّل بقى على أساس وقت التحصيل كمان (متّسق مع الشارت).
 * • (تعديل) لو المستخدم مالوش صلاحية النظرة العامة → يُوجَّه لأول صفحة مسموحة.
 */
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { hasPerm, firstAllowedPage } from "@/lib/admin/permissions";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import OverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

type RangeKey = "day" | "week" | "month" | "year";

const RANGES: Record<RangeKey, {
  grain: string; step: string; spanStart: string; prevStart: string; prevEnd: string;
}> = {
  day: {
    grain: "hour",
    step: "1 hour",
    spanStart: "date_trunc('day', now())",
    prevStart: "date_trunc('day', now()) - interval '1 day'",
    prevEnd: "date_trunc('day', now())",
  },
  week: {
    grain: "day",
    step: "1 day",
    spanStart: "date_trunc('day', now()) - interval '6 days'",
    prevStart: "date_trunc('day', now()) - interval '13 days'",
    prevEnd: "date_trunc('day', now()) - interval '6 days'",
  },
  month: {
    grain: "day",
    step: "1 day",
    spanStart: "date_trunc('day', now()) - interval '29 days'",
    prevStart: "date_trunc('day', now()) - interval '59 days'",
    prevEnd: "date_trunc('day', now()) - interval '29 days'",
  },
  year: {
    grain: "month",
    step: "1 month",
    spanStart: "date_trunc('month', now()) - interval '11 months'",
    prevStart: "date_trunc('month', now()) - interval '23 months'",
    prevEnd: "date_trunc('month', now()) - interval '11 months'",
  },
};

/* وقت التحصيل الفعلي لكل حجز: آخر سطر «تأكيد الدفع» في السجل، وإلا created_at. */
const collectedAt = (a: string) =>
  `COALESCE((SELECT max(h.created_at) FROM booking_status_history h
             WHERE h.booking_id = ${a}.id AND h.note LIKE '%تأكيد الدفع%'), ${a}.created_at)`;

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const me = await requireAdmin();
  // لو مالوش صلاحية النظرة العامة، وجّهه لأول صفحة مسموحة (أو الرئيسية).
  if (!hasPerm(me, "overview")) {
    const first = firstAllowedPage(me);
    redirect(first ? first.href : "/");
  }

  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const range: RangeKey = (["day", "week", "month", "year"].includes(sp?.range || "")
    ? sp!.range
    : "month") as RangeKey;
  const R = RANGES[range];

  /* ═══════════ KPIs — الإيراد المحصّل بالفترة على أساس وقت التحصيل ═══════════ */
  const [counts] = await query<any>(
    `SELECT
       COALESCE((SELECT sum(total) FROM bookings WHERE payment_status='paid'),0)                                   AS collected_all,
       COALESCE((SELECT sum(total) FROM bookings WHERE status<>'cancelled'),0)                                      AS expected_all,
       COALESCE((SELECT sum(b.total) FROM bookings b
                 WHERE b.payment_status='paid'
                   AND ${collectedAt("b")} >= ${R.spanStart}),0)                                                    AS rev_cur,
       COALESCE((SELECT sum(b.total) FROM bookings b
                 WHERE b.payment_status='paid'
                   AND ${collectedAt("b")} >= ${R.prevStart}
                   AND ${collectedAt("b")} <  ${R.prevEnd}),0)                                                      AS rev_prev,
       (SELECT count(*) FROM bookings WHERE created_at >= ${R.spanStart})                                           AS cnt_cur,
       (SELECT count(*) FROM bookings WHERE created_at >= ${R.prevStart} AND created_at < ${R.prevEnd})             AS cnt_prev,
       (SELECT count(*) FROM bookings WHERE status='upcoming')                                                      AS upcoming,
       (SELECT count(*) FROM bookings WHERE status='active')                                                        AS active,
       (SELECT count(*) FROM bookings WHERE status='completed')                                                     AS completed,
       (SELECT count(*) FROM bookings WHERE status='cancelled')                                                     AS cancelled,
       (SELECT count(*) FROM bookings WHERE payment_status='paid')                                                  AS paid_count,
       (SELECT count(*) FROM bookings WHERE payment_status<>'paid' AND status<>'cancelled')                         AS unpaid_count,
       (SELECT count(*) FROM users WHERE role='member')                                                             AS members,
       (SELECT count(*) FROM users WHERE role='member' AND member_since >= ${R.spanStart})                          AS new_members`
  );

  /* ═══════════ سلسلة التحصيل الزمنية (مبلغ مُحصَّل + عدد عمليات التحصيل) ═══════════ */
  const series = await query<any>(
    `WITH buckets AS (
        SELECT generate_series(${R.spanStart}, now(), interval '${R.step}') AS bk
     ),
     collected AS (
        SELECT date_trunc('${R.grain}', ${collectedAt("b")}) AS bk, b.total AS amount
        FROM bookings b
        WHERE b.payment_status = 'paid'
          AND ${collectedAt("b")} >= ${R.spanStart}
     )
     SELECT to_char(buckets.bk, 'YYYY-MM-DD"T"HH24:MI:SS') AS bucket,
            COALESCE(sum(c.amount), 0) AS value,
            count(c.amount)            AS cnt
     FROM buckets
     LEFT JOIN collected c ON c.bk = buckets.bk
     GROUP BY buckets.bk
     ORDER BY buckets.bk`
  );

  /* ═══════════ أكثر الخدمات طلبًا (ضمن الفترة) ═══════════ */
  const topServices = await query<any>(
    `SELECT bi.service_slug AS slug, bi.name_snapshot AS name,
            count(*)::int AS cnt, COALESCE(sum(bi.line_total),0) AS revenue
     FROM booking_items bi
     JOIN bookings b ON b.id = bi.booking_id AND b.status<>'cancelled'
       AND b.created_at >= ${R.spanStart}
     GROUP BY bi.service_slug, bi.name_snapshot
     ORDER BY cnt DESC, revenue DESC
     LIMIT 6`
  );

  /* ═══════════ طرق الدفع (ضمن الفترة) ═══════════ */
  const byPayment = await query<any>(
    `SELECT b.payment_method_code AS code, COALESCE(pm.name, '{}'::jsonb) AS name,
            count(*)::int AS cnt, COALESCE(sum(b.total),0) AS revenue
     FROM bookings b
     LEFT JOIN payment_methods pm ON pm.code = b.payment_method_code
     WHERE b.status<>'cancelled' AND b.created_at >= ${R.spanStart} AND b.payment_method_code IS NOT NULL
     GROUP BY b.payment_method_code, pm.name
     ORDER BY cnt DESC`
  );

  /* ═══════════ أقرب الحجوزات ═══════════ */
  const recent = await query<any>(
    `SELECT b.reference, b.vehicle_label, b.status, b.total, b.payment_status,
            b.scheduled_date, b.scheduled_time, b.plate, b.branch_code,
            COALESCE(u.name, b.customer_name, '—') AS customer
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.status IN ('upcoming','active')
     ORDER BY b.scheduled_date NULLS LAST, b.created_at DESC
     LIMIT 6`
  );

  const branches = await query<any>(`SELECT code, name FROM branches`);
  const branchName: Record<string, string> = {};
  for (const br of branches) branchName[br.code] = pick(br.name, locale);

  const trend = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

  return (
    <OverviewClient
      locale={locale}
      range={range}
      counts={{
        collected: Number(counts?.collected_all) || 0,
        expected: Number(counts?.expected_all) || 0,
        upcoming: Number(counts?.upcoming) || 0,
        active: Number(counts?.active) || 0,
        completed: Number(counts?.completed) || 0,
        cancelled: Number(counts?.cancelled) || 0,
        periodCount: Number(counts?.cnt_cur) || 0,
        paidCount: Number(counts?.paid_count) || 0,
        unpaidCount: Number(counts?.unpaid_count) || 0,
        members: Number(counts?.members) || 0,
        newMembers: Number(counts?.new_members) || 0,
        revTrend: trend(Number(counts?.rev_cur) || 0, Number(counts?.rev_prev) || 0),
        countTrend: trend(Number(counts?.cnt_cur) || 0, Number(counts?.cnt_prev) || 0),
        periodRevenue: Number(counts?.rev_cur) || 0,
      }}
      series={series.map((r) => ({
        bucket: r.bucket,
        value: Number(r.value) || 0,
        cnt: Number(r.cnt) || 0,
      }))}
      topServices={topServices.map((s) => ({
        name: pick(s.name, locale) || s.slug,
        cnt: s.cnt,
        revenue: Number(s.revenue) || 0,
      }))}
      byPayment={byPayment.map((p) => ({
        name: pick(p.name, locale) || p.code || "—",
        code: p.code,
        cnt: p.cnt,
        revenue: Number(p.revenue) || 0,
      }))}
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