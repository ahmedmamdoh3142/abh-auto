'use client';

/**
 * ServiceCardLarge — "The Plate"
 *
 * إصلاح الأداء: حركة "تنفّس" الصورة كانت framer بـrepeat:Infinity في النسختين
 * (الموبايل والديسكتوب)، وكانت تعمل حتى على النسخة المخفية (display:none لا
 * يوقف framer). حُوّلت إلى CSS (.card-breath): تتوقف تلقائيًا على display:none،
 * وتُعطَّل كليًا على الموبايل ومع prefers-reduced-motion.
 *
 * كل الأسعار من الـprops (service.prices / service.oldPrices) = جدول service_prices.
 */
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { CardImage } from '@/components/ui/card-image';
import { ArrowUpRight, Check, ShieldCheck, Clock, Star, Plus } from 'lucide-react';

import { ROMANS, formatPrice, sizes, type Service, type SizeSlug } from '@/lib/services-data';

/* ── لون التنبيه للخصم — غيّره من هنا بس ───────────────────────── */
const ACCENT = '#d2453f';
const ACCENT_RGB = '210,69,63';
/* ──────────────────────────────────────────────────────────────── */

interface Props {
  service: Service;
  index: number;
  total: number;
}

function priceInfo(service: Service, size: SizeSlug) {
  const current = service.prices[size];
  const old = service.oldPrices?.[size];
  const discounted = typeof old === 'number' && old > current;
  const pct = discounted ? Math.round((1 - current / (old as number)) * 100) : 0;
  const saved = discounted ? (old as number) - current : 0;
  return { current, old: old as number | undefined, discounted, pct, saved };
}

