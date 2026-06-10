/**
 * app/admin/services/page.tsx — الخدمات والأسعار (SERVER).
 * يجلب خدمات الكتالوج + التصنيفات + معاملات الأحجام، ويمرّر الحقول الثنائية كـ {en,ar}.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { toLoc, pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import ServicesClient from "./services-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  const services = await query<any>(
    `SELECT id, category_id, surface, slug, name, tagline, duration, warranty_duration,
            image, badge, pricing_model, base_price, old_base_price, discount_percent,
            is_on_request, is_featured, is_active, sort
     FROM services
     WHERE surface = 'catalog'
     ORDER BY sort, id`
  );
  const cats = await query<any>(`SELECT id, name FROM service_categories WHERE surface='catalog' ORDER BY sort, id`);
  const sizes = await query<any>(`SELECT code, name, multiplier FROM vehicle_sizes WHERE is_active ORDER BY sort, code`);

  return (
    <ServicesClient
      locale={locale}
      categories={cats.map((c) => ({ id: c.id, label: pick(c.name, locale) }))}
      sizes={sizes.map((s) => ({ code: s.code, label: pick(s.name, locale), mult: Number(s.multiplier) || 1 }))}
      initial={services.map((s) => ({
        id: s.id,
        categoryId: s.category_id,
        slug: s.slug,
        name: toLoc(s.name),
        tagline: toLoc(s.tagline),
        duration: toLoc(s.duration),
        warranty: toLoc(s.warranty_duration),
        image: s.image || "",
        badge: s.badge || "",
        pricingModel: s.pricing_model,
        basePrice: Number(s.base_price) || 0,
        discount: Number(s.discount_percent) || 0,
        onRequest: s.is_on_request,
        featured: s.is_featured,
        active: s.is_active,
        sort: s.sort,
      }))}
    />
  );
}
