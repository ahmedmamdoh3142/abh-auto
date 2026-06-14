/**
 * Booking domain data — ABH Auto.
 *
 * lib/site-config.ts is read-only, so the booking catalogue, vehicle-size
 * inference and price matrix live here. Services are grouped into categories
 * (Packages / Ceramic / PPF / Thermal / Protection / Add-ons); each carries a
 * background image, an "includes" list and a warranty for the image-backed
 * cards in StepServices.
 *
 * SIZING: wired end-to-end but every model currently resolves to `large`
 * (the safe upper bound) per the brief. To refine, populate MODEL_SIZE.
 */

export type VehicleSize = 'small' | 'medium' | 'large';

export const SIZE_MULTIPLIER: Record<VehicleSize, number> = {
  small: 1,
  medium: 1.25,
  large: 1.55,
};

export type CategoryId = 'packages' | 'ceramic' | 'ppf' | 'thermal' | 'protection' | 'addons';

export interface Category {
  id: CategoryId;
  /** i18n key under booking.cats.<id> */
  label: string;
  icon: 'star' | 'shield' | 'layers' | 'sun' | 'lock' | 'sparkles';
}

export const CATEGORIES: Category[] = [
  { id: 'packages', label: 'packages', icon: 'star' },
  { id: 'ceramic', label: 'ceramic', icon: 'shield' },
  { id: 'ppf', label: 'ppf', icon: 'layers' },
  { id: 'thermal', label: 'thermal', icon: 'sun' },
  { id: 'protection', label: 'protection', icon: 'lock' },
  { id: 'addons', label: 'addons', icon: 'sparkles' },
];

