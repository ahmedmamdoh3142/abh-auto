/**
 * app/admin/bookings/new/page.tsx — حجز سريع من الداشبورد (SERVER).
 * يجلب كل ما تحتاجه الصفحة المختصرة: الماركات+الموديلات+الأحجام، الخدمات بأسعار
 * كل حجم، الفروع، الألوان، طرق الدفع، المواعيد — ويمرّرها للكلاينت.
 *
 * مبدأ مهم (طلب 6): حجم السيارة (المشتق من الموديل) هو ما يحدّد سعر كل خدمة.
 *
 * (تعديل) الداشبورد الداخلي يعرض كل خدمات الكتالوج — حتى المعطّلة (المخفية من
 * الموقع is_active=false) — عشان الموظّف يقدر يحجزها للعميل الحاضر. الخدمة
 * المخفية بتتعلّم بشارة في الواجهة، وروت الإنشاء بيسعّرها ويحجزها عادي.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import NewBookingClient from "./new-booking-client";
import { requirePermission } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

type SizeCode = "small" | "medium" | "large";

export default async function AdminNewBookingPage() {
  await requirePermission("bookings_new");
  const locale = (await getLocale()) as Locale;

  // ── الماركات + الموديلات + حجم كل موديل ──
  const brandRows = await query<any>(
    `SELECT b.id, b.name,
            COALESCE(
              json_agg(json_build_object('name', m.name, 'size', m.size_code) ORDER BY m.sort)
              FILTER (WHERE m.id IS NOT NULL), '[]'
            ) AS models
     FROM brands b
     LEFT JOIN brand_models m ON m.brand_id = b.id AND m.is_active = true
     WHERE b.is_active = true
     GROUP BY b.id, b.name, b.sort
     ORDER BY b.sort, b.name`
  );
  const brands = brandRows.map((r) => ({
    id: r.id,
    name: r.name,
    models: (r.models ?? []).map((m: any) => ({
      name: m.name,
      size: (["small", "medium", "large"].includes(m.size) ? m.size : "large") as SizeCode,
    })),
  }));

  // ── الخدمات + الأسعار لكل حجم + التصنيف ──
  // ملاحظة: الداشبورد الداخلي يعرض كل خدمات الكتالوج (بما فيها المعطّلة/المخفية من
  // الموقع). نرجّع is_active عشان الواجهة تعلّم المخفية بشارة. النشطة تظهر أولًا.
  const svcRows = await query<any>(
    `SELECT s.id, s.slug, c.slug AS category, c.name AS cat_name, s.name AS name_raw,
            s.is_on_request, s.is_active,
            COALESCE((SELECT jsonb_object_agg(sp.size_code,
                        jsonb_build_object('price', sp.price, 'old', sp.old_price))
                      FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices_raw
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.surface='catalog'
     ORDER BY c.sort, s.is_active DESC, s.sort`
  );

  const SIZES: SizeCode[] = ["small", "medium", "large"];
  const services = svcRows.map((r) => {
    const p = r.prices_raw ?? {};
    const prices: Record<SizeCode, number> = { small: 0, medium: 0, large: 0 };
    const oldPrices: Record<SizeCode, number> = { small: 0, medium: 0, large: 0 };
    for (const sz of SIZES) {
      prices[sz] = Number(p[sz]?.price) || 0;
      oldPrices[sz] = Number(p[sz]?.old) || 0; // السعر قبل الخصم (0 لو لا يوجد)
    }
    return {
      id: Number(r.id),
      slug: r.slug,
      name: pick(r.name_raw, locale),
      category: pick(r.cat_name, locale),
      categorySlug: r.category,
      onRequest: !!r.is_on_request,
      active: !!r.is_active, // false = مخفية من الموقع (تظهر بالداشبورد بشارة)
      prices,
      oldPrices,
    };
  });

  // ── الفروع / الألوان / طرق الدفع / المواعيد ──
  const branchRows = await query<any>(`SELECT code, name FROM branches WHERE is_active = true ORDER BY sort`).catch(() => []);
  const branches = branchRows.map((b) => ({ code: b.code, label: pick(b.name, locale) }));

  const colorRows = await query<any>(`SELECT code, name, hex, is_light FROM colors WHERE is_active = true ORDER BY sort, code`).catch(() => []);
  const colors = colorRows.map((c) => ({ key: c.code, hex: c.hex, light: !!c.is_light, name: pick(c.name, locale) }));

  const cityRows = await query<any>(`SELECT code, name FROM cities WHERE is_active = true ORDER BY sort`).catch(() => []);
  const cities = cityRows.map((c) => ({ code: c.code, label: pick(c.name, locale) }));

  const payRows = await query<any>(`SELECT code, name FROM payment_methods WHERE is_active = true ORDER BY sort`).catch(() => []);
  const payments = payRows.map((p) => ({ code: p.code, label: pick(p.name, locale) }));

  const towRows = await query<any>(`SELECT code, name, cost FROM towing_options ORDER BY sort`).catch(() => []);
  const towing = towRows.map((tw) => ({ code: tw.code, label: pick(tw.name, locale), cost: Number(tw.cost) || 0 }));

  const slotRows = await query<any>(`SELECT slot_time FROM time_slots WHERE is_active = true ORDER BY sort, slot_time`).catch(() => []);
  const slots = slotRows.map((s) => s.slot_time);

  return (
    <NewBookingClient
      locale={locale}
      brands={brands}
      services={services}
      branches={branches}
      colors={colors}
      cities={cities}
      payments={payments}
      towing={towing}
      slots={slots}
    />
  );
}