'use client';

/**
 * StepConfirm — act 03 (بعد إلغاء خطوة بيانات العميل المنفصلة).
 * الخدمات من القاعدة + كود خصم متعدّد الأنواع.
 *
 * (تحديث) شيل عرض اللون واللوحة والإيميل (لم تعد تُجمع). أُضيف تشيك إجباري
 * للموافقة على الشروط والأحكام وسياسة الاسترجاع قبل تفعيل زر «تأكيد الحجز» —
 * بالضغط على رابط «الشروط والأحكام» يفتح مودال (كونتينر) بنص السياسة كاملًا.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Car, Wrench, UserRound, MapPin, Check, ChevronDown, ShieldCheck, Tag, X, Loader2, Gift, Sparkles, CreditCard } from 'lucide-react';

import {
  BRANDS, PAYMENT_METHODS, PAYMENT_DISABLED, branchLabel, currencyFmt,
  TOWING_COST,
  type PaymentMethod, type VehicleSize,
} from '@/lib/booking-data';
import { dbPriceFor, dbOldPriceFor, type DbServiceMeta } from '@/lib/booking-pricing';
import { useAuth } from '@/components/shared/auth-provider';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

const SIZE_LABELS: Record<VehicleSize, { ar: string; en: string; tier: string }> = {
  small: { ar: 'صغيرة', en: 'Small', tier: 'Tier I' },
  medium: { ar: 'متوسطة', en: 'Medium', tier: 'Tier II' },
  large: { ar: 'كبيرة', en: 'Large', tier: 'Tier III' },
};

/* ── نص الشروط والأحكام / سياسة الاسترجاع (مطابق لنص الفاتورة) ── */
const TERMS_AR = [
  'يحق للعميل طلب استرجاع المبلغ المدفوع خلال 7 أيام عمل من تاريخ الدفع، شريطة أن يكون الطلب قبل تنفيذ الخدمة.',
  'لا يُقبل أي طلب استرجاع بعد تنفيذ الخدمة أو بعد انتهاء فترة الاسترجاع المنصوص عليها، وذلك بصرف النظر عن السبب.',
  'يُعاد المبلغ المستحق إلى حساب العميل عبر وسيلة الدفع الأصلية خلال مدة لا تتجاوز 15 يوم عمل من تاريخ قبول الطلب.',
  'يحق للعميل استبدال الخدمة المحجوزة بخدمة أخرى قبل استلام المركبة، وفي حال كانت الخدمة البديلة أعلى سعرًا يلزم العميل بسداد فرق السعر.',
  'تسري صلاحية الحجز لمدة 3 أشهر من تاريخ الدفع، وفي حال انقضت المدة دون تنفيذ الخدمة يتم استرجاع مبلغ العميل بعد استقطاع ضريبة القيمة المضافة إلى حسابه البنكي أو محفظته الإلكترونية.',
  'لا تخضع المشتريات التي تمت بالقسائم الشرائية أو رموز الخصم لسياسة الاسترجاع بأي حال من الأحوال.',
  'لا تخضع العروض والباقات الخاصة للاسترجاع، ويُتاح الاستبدال بباقة مماثلة أو أعلى مع سداد فرق السعر.',
  'تُعد هذه السياسة جزءًا لا يتجزأ من عقد الخدمة، وإتمام الدفع يُعد قبولًا صريحًا لجميع بنودها.',
];
const TERMS_EN = [
  'A refund of the paid amount may be requested within 7 business days from the payment date, provided the request is made before the service is performed.',
  'No refund request is accepted after the service is performed or after the stated refund period ends, regardless of the reason.',
  'The due amount is returned to the customer via the original payment method within no more than 15 business days from the date the request is accepted.',
  'The customer may exchange the booked service for another before the vehicle is handed over; if the alternative service is of higher price, the customer pays the difference.',
  'The booking is valid for 3 months from the payment date. If the period lapses without the service being performed, the amount is refunded — after deducting VAT — to the customer\'s bank account or e-wallet.',
  'Purchases made with vouchers or discount codes are not subject to the refund policy under any circumstances.',
  'Special offers and packages are non-refundable; exchange is available for an equal or higher package with payment of the price difference.',
  'This policy is an integral part of the service contract, and completing payment is an explicit acceptance of all its terms.',
];

