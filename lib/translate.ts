/**
 * lib/translate.ts — كشف اللغة + الترجمة عبر LibreTranslate.
 * السياق هنا محصور في اتجاهين بس: عربي <-> إنجليزي.
 */
const LT_URL = process.env.LIBRETRANSLATE_URL || "http://localhost:5000/translate";
const LT_API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

export type Lang = "ar" | "en";

/** كشف بسيط وسريع بدون أي API call: لو فيه حروف عربية → ar، غير كده → en */
export function detectLang(text: string): Lang {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicPattern.test(text) ? "ar" : "en";
}

export async function translateText(text: string, source: Lang, target: Lang): Promise<string | null> {
  const clean = (text || "").trim();
  if (!clean || source === target) return null;
  try {
    const res = await fetch(LT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: clean,
        source,
        target,
        format: "text",
        ...(LT_API_KEY ? { api_key: LT_API_KEY } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = data?.translatedText;
    return typeof out === "string" && out.trim() ? out : null;
  } catch (e) {
    console.error("translateText failed:", e);
    return null;
  }
}