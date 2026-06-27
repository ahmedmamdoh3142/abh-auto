'use client';

/**
 * StepConfirm — act 04. الخدمات من القاعدة + كود خصم متعدّد الأنواع.
 * التحقق من الكود يرسل بنود الطلب (serviceId + السعر) فيحسب الخادم الخصم الصحيح
 * حسب نوع الكود (إجمالي/مبلغ/خدمات محددة) ويرجّع الخصم لكل خدمة.
 *
 * (عروض) أُضيف عرض الهدايا في الدوسيه وفي التفصيل (breakdown) — مجانًا أو بخصم.
 * (جديد) كوبون هدية عجلة الحظ (gift_service): يضيف خدمة مجانًا — يظهر في صندوق
 *   الكود كـ«هديتك … مجانًا»، والخدمة نفسها تتسجّل في الخادم وقت تأكيد الحجز.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Car, Wrench, UserRound, MapPin, Check, ChevronDown, ShieldCheck, Tag, X, Loader2, Gift, Sparkles } from 'lucide-react';

import {
  BRANDS, PAYMENT_METHODS, PAYMENT_DISABLED, branchLabel, currencyFmt,
  TOWING_COST,
  type PaymentMethod, type VehicleSize,
} from '@/lib/booking-data';
import { dbPriceFor, dbOldPriceFor, type DbServiceMeta } from '@/lib/booking-pricing';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

const SIZE_LABELS: Record<VehicleSize, { ar: string; en: string; tier: string }> = {
  small: { ar: 'صغيرة', en: 'Small', tier: 'Tier I' },
  medium: { ar: 'متوسطة', en: 'Medium', tier: 'Tier II' },
  large: { ar: 'كبيرة', en: 'Large', tier: 'Tier III' },
};

export function StepConfirm({
  t, isAr, data, total, set, services: SERVICES, onBack, onConfirm,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  total: { services: number; tow: number; beforePromo: number; promoCut: number; grand: number; onReq: boolean; saved: number };
  set: (patch: Partial<BookingState>) => void;
  services: DbServiceMeta[];
  onBack: () => void; onConfirm: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const brand = BRANDS.find((b) => b.id === data.brandId);
  const szL = SIZE_LABELS[data.size] ?? SIZE_LABELS.large;
  const sizeChip = `${isAr ? szL.ar : szL.en} · ${szL.tier}`;
  const gifts = data.gifts ?? [];

  const confirm = () => {
    if (!data.payment) return;
    setProcessing(true);
    setTimeout(onConfirm, 1100);
  };

  return (
    <div>
      <Heading t={t} />

      <div className="relative mt-8 overflow-hidden rounded-[24px] border border-white/[0.08]">
        <div className="absolute inset-0 scale-105 bg-cover bg-center brightness-[0.4] grayscale-[0.5]"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=70&w=1600')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/55 to-[#050608]/20" />
        <div className="absolute inset-0 bg-gradient-to-e from-[#050608]/80 to-transparent" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between md:p-8">
          <div>
            <span className="text-[0.55rem] uppercase tracking-[0.3em] text-platinum/70">{t('step4.reserving')}</span>
            <h3 className="mt-2 font-display text-3xl uppercase leading-none text-ivory md:text-4xl">
              {brand?.name} <span className="text-platinum">{data.model}</span>
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BannerChip>{t(`colors.${data.colorKey}`)}</BannerChip>
              <BannerChip>{sizeChip}</BannerChip>
              {data.plate && <BannerChip mono>{data.plate}</BannerChip>}
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-platinum/25 bg-obsidian/40 px-4 py-2 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-platinum" strokeWidth={1.6} />
            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-platinum/85">{t('step4.protected')}</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
        <div className="space-y-5">
          <DossierCard icon={Car} title={t('step4.vehicleTitle')}>
            <Row k={`${brand?.name ?? ''}`} v={data.model} />
            <Row k={t('step1.color')} v={t(`colors.${data.colorKey}`)} />
            <Row k={t('step1.plate')} v={data.plate} mono />
          </DossierCard>

          <DossierCard icon={Wrench} title={t('step4.servicesTitle')}>
            {data.services.map((slug) => {
              const svc = SERVICES.find((s) => s.slug === slug);
              if (!svc) return null;
              const discounted = data.promoServiceIds?.includes(svc.id);
              return <Row key={slug} k={svc.name}
                v={svc.onRequest ? t('onRequest') : `${currencyFmt(dbPriceFor(svc, data.size))} ${t('currency')}`} mono={!svc.onRequest}
                tag={discounted ? (isAr ? 'خصم' : 'Promo') : undefined} />;
            })}
            {data.towing && data.towingMode && (
              <Row k={t('step4.towing')} v={`${currencyFmt(total.tow)} ${t('currency')}`} mono />
            )}
          </DossierCard>

          {/* (عروض) هداياك */}
          {gifts.length > 0 && (
            <DossierCard icon={Gift} title={isAr ? 'هداياك' : 'Your gifts'}>
              {gifts.map((g) => {
                const svc = SERVICES.find((s) => s.slug === g.slug);
                if (!svc) return null;
                return <Row key={`gift-${g.slug}`} k={svc.name}
                  v={g.unit === 0 ? (isAr ? 'مجانًا' : 'Free') : `${currencyFmt(g.unit)} ${t('currency')}`}
                  mono={g.unit !== 0}
                  tag={isAr ? 'هدية' : 'Gift'} />;
              })}
            </DossierCard>
          )}

          <DossierCard icon={UserRound} title={t('step4.detailsTitle')}>
            <Row k={t('step3.fullName')} v={data.name} />
            <Row k={t('step3.phone')} v={data.phone} mono />
            <Row k={t('step3.email')} v={data.email} mono />
            <Row k={t('step4.branch')} v={branchLabel(data.branch, isAr)} />
            <Row k={t('step4.dateTime')} v={`${data.date} · ${data.time}`} mono />
          </DossierCard>

          {data.towing && data.towingAddress && (
            <DossierCard icon={MapPin} title={t('step2.towingLocationTitle')}>
              <Row k={t('step2.towingAddressPlaceholder')} v={data.towingAddress} />
            </DossierCard>
          )}
        </div>

        <div>
          <div className="sticky top-28">
            <SubLabel>{t('step4.paymentTitle')}</SubLabel>
            <div className="mt-5 space-y-3">
              {PAYMENT_METHODS.map((m, i) => {
                const disabled = PAYMENT_DISABLED.has(m);
                return (
                  <PaymentRow key={m} method={m} on={data.payment === m} disabled={disabled}
                    soonLabel={isAr ? 'قريبًا' : 'Soon'}
                    title={t(`step4.${m}`)} desc={t(`step4.${m}Desc`)} delay={i * 0.06}
                    onSelect={() => { if (!disabled) set({ payment: m }); }} />
                );
              })}
            </div>

            {/* ── كود الخصم ── */}
            <PromoField isAr={isAr} data={data} set={set} services={SERVICES} t={t} />

            <div className="mt-7 rounded-3xl border border-platinum/25 bg-gradient-to-b from-platinum/[0.07] to-white/[0.01] p-5 md:p-6">
              <button data-cursor="hover" onClick={() => set({ showBreakdown: !data.showBreakdown })}
                className="flex w-full items-center justify-between pb-1 text-[0.62rem] uppercase tracking-[0.2em] text-platinum/85">
                <span>{t('step4.breakdown')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${data.showBreakdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {data.showBreakdown && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                    <div className="pt-1.5">
                      {data.services.map((slug) => {
                        const svc = SERVICES.find((s) => s.slug === slug);
                        if (!svc) return null;
                        const old = dbOldPriceFor(svc, data.size);
                        const promoCut = data.promoPerService?.[svc.id] ?? 0;
                        return (
                          <div key={slug} className="flex justify-between gap-3 py-1.5 text-[0.82rem] text-ivory/82">
                            <span className="inline-flex items-center gap-1.5">
                              {svc.name}
                              {promoCut > 0 && <span className="rounded-full bg-platinum/15 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide text-platinum">{isAr ? 'خصم' : 'Promo'}</span>}
                            </span>
                            <span dir="ltr" className="flex items-baseline gap-1.5 tabular-nums">
                              {old && <span className="font-display text-xs text-steel line-through decoration-[#c98a8a]/70">{currencyFmt(old)}</span>}
                              <span className={`font-display ${old ? 'text-[#e7b4b4]' : 'text-platinum'}`}>{svc.onRequest ? t('onRequest') : currencyFmt(dbPriceFor(svc, data.size))}</span>
                            </span>
                          </div>
                        );
                      })}
                      {data.towing && data.towingMode && (
                        <div className="flex justify-between gap-3 py-1.5 text-[0.82rem] text-ivory/82">
                          <span>{t('step4.towing')}</span>
                          <span dir="ltr" className="font-display text-platinum tabular-nums">{currencyFmt(total.tow)}</span>
                        </div>
                      )}
                      {/* (عروض) سطور الهدايا */}
                      {gifts.map((g) => {
                        const svc = SERVICES.find((s) => s.slug === g.slug);
                        if (!svc) return null;
                        return (
                          <div key={`bd-gift-${g.slug}`} className="flex justify-between gap-3 py-1.5 text-[0.82rem] text-ivory/82">
                            <span className="inline-flex items-center gap-1.5">
                              {svc.name}
                              <span className="rounded-full bg-[#d9b25f]/15 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide text-[#e8d6a8]">{isAr ? 'هدية' : 'Gift'}</span>
                            </span>
                            <span dir="ltr" className="font-display tabular-nums text-[#e8d6a8]">{g.unit === 0 ? (isAr ? 'مجانًا' : 'Free') : currencyFmt(g.unit)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="my-3.5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              {total.saved > 0 && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-[#e7b4b4]"><Check className="h-3 w-3" strokeWidth={2.4} />{t('step4.youSave')}</span>
                  <span dir="ltr" className="font-display text-[#e7b4b4] tabular-nums">−{currencyFmt(total.saved)} {t('currency')}</span>
                </div>
              )}

              {/* سطر خصم الكود — يعتمد على القيمة المحسوبة من الخادم */}
              {data.promoCode && total.promoCut > 0 && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-platinum">
                    <Tag className="h-3 w-3" strokeWidth={2} />
                    {promoLabel(isAr, data)}
                  </span>
                  <span dir="ltr" className="font-display text-platinum tabular-nums">−{currencyFmt(total.promoCut)} {t('currency')}</span>
                </div>
              )}

              {/* سطر هدية الكوبون (مجانًا) */}
              {data.promoCode && data.promoKind === 'gift_service' && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-[#e8d6a8]">
                    <Gift className="h-3 w-3" strokeWidth={2} />
                    {isAr ? 'هدية الكود' : 'Code gift'}
                  </span>
                  <span dir="ltr" className="font-display tabular-nums text-[#e8d6a8]">{isAr ? 'مجانًا' : 'Free'}</span>
                </div>
              )}

              <div className="flex items-end justify-between">
                <span className="text-[0.6rem] uppercase tracking-[0.26em] text-steel">{total.onReq && total.grand === 0 ? t('step4.estimate') : t('step4.total')}</span>
                <span className="flex items-baseline gap-1.5">
                  {total.onReq && total.grand === 0 ? (
                    <span className="font-display text-2xl text-ivory">{t('onRequest')}</span>
                  ) : (
                    <>
                      <span dir="ltr" className="font-display text-4xl text-ivory tabular-nums">{currencyFmt(total.grand)}</span>
                      <span className="text-[0.62rem] uppercase tracking-[0.18em] text-platinum/70">{t('currency')}</span>
                    </>
                  )}
                </span>
              </div>

            </div>

            {!data.payment && <p className="mt-3 text-[0.7rem] text-steel">{t('step4.selectPayment')}</p>}

            <div className="mt-7 flex flex-col gap-3">
              <button onClick={confirm} disabled={!data.payment || processing} data-cursor="hover"
                className={data.payment && !processing ? '' : 'pointer-events-none opacity-40'}>
                <PrimaryPill full>{processing ? t('step4.processing') : t('step4.confirm')}</PrimaryPill>
              </button>
              <button onClick={onBack} data-cursor="hover" className="self-center"><GhostPill>{t('step4.back')}</GhostPill></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** نص وصفي لسطر خصم الكود حسب نوعه. */
function promoLabel(isAr: boolean, data: BookingState): string {
  const code = data.promoCode ?? '';
  if (data.promoKind === 'percentage') return isAr ? `خصم الكود (${code}) −${data.promoPercent}%` : `Promo (${code}) −${data.promoPercent}%`;
  if (data.promoKind === 'fixed') return isAr ? `خصم الكود (${code})` : `Promo (${code})`;
  // أنواع الخدمات
  return isAr ? `خصم الكود (${code}) على خدمات محددة` : `Promo (${code}) — selected services`;
}

/* ── كود الخصم: تذكرة عرض تلقائية فاخرة + إدخال + تحقق ── */
const promoFmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

type AutoPromo = {
  code: string;
  kind: 'percentage' | 'fixed';
  discountPercent: number;
  fixedAmount: number;
  minOrder: number;
  label: string | null;
};

function PromoField({ isAr, data, set, services, t }: {
  isAr: boolean; data: BookingState; set: (p: Partial<BookingState>) => void;
  services: DbServiceMeta[]; t: ReturnType<typeof useTranslations>;
}) {
  const ccy = t('currency');
  const [code, setCode] = useState(data.promoCode ?? '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftName, setGiftName] = useState<string | null>(null); // اسم خدمة الهدية (للنوع gift_service)
  const [autoPromo, setAutoPromo] = useState<AutoPromo | null>(null); // العرض التلقائي (تذكرة)
  // الكوبون «مُطبَّق» لو فيه خصم > 0 أو كان كوبون هدية (الخصم صفر لكنه مفعّل).
  const applied = !!data.promoCode && (data.promoDiscount > 0 || data.promoKind === 'gift_service');

  // تذكرة العرض التلقائي (كود نشط معلّم auto_show لسطح الحجز)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/promo/auto?surface=booking').then((r) => r.json());
        if (alive && j?.ok && j.promo) setAutoPromo(j.promo);
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
  }, []);

  const errMsg = (e: string) => {
    if (isAr) return e === 'not_found' ? 'كود غير صحيح'
      : e === 'expired' ? 'انتهت صلاحية الكود'
      : e === 'not_started' ? 'الكود لسه ما اشتغلش'
      : e === 'used_up' || e === 'inactive' ? 'الكود مش متاح'
      : e === 'per_user' ? 'استخدمت الكود ده قبل كده'
      : e === 'min_order' ? `الكود يتطلّب حد أدنى للطلب`
      : e === 'no_match' ? 'الكود لا ينطبق على الخدمات المختارة'
      : 'تعذّر التحقق، حاول تاني';
    return e === 'not_found' ? 'Invalid code'
      : e === 'expired' ? 'Code expired'
      : e === 'not_started' ? 'Code not active yet'
      : e === 'used_up' || e === 'inactive' ? 'Code no longer available'
      : e === 'per_user' ? 'You already used this code'
      : e === 'min_order' ? 'Order below the code minimum'
      : e === 'no_match' ? 'Not applicable to selected services'
      : 'Could not verify, try again';
  };

  // نبني بنود الطلب: serviceId + السعر للحجم الحالي (نتخطّى on-request)
  const buildLines = () => data.services
    .map((slug) => {
      const meta = services.find((s) => s.slug === slug);
      if (!meta || meta.onRequest) return null;
      return { serviceId: meta.id, unit: dbPriceFor(meta, data.size) };
    })
    .filter(Boolean) as { serviceId: number; unit: number }[];

  const run = async (raw: string) => {
    const c = raw.trim();
    if (!c) return;
    setChecking(true); setError(null);
    try {
      const lines = buildLines();
      const subtotal = lines.reduce((s, l) => s + l.unit, 0) + (data.towing && data.towingMode ? TOWING_COST[data.towingMode] : 0);
      const res = await fetch('/api/promo/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, lines, subtotal }),
      });
      const j = await res.json();
      if (j?.ok) {
        if (j.kind === 'gift_service') {
          // كوبون هدية: لا خصم — الخدمة تتضاف مجانًا (تتسجّل في الخادم وقت الحجز).
          const gn = j.giftService
            ? ((isAr ? j.giftService.name?.ar : j.giftService.name?.en) || j.giftService.name?.ar || j.giftService.name?.en || (isAr ? 'هدية' : 'Gift'))
            : (isAr ? 'هدية' : 'Gift');
          setGiftName(gn);
          set({
            promoCode: j.code, promoKind: j.kind,
            promoPercent: 0, promoDiscount: 0,
            promoServiceIds: [], promoPerService: {},
          });
        } else {
          setGiftName(null);
          set({
            promoCode: j.code,
            promoKind: j.kind,
            promoPercent: Number(j.discountPercent) || 0,
            promoDiscount: Number(j.discount) || 0,
            promoServiceIds: j.matchedServiceIds ?? [],
            promoPerService: j.perService ?? {},
          });
        }
        setError(null);
      } else {
        setGiftName(null);
        set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {} });
        setError(errMsg(j?.error ?? 'server_error'));
      }
    } catch {
      setGiftName(null);
      set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {} });
      setError(errMsg('server_error'));
    } finally { setChecking(false); }
  };

  const check = () => run(code);
  const applyTicket = () => { if (!autoPromo) return; setCode(autoPromo.code); run(autoPromo.code); };

  const clear = () => {
    set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {} });
    setCode(''); setError(null); setGiftName(null);
  };

  const isGift = data.promoKind === 'gift_service';
  const autoValue = autoPromo
    ? (autoPromo.kind === 'fixed' ? `${promoFmt(autoPromo.fixedAmount)} ${ccy}` : `${autoPromo.discountPercent}%`)
    : '';

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.24em] text-platinum/80">
        <Tag className="h-3.5 w-3.5 text-platinum/60" strokeWidth={1.8} />
        {isAr ? 'كود خصم' : 'Promo code'}
      </div>

      {/* تذكرة العرض التلقائي — تُطبَّق بضغطة، وتختفي بعد التطبيق */}
      <AnimatePresence>
        {autoPromo && !applied && (
          <motion.button
            type="button" onClick={applyTicket} disabled={checking} data-cursor="hover"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="promo-ticket group/tk relative mb-3 flex w-full items-stretch overflow-hidden rounded-2xl border border-platinum/30 bg-gradient-to-br from-platinum/[0.1] via-platinum/[0.03] to-transparent text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-platinum/60">
            <span aria-hidden className="promo-ticket-shimmer pointer-events-none absolute inset-0" />
            <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />
            {/* قصّتا التذكرة */}
            <span aria-hidden className="absolute -start-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />
            <span aria-hidden className="absolute -end-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />

            {/* اليسار: العرض */}
            <span className="relative flex flex-1 items-center gap-3.5 p-4">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-xl border border-platinum/30 bg-platinum/[0.1]">
                <Sparkles className="h-5 w-5 text-platinum" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.2em] text-platinum/65">
                  <Tag className="h-2.5 w-2.5" strokeWidth={1.8} />{autoPromo.label || (isAr ? 'عرض حصري لحجز الموقع' : 'Exclusive online offer')}
                </span>
                <span className="mt-1 flex items-baseline gap-1.5">
                  <span dir="ltr" className="font-display text-[1.7rem] leading-none text-ivory tabular-nums">{autoValue}</span>
                  <span className="text-[0.55rem] uppercase tracking-[0.14em] text-platinum/55">{isAr ? 'خصم' : 'off'}</span>
                </span>
                {autoPromo.minOrder > 0 && (
                  <span className="mt-1 block text-[0.6rem] text-platinum/45">
                    {isAr ? `بحد أدنى ${promoFmt(autoPromo.minOrder)} ${ccy}` : `Min ${promoFmt(autoPromo.minOrder)} ${ccy}`}
                  </span>
                )}
              </span>
            </span>

            {/* فاصل منقّط */}
            <span aria-hidden className="relative my-3.5 border-s border-dashed border-platinum/30" />

            {/* اليمين: الكود + زر التطبيق */}
            <span className="relative flex flex-none flex-col items-center justify-center gap-2 px-5">
              <span dir="ltr" className="font-display text-sm tracking-[0.18em] text-ivory">{autoPromo.code}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-white to-platinum px-3.5 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.12em] text-obsidian transition-transform duration-300 group-hover/tk:scale-[1.04]">
                {checking ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> : <Check className="h-3 w-3" strokeWidth={2.6} />}
                {isAr ? 'طبّق العرض' : 'Apply'}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {applied ? (
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isGift ? 'border-[#d9b25f]/40 bg-[#d9b25f]/[0.07]' : 'border-platinum/40 bg-platinum/[0.07]'}`}>
          <span className="inline-flex items-center gap-2 text-sm text-ivory">
            {isGift ? <Gift className="h-4 w-4 text-[#e8d6a8]" strokeWidth={2} /> : <Check className="h-4 w-4 text-platinum" strokeWidth={2.4} />}
            <span className="font-display tracking-[0.12em]">{data.promoCode}</span>
            <span className={isGift ? 'text-[#e8d6a8]' : 'text-platinum/80'}>
              {isGift
                ? (isAr ? `· هديتك: ${giftName ?? 'خدمة'} مجانًا` : `· Gift: ${giftName ?? 'service'} free`)
                : `· −${currencyFmt(data.promoDiscount)} ${t('currency')}`}
            </span>
          </span>
          <button data-cursor="hover" onClick={clear} aria-label="remove"
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 text-platinum/70 transition-colors hover:border-[#7c1a1a]/60 hover:text-[#e7b4b4]">
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <input
            value={code} dir="ltr"
            onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/\s+/g, '')); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            placeholder={isAr ? 'اكتب الكود' : 'Enter code'}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 font-display text-sm tracking-[0.14em] text-ivory placeholder:font-sans placeholder:tracking-normal placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
          <button data-cursor="hover" onClick={check} disabled={checking || !code.trim()}
            className={`inline-flex flex-none items-center gap-2 rounded-2xl border px-5 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
              checking || !code.trim()
                ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-steel/50'
                : 'border-platinum/40 bg-platinum/[0.08] text-ivory hover:border-platinum/70 hover:bg-platinum/[0.14]'
            }`}>
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
            {isAr ? 'تحقّق' : 'Apply'}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[0.66rem] tracking-wide text-[#c98a8a]">{error}</p>}
      <style>{`
        .promo-ticket-shimmer{background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,0.07) 50%,transparent 58%);background-size:280% 100%;animation:promoSweep 6s ease-in-out infinite;}
        @keyframes promoSweep{0%{background-position:140% 0}100%{background-position:-140% 0}}
        @media (prefers-reduced-motion: reduce){ .promo-ticket-shimmer{ animation:none; } }
      `}</style>
    </div>
  );
}

function Heading({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3.5">
        <span className="font-display text-base text-platinum tabular-nums">04</span>
        <span className="h-px w-8 bg-platinum/40" />
        <span className="text-[0.55rem] uppercase tracking-[0.3em] text-steel">{t('steps.payment')}</span>
      </div>
      <h2 className="font-display text-3xl font-light uppercase leading-tight tracking-tight text-ivory md:text-4xl">{t('step4.heading')}</h2>
      <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-platinum/60">{t('step4.subheading')}</p>
    </div>
  );
}

function DossierCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-platinum">
          <Icon className="reversible-icon h-4 w-4" strokeWidth={1.5} />
        </span>
        <span className="text-[0.58rem] uppercase tracking-[0.26em] text-platinum/80">{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </motion.div>
  );
}

function Row({ k, v, mono, tag }: { k: string; v: string; mono?: boolean; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="inline-flex items-center gap-1.5 text-platinum/55">
        {k}
        {tag && <span className="rounded-full bg-platinum/15 px-1.5 py-0.5 text-[0.5rem] uppercase tracking-wide text-platinum">{tag}</span>}
      </span>
      <span dir={mono ? 'ltr' : undefined} className={`text-end text-ivory/90 ${mono ? 'font-display tracking-wide tabular-nums' : ''}`}>{v}</span>
    </div>
  );
}

function BannerChip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span dir={mono ? 'ltr' : undefined}
      className={`rounded-full border border-white/15 bg-obsidian/40 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-platinum/90 backdrop-blur-sm ${mono ? 'font-display !tracking-[0.12em]' : ''}`}>
      {children}
    </span>
  );
}

function PaymentRow({ method, on, title, desc, delay, onSelect, disabled, soonLabel }: {
  method: PaymentMethod; on: boolean; title: string; desc: string; delay: number; onSelect: () => void;
  disabled?: boolean; soonLabel?: string;
}) {
  return (
    <motion.button data-cursor={disabled ? undefined : 'hover'} onClick={onSelect} disabled={disabled} aria-disabled={disabled}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: EASE }}
      className={['flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-300',
        disabled ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.01] opacity-55'
          : on ? 'border-platinum/45 bg-platinum/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'].join(' ')}>
      <span className={disabled ? 'grayscale' : ''}><PaymentMark method={method} /></span>
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-ivory">
          {title}
          {disabled && soonLabel && (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.14em] text-platinum/70">{soonLabel}</span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-platinum/55">{desc}</span>
      </span>
      <span className={['grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border transition-all duration-300',
        on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/20'].join(' ')}>
        {on && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
      </span>
    </motion.button>
  );
}

function PaymentMark({ method }: { method: PaymentMethod }) {
  if (method === 'applePay') {
    return (
      <span className="grid h-10 w-14 flex-shrink-0 place-items-center rounded-lg border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.01]">
        <span className="inline-flex items-center text-[0.62rem] font-semibold text-ivory">
          <svg viewBox="0 0 24 24" className="me-px h-[11px] w-[11px] fill-ivory"><path d="M17.5 12.3c0-2 1.6-2.9 1.7-3-.9-1.3-2.4-1.5-2.9-1.5-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.6-1 2.3-2c.7-1.1 1-2.1 1-2.2-.1 0-2.2-.9-2.2-3.6zM15.6 6.5c.5-.6.9-1.5.8-2.4-.8 0-1.7.5-2.2 1.1-.5.5-.9 1.4-.8 2.3.9.1 1.8-.4 2.2-1z" /></svg>
          Pay
        </span>
      </span>
    );
  }
  const label = method === 'cash' ? 'CASH' : method === 'tabby' ? 'tabby' : 'tamara';
  return (
    <span className="grid h-10 w-14 flex-shrink-0 place-items-center rounded-lg border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.01]">
      <span className="text-[0.62rem] font-semibold tracking-tight text-ivory">{label}</span>
    </span>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}