export function StepConfirm({
  t, isAr, data, total, set, services: SERVICES, onBack, onConfirm,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  total: { services: number; tow: number; beforePromo: number; promoCut: number; bankCut: number; grand: number; onReq: boolean; saved: number; originalTotal: number };
  set: (patch: Partial<BookingState>) => void;
  services: DbServiceMeta[];
  onBack: () => void; onConfirm: () => Promise<boolean>;
}) {
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const brand = BRANDS.find((b) => b.id === data.brandId);
  const szL = SIZE_LABELS[data.size] ?? SIZE_LABELS.large;
  const sizeChip = `${isAr ? szL.ar : szL.en} · ${szL.tier}`;
  const gifts = data.gifts ?? [];

  const hasGiftCode = data.promoKind === 'gift_service' && !!data.giftServiceSlug;

  const confirm = () => {
    if (!data.payment || !data.agreedToTerms) return;
    setProcessing(true);
    setPayError(null);
    setTimeout(async () => {
      const ok = await onConfirm();
      if (!ok) {
        setProcessing(false);
        setPayError(isAr
          ? 'حصل خطأ أثناء تأكيد الحجز، برجاء المحاولة مرة أخرى أو التواصل معنا.'
          : 'Something went wrong confirming your booking. Please try again or contact us.');
      }
    }, 1100);
  };

  const showOriginal = total.originalTotal > total.grand && (total.saved > 0 || total.promoCut > 0);
  const canConfirm = !!data.payment && data.agreedToTerms;

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
              <BannerChip>{sizeChip}</BannerChip>
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
            <Row k={t('step1.brand')} v={brand?.name ?? ''} />
            <Row k={t('step1.model')} v={data.model} />
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
            {data.services.length === 0 && (
              <p className="text-[0.78rem] text-steel">{isAr ? 'لا خدمات مدفوعة — هدية فقط.' : 'No paid services — gift only.'}</p>
            )}
            {data.towing && data.towingMode && (
              <>
                <Row k={t('step4.towing')} v={`${currencyFmt(total.tow)} ${t('currency')}`} mono />
                <p className="text-[0.64rem] leading-relaxed text-steel/60">
                  {isAr ? '* سعر تقريبي — قابل للتعديل حسب موقعك الفعلي.' : '* Estimated — may vary based on your actual location.'}
                </p>
              </>
            )}
          </DossierCard>

          {(gifts.length > 0 || hasGiftCode) && (
            <DossierCard icon={Gift} title={isAr ? 'هداياك' : 'Your gifts'}>
              {hasGiftCode && (
                <Row k={data.giftServiceName || (isAr ? 'هدية الكود' : 'Code gift')}
                  v={isAr ? 'مجانًا' : 'Free'} tag={isAr ? 'هدية' : 'Gift'} />
              )}
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

            <PromoField isAr={isAr} data={data} set={set} services={SERVICES} t={t} />

            <BankDiscountField isAr={isAr} data={data} set={set} t={t} />

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
                          <span className="inline-flex items-center gap-1.5">
                            {t('step4.towing')}
                            <span className="text-[0.58rem] text-steel/60">{isAr ? '(تقريبي)' : '(est.)'}</span>
                          </span>
                          <span dir="ltr" className="font-display text-platinum tabular-nums">{currencyFmt(total.tow)}</span>
                        </div>
                      )}
                      {hasGiftCode && (
                        <div className="flex justify-between gap-3 py-1.5 text-[0.82rem] text-ivory/82">
                          <span className="inline-flex items-center gap-1.5">
                            {data.giftServiceName || (isAr ? 'هدية الكود' : 'Code gift')}
                            <span className="rounded-full bg-[#d9b25f]/15 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide text-[#e8d6a8]">{isAr ? 'هدية' : 'Gift'}</span>
                          </span>
                          <span dir="ltr" className="font-display tabular-nums text-[#e8d6a8]">{isAr ? 'مجانًا' : 'Free'}</span>
                        </div>
                      )}
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

              {showOriginal && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="text-platinum/60">{isAr ? 'الإجمالي قبل الخصم' : 'Subtotal'}</span>
                  <span dir="ltr" className="font-display text-platinum/55 tabular-nums line-through decoration-white/25">{currencyFmt(total.originalTotal)} {t('currency')}</span>
                </div>
              )}

              {total.saved > 0 && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-[#e7b4b4]"><Check className="h-3 w-3" strokeWidth={2.4} />{t('step4.youSave')}</span>
                  <span dir="ltr" className="font-display text-[#e7b4b4] tabular-nums">−{currencyFmt(total.saved)} {t('currency')}</span>
                </div>
              )}

              {data.promoCode && total.promoCut > 0 && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-platinum">
                    <Tag className="h-3 w-3" strokeWidth={2} />
                    {promoLabel(isAr, data)}
                  </span>
                  <span dir="ltr" className="font-display text-platinum tabular-nums">−{currencyFmt(total.promoCut)} {t('currency')}</span>
                </div>
              )}

              {data.bankVerified && total.bankCut > 0 && (
                <div className="mb-2.5 flex items-center justify-between text-[0.78rem]">
                  <span className="inline-flex items-center gap-1.5 text-[#9fd4b0]">
                    <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                    {isAr ? `خصم عملاء البنك الأهلي (${data.bankDiscountPercent}%)` : `Bank customer discount (${data.bankDiscountPercent}%)`}
                  </span>
                  <span dir="ltr" className="font-display text-[#9fd4b0] tabular-nums">−{currencyFmt(total.bankCut)} {t('currency')}</span>
                </div>
              )}

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
                <span className="flex flex-col gap-0.5">
                  <span className="text-[0.6rem] uppercase tracking-[0.26em] text-steel">{total.onReq && total.grand === 0 ? t('step4.estimate') : t('step4.total')}</span>
                  {!(total.onReq && total.grand === 0) && (
                    <span className="text-[0.56rem] normal-case tracking-normal text-steel/70">({isAr ? 'شامل ضريبة القيمة المضافة' : 'incl. VAT'})</span>
                  )}
                </span>
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

              <p className="mt-4 border-t border-white/[0.06] pt-3 text-center text-[0.62rem] leading-relaxed text-steel/70">
                {isAr ? 'جميع الأسعار شاملة ضريبة القيمة المضافة (15%)' : 'All prices are inclusive of VAT (15%)'}
              </p>
            </div>

            {/* ── تشيك الموافقة على الشروط والأحكام ── */}
            <TermsConsent isAr={isAr} checked={data.agreedToTerms} onChange={(v) => set({ agreedToTerms: v })} onOpen={() => setTermsOpen(true)} />

            {!data.payment && <p className="mt-3 text-[0.7rem] text-steel">{t('step4.selectPayment')}</p>}
            {data.payment && !data.agreedToTerms && (
              <p className="mt-3 text-[0.7rem] text-steel">{isAr ? 'يجب الموافقة على الشروط والأحكام للمتابعة' : 'Please agree to the terms to continue'}</p>
            )}
            {payError && <p className="mt-3 text-[0.7rem] text-[#e7b4b4]">{payError}</p>}

            <div className="mt-7 flex flex-col gap-3">
              <button onClick={confirm} disabled={!canConfirm || processing} data-cursor="hover"
                className={canConfirm && !processing ? '' : 'pointer-events-none opacity-40'}>
                <PrimaryPill full>{processing ? t('step4.processing') : t('step4.confirm')}</PrimaryPill>
              </button>
              <button onClick={onBack} data-cursor="hover" className="self-center"><GhostPill>{t('step4.back')}</GhostPill></button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {termsOpen && (
          <TermsModal isAr={isAr} onClose={() => setTermsOpen(false)}
            onAgree={() => { set({ agreedToTerms: true }); setTermsOpen(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── تشيك + مودال الشروط والأحكام ── */
function TermsConsent({ isAr, checked, onChange, onOpen }: {
  isAr: boolean; checked: boolean; onChange: (v: boolean) => void; onOpen: () => void;
}) {
  return (
    <label
      data-cursor="hover"
      className={['mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors duration-300',
        checked ? 'border-platinum/40 bg-platinum/[0.06]' : 'border-white/12 bg-white/[0.02] hover:border-white/25'].join(' ')}>
      <span className={['mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-md border transition-all duration-300',
        checked ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/25'].join(' ')}>
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="sr-only" aria-label={isAr ? 'الموافقة على الشروط والأحكام' : 'Terms agreement'} />
      <span className="text-[0.8rem] leading-relaxed text-platinum/80">
        {isAr ? 'أوافق على ' : 'I agree to the '}
        <button type="button" data-cursor="hover" onClick={(e) => { e.preventDefault(); onOpen(); }}
          className="text-ivory underline decoration-platinum/50 underline-offset-4 transition-colors hover:text-platinum">
          {isAr ? 'الشروط والأحكام وسياسة الاسترجاع' : 'Terms & Conditions and Refund Policy'}
        </button>
      </span>
    </label>
  );
}

function TermsModal({ isAr, onClose, onAgree }: { isAr: boolean; onClose: () => void; onAgree: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#0c0d0e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="font-display text-lg uppercase text-ivory">{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</h3>
          <button data-cursor="hover" onClick={onClose} aria-label="close"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ol className="list-decimal space-y-2.5 ps-5 text-[0.82rem] leading-relaxed text-platinum/80">
            {(isAr ? TERMS_AR : TERMS_EN).map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>
        <div className="border-t border-white/10 p-5">
          <button onClick={onAgree} data-cursor="hover"><PrimaryPill full>{isAr ? 'أوافق ومتابعة' : 'I Agree & Continue'}</PrimaryPill></button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/** نص وصفي لسطر خصم الكود حسب نوعه. */
function promoLabel(isAr: boolean, data: BookingState): string {
  const code = data.promoCode ?? '';
  if (data.promoKind === 'percentage') return isAr ? `خصم الكود (${code}) −${data.promoPercent}%` : `Promo (${code}) −${data.promoPercent}%`;
  if (data.promoKind === 'fixed') return isAr ? `خصم الكود (${code})` : `Promo (${code})`;
  return isAr ? `خصم الكود (${code}) على خدمات محددة` : `Promo (${code}) — selected services`;
}

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
  const { member } = useAuth();
  const isPartner = member?.role === 'partner';
  const [code, setCode] = useState(data.promoCode ?? '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftName, setGiftName] = useState<string | null>(data.giftServiceName ?? null);
  const [autoPromo, setAutoPromo] = useState<AutoPromo | null>(null);
  const applied = !!data.promoCode && (data.promoDiscount > 0 || data.promoKind === 'gift_service');

  useEffect(() => {
    if (isPartner) return;
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/promo/auto?surface=booking').then((r) => r.json());
        if (alive && j?.ok && j.promo) setAutoPromo(j.promo);
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
  }, [isPartner]);

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
          const gn = j.giftService
            ? ((isAr ? j.giftService.name?.ar : j.giftService.name?.en) || j.giftService.name?.ar || j.giftService.name?.en || (isAr ? 'هدية' : 'Gift'))
            : (isAr ? 'هدية' : 'Gift');
          setGiftName(gn);
          set({
            promoCode: j.code, promoKind: j.kind,
            promoPercent: 0, promoDiscount: 0,
            promoServiceIds: [], promoPerService: {},
            giftServiceSlug: j.giftService?.slug ?? null,
            giftServiceName: gn,
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
            giftServiceSlug: null, giftServiceName: null,
          });
        }
        setError(null);
      } else {
        setGiftName(null);
        set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {}, giftServiceSlug: null, giftServiceName: null });
        setError(errMsg(j?.error ?? 'server_error'));
      }
    } catch {
      setGiftName(null);
      set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {}, giftServiceSlug: null, giftServiceName: null });
      setError(errMsg('server_error'));
    } finally { setChecking(false); }
  };

  const check = () => run(code);
  const applyTicket = () => { if (!autoPromo) return; setCode(autoPromo.code); run(autoPromo.code); };

  const clear = () => {
    set({ promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0, promoServiceIds: [], promoPerService: {}, giftServiceSlug: null, giftServiceName: null });
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

      <AnimatePresence>
        {autoPromo && !applied && !isPartner && (
          <motion.button
            type="button" onClick={applyTicket} disabled={checking} data-cursor="hover"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="promo-ticket group/tk relative mb-3 flex w-full items-stretch overflow-hidden rounded-2xl border border-platinum/30 bg-gradient-to-br from-platinum/[0.1] via-platinum/[0.03] to-transparent text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-platinum/60">
            <span aria-hidden className="promo-ticket-shimmer pointer-events-none absolute inset-0" />
            <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />
            <span aria-hidden className="absolute -start-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />
            <span aria-hidden className="absolute -end-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />

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

            <span aria-hidden className="relative my-3.5 border-s border-dashed border-platinum/30" />

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
                ? (isAr ? `· هديتك: ${giftName ?? data.giftServiceName ?? 'خدمة'} مجانًا` : `· Gift: ${giftName ?? data.giftServiceName ?? 'service'} free`)
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

function BankDiscountField({ isAr, data, set, t }: {
  isAr: boolean; data: BookingState; set: (p: Partial<BookingState>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(!!data.bankVerified);
  const [digits, setDigits] = useState(data.bankCardDigits ?? '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    const d = digits.replace(/\D/g, '').slice(0, 8);
    if (d.length < 6) { setError(isAr ? 'أدخل 6 أرقام على الأقل من رقم الكارت' : 'Enter at least 6 digits'); return; }
    setChecking(true); setError(null);
    try {
      const res = await fetch('/api/bank-discount/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardDigits: d }),
      });
      const j = await res.json();
      if (j?.ok) {
        set({
          bankVerified: true, bankCardDigits: d, bankCode: j.bankCode, bankDiscountPercent: j.percent,
          promoCode: null, promoPercent: 0, promoKind: null, promoDiscount: 0,
          promoServiceIds: [], promoPerService: {}, giftServiceSlug: null, giftServiceName: null,
        });
      } else {
        set({ bankVerified: false, bankCode: null, bankDiscountPercent: 0 });
        setError(isAr ? 'الكارت ده مش من البنك الأهلي السعودي' : 'This card is not from Saudi National Bank');
      }
    } catch {
      setError(isAr ? 'تعذّر التحقق، حاول تاني' : 'Could not verify, try again');
    } finally { setChecking(false); }
  };

  const clear = () => {
    set({ bankVerified: false, bankCardDigits: null, bankCode: null, bankDiscountPercent: 0 });
    setDigits(''); setError(null);
  };

  if (data.bankVerified) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
        className="relative mt-4 overflow-hidden rounded-2xl border border-[#9fd4b0]/40 bg-gradient-to-br from-[#9fd4b0]/[0.1] via-[#9fd4b0]/[0.03] to-transparent px-5 py-4">
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#9fd4b0]/50 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[#9fd4b0]/40 bg-[#9fd4b0]/[0.12]">
              <ShieldCheck className="h-5 w-5 text-[#9fd4b0]" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-sm font-medium text-ivory">
                {isAr ? 'تم التحقق من بطاقة البنك الأهلي' : 'Saudi National Bank card verified'}
              </span>
              <span className="mt-0.5 block text-xs text-[#9fd4b0]">
                {isAr ? `خصم ${data.bankDiscountPercent}% مُطبَّق على طلبك` : `${data.bankDiscountPercent}% off applied to your order`}
              </span>
            </span>
          </span>
          <button data-cursor="hover" onClick={clear} aria-label="remove"
            className="grid h-7 w-7 flex-none place-items-center rounded-full border border-white/15 text-platinum/70 transition-colors hover:border-[#7c1a1a]/60 hover:text-[#e7b4b4]">
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </motion.div>
    );
  }

  if (open) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
        className="relative mt-4 overflow-hidden rounded-2xl border border-[#9fd4b0]/35 bg-gradient-to-br from-[#9fd4b0]/[0.07] via-white/[0.02] to-transparent p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[#9fd4b0]/35 bg-[#9fd4b0]/[0.1]">
            <ShieldCheck className="h-5 w-5 text-[#9fd4b0]" strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-sm font-medium text-ivory">{isAr ? 'تحقق من بطاقة البنك الأهلي' : 'Verify your Saudi National Bank card'}</span>
            <span className="mt-0.5 block text-xs text-platinum/55">
              {isAr ? 'أول 8 أرقام فقط — خصم 20%، لا يُجمع مع خصومات أخرى' : 'First 8 digits only — 20% off, not combinable'}
            </span>
          </span>
          <button data-cursor="hover" onClick={() => setOpen(false)} aria-label="close"
            className="ms-auto grid h-7 w-7 flex-none place-items-center rounded-full border border-white/15 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex gap-2.5">
          <input
            value={digits} dir="ltr" inputMode="numeric" maxLength={8} autoFocus
            onChange={(e) => { setDigits(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            placeholder={isAr ? 'مثال: 4567 1234' : 'e.g. 4567 1234'}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 font-display text-sm tracking-[0.14em] text-ivory placeholder:font-sans placeholder:tracking-normal placeholder:text-steel/60 outline-none transition-colors focus:border-[#9fd4b0]/50 focus:bg-white/[0.05]" />
          <button data-cursor="hover" onClick={check} disabled={checking || digits.length < 8}
            className={`inline-flex flex-none items-center gap-2 rounded-2xl border px-5 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
              checking || digits.length < 8
                ? 'cursor-not-allowed border-white/10 bg-white/[0.02] text-steel/50'
                : 'border-[#9fd4b0]/40 bg-[#9fd4b0]/[0.1] text-ivory hover:border-[#9fd4b0]/70 hover:bg-[#9fd4b0]/[0.16]'
            }`}>
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />}
            {isAr ? 'تحقّق' : 'Verify'}
          </button>
        </div>
        {error && <p className="mt-2 text-[0.66rem] tracking-wide text-[#c98a8a]">{error}</p>}
        <div className="mt-3 flex items-center gap-1.5 text-[0.62rem] text-platinum/45">
          <ShieldCheck className="h-3 w-3" strokeWidth={1.8} />
          {isAr ? 'بياناتك مشفّرة ولا تُحفظ بالكامل — أول 8 أرقام فقط للتحقق.' : 'Your data is encrypted — only the first 8 digits are used for verification.'}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.button
        type="button" onClick={() => setOpen(true)} data-cursor="hover"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
        className="bank-offer-card group/bk relative mt-4 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-[#9fd4b0]/25 bg-gradient-to-br from-[#9fd4b0]/[0.08] via-white/[0.02] to-transparent p-4 text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9fd4b0]/55">
        <span aria-hidden className="bank-offer-shimmer pointer-events-none absolute inset-0" />
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#9fd4b0]/40 to-transparent" />

        <span className="relative grid h-12 w-12 flex-none place-items-center rounded-xl border border-[#9fd4b0]/35 bg-[#9fd4b0]/[0.1]">
          <ShieldCheck className="h-6 w-6 text-[#9fd4b0]" strokeWidth={1.6} />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-[#9fd4b0]/85">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={1.8} />
            {isAr ? 'عرض حصري لعملاء البنك الأهلي السعودي' : 'Exclusive Saudi National Bank offer'}
          </span>
          <span className="mt-1 block font-display text-lg leading-none text-ivory">
            {isAr ? 'وفّر 20% على طلبك' : 'Save 20% on your order'}
          </span>
          <span className="mt-1 block text-[0.68rem] text-platinum/55">
            {isAr ? 'اربط بطاقتك البنكية للتحقق الفوري' : 'Link your bank card for instant verification'}
          </span>
        </span>

        <span className="relative inline-flex flex-none items-center gap-1.5 rounded-full bg-gradient-to-br from-[#c3ecd1] to-[#9fd4b0] px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-obsidian transition-transform duration-300 group-hover/bk:scale-[1.04]">
          {isAr ? 'تحقق الآن' : 'Verify now'}
        </span>
      </motion.button>
      <style>{`
        .bank-offer-shimmer{background:linear-gradient(115deg,transparent 42%,rgba(159,212,176,0.14) 50%,transparent 58%);background-size:280% 100%;animation:bankSweep 6s ease-in-out infinite;}
        @keyframes bankSweep{0%{background-position:140% 0}100%{background-position:-140% 0}}
        @media (prefers-reduced-motion: reduce){ .bank-offer-shimmer{ animation:none; } }
      `}</style>
    </>
  );
}

function Heading({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3.5">
        <span className="font-display text-base text-platinum tabular-nums">03</span>
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
  if (method === 'card') {
    return (
      <span className="grid h-10 w-14 flex-shrink-0 place-items-center rounded-lg border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.01]">
        <CreditCard className="h-5 w-5 text-ivory" strokeWidth={1.6} />
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