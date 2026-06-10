/**
 * app/admin/bookings/page.tsx — قائمة الحجوزات (SERVER).
 * تجلب الحجوزات + سلاگ الخدمات لكل حجز، وأسماء الخدمات/الفروع للعرض.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import BookingsClient from "./bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  const rows = await query<any>(
    `SELECT b.id, b.reference, b.status, b.stage, b.vehicle_label, b.plate,
            b.size_code, b.color_code, b.branch_code, b.scheduled_date, b.scheduled_time,
            b.total, b.payment_status,
            (SELECT name FROM users u WHERE u.id = b.user_id) AS customer_name,
            COALESCE((SELECT json_agg(bi.name_snapshot ORDER BY bi.id)
                      FROM booking_items bi WHERE bi.booking_id = b.id), '[]') AS items
     FROM bookings b
     ORDER BY b.created_at DESC
     LIMIT 200`
  );

  const branches = await query<any>(`SELECT code, name FROM branches`);
  const branchName: Record<string, string> = {};
  for (const br of branches) branchName[br.code] = pick(br.name, locale);

  const bookings = rows.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    stage: b.stage ?? 0,
    vehicle: b.vehicle_label || "—",
    plate: b.plate || "",
    size: b.size_code || "",
    branch: branchName[b.branch_code] || b.branch_code || "—",
    customer: b.customer_name || "—",
    date: b.scheduled_date ? new Date(b.scheduled_date).toISOString().slice(0, 10) : "",
    time: b.scheduled_time || "",
    total: Number(b.total) || 0,
    payment: b.payment_status,
    services: (Array.isArray(b.items) ? b.items : []).map((it: any) => pick(it, locale)).filter(Boolean),
  }));

  return <BookingsClient initial={bookings} locale={locale} />;
}
