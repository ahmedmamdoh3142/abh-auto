import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";
import { getHeroData, getHeroSlides } from "@/lib/hero-data";
import { getPartnerForUser, getPartnerPriceMap, priceKey } from "@/lib/partner-pricing";

async function block(key: string, locale: Locale) {
  const rows = await query(`SELECT value->$2 AS content FROM content_blocks WHERE key=$1`, [key, locale]);
  return (rows[0]?.content as Record<string, any>) ?? {};
}

/**
 * getHomeData — الآن يقبل userId (اختياري).
 * لو المستخدم شركة (partner):
 *   • offers / offersAll = فاضية (الشركة لا ترى العروض الإعلانية).
 *   • banner = null (لا بانر ترويجي).
 *   • قسم الخدمات: تُستبدل الأسعار بأسعار الشركة.
 *   • isPartner = true (تستعمله الصفحة لإخفاء أقسام كاملة).
 *
 * صور الكروت (سكشن الخدمات + العروض): من العمود الموحّد services.card_image.
 * لو card_image فارغ → نمرّر "" (الواجهة تعرض placeholder، ولا ترجع لـ image).
 *
 * heroSlides: سلايدات الهيرو من جدول hero_slides. لو الجدول غير موجود
 * (قبل الميجريشن) ترجع [] والهيرو يشتغل كصورة واحدة زي الأول.
 */
export async function getHomeData(locale: Locale, userId?: string | null) {
  const partner = await getPartnerForUser(userId);
  const partnerMap = partner ? await getPartnerPriceMap(partner.id) : null;

  const [
    hero,
    heroSlides,
    stats, discountedRaw, projects, testimonials, marquee, imagesRow,
    bannerCopy, bannerMetaRow, offersText, servicesText, servicesRaw, whyText, projectsText, testimonialsText,
  ] = await Promise.all([
    getHeroData(),
    getHeroSlides(),

    query(`SELECT code, value, suffix, label->>$1 AS label FROM stats ORDER BY sort`, [locale]),

    query(
      `SELECT s.slug,
              s.name->>$1   AS title,
              s.tagline->>$1 AS copy,
              s.card_image,
              (SELECT max(round(((1 - sp.price / NULLIF(sp.old_price, 0)) * 100))::int)
               FROM service_prices sp
               WHERE sp.service_id = s.id
                 AND sp.old_price IS NOT NULL
                 AND sp.old_price > sp.price) AS pct
       FROM services s
       WHERE s.surface = 'catalog' AND s.is_active = true
       ORDER BY pct DESC NULLS LAST, s.sort`,
      [locale]
    ),

    query(`SELECT slug, title, category_label->>$1 AS category, craft, year, image_after, image_before
           FROM projects WHERE is_active=true ORDER BY sort`, [locale]),
    query(`SELECT name, role->>$1 AS role, quote->>$1 AS quote, rating, avatar_url
           FROM testimonials WHERE is_active=true ORDER BY sort`, [locale]),
    query(`SELECT label->>$1 AS label FROM marquee_items ORDER BY sort`, [locale]),
    query(`SELECT value FROM settings WHERE key='images'`),
    block("banner", locale),
    query(`SELECT value->>'ends_at' AS ends_at, value->>'badge_value' AS badge_value, is_visible
           FROM content_blocks WHERE key='banner'`),
    block("offers", locale),
    block("services", locale),
    // نجلب s.id كمان عشان دمج أسعار الشريك، و card_image لصورة الكرت الموحّدة
    query(
      `SELECT s.id,
              s.slug,
              s.name->>$1 AS title,
              s.tagline->>$1 AS blurb,
              s.description->>$1 AS long,
              s.card_image,
              s.warranty_duration->>$1 AS warranty,
              s.is_on_request,
              COALESCE((SELECT json_agg(COALESCE(si.label->>$1, si.label->>'en') ORDER BY si.sort)
                        FROM service_includes si WHERE si.service_id = s.id), '[]') AS benefits,
              COALESCE((SELECT jsonb_object_agg(sp.size_code,
                          jsonb_build_object('price', sp.price, 'old', sp.old_price))
                        FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices
       FROM services s
       WHERE s.surface = 'catalog' AND s.is_active = true
       ORDER BY s.sort
       LIMIT 3`,
      [locale]
    ),
    block("why", locale),
    block("projects", locale),
    block("testimonials", locale),
  ]);

  // ── قسم الخدمات: لو شريك، لبّس أسعاره وألغِ القديم ──
  // نطبّع الصورة: card_image → image (المكوّن يقرأ item.image)، فارغ = "".
  const DB_SIZES = ["small", "medium", "large"] as const;
  const services = (servicesRaw as any[]).map((r) => {
    const image = r.card_image ?? "";
    const pricesRaw = r.prices ?? {};
    if (!partnerMap) return { ...r, image, prices: pricesRaw };

    const merged: Record<string, any> = {};
    for (const size of DB_SIZES) {
      const baseP = Number(pricesRaw[size]?.price) || 0;
      const pp = partnerMap.get(priceKey(r.id, size));
      merged[size] = { price: pp ? pp.price : baseP, old: null };
    }
    return { ...r, image, prices: merged };
  });

  // ── العروض المخفّضة (للعملاء العاديين فقط) — الصورة من services.card_image ──
  const discounted = partner
    ? []
    : (discountedRaw as any[])
        .filter((r) => r.pct != null && Number(r.pct) > 0)
        .map((r) => ({
          slug: r.slug,
          tag: null,
          title: r.title ?? "",
          copy: r.copy ?? "",
          discount_label: `${Number(r.pct)}%`,
          image: r.card_image ?? "",   // ← صورة الكرت الموحّدة (فارغ = placeholder)
        }));

  // ── البانر الترويجي: مخفي تمامًا عن الشركاء ──
  const bannerVisible = (bannerMetaRow[0] as any)?.is_visible !== false;
  const banner = (partner || !bannerVisible)
    ? null
    : {
        ...bannerCopy,
        endsAt: (bannerMetaRow[0] as any)?.ends_at ?? null,
        badgeValue: (bannerMetaRow[0] as any)?.badge_value ?? null,
      };

  return {
    hero,
    heroSlides,
    stats,
    offers: discounted.slice(0, 3),
    offersAll: discounted,
    projects,
    testimonials,
    marquee: (marquee as { label: string }[]).map((m) => m.label),
    images: (imagesRow[0]?.value as Record<string, any>) ?? {},
    banner,
    offersText,
    servicesText,
    services,
    whyText,
    projectsText,
    testimonialsText,
    isPartner: !!partner,
  };
}