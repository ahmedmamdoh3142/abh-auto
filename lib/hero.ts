import { query } from "@/lib/db";

/* ══════════════════════════════════════════════════════════════
 *  lib/hero.ts — ABH Auto
 *  أضف هذا الجزء إلى الملف الحالي (فوق أو تحت getHeroData).
 *  getHeroData تبقى كما هي — لم يتغير فيها شيء.
 * ══════════════════════════════════════════════════════════════ */

export interface HeroSlide {
  id: number;
  /** landscape — يُستخدم على ≥768px */
  imageDesktop: string;
  /** portrait — يُستخدم على <768px (يقع على الديسكتوب لو فاضي) */
  imageMobile: string;
  alt: { ar: string; en: string };
  /** لينك اختياري عند الضغط على السلايد */
  href: string | null;
}

const cleanStr = (s: unknown): string | null => {
  const str = typeof s === "string" ? s.trim() : "";
  return str.length ? str : null;
};

/**
 * يقرأ سلايدات الهيرو مرتبة. السلايد رقم 0 (أول واحدة) هي
 * عنصر الـ LCP — تُرندَر بـ priority في الكومبوننت.
 *
 * آمن ضد غياب الجدول (قبل تشغيل الميجريشن) → يرجع [] فيشتغل
 * الهيرو كصورة واحدة زي ما هو دلوقتي.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const rows = await query<{
      id: number;
      image_desktop: string;
      image_mobile: string | null;
      alt: { ar?: string; en?: string } | null;
      href: string | null;
    }>(
      `SELECT id, image_desktop, image_mobile, alt, href
         FROM hero_slides
        WHERE is_active = true
        ORDER BY sort ASC, id ASC
        LIMIT 12`
    );

    return rows.map((r) => ({
      id: r.id,
      imageDesktop: r.image_desktop,
      imageMobile: cleanStr(r.image_mobile) ?? r.image_desktop,
      alt: { ar: r.alt?.ar ?? "", en: r.alt?.en ?? "" },
      href: cleanStr(r.href),
    }));
  } catch (err) {
    console.error("getHeroSlides failed:", err);
    return [];
  }
}