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

/* ── Vehicle catalogue ── */
export interface Brand { id: string; name: string; models: string[]; }

export const BRANDS: Brand[] = [
  { id: 'rolls', name: 'Rolls-Royce', models: ['Phantom', 'Ghost', 'Cullinan', 'Spectre', 'Wraith', 'Dawn'] },
  { id: 'bentley', name: 'Bentley', models: ['Continental GT', 'Flying Spur', 'Bentayga', 'Bacalar', 'Mulsanne'] },
  { id: 'ferrari', name: 'Ferrari', models: ['SF90', 'Roma', '296 GTB', 'Purosangue', '812', 'F8'] },
  { id: 'lamborghini', name: 'Lamborghini', models: ['Revuelto', 'Huracán', 'Urus', 'Aventador'] },
  { id: 'porsche', name: 'Porsche', models: ['911', 'Taycan', 'Cayenne', 'Panamera', 'Macan', '718'] },
  { id: 'mercedes', name: 'Mercedes-Benz', models: ['S-Class', 'G63 AMG', 'Maybach', 'GLS', 'SL', 'EQS'] },
  { id: 'bmw', name: 'BMW', models: ['7 Series', 'X7', 'M5', 'XM', 'i7', '8 Series'] },
  { id: 'aston', name: 'Aston Martin', models: ['DBX', 'DB12', 'Vantage', 'Valhalla'] },
  { id: 'mclaren', name: 'McLaren', models: ['750S', 'Artura', 'GTS', '720S'] },
  { id: 'landrover', name: 'Land Rover', models: ['Range Rover', 'Range Rover Sport', 'Defender', 'Velar'] },
  { id: 'pagani', name: 'Pagani', models: ['Huayra', 'Utopia'] },
  { id: 'cadillac', name: 'Cadillac', models: ['Escalade', 'CT5', 'Lyriq'] },
];

const MODEL_SIZE: Record<string, VehicleSize> = {};
export function inferSize(_brandId: string, model: string): VehicleSize {
  return MODEL_SIZE[model] ?? 'large';
}

export interface ColorMeta { key: string; hex: string; light: boolean; }
export const COLORS: ColorMeta[] = [
  { key: 'white', hex: '#f3f3f1', light: true }, { key: 'black', hex: '#0a0a0b', light: false },
  { key: 'silver', hex: '#c7c9cb', light: true }, { key: 'gray', hex: '#6b6e72', light: false },
  { key: 'red', hex: '#7c1a1a', light: false }, { key: 'blue', hex: '#1b2a44', light: false },
  { key: 'green', hex: '#1c3a2e', light: false }, { key: 'yellow', hex: '#c9a227', light: true },
  { key: 'orange', hex: '#9c4416', light: false }, { key: 'brown', hex: '#4a3526', light: false },
  { key: 'beige', hex: '#cdbfa3', light: true }, { key: 'gold', hex: '#b8993f', light: true },
];

export type TowingMode = 'oneway' | 'return' | 'both';
export const TOWING_COST: Record<TowingMode, number> = { oneway: 300, return: 300, both: 550 };

export const CITIES = ['cairo', 'alexandria', 'giza', 'nasr_city', 'new_cairo', 'maadi', 'zamalek', 'october'] as const;
export const BRANCHES = ['nasr_city', 'new_cairo', 'alexandria'] as const;

export type PaymentMethod = 'tabby' | 'tamara' | 'applePay' | 'cash';
export const PAYMENT_METHODS: PaymentMethod[] = ['tabby', 'tamara', 'applePay', 'cash'];

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