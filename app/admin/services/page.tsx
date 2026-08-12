/**
 * app/admin/services/page.tsx — الخدمات والأسعار (SERVER) · v3
 * إضافة: تمرير قائمة الشركاء (partners) لتفعيل وضع "أسعار شركة" عبر كومبو بوكس.
 * إضافة: card_image (صورة الكرت الطولية) ضمن بيانات كل خدمة.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { toLoc, pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import ServicesClient from "./services-client";
import { requirePermission } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

const firstNum = (j: any): number => {
  if (!j) return 0;
  const s = typeof j === "string" ? j : (j.en || j.ar || "");
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export default async function ServicesPage() {
  await requirePermission("services");
  const locale = (await getLocale()) as Locale;

  const services = await query<any>(
    `SELECT s.id, s.category_id, s.slug, s.name, s.description, s.image, s.card_image, s.badge,
            s.is_on_request, s.is_featured, s.is_active, s.sort, s.tier_code,
            s.duration, s.warranty_duration, s.warranty_km_limit,
            COALESCE((SELECT jsonb_object_agg(sp.size_code, jsonb_build_object('price', sp.price, 'old', sp.old_price))
                      FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices,
            COALESCE((SELECT json_agg(si.label ORDER BY si.sort)
                      FROM service_includes si WHERE si.service_id = s.id), '[]') AS includes
     FROM services s
     WHERE s.surface = 'catalog'
     ORDER BY s.sort, s.id`
  );
  const cats = await query<any>(`SELECT id, name FROM service_categories WHERE surface='catalog' ORDER BY sort, id`);
  const sizes = await query<any>(`SELECT code, name FROM vehicle_sizes WHERE is_active ORDER BY sort, code`);

  // الشركاء (للكومبو بوكس)
  const partners = await query<any>(
    `SELECT p.id, p.company_name
       FROM partners p
      WHERE p.is_active = true
      ORDER BY p.company_name`
  );

  const sizeP = (prices: any, code: string) => ({
    price: Number(prices?.[code]?.price) || 0,
    old: prices?.[code]?.old != null ? Number(prices[code].old) : 0,
  });

  return (
    <ServicesClient
      locale={locale}
      categories={cats.map((c) => ({ id: c.id, label: pick(c.name, locale) }))}
      sizes={sizes.map((s) => ({ code: s.code, label: pick(s.name, locale) }))}
      partners={partners.map((p) => ({ id: p.id, name: p.company_name }))}
      initial={services.map((s) => ({
        id: s.id,
        slug: s.slug,
        categoryId: s.category_id,
        name: toLoc(s.name),
        description: toLoc(s.description),
        prices: { small: sizeP(s.prices, "small"), medium: sizeP(s.prices, "medium"), large: sizeP(s.prices, "large") },
        includes: (s.includes ?? []).map((x: any) => toLoc(x)),
        warrantyYears: firstNum(s.warranty_duration),
        warrantyKm: s.warranty_km_limit != null ? Number(s.warranty_km_limit) : 0,
        durationDays: firstNum(s.duration),
        image: s.image || "",
        cardImage: s.card_image || "",
        badge: s.badge || "",
        tier: s.tier_code === "essential" ? "essential" : "signature",
        onRequest: s.is_on_request,
        featured: s.is_featured,
        active: s.is_active,
        sort: s.sort,
      }))}
    />
  );
}