import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";

// تحويل أكواد الأحجام: القاعدة small/medium/large → الواجهة s/m/l
const SIZE_MAP: Record<string, "s" | "m" | "l"> = { small: "s", medium: "m", large: "l" };

export async function getServicesData(_locale?: Locale) {
  // التصنيفات الخمسة (catalog فقط — لتفادي تكرار الـslug)
  const categories = await query(
    `SELECT slug, numeral,
            name AS short_raw,
            tagline AS tagline_raw
     FROM service_categories
     WHERE surface='catalog' AND is_active=true
     ORDER BY sort`
  );

  // الخدمات بأسعارها (الجديدة والقديمة) وincludes وضمانها وتصنيفها
  const rows = await query(
    `SELECT s.slug,
            c.slug AS category,
            s.name AS name_raw,
            s.tagline AS tagline_raw,
            s.description AS description_raw,
            s.image,
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

  // تحويل الأسعار من {small,medium,large} إلى {s,m,l}
  const services = (rows as any[]).map((r) => {
    const pricesDb = r.prices_raw ?? {};
    const prices: Record<string, number> = { s: 0, m: 0, l: 0 };
    for (const [k, v] of Object.entries(pricesDb)) {
      const key = SIZE_MAP[k];
      if (key) prices[key] = Number(v);
    }

    // الأسعار القديمة (لو موجودة فقط) — نفس التحويل
    const oldDb = r.old_prices_raw ?? {};
    const oldPrices: Record<string, number> = {};
    for (const [k, v] of Object.entries(oldDb)) {
      const key = SIZE_MAP[k];
      if (key && v != null) oldPrices[key] = Number(v);
    }

    return {
      slug: r.slug,
      category: r.category,
      name: r.name_raw,
      tagline: r.tagline_raw ?? { en: "", ar: "" },
      description: r.description_raw ?? { en: "", ar: "" },
      image: r.image,
      badge: r.badge ?? undefined,
      duration: r.duration_raw ?? { en: "", ar: "" },
      prices,
      // نرجّعها فقط لو فيها قيمة — الواجهة تتعامل معها كاختيارية
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

  return { categories: cats, services };
}