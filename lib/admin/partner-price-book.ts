/**
 * lib/admin/partner-price-book.ts
 * ───────────────────────────────────────────────────────────────────────────
 * دفتر الأسعار المعتمد (مستخرَج من ملفّي الأسعار: الشركاء + المناديب).
 *
 * الحقيقة المهمة المؤكَّدة من الـPDF:
 *   • «السعر بعد الخصم» واحد بالظبط في الملفين — الفرق الوحيد هو نسبة العمولة.
 *   • العمولة = السعر بعد الخصم × النسبة:  الشركاء 20% ، المناديب 10%.
 * فلذلك عندنا قائمة سعر واحدة (prices أدناه) + نسبتان فقط.
 *
 * الأرقام هنا = «السعر بعد الخصم» (وهو ما يُكتب في خانة «سعر الشركة»).
 * العمولة تُحسب آليًا = round(price × rate) — مش متخزّنة هنا.
 *
 * الربط بالخدمات: الأفضل والمضمون 100% هو OVERRIDE_BY_SERVICE_ID (serviceId → code)
 * وتتملّى من ناتج الكويري 01_services_dump.sql. ولو فاضية، بنطابق بالاسم
 * (إنجليزي ثم عربي) تلقائيًا — وغالبًا بيظبط لأن الأسماء متطابقة.
 */

export type PresetSize = "small" | "medium" | "large";
export type PresetKind = "partner" | "rep";

export const PRESET_RATES: Record<PresetKind, number> = {
  partner: 0.20, // الشركاء
  rep: 0.10,     // المناديب
};

export interface PresetEntry {
  code: number;                          // رقم الخدمة في الـPDF (1..28)
  en: string;
  ar: string;
  prices: Record<PresetSize, number>;    // السعر بعد الخصم لكل حجم
}

/* ملاحظة: REMOVE THERMAL / ENGINE CLEAN / OZONE نفس السعر للأحجام الثلاثة. */
export const PARTNER_PRICE_BOOK: PresetEntry[] = [
  { code: 1,  en: "ABH ROYAL MATTE",      ar: "ايه بي اتش رويال مطفي",        prices: { large: 13000, medium: 12350, small: 11050 } },
  { code: 2,  en: "ABH ROYAL GLOSS",      ar: "ايه بي اتش رويال لمع",         prices: { large: 12350, medium: 11700, small: 10400 } },
  { code: 3,  en: "ABH ELITE PART PRO",   ar: "ايه بي اتش إليت جزئي برو",      prices: { large: 2600,  medium: 2405,  small: 2275 } },
  { code: 4,  en: "ABH ELITE FRONT PRO",  ar: "ايه بي اتش إليت مقدمة برو",     prices: { large: 3900,  medium: 3705,  small: 3510 } },
  { code: 5,  en: "ABH ELITE MATTE",      ar: "ايه بي اتش إيليت مطفي",        prices: { large: 11050, medium: 10400, small: 9750 } },
  { code: 6,  en: "ABH 6 COLORS",         ar: "ايه بي اتش الوان",             prices: { large: 9750,  medium: 9100,  small: 8450 } },
  { code: 7,  en: "ABH ELITE GLOSS",      ar: "ايه بي اتش إيليت لمع",         prices: { large: 12350, medium: 11050, small: 9750 } },
  { code: 8,  en: "ABH ELITE FRONT",      ar: "ايه بي اتش إيليت مقدمة",       prices: { large: 3900,  medium: 3770,  small: 3640 } },
  { code: 9,  en: "ABH ELITE HALF",       ar: "ايه بي اتش إيليت نصفي",        prices: { large: 1950,  medium: 1820,  small: 1690 } },
  { code: 10, en: "ABH ELITE PART",       ar: "ايه بي اتش إيليت جزئي",        prices: { large: 1625,  medium: 1300,  small: 1170 } },
  { code: 11, en: "ABH THERMAL 60%",      ar: "ايه بي اتش عازل حراري 60%",     prices: { large: 975,   medium: 845,   small: 715 } },
  { code: 12, en: "ABH THERMAL 95%",      ar: "ايه بي اتش عازل حراري 95%",     prices: { large: 1430,  medium: 1300,  small: 1170 } },
  { code: 13, en: "ABH FULL POLISH",      ar: "تلميع ايه بي اتش كامل",         prices: { large: 975,   medium: 910,   small: 845 } },
  { code: 14, en: "ABH INTERNAL POLISH",  ar: "تلميع ايه بي اتش داخلي",        prices: { large: 780,   medium: 650,   small: 520 } },
  { code: 15, en: "HYDRO POLISH",         ar: "تلميع مائي",                   prices: { large: 910,   medium: 845,   small: 780 } },
  { code: 16, en: "bright polish",        ar: "تلميع ساطع",                   prices: { large: 715,   medium: 650,   small: 585 } },
  { code: 17, en: "ABH RESTORE",          ar: "رجعها ايه بي اتش",             prices: { large: 1755,  medium: 1625,  small: 1495 } },
  { code: 18, en: "Nano ceramic 2",       ar: "نانو سيراميك خارجي طبقتان",     prices: { large: 1040,  medium: 910,   small: 780 } },
  { code: 19, en: "Nano ceramic 4",       ar: "نانو سيراميك خارجي 4 طبقات",    prices: { large: 1690,  medium: 1560,  small: 1430 } },
  { code: 20, en: "Nano ceramic 6",       ar: "نانو سيراميك خارجي 6 طبقات",    prices: { large: 2275,  medium: 2145,  small: 2015 } },
  { code: 21, en: "Nano ceramic INTERIOR",ar: "نانو سيراميك داخلي",           prices: { large: 1820,  medium: 1690,  small: 1560 } },
  { code: 22, en: "WINDSHIELD",           ar: "ونشيلد اساسي",                 prices: { large: 650,   medium: 585,   small: 520 } },
  { code: 23, en: "ABH WINDSHIELD KPU",   ar: "ايه بي اتش ونشيلد كي بي يو",    prices: { large: 975,   medium: 845,   small: 780 } },
  { code: 24, en: "INTERIOR GUARD",       ar: "حماية ديكورات داخلية",         prices: { large: 1300,  medium: 1170,  small: 1040 } },
  { code: 25, en: "REMOVE FILM",          ar: "إزالة أفلم الحماية",           prices: { large: 1125,  medium: 1125,  small: 1125 } },
  { code: 26, en: "REMOVE THERMAL",       ar: "إزالة العازل الحراري",         prices: { large: 188,   medium: 188,   small: 188 } },
  { code: 27, en: "ENGINE CLEAN",         ar: "تنظيف محرك",                   prices: { large: 75,    medium: 75,    small: 75 } },
  { code: 28, en: "OZONE",                ar: "تعقيم أوزون",                  prices: { large: 75,    medium: 75,    small: 75 } },
];

