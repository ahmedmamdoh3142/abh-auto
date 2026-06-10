/**
 * lib/admin/i18n-json.ts
 * أدوات التعامل مع الأعمدة الثنائية اللغة (jsonb) في القاعدة.
 * كل الحقول المتعددة اللغات متخزّنة كـ { en, ar }.
 * آمن للاستيراد من السيرفر والـ client (لا يلمس pg).
 */
import type { Locale } from "@/lib/i18n";

export type Loc = { en: string; ar: string };

export const emptyLoc = (): Loc => ({ en: "", ar: "" });

/** يحوّل أي قيمة من jsonb (object | string | null) لـ { en, ar } مضمونة. */
export function toLoc(value: unknown): Loc {
  if (value == null) return emptyLoc();
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return toLoc(parsed);
    } catch {
      /* نص عادي */
    }
    return { en: value, ar: value };
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return {
      en: typeof o.en === "string" ? o.en : "",
      ar: typeof o.ar === "string" ? o.ar : "",
    };
  }
  return emptyLoc();
}

/** يختار اللغة المناسبة للعرض مع fallback. */
export function pick(value: unknown, locale: Locale): string {
  const l = toLoc(value);
  return (locale === "ar" ? l.ar || l.en : l.en || l.ar) || "";
}

/** ينضّف Loc قبل الحفظ. */
export function cleanLoc(l: Loc): Loc {
  return { en: (l.en || "").trim(), ar: (l.ar || "").trim() };
}
