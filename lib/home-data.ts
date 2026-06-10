import { query } from "@/lib/db";
import type { Locale } from "@/lib/locales";

async function block(key: string, locale: Locale) {
  const rows = await query(`SELECT value->$2 AS content FROM content_blocks WHERE key=$1`, [key, locale]);
  return (rows[0]?.content as Record<string, any>) ?? {};
}

export async function getHomeData(locale: Locale) {
  const [
    stats, discountedRaw, projects, testimonials, marquee, imagesRow,
    bannerCopy, bannerMetaRow, offersText, servicesText, services, whyText, projectsText, testimonialsText,
  ] = await Promise.all([
    query(`SELECT code, value, suffix, label->>$1 AS label FROM stats ORDER BY sort`, [locale]),

    // العروض = الخدمات اللي عليها خصم فعلي (نهائي < قديم). النسبة تُحسب لكل خدمة (أعلى خصم بين الأحجام).
    query(
      `SELECT s.slug,
              s.name->>$1   AS title,
              s.tagline->>$1 AS copy,
              s.image,
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
    query(`SELECT value->>'ends_at' AS ends_at, value->>'badge_value' AS badge_value
           FROM content_blocks WHERE key='banner'`),
    block("offers", locale),
    block("services", locale),
    query(
      `SELECT s.slug,
              s.name->>$1 AS title,
              s.tagline->>$1 AS blurb,
              s.description->>$1 AS long,
              s.image,
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

  // حوّل الخدمات المخفّضة لصيغة كروت العروض (نفس شكل OfferRow)
  const discounted = (discountedRaw as any[])
    .filter((r) => r.pct != null && Number(r.pct) > 0)
    .map((r) => ({
      slug: r.slug,
      tag: null,
      title: r.title ?? "",
      copy: r.copy ?? "",
      discount_label: `${Number(r.pct)}%`,   // الكرت بيقرأ الرقم منها تلقائيًا
      image: r.image ?? "",
    }));

  const banner = {
    ...bannerCopy,
    endsAt: (bannerMetaRow[0] as any)?.ends_at ?? null,
    badgeValue: (bannerMetaRow[0] as any)?.badge_value ?? null,
  };

  return {
    stats,
    offers: discounted.slice(0, 3),   // أول 3 في الشبكة
    offersAll: discounted,            // الكل في المودال
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
  };
}