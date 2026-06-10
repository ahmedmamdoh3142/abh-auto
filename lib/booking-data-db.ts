import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";
import type { CategoryId, Category, VehicleSize, Brand } from "@/lib/booking-data";
import type { DbServiceMeta } from "@/lib/booking-pricing";

// إعادة تصدير للتوافق مع الاستيرادات القديمة
export type { DbServiceMeta } from "@/lib/booking-pricing";
export { dbPriceFor, dbOldPriceFor, dbDiscountPct } from "@/lib/booking-pricing";

const CAT_ICON: Record<string, Category["icon"]> = {
  coatings: "shield",
  protection: "lock",
  security: "star",
  detailing: "sparkles",
  bundles: "layers",
};

function pick(json: any, locale: Locale): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  return json[locale] ?? json.ar ?? json.en ?? "";
}

export async function getBookingData(locale: Locale): Promise<{
  categories: Category[];
  services: DbServiceMeta[];
  brands: Brand[];
  modelSizes: Record<string, VehicleSize>;
}> {
  // ── التصنيفات ──
  const catRows = await query<any>(
    `SELECT slug, name AS name_raw FROM service_categories
     WHERE surface='catalog' AND is_active=true
     ORDER BY sort`
  );
  const categories: Category[] = catRows.map((c) => ({
    id: c.slug as CategoryId,
    label: pick(c.name_raw, locale),
    icon: CAT_ICON[c.slug] ?? "star",
  }));

  // ── الماركات + الموديلات + حجم كل موديل (من القاعدة، مش static) ──
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

  const brands: Brand[] = [];
  const modelSizes: Record<string, VehicleSize> = {};
  for (const r of brandRows) {
    const ms: { name: string; size: string }[] = r.models ?? [];
    brands.push({ id: r.id, name: r.name, models: ms.map((x) => x.name) });
    for (const x of ms) {
      const size = (x.size === "small" || x.size === "medium" || x.size === "large")
        ? (x.size as VehicleSize) : "large";
      modelSizes[`${r.id}::${x.name}`] = size;
    }
  }

  // ── الخدمات + الأسعار لكل حجم ──
  const rows = await query<any>(
    `SELECT s.id, s.slug, c.slug AS category, s.image,
            s.name AS name_raw, s.description AS desc_raw,
            s.is_on_request, s.is_featured,
            s.duration AS duration_raw,
            s.warranty_duration AS warranty_raw,
            COALESCE((SELECT jsonb_object_agg(sp.size_code,
                        jsonb_build_object('price', sp.price, 'old', sp.old_price))
                      FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices_raw,
            COALESCE((SELECT json_agg(si.label ORDER BY si.sort)
                      FROM service_includes si WHERE si.service_id = s.id), '[]') AS includes_raw
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.surface='catalog' AND s.is_active=true
     ORDER BY c.sort, s.sort`
  );

  const services: DbServiceMeta[] = rows.map((r) => {
    const p = r.prices_raw ?? {};
    const prices: Record<VehicleSize, number> = {
      small: Number(p.small?.price) || 0,
      medium: Number(p.medium?.price) || 0,
      large: Number(p.large?.price) || 0,
    };
    const oldPrices: Record<VehicleSize, number | null> = {
      small: p.small?.old != null ? Number(p.small.old) : null,
      medium: p.medium?.old != null ? Number(p.medium.old) : null,
      large: p.large?.old != null ? Number(p.large.old) : null,
    };
    const includes: string[] = (r.includes_raw ?? []).map((x: any) => pick(x, locale));
    return {
      slug: r.slug,
      name: pick(r.name_raw, locale),
      desc: pick(r.desc_raw, locale),
      cat: r.category as CategoryId,
      base: prices.large,
      img: r.image ?? "",
      warranty: pick(r.warranty_raw, locale),
      dur: pick(r.duration_raw, locale),
      incl: includes,
      featured: !!r.is_featured,
      onRequest: !!r.is_on_request,
      prices,
      oldPrices,
      discountPercent: 0,
    };
  });

  return { categories, services, brands, modelSizes };
}