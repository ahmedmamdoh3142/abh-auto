'use client';

/**
 * BookingFlow — the /booking experience. (DB-driven services + promo code + colors)
 *
 * ── إصلاح أداء/تعليق الموبايل (مهم) ─────────────────────────────────────────
 *  1) جُزيئات الهيرو (20) كانت motion.span بأنيميشن repeat:Infinity تعمل على
 *     الـmain thread دائمًا. حُوِّلت إلى CSS keyframes (compositor) وتُخفى تمامًا
 *     على اللمس/تقليل الحركة.
 *  2) media query تعطّل backdrop-filter (السبب الرئيسي لاسوداد الشاشة على iOS)
 *     على كلاس glass الأب وكل عناصر backdrop-blur، وتُخفي البلور الثقيل
 *     (blur-3xl/2xl) على الموبايل — يمنع طرد طبقات GPU أثناء السكرول.
 *
 * ── (جديد) كود الخصم في خطوة الخدمات ────────────────────────────────────────
 *  • حقل الكود اتنقل لخطوة الخدمات (StepServices). العميل يقدر يطبّق كوده بدري.
 *  • كود الهدية (gift_service): الخدمة المجانية تُضاف تلقائيًا وتظهر في الدوك.
 *    giftServiceSlug + giftServiceName يُخزّنان لعرضها.
 *  • قاعدة العبور: يكفي كود هدية صالح لوحده، أو خدمة مدفوعة واحدة على الأقل.
 *
 * ── (جديد) الإجمالي قبل الخصم ───────────────────────────────────────────────
 *  • total.originalTotal = أصل الأسعار (قبل أي خصم إعلاني) — يظهر مشطوبًا فوق «وفرت».
 *
 * ── تتبّع Google Analytics (قمع الحجز) ──────────────────────────────────────
 */
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, ArrowLeft, Check } from 'lucide-react';

import {
  COLORS, PAYMENT_METHODS, BRANDS as LIB_BRANDS, sizeForModel,
  currencyFmt, TOWING_COST,
  type VehicleSize, type CategoryId, type TowingMode, type PaymentMethod, type Category, type Brand,
} from '@/lib/booking-data';
import { dbPriceFor, dbOldPriceFor, type DbServiceMeta } from '@/lib/booking-pricing';
import type { DbColor } from '@/lib/booking-data-db';
import { useAuth } from '@/components/shared/auth-provider';
import {
  trackBookingView, trackBeginCheckout, trackVehicleInfo, trackSelectServices,
  trackCustomerInfo, trackSchedule, trackBookingSubmit, trackBookingSuccess, trackBookingError,
} from '@/lib/analytics';

import { StepVehicle } from './step-vehicle';

// (جديد) تحميل باقي الخطوات lazy — بيقلل حجم الجافاسكريبت الأولي بشكل كبير،
// لأن العميل غالبًا هيقضي وقت في خطوة السيارة قبل ما يحتاج كود بقية الخطوات.
const StepServices = dynamic(() => import('./step-services').then((m) => m.StepServices), { loading: () => <StepSkeleton /> });
const StepMaintenance = dynamic(() => import('./step-maintenance').then((m) => m.StepMaintenance), { loading: () => <StepSkeleton /> });
const StepDetails = dynamic(() => import('./step-details').then((m) => m.StepDetails), { loading: () => <StepSkeleton /> });
const StepConfirm = dynamic(() => import('./step-confirm').then((m) => m.StepConfirm), { loading: () => <StepSkeleton /> });
const StepMaintenanceConfirm = dynamic(() => import('./step-maintenance-confirm').then((m) => m.StepMaintenanceConfirm), { loading: () => <StepSkeleton /> });
const JsCheckoutPanel = dynamic(() => import('./js-checkout-card').then((m) => m.JsCheckoutPanel), { loading: () => <StepSkeleton /> });

const EASE = [0.16, 1, 0.3, 1] as const;
const CINEMATIC = '/images/cta-bg.webp';
const BOOKING_IMAGE = '/images/hero-bg.webp';

