import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";
import type { CategoryId, Category, VehicleSize, Brand } from "@/lib/booking-data";
import type { DbServiceMeta } from "@/lib/booking-pricing";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";

// إعادة تصدير للتوافق مع الاستيرادات القديمة
export type { DbServiceMeta } from "@/lib/booking-pricing";
export { dbPriceFor, dbOldPriceFor, dbDiscountPct } from "@/lib/booking-pricing";

/** لون قادم من جدول colors في القاعدة، بعد ترجمة الاسم حسب اللغة. */
export interface DbColor {
  key: string;
  hex: string;
  light: boolean;
  name: string;
}

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

/** الألوان فقط. */
export async function getColors(locale: Locale): Promise<DbColor[]> {
  return getCachedColors(locale);
}

// (جديد) الكتالوج العام — تصنيفات/ماركات/ألوان/خدمات بأسعارها الأساسية —
// لا يعتمد على المستخدم أبدًا، فيصلح للكاش بأمان. مدة 60 ثانية كافية لتحديث
// أي تعديل من لوحة التحكم بسرعة معقولة، وتلغي 3 queries ثقيلة على كل فتح صفحة.
type BaseCatalog = {
  categories: Category[];
  brands: Brand[];
  modelSizes: Record<string, VehicleSize>;
  baseServices: (Omit<DbServiceMeta, "prices" | "oldPrices"> & {
    prices: Record<VehicleSize, number>;
    oldPrices: Record<VehicleSize, number | null>;
  })[];
};

const getCachedColors = unstable_cache(
  async (locale: Locale): Promise<DbColor[]> => {
    const rows = await query<any>(
      `SELECT code, name, hex, is_light
       FROM colors
       WHERE is_active = true
       ORDER BY sort, code`
    );
    return rows.map((c) => ({
      key: c.code,
      hex: c.hex,
      light: !!c.is_light,
      name: pick(c.name, locale),
    }));
  },
  ["booking-colors"],
  { revalidate: 60, tags: ["booking-catalog"] }
);

const getCachedBaseCatalog = unstable_cache(
  async (locale: Locale): Promise<BaseCatalog> => {
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

    // ── الخدمات + الأسعار الأساسية (بدون أي overlay خاص بالشريك) ──
    const rows = await query<any>(
      `SELECT s.id, s.slug, c.slug AS category, s.image,
              s.name AS name_raw, s.description AS desc_raw,
              s.is_on_request, s.is_featured, s.tier_code,
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

    const SIZES: VehicleSize[] = ["small", "medium", "large"];

    const baseServices = rows.map((r) => {
      const p = r.prices_raw ?? {};
      const prices: Record<VehicleSize, number> = { small: 0, medium: 0, large: 0 };
      const oldPrices: Record<VehicleSize, number | null> = { small: null, medium: null, large: null };
      for (const size of SIZES) {
        prices[size] = Number(p[size]?.price) || 0;
        oldPrices[size] = p[size]?.old != null ? Number(p[size].old) : null;
      }
      const includes: string[] = (r.includes_raw ?? []).map((x: any) => pick(x, locale));
      return {
        id: Number(r.id),
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
        tier: (r.tier_code === "essential" ? "essential" : "signature") as import("@/lib/shared/tier").TierCode,
        prices,
        oldPrices,
        discountPercent: 0,
      };
    });

    return { categories, brands, modelSizes, baseServices };
  },
  ["booking-base-catalog"],
  { revalidate: 60, tags: ["booking-catalog"] }
);

/**
 * getBookingData — الآن يقبل userId (اختياري).
 * لو المستخدم شركة (partner) نشطة: تُستبدل أسعار الخدمات بأسعاره الخاصة،
 * ولا يظهر أي خصم إعلاني (old = null).
 */
export async function getBookingData(
  locale: Locale,
  userId?: string | null
): Promise<{
  categories: Category[];
  services: DbServiceMeta[];
  brands: Brand[];
  modelSizes: Record<string, VehicleSize>;
  colors: DbColor[];
  isPartner: boolean;
}> {
  // (جديد) الكتالوج العام مكاش لمدة 60 ثانية + طلب الشريك بالتوازي — بدل تسلسل
  // 3 queries ثقيلة + query الشريك واحدة ورا التانية، بقوا كلهم يجروا سوا.
  const [base, colors, partner] = await Promise.all([
    getCachedBaseCatalog(locale),
    getCachedColors(locale),
    getPartnerForUser(userId),
  ]);
  const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

  // ── overlay أسعار الشريك فوق الكتالوج المكاش — في الميموري، بدون أي query إضافي ──
  const services: DbServiceMeta[] = base.baseServices.map((s) => {
    if (!partnerMap) return s as DbServiceMeta;
    const prices: Record<VehicleSize, number> = { small: 0, medium: 0, large: 0 };
    const oldPrices: Record<VehicleSize, number | null> = { small: null, medium: null, large: null };
    (['small', 'medium', 'large'] as VehicleSize[]).forEach((size) => {
      const pp = partnerMap.get(priceKey(s.id, size));
      prices[size] = pp ? pp.price : s.prices[size];
      oldPrices[size] = null; // الشريك ما يشوفش خصومات إعلانية
    });
    return { ...s, prices, oldPrices, base: prices.large } as DbServiceMeta;
  });

  return {
    categories: base.categories,
    services,
    brands: base.brands,
    modelSizes: base.modelSizes,
    colors,
    isPartner: !!partner,
  };
}