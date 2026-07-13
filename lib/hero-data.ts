import { query } from "@/lib/db";

/* ══════════════════════════════════════════════════════════════════════
 *  lib/hero-data.ts — ABH Auto
 *  استبدال كامل للملف.
 *  getHeroData بقيت زي ما هي بالظبط — الجديد هو getHeroSlides في الآخر.
 * ══════════════════════════════════════════════════════════════════════ */

/** مصدر فيديو واحد بصيغتين (WebM أخف، وMP4 توافق أوسع). */
export interface HeroVideoSources {
  /** WebM (VP9) — أخف 30-50%، يُفضّله المتصفح لو دعمه. */
  webm: string | null;
  /** MP4 (H.264) — توافق أوسع (Safari/iOS). */
  mp4: string | null;
}

/** بيانات فيديو الهيرو القادمة من settings(key='hero'). */
export interface HeroData {
  /** فيديو اللاب/الشاشات العريضة (landscape). */
  desktop: HeroVideoSources;
  /** فيديو الموبايل (portrait) — اختياري؛ لو فاضي يُستخدم اللاب. */
  mobile: HeroVideoSources;
  /** صورة الـ poster (للديسكتوب/الافتراضي) قبل تحميل الفيديو. */
  posterUrl: string | null;
  /** صورة الـ poster المخصّصة للموبايل — لو فاضية يُستخدم posterUrl. */
  posterUrlMobile: string | null;
}

const EMPTY: HeroVideoSources = { webm: null, mp4: null };

const FALLBACK: HeroData = {
  desktop: EMPTY,
  mobile: EMPTY,
  posterUrl: "/images/hero-bg.webp",
  posterUrlMobile: "/images/hero-bg.webp",
};

const clean = (s: unknown): string | null => {
  const str = typeof s === "string" ? s.trim() : "";
  return str.length ? str : null;
};

/**
 * يقرأ إعدادات الهيرو من القاعدة. متوافق مع شكلين:
 *
 *  (أ) الشكل البسيط (نسخة واحدة لكل جهاز):
 *      { video_url, video_url_mobile, poster_url, poster_url_mobile }
 *
 *  (ب) الشكل الكامل (WebM + MP4 لكل جهاز):
 *      {
 *        poster_url,
 *        poster_url_mobile,
 *        desktop: { webm, mp4 },
 *        mobile:  { webm, mp4 }
 *      }
 *
 * صورة الموبايل (poster_url_mobile) اختيارية: لو غير موجودة نرجع لصورة
 * الديسكتوب (poster_url) — فلا يتعطّل أي شيء على المواقع القديمة.
 *
 * آمن ضد غياب الصف أو الأعمدة: يرجّع poster فقط فيشتغل الهيرو كصورة ثابتة.
 */
export async function getHeroData(): Promise<HeroData> {
  try {
    const rows = await query<{ value: any }>(
      `SELECT value FROM settings WHERE key = 'hero' LIMIT 1`
    );
    const v = rows[0]?.value;
    if (!v || typeof v !== "object") return FALLBACK;

    const poster = clean(v.poster_url) ?? FALLBACK.posterUrl;
    // صورة الموبايل: من poster_url_mobile، وإلا نفس صورة الديسكتوب.
    const posterMobile = clean(v.poster_url_mobile) ?? poster;

    // الشكل الكامل له الأولوية لو موجود
    const dObj = v.desktop && typeof v.desktop === "object" ? v.desktop : null;
    const mObj = v.mobile && typeof v.mobile === "object" ? v.mobile : null;

    const desktop: HeroVideoSources = {
      webm: clean(dObj?.webm),
      // mp4 من الشكل الكامل، وإلا من الحقل البسيط video_url
      mp4: clean(dObj?.mp4) ?? clean(v.video_url),
    };

    const mobile: HeroVideoSources = {
      webm: clean(mObj?.webm),
      mp4: clean(mObj?.mp4) ?? clean(v.video_url_mobile),
    };

    return { desktop, mobile, posterUrl: poster, posterUrlMobile: posterMobile };
  } catch (err) {
    console.error("getHeroData failed:", err);
    return FALLBACK;
  }
}

/* ══════════════════════════════════════════════════════════════════════
 *  ⬇︎ جديد — سلايدر الهيرو
 * ══════════════════════════════════════════════════════════════════════ */

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

/**
 * يقرأ سلايدات الهيرو مرتّبة (hero_slides).
 *
 * السلايد رقم 0 (sort = 0) هي عنصر الـ LCP — الكومبوننت يرندرها وحدها
 * في الـ HTML الأولي بـ priority، وباقي السلايدات لا تدخل الـ DOM إلا
 * بعد requestIdleCallback.
 *
 * آمن ضد غياب الجدول (قبل تشغيل الميجريشن) → يرجّع [] فيشتغل الهيرو
 * كصورة واحدة تمامًا زي ما هو دلوقتي.
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
      imageMobile: clean(r.image_mobile) ?? r.image_desktop,
      alt: { ar: r.alt?.ar ?? "", en: r.alt?.en ?? "" },
      href: clean(r.href),
    }));
  } catch (err) {
    console.error("getHeroSlides failed:", err);
    return [];
  }
}