export interface BookingState {
  brandId: string;
  model: string;
  colorKey: string;
  plate: string;
  size: VehicleSize;
  /** (جديد) خط الخامة المختار في خطوة الخدمات — Signature أو Essential */
  tier: import('@/lib/shared/tier').TierCode;
  services: string[];
  activeCat: CategoryId;
  towing: boolean;
  towingMode: TowingMode | null;
  towingLat: number | null;
  towingLng: number | null;
  towingAddress: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  branch: string;
  date: string;
  time: string;
  payment: PaymentMethod | null;
  showBreakdown: boolean;
  calMonth: { y: number; m: number } | null;
  promoCode: string | null;
  promoPercent: number;
  promoKind: string | null;
  promoDiscount: number;
  promoServiceIds: number[];
  promoPerService: Record<number, number>;
  giftServiceSlug: string | null;
  giftServiceName: string | null;
  whatsappOptIn: boolean | undefined;
  gifts: { slug: string; bundleId: string; unit: number }[];
  /** (جديد) خصم بنك العميل — أول 8 أرقام من الكارت فقط، لا نخزّن الرقم الكامل. */
  bankVerified: boolean;
  bankCardDigits: string | null;
  bankCode: string | null;
  bankDiscountPercent: number;
  /** (جديد) صيانة الضمان — لما تكون true، خطوة الخدمات والدفع تتبدّل بخطوات الصيانة. */
  isMaintenance: boolean;
  maintenanceWarranty: WarrantyCoverage | null;
  problemDescription: string;
  /** (جديد) قراءة العداد الحالية كما أدخلها العميل — تُستخدم لفحص سقف الضمان بالكيلومترات. */
  odometerKm: string;
}

/** (جديد) شكل موحّد لتغطية الضمان — تايب مستقل بسطر واحد عشان يبقى آمن مع النسخ/اللصق. */
export type WarrantyCoverage = { bookingItemId: number; serviceId: number; serviceName: string; expiresAt: string };

const INITIAL: BookingState = {
  brandId: '', model: '', colorKey: '', plate: '', size: 'large',
  tier: 'signature',
  services: [], activeCat: 'coatings' as CategoryId, towing: false, towingMode: null,
  towingLat: null, towingLng: null, towingAddress: '',
  name: '', phone: '', email: '', city: '', branch: '', date: '', time: '',
  payment: null, showBreakdown: false, calMonth: null,
  promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0,
  promoServiceIds: [], promoPerService: {},
  giftServiceSlug: null, giftServiceName: null,
  whatsappOptIn: undefined,
  gifts: [],
  bankVerified: false, bankCardDigits: null, bankCode: null, bankDiscountPercent: 0,
  isMaintenance: false, maintenanceWarranty: null, problemDescription: '', odometerKm: '',
};

const STEP_KEYS = ['vehicle', 'services', 'customer', 'payment'] as const;