/**
 * ربط مضمون: service_id فى قاعدتك  →  code فى الدفتر أعلاه.
 * املأها من ناتج الكويري (01_services_dump.sql). مثال:
 *   export const OVERRIDE_BY_SERVICE_ID = { 12: 1, 13: 2, 14: 3, ... };
 * لو سِبتها فاضية، بنعتمد على مطابقة الاسم تلقائيًا.
 */
export const OVERRIDE_BY_SERVICE_ID: Record<number, number> = {
  // serviceId : code  (مقفول من ناتج القاعدة — ربط مضمون 100%)
  39: 1,   // ABH Royal Matte
  40: 2,   // ABH Royal Gloss
  41: 3,   // ABH Elite Part Pro
  42: 4,   // ABH Elite Front Pro
  43: 5,   // ABH Elite Matte
  66: 6,   // ABH Colors
  44: 7,   // ABH Elite Gloss
  45: 8,   // ABH Elite Front
  46: 9,   // ABH Elite Half
  47: 10,  // ABH Elite Part
  48: 11,  // ABH Thermal 60%
  49: 12,  // ABH Thermal 95%
  50: 13,  // ABH Full Polish
  // code 14 (ABH Internal Polish) غير موجود في القاعدة — أضِفه لو احتجته.
  51: 15,  // Hydro Polish
  52: 16,  // Bright Polish
  53: 17,  // ABH Restore
  54: 18,  // Nano Ceramic 2 Layers
  55: 19,  // Nano Ceramic 4 Layers
  56: 20,  // Nano Ceramic 6 Layers
  57: 21,  // Nano Ceramic Interior
  58: 22,  // Windshield
  59: 23,  // ABH Windshield KPU
  60: 24,  // Interior Guard
  61: 25,  // Remove Film
  62: 26,  // Remove Thermal
  63: 27,  // Engine Clean
  64: 28,  // Ozone Sterilisation
};

/* ── أدوات المطابقة بالاسم (احتياطي لو الربط بالـid مش متملّي) ── */
export const normEn = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const normAr = (s: string) =>
  (s || "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // تشكيل + تطويل
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\u0621-\u064A0-9]/g, "");        // سيب الحروف والأرقام بس

const BY_CODE = new Map(PARTNER_PRICE_BOOK.map((e) => [e.code, e]));
const BY_EN = new Map(PARTNER_PRICE_BOOK.map((e) => [normEn(e.en), e]));
const BY_AR = new Map(PARTNER_PRICE_BOOK.map((e) => [normAr(e.ar), e]));

export interface MatchInput { id?: number; name: { ar?: string; en?: string } }

/** يرجّع صف الدفتر المطابق لخدمة، أو null لو ملقاش. */
export function matchPreset(svc: MatchInput): PresetEntry | null {
  if (svc.id != null && OVERRIDE_BY_SERVICE_ID[svc.id] != null) {
    const e = BY_CODE.get(OVERRIDE_BY_SERVICE_ID[svc.id]);
    if (e) return e;
  }
  const en = normEn(svc.name?.en || "");
  if (en && BY_EN.has(en)) return BY_EN.get(en)!;
  const ar = normAr(svc.name?.ar || "");
  if (ar && BY_AR.has(ar)) return BY_AR.get(ar)!;
  return null;
}