export function ServiceCardLarge({ service, index, total }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [activeSize, setActiveSize] = useState<SizeSlug>('m');

  const shared = { service, isAr, activeSize, setActiveSize };

  return (
    <article className="relative w-full min-w-0">
      <style>{`
        .card-breath{animation:cardBreath 26s ease-in-out infinite;}
        @keyframes cardBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @media (prefers-reduced-motion: reduce),(max-width: 820px){ .card-breath{animation:none} }
      `}</style>

      {/* ============ MOBILE — hero + stacked ============ */}
      <div className="w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-obsidian md:hidden">
        {/* IMAGE HERO */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <div className="card-breath absolute inset-0">
            <CardImage
              src={service.image}
              alt={service.name.en}
              sizes="(max-width: 768px) 92vw, 640px"
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/40" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <Chapter index={index} total={total} isAr={isAr} />
            {service.badge && <BadgeChip kind={service.badge} isAr={isAr} />}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex items-center gap-2 text-platinum/80">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em]">
                {service.duration[isAr ? 'ar' : 'en']}
              </span>
            </div>
            <h2 className="mt-2 break-words font-display text-[1.75rem] font-light leading-[1] tracking-tight text-ivory drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {service.name[isAr ? 'ar' : 'en']}
            </h2>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col gap-5 p-5">
          <div>
            <p className="font-editorial text-base italic text-platinum/80">
              {service.tagline[isAr ? 'ar' : 'en']}
            </p>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-platinum/60">
              {service.description[isAr ? 'ar' : 'en']}
            </p>
          </div>

          <PricePlate {...shared} />

          <div>
            <Label>{isAr ? 'اختر الحجم' : 'Select size'}</Label>
            <div className="mt-3">
              <SizeTiles {...shared} />
            </div>
          </div>

          <div>
            <Label>{isAr ? 'يشمل' : 'Included'}</Label>
            <IncludesList service={service} isAr={isAr} className="mt-3 grid gap-2" />
          </div>

          <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-5">
            <WarrantyMark service={service} isAr={isAr} />
            <ReserveButton service={service} isAr={isAr} />
          </div>
        </div>
      </div>

      {/* ============ DESKTOP ============ */}
      <div className="hidden w-full overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] backdrop-blur-md md:block">
        <div className="group relative grid min-h-[70vh] grid-cols-[1.05fr_1fr]">
          <div className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition-opacity duration-700 group-hover:opacity-100">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-platinum/15 via-transparent to-platinum/10 blur-xl" />
          </div>

          {/* image */}
          <div className="relative overflow-hidden">
            <div className="card-breath absolute inset-0">
              <CardImage
                src={service.image}
                alt={service.name.en}
                sizes="55vw"
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian/30 via-transparent to-obsidian/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/15 to-transparent" />

            <div className="pointer-events-none absolute inset-7">
              <span className="absolute start-0 top-0 h-7 w-7 border-s border-t border-ivory/25" />
              <span className="absolute end-0 top-0 h-7 w-7 border-e border-t border-ivory/25" />
              <span className="absolute bottom-0 start-0 h-7 w-7 border-b border-s border-ivory/25" />
              <span className="absolute bottom-0 end-0 h-7 w-7 border-b border-e border-ivory/25" />
            </div>

            <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-8">
              <Chapter index={index} total={total} isAr={isAr} />
              {service.badge && <BadgeChip kind={service.badge} isAr={isAr} />}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 p-8">
              <div className="flex items-center gap-2 text-platinum/70">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em]">
                  {service.duration[isAr ? 'ar' : 'en']}
                </span>
              </div>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] font-light leading-[0.95] tracking-tight text-ivory">
                {service.name[isAr ? 'ar' : 'en']}
              </h2>
            </div>
          </div>

          {/* content */}
          <div className="relative flex min-w-0 flex-col p-8 lg:p-10">
            <p className="font-editorial text-xl italic text-platinum/80">
              {service.tagline[isAr ? 'ar' : 'en']}
            </p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-platinum/60">
              {service.description[isAr ? 'ar' : 'en']}
            </p>

            <div className="mt-6">
              <PricePlate {...shared} />
            </div>

            <div className="mt-6">
              <Label>{isAr ? 'اختر الحجم' : 'Select size'}</Label>
              <div className="mt-3">
                <SizeTiles {...shared} />
              </div>
            </div>

            <div className="mt-7">
              <Label>{isAr ? 'يشمل' : 'Included'}</Label>
              <IncludesList service={service} isAr={isAr} className="mt-3 grid gap-2 sm:grid-cols-2" />
            </div>

            <div className="flex-1" />

            <div className="mt-7 flex items-end justify-between gap-4">
              <WarrantyMark service={service} isAr={isAr} />
              <ReserveButton service={service} isAr={isAr} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── Shared pieces ───────────────────────── */

function PricePlate({
  service,
  isAr,
  activeSize,
}: {
  service: Service;
  isAr: boolean;
  activeSize: SizeSlug;
  setActiveSize: (s: SizeSlug) => void;
}) {
  const info = priceInfo(service, activeSize);
  const sizeLabel = sizes.find((s) => s.slug === activeSize)?.label[isAr ? 'ar' : 'en'];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-platinum/15 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{
          background: info.discounted
            ? `linear-gradient(90deg, transparent, rgba(${ACCENT_RGB},0.55), transparent)`
            : 'linear-gradient(90deg, transparent, rgba(203,205,205,0.4), transparent)',
        }}
      />
      <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-platinum/45">
        {isAr ? `لمقاس ${sizeLabel}` : `For ${sizeLabel}`}
      </span>

      {info.discounted && (
        <span className="mt-1.5 flex items-center gap-2">
          <span
            dir="ltr"
            className="font-mono text-sm tabular-nums text-platinum/45 line-through"
            style={{ textDecorationColor: ACCENT, textDecorationThickness: '2px' }}
          >
            {formatPrice(info.old as number)}
          </span>
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[0.6rem] font-semibold tabular-nums text-white"
            style={{ backgroundColor: ACCENT }}
          >
            −{info.pct}%
          </span>
        </span>
      )}

      <span className="mt-1 flex items-baseline gap-2">
        <span
          dir="ltr"
          className="font-display text-[clamp(1.7rem,7vw,2.6rem)] font-light leading-none tabular-nums text-ivory"
        >
          {formatPrice(info.current)}
        </span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-platinum/50">SAR</span>
      </span>

      {info.discounted && (
        <span className="mt-2 block font-mono text-[0.6rem] tracking-[0.15em]" style={{ color: ACCENT }}>
          {isAr ? `وفّر ${formatPrice(info.saved)} SAR` : `Save ${formatPrice(info.saved)} SAR`}
        </span>
      )}
    </div>
  );
}