export interface ServiceMeta {
  slug: string;
  cat: CategoryId;
  /** SMALL-size base price in SAR; larger sizes scale via SIZE_MULTIPLIER. */
  base: number;
  /** Optional pre-discount SMALL-size price. When set and > base, the card
   *  shows the original price struck through next to the live (discounted) one. */
  oldBase?: number;
  /** Background image (Unsplash CDN, stable IDs — matches site-config pattern). */
  img: string;
  /** i18n keys live under booking.svc.<slug>.{name,desc} ; warranty/dur/incl here. */
  warranty: string;
  dur: string;
  incl: string[]; // i18n: booking.svc.<slug>.incl is preferred; these are EN fallbacks
  featured?: boolean;
  onRequest?: boolean;
}

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=900`;

export const SERVICES: ServiceMeta[] = [
  // ── Signature packages ──
  { slug: 'pkg_diamond', cat: 'packages', base: 9800, oldBase: 12500, featured: true, warranty: '10 yrs', dur: '3–4 days',
    img: U('photo-1503376780353-7e6692767b70'),
    incl: ['Multi-stage paint correction', '12 nano-ceramic layers', 'Self-healing topcoat', 'Documented dossier'] },
  { slug: 'pkg_summer', cat: 'packages', base: 4500, oldBase: 5800, warranty: '3 yrs', dur: '1–2 days',
    img: U('photo-1605559424843-9e4c228bf1c2'),
    incl: ['UV-rated ceramic', 'Interior deep-clean', 'Hydrophobic glass', '6-month service'] },
  { slug: 'pkg_elite', cat: 'packages', base: 0, onRequest: true, warranty: 'Annual', dur: 'Year-round',
    img: U('photo-1542362567-b07e54358753'),
    incl: ['Unlimited sessions', 'Dedicated team', 'Valet pickup', '24/7 concierge'] },

  // ── Nano ceramic ──
  { slug: 'cer_9h', cat: 'ceramic', base: 3200, oldBase: 3900, featured: true, warranty: '5 yrs', dur: '12–24 hrs',
    img: U('photo-1607860108855-64acf2078ed9'),
    incl: ['Single-stage correction', '9H ceramic layer', 'Hydrophobic finish', 'Cure & inspection'] },
  { slug: 'cer_graphene', cat: 'ceramic', base: 4600, warranty: '7 yrs', dur: '1–2 days',
    img: U('photo-1605618826115-fb9e775cfa9e'),
    incl: ['Dual-stage correction', 'Graphene coating', 'Reduced water spotting', 'Annual check'] },
  { slug: 'cer_wheel', cat: 'ceramic', base: 850, warranty: '2 yrs', dur: '4–6 hrs',
    img: U('photo-1568605117036-5fe5e7bab0b7'),
    incl: ['Wheels off', 'Barrel coating', 'Caliper coating', 'Brake-dust resistance'] },

  // ── Paint protection film ──
  { slug: 'ppf_full', cat: 'ppf', base: 6800, oldBase: 8400, featured: true, warranty: '10 yrs', dur: '4–6 days',
    img: U('photo-1552519507-da3b142c6e3d'),
    incl: ['Full bodywork wrap', 'Self-healing film', 'Wrapped edges', 'Gloss or matte'] },
  { slug: 'ppf_track', cat: 'ppf', base: 3400, warranty: '10 yrs', dur: '2–3 days',
    img: U('photo-1583121274602-3e2820c69888'),
    incl: ['Full front end', 'Rocker panels', 'Mirror caps', 'A-pillars & roof edge'] },
  { slug: 'ppf_partial', cat: 'ppf', base: 2200, warranty: '10 yrs', dur: '1–2 days',
    img: U('photo-1542362567-b07e54358753'),
    incl: ['Partial hood', 'Front bumper', 'Fender leading edges', 'Headlights'] },

  // ── Heat & tint ──
  { slug: 'tint_ceramic', cat: 'thermal', base: 1800, oldBase: 2300, featured: true, warranty: 'Lifetime', dur: '4–6 hrs',
    img: U('photo-1493238792000-8113da705763'),
    incl: ['All windows', '99% UV block', 'High IR rejection', 'Lifetime warranty'] },
  { slug: 'tint_windshield', cat: 'thermal', base: 1100, warranty: 'Lifetime', dur: '2–3 hrs',
    img: U('photo-1449965408869-eaa3f722e40d'),
    incl: ['Front windshield', 'Crystal-clear', 'IR rejection', 'No signal loss'] },

  // ── Protection ──
  { slug: 'prot_armor', cat: 'protection', base: 0, onRequest: true, featured: true, warranty: 'Certified', dur: 'On consult',
    img: U('photo-1494976388531-d1058494cdd8'),
    incl: ['B4–B6 options', 'Glass & body', 'Run-flat tyres', 'Discreet integration'] },
  { slug: 'prot_tracking', cat: 'protection', base: 1400, warranty: '2 yrs', dur: '3–4 hrs',
    img: U('photo-1502877338535-766e1452684a'),
    incl: ['Hidden install', 'Geofencing', 'Instant alerts', 'Mobile app'] },
  { slug: 'prot_security', cat: 'protection', base: 1900, warranty: '2 yrs', dur: '4–6 hrs',
    img: U('photo-1550355291-bbee04a92027'),
    incl: ['Biometric ignition', 'App control', 'Immobiliser', 'Factory look kept'] },

  // ── Add-ons ──
  { slug: 'add_detail', cat: 'addons', base: 1400, oldBase: 1800, warranty: '—', dur: '6–8 hrs',
    img: U('photo-1607853202273-797f1c22a38e'),
    incl: ['Exterior decon', 'Interior steam', 'Leather care', 'Final dressing'] },
  { slug: 'add_polish', cat: 'addons', base: 900, warranty: '—', dur: '4–6 hrs',
    img: U('photo-1605164599901-db7f68c4b87a'),
    incl: ['Paint reading', 'Compounding', 'Polishing', 'Finishing'] },
  { slug: 'add_engine', cat: 'addons', base: 450, warranty: '—', dur: '2–3 hrs',
    img: U('photo-1486262715619-67b85e0b08d3'),
    incl: ['Degrease', 'Steam clean', 'Dressing', 'Protection'] },
];

export function priceFor(service: ServiceMeta, size: VehicleSize): number {
  if (service.onRequest) return 0;
  return Math.round((service.base * SIZE_MULTIPLIER[size]) / 50) * 50;
}

/** Original (pre-discount) price for the size, or null when not on sale. */
export function oldPriceFor(service: ServiceMeta, size: VehicleSize): number | null {
  if (service.onRequest || !service.oldBase || service.oldBase <= service.base) return null;
  return Math.round((service.oldBase * SIZE_MULTIPLIER[size]) / 50) * 50;
}

/** Whole-number discount percentage (e.g. 22), or 0 when not on sale. */
export function discountPct(service: ServiceMeta): number {
  if (service.onRequest || !service.oldBase || service.oldBase <= service.base) return 0;
  return Math.round((1 - service.base / service.oldBase) * 100);
}

/* ── Vehicle catalogue (مصدره ملف الإكسل عبر brands-data.ts) ── */
export type { Brand } from './brands-data';
export { BRANDS, MODEL_SIZE, sizeForModel } from './brands-data';
import { sizeForModel as _sizeForModel } from './brands-data';

/** للتوافق القديم: الحجم من (الماركة + الموديل). */
export function inferSize(brandId: string, model: string): VehicleSize {
  return _sizeForModel(brandId, model);
}

export interface ColorMeta { key: string; hex: string; light: boolean; }
export const COLORS: ColorMeta[] = [
  // ── الأساسية (موجودة) ──
  { key: 'white', hex: '#f5f5f5', light: true },
  { key: 'black', hex: '#0a0a0a', light: false },
  { key: 'silver', hex: '#c9ccce', light: true },
  { key: 'gray', hex: '#6b7075', light: false },
  { key: 'gunmetal', hex: '#2a2d31', light: false },
  { key: 'blue', hex: '#1f3a93', light: false },
  { key: 'red', hex: '#9b1c1c', light: false },
  { key: 'green', hex: '#14452f', light: false },
  { key: 'brown', hex: '#4a2f1b', light: false },
  { key: 'beige', hex: '#d8c8a8', light: true },
  { key: 'gold', hex: '#b8973f', light: true },
  { key: 'burgundy', hex: '#5c1626', light: false },
 
  // ── إضافات: درجات بيضا/رمادي راقية ──
  { key: 'pearl_white', hex: '#eef0ee', light: true },   // أبيض لؤلؤي
  { key: 'champagne', hex: '#d9c9a3', light: true },      // شمبانيا
  { key: 'titanium', hex: '#9fa3a6', light: true },       // تيتانيوم
  { key: 'nardo_gray', hex: '#7c7f82', light: false },    // ناردو جراي
 
  // ── درجات زرقا ──
  { key: 'sky_blue', hex: '#5b8fc4', light: false },      // أزرق سماوي
  { key: 'navy', hex: '#11203f', light: false },          // كحلي
  { key: 'teal', hex: '#1b6f72', light: false },          // أزرق مخضر
 
  // ── درجات حمرا/برتقالي ──
  { key: 'maroon', hex: '#3f1418', light: false },        // أحمر داكن (عنّابي غامق)
  { key: 'orange', hex: '#c1571a', light: false },        // برتقالي
  { key: 'bronze', hex: '#7d5a32', light: false },        // برونزي
 
  // ── خضرا/مميّزة ──
  { key: 'british_green', hex: '#1c3b2e', light: false }, // أخضر بريطاني
  { key: 'olive', hex: '#5a5a2f', light: false },         // زيتي
 
  // ── بنفسجي/خاص ──
  { key: 'purple', hex: '#4a2a6b', light: false },        // بنفسجي
  { key: 'matte_black', hex: '#1a1a1c', light: false },   // أسود مطفي
];

export type TowingMode = 'oneway' | 'return' | 'both';
export const TOWING_COST: Record<TowingMode, number> = { oneway: 300, return: 300, both: 550 };

// المدن: جدة ومكة فقط (مطابقة لجدول cities في القاعدة)، بأسماء مبنية في الكود.
export const CITIES = ['jeddah', 'makkah'] as const;
export const CITY_LABELS: Record<string, { ar: string; en: string }> = {
  jeddah: { ar: 'جدة', en: 'Jeddah' },
  makkah: { ar: 'مكة المكرمة', en: 'Makkah' },
};
export function cityLabel(code: string, isAr: boolean): string {
  const c = CITY_LABELS[code];
  return c ? (isAr ? c.ar : c.en) : code;
}
export const BRANCHES = ['tahlia'] as const;

// أسماء الفروع مبنية في الكود (لا تعتمد على ملفات الترجمة) لضمان ظهورها صح دائمًا.
export const BRANCH_LABELS: Record<string, { ar: string; en: string }> = {
  tahlia: { ar: 'جدة — فرع التحلية', en: 'Jeddah — Al Tahlia' },
};
export function branchLabel(code: string, isAr: boolean): string {
  const b = BRANCH_LABELS[code];
  return b ? (isAr ? b.ar : b.en) : code;
}

export type PaymentMethod = 'tabby' | 'tamara' | 'applePay' | 'cash';
// كل طرق الدفع ظاهرة، لكن المعطّلة منها (PAYMENT_DISABLED) معروضة كـ "قريبًا"
// وغير قابلة للاختيار لحد ما نفعّل بوابات الدفع. المتاح حاليًا: الدفع بالفرع (cash).
export const PAYMENT_METHODS: PaymentMethod[] = ['tabby', 'tamara', 'applePay', 'cash'];
export const PAYMENT_DISABLED = new Set<PaymentMethod>(['tabby', 'tamara', 'applePay']);

/** Time slots grouped by part of day; BOOKED simulates taken slots. */
export const TIME_GROUPS: [string, string[]][] = [
  ['morning', ['09:00', '10:30', '12:00']],
  ['afternoon', ['13:30', '15:00', '16:30']],
  ['evening', ['18:00', '19:30', '21:00']],
];
export const BOOKED_SLOTS = new Set(['12:00', '16:30']);

export function currencyFmt(n: number): string {
  return n.toLocaleString('en-US');
}