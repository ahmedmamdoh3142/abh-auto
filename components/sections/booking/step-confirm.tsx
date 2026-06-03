'use client';

/**
 * StepConfirm — act 04. Full booking dossier, payment selection
 * (Tabby / Tamara / Apple Pay / Cash) and the final confirm action.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Car, Wrench, UserRound, MapPin, Check, ChevronDown, ShieldCheck } from 'lucide-react';

import {
  BRANDS, SERVICES, PAYMENT_METHODS, priceFor, oldPriceFor, currencyFmt,
  type PaymentMethod,
} from '@/lib/booking-data';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

export function StepConfirm({
  t, isAr, data, total, set, onBack, onConfirm,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  total: { services: number; tow: number; grand: number; onReq: boolean; saved: number };
  set: (patch: Partial<BookingState>) => void;
  onBack: () => void; onConfirm: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const brand = BRANDS.find((b) => b.id === data.brandId);

  const confirm = () => {
    if (!data.payment) return;
    setProcessing(true);
    setTimeout(onConfirm, 1100);
  };

  return (
    <div>
      <Heading t={t} />

      {/* cinematic vehicle banner — breaks the monotony of the cards below */}
      <div className="relative mt-8 overflow-hidden rounded-[24px] border border-white/[0.08]">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center brightness-[0.4] grayscale-[0.5]"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=70&w=1600')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/55 to-[#050608]/20" />
        <div className="absolute inset-0 bg-gradient-to-e from-[#050608]/80 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between md:p-8"
        >
          <div>
            <span className="text-[0.55rem] uppercase tracking-[0.3em] text-platinum/70">{t('step4.reserving')}</span>
            <h3 className="mt-2 font-display text-3xl uppercase leading-none text-ivory md:text-4xl">
              {brand?.name} <span className="text-platinum">{data.model}</span>
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BannerChip>{t(`colors.${data.colorKey}`)}</BannerChip>
              <BannerChip>{t('step2.largeVehicle')} · Tier III</BannerChip>
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
        {/* ── Dossier ──────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* vehicle */}
          <DossierCard icon={Car} title={t('step4.vehicleTitle')}>
            <Row k={`${brand?.name ?? ''}`} v={data.model} />
            <Row k={t('step1.color')} v={t(`colors.${data.colorKey}`)} />
            <Row k={t('step1.plate')} v={data.plate} mono />
          </DossierCard>

          {/* services */}
          <DossierCard icon={Wrench} title={t('step4.servicesTitle')}>
            {data.services.map((slug) => {
              const svc = SERVICES.find((s) => s.slug === slug)!;
              return <Row key={slug} k={t(`svc.${slug}.name`)}
                v={svc.onRequest ? t('onRequest') : `${currencyFmt(priceFor(svc, data.size))} ${t('currency')}`} mono={!svc.onRequest} />;
            })}
            {data.towing && data.towingMode && (
              <Row k={t('step4.towing')} v={`${currencyFmt(total.tow)} ${t('currency')}`} mono />
            )}
          </DossierCard>

          {/* details */}
          <DossierCard icon={UserRound} title={t('step4.detailsTitle')}>
            <Row k={t('step3.fullName')} v={data.name} />
            <Row k={t('step3.phone')} v={data.phone} mono />
            <Row k={t('step3.email')} v={data.email} mono />
            <Row k={t('step4.branch')} v={t(`branches.${data.branch}`)} />
            <Row k={t('step4.dateTime')} v={`${data.date} · ${data.time}`} mono />
          </DossierCard>

          {data.towing && data.towingAddress && (
            <DossierCard icon={MapPin} title={t('step2.towingLocationTitle')}>
              <Row k={t('step2.towingAddressPlaceholder')} v={data.towingAddress} />
            </DossierCard>
          )}
        </div>

        {/* ── Payment ──────────────────────────────────────────── */}
        <div>
          <div className="sticky top-28">
            <SubLabel>{t('step4.paymentTitle')}</SubLabel>
            <div className="mt-5 space-y-3">
              {PAYMENT_METHODS.map((m, i) => (
                <PaymentRow
                  key={m}
                  method={m}
                  on={data.payment === m}
                  title={t(`step4.${m}`)}
                  desc={t(`step4.${m}Desc`)}
                  delay={i * 0.06}
                  onSelect={() => set({ payment: m })}
                />
              ))}
            </div>

            {/* price box with expandable breakdown */}
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
                        const svc = SERVICES.find((s) => s.slug === slug)!;
                        const old = oldPriceFor(svc, data.size);
                        return (
                          <div key={slug} className="flex justify-between gap-3 py-1.5 text-[0.82rem] text-ivory/82">
                            <span>{t(`svc.${slug}.name`)}</span>
                            <span dir="ltr" className="flex items-baseline gap-1.5 tabular-nums">
                              {old && <span className="font-display text-xs text-steel line-through decoration-[#c98a8a]/70">{currencyFmt(old)}</span>}
                              <span className={`font-display ${old ? 'text-[#e7b4b4]' : 'text-platinum'}`}>{svc.onRequest ? t('onRequest') : currencyFmt(priceFor(svc, data.size))}</span>
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
              {data.payment === 'tabby' && total.grand > 0 && (
                <InstallmentNote t={t} text={t('step4.tabbyNote', { amount: currencyFmt(Math.round(total.grand / 4)) })} />
              )}
              {data.payment === 'tamara' && total.grand > 0 && (
                <InstallmentNote t={t} text={t('step4.tamaraNote', { amount: currencyFmt(Math.round(total.grand / 3)) })} />
              )}
            </div>

            {!data.payment && <p className="mt-3 text-[0.7rem] text-steel">{t('step4.selectPayment')}</p>}

            <div className="mt-7 flex flex-col gap-3">
              <button onClick={confirm} disabled={!data.payment || processing} data-cursor="hover"
                className={data.payment && !processing ? '' : 'pointer-events-none opacity-40'}>
                <PrimaryPill full>
                  {processing ? t('step4.processing') : t('step4.confirm')}
                </PrimaryPill>
              </button>
              <button onClick={onBack} data-cursor="hover" className="self-center"><GhostPill>{t('step4.back')}</GhostPill></button>
            </div>
          </div>
        </div>
      </div>
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

function DossierCard({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
    >
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

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-platinum/55">{k}</span>
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

function PaymentRow({
  method, on, title, desc, delay, onSelect,
}: {
  method: PaymentMethod; on: boolean; title: string; desc: string; delay: number; onSelect: () => void;
}) {
  return (
    <motion.button
      data-cursor="hover"
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4, ease: EASE }}
      className={[
        'flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-300',
        on ? 'border-platinum/45 bg-platinum/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
      ].join(' ')}
    >
      <PaymentMark method={method} />
      <span className="flex-1">
        <span className="block text-sm font-medium text-ivory">{title}</span>
        <span className="mt-0.5 block text-xs text-platinum/55">{desc}</span>
      </span>
      <span className={[
        'grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border transition-all duration-300',
        on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/20',
      ].join(' ')}>
        {on && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
      </span>
    </motion.button>
  );
}

/** Small monochrome wordmark chip per provider (no external logos). */
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

function InstallmentNote({ t, text }: { t: ReturnType<typeof useTranslations>; text: string }) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-platinum/20 bg-platinum/[0.05] px-3 py-1.5 text-[0.62rem] text-platinum">
      <Check className="h-[11px] w-[11px]" strokeWidth={2.4} />{text}
    </div>
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