export function BookingFlow({
  categories,
  services: SERVICES,
  brands,
  modelSizes,
  colors,
}: {
  categories: Category[];
  services: DbServiceMeta[];
  brands: Brand[];
  modelSizes: Record<string, VehicleSize>;
  colors?: DbColor[];
}) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { member, hydrated, addBooking } = useAuth();

  // (جديد) دخول مباشر لوضع صيانة الضمان من الناف بار: /booking?flow=maintenance
  const searchParams = useSearchParams();
  const maintenanceIntent = searchParams.get('flow') === 'maintenance';
  const autoMaintenanceTried = useRef(false);

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [data, setData] = useState<BookingState>(INITIAL);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  // (جديد) موديلات مؤقتة يضيفها العميل يدويًا — تتسجّل في القاعدة فورًا وتُستخدم لحساب السعر بحجمها.
  const [customModels, setCustomModels] = useState<Record<string, VehicleSize>>({});
  // (جديد) بيانات الحجز اللي بنستنى دفع البطاقة بتاعه — بيظهر الفورم المدمج بدل خطوة التأكيد.
  const [cardCheckout, setCardCheckout] = useState<{ bookingId: string; reference: string; amount: number } | null>(null);

  // تتبّع: دخل صفحة الحجز (بداية القمع)
  useEffect(() => { trackBookingView(); }, []);

  const set = useCallback(
    (patch: Partial<BookingState>) => setData((d) => ({ ...d, ...patch })),
    [],
  );

  const baseBrands = (brands && brands.some((b) => (b.models?.length ?? 0) > 0)) ? brands : LIB_BRANDS;

  // نضيف الموديلات المؤقتة (المكتوبة يدويًا) لقائمة كل ماركة عشان تظهر مختارة في الكومبوبوكس.
  const effectiveBrands = useMemo(() => {
    const extraByBrand = new Map<string, string[]>();
    for (const key of Object.keys(customModels)) {
      const idx = key.indexOf('::');
      const bId = key.slice(0, idx);
      const name = key.slice(idx + 2);
      const arr = extraByBrand.get(bId) ?? [];
      arr.push(name);
      extraByBrand.set(bId, arr);
    }
    if (extraByBrand.size === 0) return baseBrands;
    return baseBrands.map((b) => {
      const extra = (extraByBrand.get(b.id) ?? []).filter((m) => !b.models.includes(m));
      return extra.length ? { ...b, models: [...b.models, ...extra] } : b;
    });
  }, [baseBrands, customModels]);

  const sizeOf = useCallback((brandId: string, model: string): VehicleSize => {
    const key = `${brandId}::${model}`;
    return customModels[key] ?? modelSizes[key] ?? sizeForModel(brandId, model) ?? 'large';
  }, [modelSizes, customModels]);

  // (جديد) تسجيل موديل يدوي: يحفظ حجمه محليًا فورًا ويحدّث بيانات الحجز بحجمه الصحيح.
  const onAddCustomModel = useCallback((brandId: string, model: string, size: VehicleSize) => {
    setCustomModels((prev) => ({ ...prev, [`${brandId}::${model}`]: size }));
    setData((d) => ({ ...d, brandId, model, size }));
  }, []);

  useEffect(() => {
    if (categories.length > 0) setData((d) => ({ ...d, activeCat: categories[0].id }));
  }, [categories]);

  useEffect(() => {
    if (!hydrated || !member) return;
    setData((d) => ({
      ...d,
      name: d.name || member.name,
      phone: d.phone || member.phone,
      email: d.email || member.email,
      city: d.city || member.city,
    }));
  }, [hydrated, member]);

  const onVehicleChange = useCallback((patch: Partial<BookingState>) => {
    setData((d) => {
      const next = { ...d, ...patch };
      if (next.brandId && next.model) next.size = sizeOf(next.brandId, next.model);
      return next;
    });
  }, [sizeOf]);

  // ── (جديد) صيانة الضمان: تحقّق من تغطية اللوحة الحالية كل ما تتغيّر ──
  const [maintenanceCovered, setMaintenanceCovered] = useState<WarrantyCoverage[]>([]);
  useEffect(() => {
    let alive = true;
    const digits = (data.plate.match(/[0-9\u0660-\u0669]/g) || []).join('');
    if (!member || digits.length < 3) { setMaintenanceCovered([]); return; }
    (async () => {
      try {
        const j = await fetch(`/api/vehicles/warranty?plate=${encodeURIComponent(data.plate)}&locale=${locale}`).then((r) => r.json());
        if (alive && j?.ok) setMaintenanceCovered(j.warranties ?? []);
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
  }, [member, data.plate, locale]);

  // لو السيارة اتغيّرت وبقت مش مغطاة بينما كنا في وضع الصيانة، نرجع لحجز عادي تلقائيًا
  useEffect(() => {
    if (data.isMaintenance && maintenanceCovered.length === 0) {
      setData((d) => ({ ...d, isMaintenance: false, maintenanceWarranty: null }));
    }
  }, [maintenanceCovered, data.isMaintenance]);

  const startMaintenance = useCallback((w: WarrantyCoverage) => {
    set({ isMaintenance: true, maintenanceWarranty: w, services: [], gifts: [], promoCode: null, promoKind: null, promoDiscount: 0 });
  }, [set]);

  const cancelMaintenance = useCallback(() => {
    autoMaintenanceTried.current = true; // العميل رفض الصيانة — منرجّعوش لها تلقائيًا تاني
    set({ isMaintenance: false, maintenanceWarranty: null, problemDescription: '' });
  }, [set]);

  // (جديد) جاي من رابط «حجز صيانة» في الناف بار: بمجرد ما نلاقي ضمان ساري
  // على اللوحة اللي كتبها، ندخّله في وضع الصيانة تلقائيًا بدل ما ينتظر يدوس على البانر.
  useEffect(() => {
    if (!maintenanceIntent || autoMaintenanceTried.current) return;
    if (data.isMaintenance) return;
    if (maintenanceCovered.length > 0) {
      autoMaintenanceTried.current = true;
      startMaintenance(maintenanceCovered[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenanceIntent, maintenanceCovered, data.isMaintenance]);

  const [maintenanceReference, setMaintenanceReference] = useState<string | null>(null);

  const confirmMaintenance = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleLabel: `${effectiveBrands.find((b) => b.id === data.brandId)?.name ?? ''} ${data.model}`.trim(),
          plate: data.plate, brandId: data.brandId, model: data.model,
          size: data.size, colorKey: data.colorKey,
          bookingItemId: data.maintenanceWarranty?.bookingItemId ?? null,
          problemDescription: data.problemDescription,
          odometerKm: data.odometerKm.trim() ? Number(data.odometerKm) : null,
          branch: data.branch, date: data.date, time: data.time,
          name: data.name, phone: data.phone, email: data.email, city: data.city,
        }),
      });
      const json = await res.json();
      if (!json?.ok) { trackBookingError(json?.error ?? 'maintenance_failed'); return; }
      setMaintenanceReference(json.reference ?? json.requestId ?? null);
      setDone(true);
      requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      console.error('maintenance request failed:', e);
      trackBookingError('maintenance_network_error');
    }
  }, [data, effectiveBrands]);

  const revalidatePromo = useCallback(async (state: BookingState) => {
    if (!state.promoCode) return;
    // كود الهدية لا يحتاج إعادة حساب خصم (قيمته صفر) — نتركه كما هو.
    if (state.promoKind === 'gift_service') return;
    const lines = state.services
      .map((slug) => {
        const meta = SERVICES.find((s) => s.slug === slug);
        if (!meta || meta.onRequest) return null;
        return { serviceId: meta.id, unit: dbPriceFor(meta, state.size) };
      })
      .filter(Boolean) as { serviceId: number; unit: number }[];

    const tow = state.towing && state.towingMode ? TOWING_COST[state.towingMode] : 0;
    const subtotal = lines.reduce((s, l) => s + l.unit, 0) + tow;

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: state.promoCode, lines, subtotal }),
      });
      const j = await res.json();
      if (j?.ok) {
        set({
          promoDiscount: Number(j.discount) || 0,
          promoServiceIds: j.matchedServiceIds ?? [],
          promoPerService: j.perService ?? {},
        });
      } else {
        set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {} });
      }
    } catch { /* تجاهل أخطاء الشبكة هنا */ }
  }, [SERVICES, set]);

  useEffect(() => {
    if (data.promoCode) revalidatePromo(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.services, data.size, data.towing, data.towingMode]);

  const total = useMemo(() => {
    let onReq = false;
    let saved = 0;
    let servicesOriginal = 0; // أصل الأسعار قبل أي خصم إعلاني
    const services = data.services.reduce((sum, slug) => {
      const meta = SERVICES.find((s) => s.slug === slug);
      if (!meta) return sum;
      if (meta.onRequest) { onReq = true; return sum; }
      const old = dbOldPriceFor(meta, data.size);
      const now = dbPriceFor(meta, data.size);
      servicesOriginal += old || now; // أصل السعر (القديم لو موجود، وإلا الحالي)
      if (old) saved += old - now;
      return sum + now;
    }, 0);
    const tow = data.towing && data.towingMode ? TOWING_COST[data.towingMode] : 0;
    const beforePromo = services + tow;
    const giftsCharge = (data.gifts ?? []).reduce((s, g) => s + (g.unit || 0), 0);
    // الإجمالي قبل أي خصم = أصل أسعار الخدمات + النقل + هدايا البندل المدفوعة
    const originalTotal = servicesOriginal + tow + giftsCharge;
    // (جديد) خصم بنك العميل يلغي أي خصم كود تمامًا
    const bankCut = data.bankVerified ? Math.round((beforePromo * data.bankDiscountPercent) / 100) : 0;
    const promoCut = data.bankVerified ? 0 : Math.min(data.promoDiscount || 0, beforePromo);
    const grand = Math.max(0, beforePromo - promoCut - bankCut) + giftsCharge;
    return { services, tow, beforePromo, promoCut, bankCut, grand, onReq, saved, originalTotal };
  }, [data.services, data.size, data.towing, data.towingMode, data.promoDiscount, data.gifts, data.bankVerified, data.bankDiscountPercent, SERVICES]);

  // قائمة الخدمات المختارة بصيغة التتبّع (اسم + سعر)
  const trackedServices = useCallback(() => data.services.map((slug) => {
    const m = SERVICES.find((s) => s.slug === slug);
    return { name: m?.name ?? slug, price: m && !m.onRequest ? dbPriceFor(m, data.size) : 0 };
  }), [data.services, data.size, SERVICES]);

  const go = useCallback((to: number) => {
    // تتبّع قمع الحجز حسب الخطوة اللي رايحين لها
    if (to === 1) { trackVehicleInfo({ brand: data.brandId, model: data.model, size: data.size }); trackBeginCheckout(); }
    else if (to === 2) { trackSelectServices(trackedServices(), total.grand); }
    else if (to === 3) { trackCustomerInfo(); trackSchedule({ branch: data.branch, date: data.date, time: data.time }); }
    setStep(to);
    setMaxReached((m) => Math.max(m, to));
    // (جديد) نسجّل الخطوة في الـhistory عشان زر رجوع المتصفح يرجع خطوة
    // خطوة بدل ما يقفل الصفحة أو يقفز لأول خطوة على طول.
    if (typeof window !== 'undefined') window.history.pushState({ bookingStep: to }, '', window.location.href);
    requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [data.brandId, data.model, data.size, data.branch, data.date, data.time, total.grand, trackedServices]);

  // (جديد) دعم زر رجوع/تقدّم في المتصفح لخطوات الحجز.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({ bookingStep: 0 }, '', window.location.href);
    const onPopState = (e: PopStateEvent) => {
      const target = typeof e.state?.bookingStep === 'number' ? e.state.bookingStep : 0;
      setStep(target);
      setMaxReached((m) => Math.max(m, target));
      requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const confirmBooking = useCallback(async () => {
    const brand = effectiveBrands.find((b) => b.id === data.brandId);
    const vehicleLabel = `${brand?.name ?? ''} ${data.model}`.trim();

    trackBookingSubmit(); // ضغط «تأكيد» (محاولة)

    let json: any = null;
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleLabel,
          plate: data.plate,
          brandId: data.brandId,
          model: data.model,
          size: data.size,
          colorKey: data.colorKey,
          branch: data.branch,
          date: data.date,
          time: data.time,
          payment: data.payment,
          towingMode: data.towing ? data.towingMode : null,
          towingCost: total.tow,
          towingAddress: data.towing ? data.towingAddress : null,
          services: data.services,
          gifts: (data.gifts ?? []).map((g) => ({ slug: g.slug, bundleId: g.bundleId })),
          promoCode: data.bankVerified ? null : (data.promoCode ?? null),
          bankCardDigits: data.bankVerified ? data.bankCardDigits : null,
          name: data.name,
          phone: data.phone,
          email: data.email,
          city: data.city,
          whatsappOptIn: !!data.whatsappOptIn,
          whatsappOptInText: data.whatsappOptIn
            ? (isAr ? 'وافق على التواصل عبر واتساب عند الحجز من الموقع' : 'Consented to WhatsApp contact at website booking')
            : null,
        }),
      });
      json = await res.json();
    } catch (e) {
      console.error('booking save failed:', e);
      trackBookingError('network_error');
      return;
    }

    if (!json?.ok || !json.reference) {
      trackBookingError(json?.error ?? 'no_reference');
      return;
    }

    // ── مسار الدفع بالبطاقة (AlinmaPay JS Checkout) — مدمج جوّه نفس الصفحة ──
    if (data.payment === 'card') {
      setCardCheckout({ bookingId: json.bookingId, reference: json.reference, amount: total.grand });
      return; // الفورم المدمج هيظهر بدل خطوة التأكيد؛ onSuccess بتاعه هو اللي يقفل الحجز
    }

    // ── مسار Apple Pay (AlinmaPay Hosted Page) — بيحوّل العميل لصفحتهم المستضافة،
    // لأن Apple Pay بيحتاج شهادات لو اتعمل عن طريق JS Checkout المدمج، لكن مفيش
    // أي شهادات مطلوبة منّا لو سبناه على الصفحة المستضافة (تأكيد AlinmaPay).
    if (data.payment === 'applePay') {
      try {
        const initRes = await fetch('/api/payment/alinma/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: json.bookingId,
            amount: total.grand,
            customer: { email: data.email, mobile: data.phone },
          }),
        });
        const initJson = await initRes.json();
        if (initJson?.ok && initJson.redirectUrl) {
          window.location.href = initJson.redirectUrl;
          return; // العميل غادر الصفحة
        }
        trackBookingError(initJson?.error ?? 'gateway_init_failed');
      } catch (e) {
        console.error('alinma initiate failed:', e);
        trackBookingError('gateway_init_failed');
      }
      return;
    }

    // ── باقي طرق الدفع (cash) — نفس السلوك الحالي ──
    setReference(json.reference);
    trackBookingSuccess({
      reference: json.reference,
      value: total.grand,
      services: trackedServices(),
      paymentMethod: data.payment ?? undefined,
    });

    if (member) {
      addBooking({
        vehicleLabel,
        plate: data.plate,
        serviceSlugs: data.services,
        branchKey: data.branch,
        date: data.date,
        time: data.time,
        total: total.grand,
        payment: data.payment === 'cash' ? 'branch' : 'paid',
        size: data.size,
        status: 'upcoming',
      });
    }

    setDone(true);
    requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [member, addBooking, data, total.grand, total.tow, effectiveBrands, isAr, trackedServices]);

  const reset = useCallback(() => {
    setData({ ...INITIAL, activeCat: categories[0]?.id ?? ('coatings' as CategoryId) });
    setStep(0); setMaxReached(0); setDone(false); setReference(null); setMaintenanceReference(null); setCardCheckout(null);
    if (typeof window !== 'undefined') window.history.replaceState({ bookingStep: 0 }, '', window.location.href);
    requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [categories]);

  return (
    <>
      <BookingHero t={t} />

      <section className="section relative pt-4 md:pt-8" id="booking">
        <div className="container">
          <StepRail step={step} maxReached={maxReached}
            labels={STEP_KEYS.map((k) => t(`steps.${k}`))}
            onJump={(i) => i <= maxReached && !done && go(i)} />

          <div ref={consoleRef} className="spotlight glass relative mt-12 scroll-mt-28 rounded-[28px] border border-white/[0.08] md:mt-16">
            <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/30 to-transparent" />

            <AnimatePresence mode="wait">
              {done ? (
                <StepSuccess key="success" t={t} data={data} total={total} isAr={isAr} onReset={reset}
                  reference={data.isMaintenance ? maintenanceReference : reference}
                  mode={data.isMaintenance ? 'maintenance' : 'booking'} />
              ) : (
                <motion.div key={step}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="p-6 md:p-10 lg:p-14"
                >
                  {step === 0 && (
                    <StepVehicle t={t} isAr={isAr} data={data} onChange={onVehicleChange} brands={effectiveBrands}
                      colors={colors} bookingImage={BOOKING_IMAGE} garage={member?.vehicles ?? []} onNext={() => go(1)}
                      onAddCustomModel={onAddCustomModel}
                      maintenanceCovered={maintenanceCovered} onStartMaintenance={startMaintenance}
                      maintenanceIntent={maintenanceIntent} />
                  )}
                  {step === 1 && (
                    data.isMaintenance ? (
                      <StepMaintenance isAr={isAr} data={data} set={set} onBack={() => go(0)} onNext={() => go(2)}
                        onCancelMaintenance={cancelMaintenance} />
                    ) : (
                      <StepServices t={t} isAr={isAr} data={data} set={set} total={total}
                        categories={categories} services={SERVICES} onBack={() => go(0)} onNext={() => go(2)} />
                    )
                  )}
                  {step === 2 && (
                    <StepDetails t={t} isAr={isAr} data={data} set={set} onBack={() => go(1)} onNext={() => go(3)} />
                  )}
                  {step === 3 && (
                    data.isMaintenance ? (
                      <StepMaintenanceConfirm isAr={isAr} data={data} onBack={() => go(2)} onSubmit={confirmMaintenance} />
                    ) : cardCheckout ? (
                      <JsCheckoutPanel
                        bookingId={cardCheckout.bookingId}
                        reference={cardCheckout.reference}
                        amount={cardCheckout.amount}
                        isAr={isAr}
                        onBack={() => setCardCheckout(null)}
                        onSuccess={() => {
                          setReference(cardCheckout.reference);
                          trackBookingSuccess({
                            reference: cardCheckout.reference,
                            value: cardCheckout.amount,
                            services: trackedServices(),
                            paymentMethod: 'card',
                          });
                          setDone(true);
                          requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                        }}
                      />
                    ) : (
                      <StepConfirm t={t} isAr={isAr} data={data} total={total} set={set}
                        services={SERVICES} onBack={() => go(2)} onConfirm={confirmBooking} />
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}

function BookingHero({ t }: { t: ReturnType<typeof useTranslations> }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, left: (i * 53) % 100, top: ((i * 37) % 80) + 10, delay: (i % 7) * 0.5, duration: 5 + (i % 5),
  }));
  return (
    <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44">
      <style>{`
        /* جُزيئات الهيرو على الـcompositor (كانت framer infinite) — مخفية على اللمس */
        .bk-particle{opacity:0;animation-name:bkRise;animation-timing-function:ease-out;animation-iteration-count:infinite;will-change:transform,opacity;}
        @keyframes bkRise{0%{opacity:0;transform:translateY(10px)}20%{opacity:.8}60%{opacity:.5}100%{opacity:0;transform:translateY(-110px)}}
        @media (hover:none),(pointer:coarse),(prefers-reduced-motion:reduce){.bk-particle{display:none!important}}

        /* ── منع تعليق/اسوداد الموبايل ──
           تعطيل backdrop-filter (يطرد طبقات GPU على iOS عند السكرول) على glass
           الأب وكل backdrop-blur، وإخفاء البلور الثقيل. يسري على صفحة الحجز فقط. */
        @media (hover:none),(pointer:coarse),(max-width:820px){
          .glass,.spotlight{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
          .glass{background:rgba(10,11,12,0.92)!important;}
          [class*="backdrop-blur"]{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
          [class*="blur-3xl"]:not([class*="backdrop"]),[class*="blur-2xl"]:not([class*="backdrop"]){display:none!important;}
        }
      `}</style>

      <div aria-hidden className="absolute inset-0 -z-20">
        <Image src={CINEMATIC} alt="" fill sizes="100vw" quality={45} className="object-cover opacity-[0.18]" style={{ filter: 'grayscale(0.5) brightness(0.5) contrast(1.1)' }} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
          <span key={p.id} className="bk-particle absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
        ))}
      </div>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('eyebrow')}
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1, ease: EASE }} className="inline-block">
              {t('title')}
            </motion.span>
          </span>
        </h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg">
          {t('subtitle')}
        </motion.p>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.4, delay: 0.55, ease: EASE }}
          className="mx-auto mt-10 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent" />
      </div>
    </section>
  );
}