function SizeTiles({
  service,
  isAr,
  activeSize,
  setActiveSize,
}: {
  service: Service;
  isAr: boolean;
  activeSize: SizeSlug;
  setActiveSize: (s: SizeSlug) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {sizes.map((size) => {
        const isOn = activeSize === size.slug;
        const info = priceInfo(service, size.slug);
        return (
          <button
            key={size.slug}
            onClick={() => setActiveSize(size.slug)}
            data-cursor="hover"
            aria-pressed={isOn}
            className={`relative min-w-0 overflow-hidden rounded-xl border p-2.5 text-center transition-all duration-500 sm:p-3 ${
              isOn
                ? 'border-platinum/45 bg-gradient-to-b from-platinum/15 to-platinum/[0.03]'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-platinum/25 hover:bg-white/[0.04]'
            }`}
          >
            <span
              className={`block font-mono text-[0.5rem] uppercase tracking-[0.3em] ${
                isOn ? 'text-ivory' : 'text-platinum/45'
              }`}
            >
              {size.slug.toUpperCase()}
            </span>
            {info.discounted && (
              <span
                dir="ltr"
                className="mt-1 block truncate font-mono text-[0.55rem] tabular-nums text-platinum/45 line-through"
                style={{ textDecorationColor: ACCENT, textDecorationThickness: '1.5px' }}
              >
                {formatPrice(info.old as number)}
              </span>
            )}
            <span
              dir="ltr"
              className={`mt-0.5 block truncate font-display text-[0.95rem] tabular-nums sm:text-lg ${
                isOn ? 'text-ivory' : 'text-platinum/80'
              }`}
            >
              {formatPrice(info.current)}
            </span>
            <span
              className={`mt-1 block truncate font-editorial text-[0.6rem] italic ${
                isOn ? 'text-platinum/80' : 'text-platinum/40'
              }`}
            >
              {size.label[isAr ? 'ar' : 'en']}
            </span>
            {isOn && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute -bottom-px left-1/2 h-0.5 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-ivory to-transparent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function IncludesList({
  service,
  isAr,
  className,
}: {
  service: Service;
  isAr: boolean;
  className?: string;
}) {
  return (
    <ul className={className}>
      {service.includes.map((item, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-platinum/10">
            <Check className="h-3 w-3 text-platinum/80" strokeWidth={2.5} />
          </span>
          <span className="text-sm text-platinum/75">{item[isAr ? 'ar' : 'en']}</span>
        </li>
      ))}
    </ul>
  );
}

function WarrantyMark({ service, isAr }: { service: Service; isAr: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-platinum/20 bg-platinum/[0.05]">
        <ShieldCheck className="h-4 w-4 text-platinum/80" />
      </span>
      <div className="flex flex-col">
        <span className="font-display text-lg text-ivory">
          {service.warranty.duration[isAr ? 'ar' : 'en']}
        </span>
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-platinum/50">
          {isAr ? 'الضمان' : 'Warranty'}
        </span>
      </div>
    </div>
  );
}

function ReserveButton({ service, isAr }: { service: Service; isAr: boolean }) {
  return (
    <Link
      href={`/booking?service=${service.slug}`}
      data-cursor="hover"
      className="group/btn relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-ivory via-platinum to-ivory px-8 py-3.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.3em] text-obsidian transition-shadow duration-500 hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.5)] sm:w-auto sm:py-4"
    >
      <span className="relative z-10">{isAr ? 'احجز الآن' : 'Reserve now'}</span>
      <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
      />
    </Link>
  );
}

function Chapter({ index, total, isAr }: { index: number; total: number; isAr: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 bg-obsidian/40 backdrop-blur-md sm:h-11 sm:w-11">
        <span className="font-display text-base text-ivory" dir="ltr">
          {ROMANS[index]}
        </span>
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.4em] text-ivory/55">
          {isAr ? 'الفصل' : 'Chapter'}
        </span>
        <span className="font-mono text-[0.5rem] text-ivory/40" dir="ltr">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-6 bg-platinum/40" />
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/60">
        {children}
      </span>
    </div>
  );
}

function BadgeChip({ kind, isAr }: { kind: 'signature' | 'new'; isAr: boolean }) {
  const label = kind === 'signature' ? (isAr ? 'موقّعة' : 'Signature') : isAr ? 'جديد' : 'New';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.3em] backdrop-blur-md sm:px-4 sm:py-2 ${
        kind === 'signature'
          ? 'border border-amber-400/30 bg-amber-500/10 text-amber-300'
          : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {kind === 'signature' ? (
        <Star className="h-3 w-3" fill="currentColor" />
      ) : (
        <Plus className="h-3 w-3" strokeWidth={2.5} />
      )}
      {label}
    </span>
  );
}