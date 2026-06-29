/**
 * app/admin/price-files/page.tsx — ملفات الأسعار (SERVER)
 * بيمرّر للـclient: قائمة الخدمات الكاملة (بأسعارها العامة كنقطة بداية)، الفئات،
 * الأحجام النشطة، وعدد الشركاء النشطين (لتأكيد الاعتماد «هيغيّر X شركة»).
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { toLoc, pick } from "@/lib/admin/i18n-json";
import type { Locale } from "@/lib/i18n";
import PriceFilesClient from "./price-files-client";

export const dynamic = "force-dynamic";

export default async function PriceFilesPage() {
  await requireAdmin();
  const locale = (await getLocale()) as Locale;

  // الخدمات + أسعارها العامة (نقطة البداية لأي ملف جديد)
  const services = await query<any>(
    `SELECT s.id, s.category_id, s.slug, s.name, s.image, s.card_image, s.is_on_request,
            COALESCE((SELECT jsonb_object_agg(sp.size_code, jsonb_build_object('price', sp.price, 'old', sp.old_price))
                      FROM service_prices sp WHERE sp.service_id = s.id), '{}'::jsonb) AS prices
       FROM services s
      WHERE s.surface = 'catalog' AND s.is_active = true
      ORDER BY s.sort, s.id`
  );
  const cats = await query<any>(`SELECT id, name FROM service_categories WHERE surface='catalog' ORDER BY sort, id`);
  const sizes = await query<any>(`SELECT code, name FROM vehicle_sizes WHERE is_active ORDER BY sort, code`);
  const partnerCountRows = await query<any>(`SELECT COUNT(*)::int AS n FROM partners WHERE is_active = true`);
  const partnerCount = Number(partnerCountRows[0]?.n) || 0;

  const sizeP = (prices: any, code: string) => ({
    price: Number(prices?.[code]?.price) || 0,
    old: prices?.[code]?.old != null ? Number(prices[code].old) : 0,
  });

  return (
    <PriceFilesClient
      locale={locale}
      partnerCount={partnerCount}
      categories={cats.map((c) => ({ id: c.id, label: pick(c.name, locale) }))}
      sizes={sizes.map((s) => ({ code: s.code, label: pick(s.name, locale) }))}
      services={services.map((s) => ({
        id: s.id,
        slug: s.slug,
        categoryId: s.category_id,
        name: toLoc(s.name),
        image: s.image || "",
        cardImage: s.card_image || "",
        onRequest: s.is_on_request,
        prices: {
          small: sizeP(s.prices, "small"),
          medium: sizeP(s.prices, "medium"),
          large: sizeP(s.prices, "large"),
        },
      }))}
    />
  );
}