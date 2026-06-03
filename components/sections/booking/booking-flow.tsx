'use client';

/**
 * BookingFlow — the /booking (احجز الآن) experience.
 * Path: components/sections/booking/booking-flow.tsx  (export `BookingFlow`)
 *
 * A four-act reservation journey, staged like the rest of the site: an
 * image-backed atelier band up top, then a glass "console" that swaps
 * between four steps with a cinematic step-rail.
 *
 *   01 · VEHICLE   pick from the member's garage (if signed in) or enter a new
 *                  car: brand → model → colour → plate, beside a hero plate.
 *   02 · SERVICES  cards priced by size, towing module + monochrome map.
 *   03 · DETAILS   name, phone, email, city, branch, date, time → payment.
 *                  Pre-filled from the signed-in member (empty fields only).
 *   04 · CONFIRM   full dossier + total + payment, then a success seal.
 *                  On confirm, the reservation is saved to the member's history.
 *
 * Strict palette (obsidian / ivory / platinum / steel). next-intl + RTL,
 * framer-motion, deterministic particles, no browser storage in the UI layer.
 */
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, ArrowLeft, Check } from 'lucide-react';

import {
  BRANDS, COLORS, SERVICES, CITIES, BRANCHES, PAYMENT_METHODS,
  inferSize, priceFor, oldPriceFor, currencyFmt, TOWING_COST,
  type VehicleSize, type CategoryId, type TowingMode, type PaymentMethod,
} from '@/lib/booking-data';
import { useAuth } from '@/components/shared/auth-provider';

import { StepVehicle } from './step-vehicle';
import { StepServices } from './step-services';
import { StepDetails } from './step-details';
import { StepConfirm } from './step-confirm';

const EASE = [0.16, 1, 0.3, 1] as const;
const CINEMATIC = '/images/cta-bg.png';

/* Booking image — local constant (site-config is read-only), mirroring the
   pattern used by Hero / CtaSection. A dark studio plate for the band. */
const BOOKING_IMAGE = '/images/hero-bg.png';

export interface BookingState {
  brandId: string;
  model: string;
  colorKey: string;
  plate: string;
  size: VehicleSize;
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
}

const INITIAL: BookingState = {
  brandId: '', model: '', colorKey: '', plate: '', size: 'large',
  services: [], activeCat: 'packages', towing: false, towingMode: null,
  towingLat: null, towingLng: null, towingAddress: '',
  name: '', phone: '', email: '', city: '', branch: '', date: '', time: '',
  payment: null, showBreakdown: false, calMonth: null,
};

const STEP_KEYS = ['vehicle', 'services', 'customer', 'payment'] as const;

