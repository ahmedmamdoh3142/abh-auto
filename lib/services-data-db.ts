import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";

// تحويل أكواد الأحجام: القاعدة small/medium/large → الواجهة s/m/l
const SIZE_MAP: Record<string, "s" | "m" | "l"> = { small: "s", medium: "m", large: "l" };
const DB_SIZES = ["small", "medium", "large"] as const;

/**
 * getServicesData — الآن يقبل userId (اختياري).
 * لو شركة: تُستبدل الأسعار بأسعاره، وتُلغى الأسعار القديمة (لا خصومات إعلانية).
 *
 * صورة الكرت: من العمود الموحّد services.card_image (نفس مصدر كروت الهوم).
 * لو card_image فارغ → image = "" (الواجهة تعرض placeholder، لا ترجع لـ image).
 */
export async function getServicesData(_locale?: Locale, userId?: string | null) {
  const partner = await getPartnerForUser(userId);
  const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

  // التصنيفات الخمسة (catalog فقط)
  const categories = await query(
    `SELECT slug, numeral,
            name AS short_raw,
            tagline AS tagline_raw
     FROM service_categories
     WHERE surface='catalog' AND is_active=true
     ORDER BY sort`
  );

  // الخدمات بأسعارها — نجلب s.id كمان للدمج مع أسعار الشريك، و card_image لصورة الكرت
  const rows = await query(
    `SELECT s.id,
            s.slug,
            c.slug AS category,
            s.name AS name_raw,
            s.tagline AS tagline_raw,
            s.description AS description_raw,
            s.card_image,
            s.badge,
            s.duration AS duration_raw,
            s.warranty_duration AS warranty_raw,
            COALESCE((SELECT jsonb_object_agg(sp.size_code, sp.price)
                      FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices_raw,
            COALESCE((SELECT jsonb_object_agg(sp.size_code, sp.old_price)
                      FROM service_prices sp
                      WHERE sp.service_id = s.id AND sp.old_price IS NOT NULL), '{}'::jsonb) AS old_prices_raw,
            COALESCE((SELECT json_agg(si.label ORDER BY si.sort)
                      FROM service_includes si WHERE si.service_id = s.id), '[]') AS includes_raw
     FROM services s
     JOIN service_categories c ON c.id = s.category_id
     WHERE s.surface='catalog' AND s.is_active=true
     ORDER BY c.sort, s.sort`
  );

  const services = (rows as any[]).map((r) => {
    const pricesDb = r.prices_raw ?? {};
    const oldDb = r.old_prices_raw ?? {};

    const prices: Record<string, number> = { s: 0, m: 0, l: 0 };
    const oldPrices: Record<string, number> = {};

    for (const dbSize of DB_SIZES) {
      const uiKey = SIZE_MAP[dbSize];
      const baseP = Number(pricesDb[dbSize]) || 0;
      const baseO = oldDb[dbSize] != null ? Number(oldDb[dbSize]) : undefined;

      if (partnerMap) {
        // شريك: سعره الخاص إن وُجد، بدون سعر قديم.
        const pp = partnerMap.get(priceKey(r.id, dbSize));
        prices[uiKey] = pp ? pp.price : baseP;
        // لا نضيف أي old للشريك
      } else {
        prices[uiKey] = baseP;
        if (baseO != null) oldPrices[uiKey] = baseO;
      }
    }

    return {
      slug: r.slug,
      category: r.category,
      name: r.name_raw,
      tagline: r.tagline_raw ?? { en: "", ar: "" },
      description: r.description_raw ?? { en: "", ar: "" },
      image: r.card_image ?? "",   // ← صورة الكرت الموحّدة (فارغ = placeholder)
      badge: r.badge ?? undefined,
      duration: r.duration_raw ?? { en: "", ar: "" },
      prices,
      oldPrices: Object.keys(oldPrices).length ? oldPrices : undefined,
      includes: r.includes_raw ?? [],
      warranty: {
        duration: r.warranty_raw ?? { en: "", ar: "" },
        notes: [],
      },
    };
  });

  const cats = (categories as any[]).map((c) => ({
    slug: c.slug,
    numeral: c.numeral ?? "",
    short: c.short_raw,
    tagline: c.tagline_raw ?? { en: "", ar: "" },
  }));

  return { categories: cats, services, isPartner: !!partner };
}