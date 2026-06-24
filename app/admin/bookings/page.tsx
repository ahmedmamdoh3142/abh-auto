/**
 * app/admin/bookings/page.tsx — قائمة الحجوزات (SERVER).
 * تجلب الحجوزات + بيانات العميل (بيانات الحجز لها الأولوية، ثم المستخدم المسجّل)
 * + الدفع + الخدمات بالأسعار + علم «هدية» لكل عنصر + الفروع/الألوان، وتمرّرها لـ BookingsClient.
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
    `SELECT b.id, b.reference, b.status, b.stage,
            b.vehicle_label, b.plate, b.size_code, b.color_code, b.branch_code,
            b.scheduled_date, b.scheduled_time,
            b.subtotal, b.towing_code, b.towing_cost, b.towing_address, b.total,
            b.payment_method_code, b.payment_status, b.cancel_reason, b.notes,
            b.created_at,
            -- بيانات العميل المُدخَلة في الحجز لها الأولوية (تدعم «احجز لصاحبك»)،
            -- ونرجع لبيانات المستخدم المسجّل فقط لو الحجز ما فيهوش بيانات عميل.
            COALESCE(b.customer_name,  u.name)        AS customer_name,
            COALESCE(b.customer_phone, u.phone)       AS customer_phone,
            COALESCE(b.customer_email, u.email::text) AS customer_email,
            COALESCE(b.customer_city,  u.city_code)   AS customer_city,
            (b.user_id IS NULL) AS is_guest,
            -- العناصر + علم «هدية» (لو الخدمة موجودة في booking_bundle_gifts لنفس الحجز)
            COALESCE((
              SELECT json_agg(json_build_object(
                       'name', bi.name_snapshot,
                       'slug', bi.service_slug,
                       'price', bi.line_total,
                       'isGift', EXISTS (
                         SELECT 1 FROM booking_bundle_gifts g
                         WHERE g.booking_id = bi.booking_id
                           AND g.gift_service_id = bi.service_id
                       )
                     ) ORDER BY bi.id)
              FROM booking_items bi WHERE bi.booking_id = b.id
            ), '[]') AS items
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     ORDER BY b.created_at DESC
     LIMIT 300`
  );

  // الفروع
  const branches = await query<any>(`SELECT code, name FROM branches`).catch(() => []);
  const branchName: Record<string, string> = {};
  for (const br of branches) branchName[br.code] = pick(br.name, locale);

  // المدن (للعرض في تفاصيل العميل)
  const cities = await query<any>(`SELECT code, name FROM cities`).catch(() => []);
  const cityName: Record<string, string> = {};
  for (const c of cities) cityName[c.code] = pick(c.name, locale);

  const bookings = rows.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    stage: b.stage ?? 0,
    vehicle: b.vehicle_label || "—",
    plate: b.plate || "",
    size: b.size_code || "",
    color: b.color_code || "",
    branch: branchName[b.branch_code] || b.branch_code || "—",
    branchCode: b.branch_code || "",
    customer: b.customer_name || "—",
    phone: b.customer_phone || "",
    email: b.customer_email || "",
    city: cityName[b.customer_city] || b.customer_city || "",
    isGuest: !!b.is_guest,
    date: b.scheduled_date ? new Date(b.scheduled_date).toISOString().slice(0, 10) : "",
    time: b.scheduled_time || "",
    subtotal: Number(b.subtotal) || 0,
    towing: Number(b.towing_cost) || 0,
    towingAddress: b.towing_address || "",
    total: Number(b.total) || 0,
    paymentMethod: b.payment_method_code || "",
    payment: b.payment_status,
    cancelReason: b.cancel_reason || "",
    notes: b.notes || "",
    services: (Array.isArray(b.items) ? b.items : []).map((it: any) => ({
      name: pick(it.name, locale) || it.slug || "",
      price: Number(it.price) || 0,
      isGift: !!it.isGift,
    })).filter((s: any) => s.name),
  }));

  return <BookingsClient initial={bookings} locale={locale} />;
}