function StepRail({ step, maxReached, labels, onJump }: { step: number; maxReached: number; labels: string[]; onJump: (i: number) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-0 top-[19px] h-px bg-white/10" />
        <motion.span aria-hidden className="absolute top-[19px] h-px bg-gradient-to-r from-platinum/40 via-ivory to-platinum/40"
          initial={false} animate={{ width: `${(step / (labels.length - 1)) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} style={{ insetInlineStart: 0 }} />
        {labels.map((label, i) => {
          const isDone = i < step; const isActive = i === step; const reachable = i <= maxReached;
          return (
            <button key={label} data-cursor="hover" onClick={() => onJump(i)} disabled={!reachable}
              className={`relative z-10 flex flex-col items-center gap-3 ${reachable ? '' : 'cursor-default'}`}>
              <span className={[
                'grid h-10 w-10 place-items-center rounded-full border text-[0.7rem] font-semibold tabular-nums transition-all duration-500',
                isActive ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian shadow-[0_10px_30px_-8px_rgba(203,205,205,0.6)]'
                  : isDone ? 'border-platinum/50 bg-platinum/10 text-ivory' : 'border-white/12 bg-white/[0.03] text-steel',
              ].join(' ')}>
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.4} /> : String(i + 1).padStart(2, '0')}
              </span>
              <span className={['whitespace-nowrap text-[0.55rem] uppercase tracking-[0.22em] transition-colors duration-500 md:text-[0.6rem]',
                isActive ? 'text-ivory' : isDone ? 'text-platinum/80' : 'text-steel'].join(' ')}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSkeleton() {
  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-platinum/30 border-t-platinum" />
    </div>
  );
}

function StepSuccess({ t, data, total, isAr, onReset, reference, mode = 'booking' }: {
  t: ReturnType<typeof useTranslations>; data: BookingState;
  total: { services: number; tow: number; grand: number }; isAr: boolean; onReset: () => void; reference: string | null;
  mode?: 'booking' | 'maintenance';
}) {
  const ref = reference ?? `ABH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const brand = LIB_BRANDS.find((b) => b.id === data.brandId);
  const isMaint = mode === 'maintenance';
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative px-6 py-16 text-center md:px-10 md:py-24">
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.07] blur-[120px]" />
      <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.9, ease: EASE }} className="relative mx-auto mb-10 h-28 w-28">
        <motion.span aria-hidden animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full opacity-70"
          style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.6), transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(6px)' }} />
        <span aria-hidden className="absolute inset-2 rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70" />
        <span className="absolute inset-[9px] grid place-items-center rounded-full bg-gradient-to-br from-obsidian via-obsidian to-[#0b0c0d]">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 14 }}>
            <Check className="h-9 w-9 text-ivory" strokeWidth={1.6} />
          </motion.span>
        </span>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
        className="font-display text-4xl font-light uppercase tracking-tight text-ivory md:text-5xl">
        {isMaint ? (isAr ? 'استلمنا طلبك' : 'Request received') : t('success.title')}
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
        className="mx-auto mt-4 max-w-[44ch] text-platinum/70">
        {isMaint ? (isAr ? 'هنراجع طلب الصيانة ونتواصل معك خلال ٢٤ ساعة للتأكيد.' : "We'll review your service request and confirm within 24 hours.") : t('success.subtitle')}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
        className="mx-auto mt-10 inline-flex flex-col items-center gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] px-8 py-7 md:flex-row md:gap-10">
        <div className="text-center md:text-start">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{isMaint ? (isAr ? 'رقم الطلب' : 'Request no.') : t('success.refLabel')}</div>
          <div dir="ltr" className="mt-1.5 font-display text-2xl tracking-[0.18em] text-ivory">{ref}</div>
        </div>
        <span aria-hidden className="hidden h-10 w-px bg-white/10 md:block" />
        {isMaint ? (
          <div className="text-center md:text-start">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{isAr ? 'الحالة' : 'Status'}</div>
            <div className="mt-1.5 font-display text-2xl text-[#e8d6a8]">{isAr ? 'قيد المراجعة' : 'Under review'}</div>
          </div>
        ) : (
          <div className="text-center md:text-start">
            <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('step4.total')}</div>
            <div dir="ltr" className="mt-1.5 font-display text-2xl text-ivory tabular-nums">{currencyFmt(total.grand)} <span className="text-base text-platinum/70">{t('currency')}</span></div>
          </div>
        )}
        {brand && (
          <>
            <span aria-hidden className="hidden h-10 w-px bg-white/10 md:block" />
            <div className="text-center md:text-start">
              <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('step4.vehicleTitle')}</div>
              <div className="mt-1.5 text-base text-ivory">{brand.name} {data.model}</div>
            </div>
          </>
        )}
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
        className="mx-auto mt-8 max-w-[46ch] text-sm leading-relaxed text-platinum/55">{t('success.nextSteps')}</motion.p>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7, ease: EASE }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a href="/account" data-cursor="hover"><GhostPill>{t('success.viewBookings')}</GhostPill></a>
        <button onClick={onReset} data-cursor="hover"><PrimaryPill>{t('success.newBooking')}</PrimaryPill></button>
      </motion.div>
    </motion.div>
  );
}

export function PrimaryPill({ children, full }: { children: React.ReactNode; full?: boolean }) {
  return (
    <span className={`group/btn relative ${full ? 'block' : 'inline-block'}`}>
      <span aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-r from-platinum/50 via-ivory/40 to-platinum/50 opacity-0 blur-2xl transition-opacity duration-700 group-hover/btn:opacity-100" />
      <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/80 via-platinum/40 to-ivory/55" />
      <span className={`relative inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 group-hover/btn:-translate-y-0.5 ${full ? 'w-full' : ''}`}
        style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9),0 18px 60px -15px rgba(203,205,205,0.6)' }}>
        {children}
        <ArrowUpRight className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={2.2} />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
      </span>
    </span>
  );
}

export function GhostPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/btn relative inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
      <ArrowLeft className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover/btn:-translate-x-0.5" strokeWidth={1.8} />
      {children}
    </span>
  );
}