export function BookingFlow() {
  const t = useTranslations('booking');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { member, hydrated, addBooking } = useAuth();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [data, setData] = useState<BookingState>(INITIAL);
  const [done, setDone] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    (patch: Partial<BookingState>) => setData((d) => ({ ...d, ...patch })),
    [],
  );

  /* Pre-fill act 03 (Your Details) from the signed-in member. Runs once the
     session is hydrated; fills empty fields only, so it never overwrites
     anything the visitor has already typed. */
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

  /* keep size in sync whenever brand+model resolve */
  const onVehicleChange = useCallback((patch: Partial<BookingState>) => {
    setData((d) => {
      const next = { ...d, ...patch };
      if (next.brandId && next.model) next.size = inferSize(next.brandId, next.model);
      return next;
    });
  }, []);

  const total = useMemo(() => {
    let onReq = false;
    let saved = 0;
    const services = data.services.reduce((sum, slug) => {
      const meta = SERVICES.find((s) => s.slug === slug);
      if (!meta) return sum;
      if (meta.onRequest) { onReq = true; return sum; }
      const old = oldPriceFor(meta, data.size);
      const now = priceFor(meta, data.size);
      if (old) saved += old - now;
      return sum + now;
    }, 0);
    const tow = data.towing && data.towingMode ? TOWING_COST[data.towingMode] : 0;
    return { services, tow, grand: services + tow, onReq, saved };
  }, [data.services, data.size, data.towing, data.towingMode]);

  const go = useCallback((to: number) => {
    setStep(to);
    setMaxReached((m) => Math.max(m, to));
    requestAnimationFrame(() => {
      consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  /* Persist the reservation to the member's history (if signed in), then seal. */
  const confirmBooking = useCallback(() => {
    if (member) {
      const brand = BRANDS.find((b) => b.id === data.brandId);
      addBooking({
        vehicleLabel: `${brand?.name ?? ''} ${data.model}`.trim(),
        plate: data.plate,
        serviceSlugs: data.services,
        branchKey: data.branch,
        date: data.date,
        time: data.time,
        total: total.grand,
        status: 'upcoming',
      });
    }
    setDone(true);
    requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [member, addBooking, data, total.grand]);

  const reset = useCallback(() => {
    setData(INITIAL);
    setStep(0);
    setMaxReached(0);
    setDone(false);
    requestAnimationFrame(() =>
      consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }, []);

  return (
    <>
      <BookingHero t={t} />

      <section className="section relative pt-4 md:pt-8" id="booking">
        <div className="container">
          <StepRail
            step={step}
            maxReached={maxReached}
            labels={STEP_KEYS.map((k) => t(`steps.${k}`))}
            onJump={(i) => i <= maxReached && !done && go(i)}
          />

          <div
            ref={consoleRef}
            className="spotlight glass relative mt-12 scroll-mt-28 rounded-[28px] border border-white/[0.08] md:mt-16"
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/30 to-transparent" />

            <AnimatePresence mode="wait">
              {done ? (
                <StepSuccess key="success" t={t} data={data} total={total} isAr={isAr} onReset={reset} />
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="p-6 md:p-10 lg:p-14"
                >
                  {step === 0 && (
                    <StepVehicle
                      t={t} isAr={isAr} data={data} onChange={onVehicleChange}
                      bookingImage={BOOKING_IMAGE}
                      garage={member?.vehicles ?? []}
                      onNext={() => go(1)}
                    />
                  )}
                  {step === 1 && (
                    <StepServices
                      t={t} isAr={isAr} data={data} set={set} total={total}
                      onBack={() => go(0)} onNext={() => go(2)}
                    />
                  )}
                  {step === 2 && (
                    <StepDetails
                      t={t} isAr={isAr} data={data} set={set}
                      onBack={() => go(1)} onNext={() => go(3)}
                    />
                  )}
                  {step === 3 && (
                    <StepConfirm
                      t={t} isAr={isAr} data={data} total={total} set={set}
                      onBack={() => go(2)} onConfirm={confirmBooking}
                    />
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

/* ════════════════════════════════════════════════════════════════════ */
/*  Hero band                                                             */
/* ════════════════════════════════════════════════════════════════════ */
function BookingHero({ t }: { t: ReturnType<typeof useTranslations> }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, left: (i * 53) % 100, top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5, duration: 5 + (i % 5),
  }));

  return (
    <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44">
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image src={CINEMATIC} alt="" fill sizes="100vw"
          className="object-cover opacity-[0.18]"
          style={{ filter: 'grayscale(0.5) brightness(0.5) contrast(1.1)' }} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
          <motion.span key={p.id} className="absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.8, 0], y: [10, -50, -100] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: 'easeOut', delay: p.delay }} />
        ))}
      </div>

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('eyebrow')}
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <motion.span initial={{ y: '110%' }} animate={{ y: 0 }}
              transition={{ duration: 1, ease: EASE }} className="inline-block">
              {t('title')}
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg"
        >
          {t('subtitle')}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.55, ease: EASE }}
          className="mx-auto mt-10 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent"
        />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Step rail                                                             */
/* ════════════════════════════════════════════════════════════════════ */
function StepRail({
  step, maxReached, labels, onJump,
}: {
  step: number; maxReached: number; labels: string[]; onJump: (i: number) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-0 top-[19px] h-px bg-white/10" />
        <motion.span
          aria-hidden
          className="absolute top-[19px] h-px bg-gradient-to-r from-platinum/40 via-ivory to-platinum/40"
          initial={false}
          animate={{ width: `${(step / (labels.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ insetInlineStart: 0 }}
        />

        {labels.map((label, i) => {
          const isDone = i < step;
          const isActive = i === step;
          const reachable = i <= maxReached;
          return (
            <button
              key={label}
              data-cursor="hover"
              onClick={() => onJump(i)}
              disabled={!reachable}
              className={`relative z-10 flex flex-col items-center gap-3 ${reachable ? '' : 'cursor-default'}`}
            >
              <span
                className={[
                  'grid h-10 w-10 place-items-center rounded-full border text-[0.7rem] font-semibold tabular-nums transition-all duration-500',
                  isActive
                    ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian shadow-[0_10px_30px_-8px_rgba(203,205,205,0.6)]'
                    : isDone
                      ? 'border-platinum/50 bg-platinum/10 text-ivory'
                      : 'border-white/12 bg-white/[0.03] text-steel',
                ].join(' ')}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.4} /> : String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={[
                  'whitespace-nowrap text-[0.55rem] uppercase tracking-[0.22em] transition-colors duration-500 md:text-[0.6rem]',
                  isActive ? 'text-ivory' : isDone ? 'text-platinum/80' : 'text-steel',
                ].join(' ')}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Success seal                                                          */
/* ════════════════════════════════════════════════════════════════════ */
function StepSuccess({
  t, data, total, isAr, onReset,
}: {
  t: ReturnType<typeof useTranslations>;
  data: BookingState;
  total: { services: number; tow: number; grand: number };
  isAr: boolean;
  onReset: () => void;
}) {
  const ref = `ABH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const brand = BRANDS.find((b) => b.id === data.brandId);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative px-6 py-16 text-center md:px-10 md:py-24"
    >
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.07] blur-[120px]" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative mx-auto mb-10 h-28 w-28"
      >
        <motion.span
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full opacity-70"
          style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.6), transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(6px)' }}
        />
        <span aria-hidden className="absolute inset-2 rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70" />
        <span className="absolute inset-[9px] grid place-items-center rounded-full bg-gradient-to-br from-obsidian via-obsidian to-[#0b0c0d]">
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 14 }}
          >
            <Check className="h-9 w-9 text-ivory" strokeWidth={1.6} />
          </motion.span>
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
        className="font-display text-4xl font-light uppercase tracking-tight text-ivory md:text-5xl"
      >
        {t('success.title')}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
        className="mx-auto mt-4 max-w-[44ch] text-platinum/70"
      >
        {t('success.subtitle')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
        className="mx-auto mt-10 inline-flex flex-col items-center gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] px-8 py-7 md:flex-row md:gap-10"
      >
        <div className="text-center md:text-start">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('success.refLabel')}</div>
          <div dir="ltr" className="mt-1.5 font-display text-2xl tracking-[0.18em] text-ivory">{ref}</div>
        </div>
        <span aria-hidden className="hidden h-10 w-px bg-white/10 md:block" />
        <div className="text-center md:text-start">
          <div className="text-[0.55rem] uppercase tracking-[0.28em] text-steel">{t('step4.total')}</div>
          <div dir="ltr" className="mt-1.5 font-display text-2xl text-ivory tabular-nums">
            {currencyFmt(total.grand)} <span className="text-base text-platinum/70">SAR</span>
          </div>
        </div>
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

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mx-auto mt-8 max-w-[46ch] text-sm leading-relaxed text-platinum/55"
      >
        {t('success.nextSteps')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7, ease: EASE }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <a href="/account" data-cursor="hover"><GhostPill>{t('success.viewBookings')}</GhostPill></a>
        <button onClick={onReset} data-cursor="hover"><PrimaryPill>{t('success.newBooking')}</PrimaryPill></button>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Shared chrome buttons (exported for steps)                            */
/* ════════════════════════════════════════════════════════════════════ */
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