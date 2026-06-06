'use client';

/**
 * ServiceCardLarge — featured service card.
 *
 * Added "soul" within the monochrome palette: the three size tiles are now
 * tiered (S → M → L) with progressively richer platinum→ivory borders, a thin
 * top accent line, and a faint halo on the flagship (L) tile — so the price
 * hierarchy reads at a glance without leaving the brand's colour world.
 */
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  ArrowUpRight,
  Check,
  Shield,
  Plus,
  Clock,
  Star,
} from 'lucide-react';

import { ROMANS, formatPrice, sizes, type Service, type SizeSlug } from '@/lib/services-data';
import { useState } from 'react';

interface Props {
  service: Service;
  index: number;
  total: number;
}

/* size tiers → richer treatment as the size grows (monochrome) */
const TIER: Record<string, number> = { s: 0, m: 1, l: 2 };
const REST_BORDER = ['border-white/[0.06]', 'border-white/[0.12]', 'border-platinum/25'];
const TOP_ACCENT = ['via-platinum/25', 'via-platinum/45', 'via-ivory/70'];

export function ServiceCardLarge({ service, index, total }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [activeSize, setActiveSize] = useState<SizeSlug>('m');

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] backdrop-blur-md">
      {/* Ambient glow on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition-opacity duration-700 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-platinum/20 via-transparent to-platinum/10 blur-xl" />
      </div>

      <div className="relative grid min-h-[70vh] md:grid-cols-2">
        {/* LEFT: Image section */}
        <div className="relative h-[45vh] overflow-hidden md:h-auto">
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src={service.image}
              alt={service.name.en}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
              style={{ filter: 'grayscale(0.25) brightness(0.85) contrast(1.05)' }}
            />
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/20 via-transparent to-obsidian/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="pointer-events-none absolute inset-6">
            <span className="absolute start-0 top-0 h-8 w-8 border-s-2 border-t-2 border-ivory/30" />
            <span className="absolute end-0 top-0 h-8 w-8 border-e-2 border-t-2 border-ivory/30" />
            <span className="absolute bottom-0 start-0 h-8 w-8 border-b-2 border-s-2 border-ivory/30" />
            <span className="absolute bottom-0 end-0 h-8 w-8 border-b-2 border-e-2 border-ivory/30" />
          </div>

          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/30 bg-obsidian/50 backdrop-blur-md">
                <span className="font-mono text-xs text-ivory" dir="ltr">{ROMANS[index]}</span>
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-ivory/60">{isAr ? 'الفصل' : 'Chapter'}</span>
                <span className="font-mono text-[0.55rem] text-ivory/40" dir="ltr">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
              </div>
            </div>
            {service.badge && <BadgeChip kind={service.badge} isAr={isAr} />}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
            <div className="flex items-center gap-2 text-platinum/70">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em]">{service.duration[isAr ? 'ar' : 'en']}</span>
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,5vw,3rem)] leading-[0.95] tracking-tight text-ivory">{service.name[isAr ? 'ar' : 'en']}</h2>
          </div>
        </div>

        {/* RIGHT: Content section */}
        <div className="relative flex flex-col p-6 md:p-8 lg:p-10">
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="font-editorial text-lg italic text-platinum/80 md:text-xl"
          >
            {service.tagline[isAr ? 'ar' : 'en']}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-sm leading-relaxed text-platinum/60 md:text-base"
          >
            {service.description[isAr ? 'ar' : 'en']}
          </motion.p>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />

          {/* SIZE SELECTOR — tiered (S → M → L) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-6 bg-platinum/40" />
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/60">{isAr ? 'اختر الحجم' : 'Select Size'}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {sizes.map((size) => {
                const isActive = activeSize === size.slug;
                const tier = TIER[size.slug] ?? 0;
                return (
                  <button
                    key={size.slug}
                    onClick={() => setActiveSize(size.slug)}
                    data-cursor="hover"
                    className={`group/size relative overflow-hidden rounded-xl border p-4 text-center transition-all duration-500 ${
                      isActive
                        ? 'border-platinum/40 bg-gradient-to-b from-platinum/15 to-platinum/5'
                        : `${REST_BORDER[tier]} bg-white/[0.02] hover:border-platinum/30 hover:bg-white/[0.04]`
                    }`}
                  >
                    {/* tier accent line (always visible) */}
                    <span aria-hidden className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent ${TOP_ACCENT[tier]} to-transparent`} />
                    {/* flagship halo on L */}
                    {tier === 2 && (
                      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(203,205,205,0.12),transparent_62%)]" />
                    )}

                    <span className={`relative block font-mono text-[0.55rem] uppercase tracking-[0.4em] transition-colors ${isActive ? 'text-ivory' : 'text-platinum/50'}`}>
                      {size.slug.toUpperCase()}
                    </span>
                    <span className={`relative mt-2 block font-display text-2xl tabular-nums transition-all md:text-3xl ${isActive ? 'scale-105 text-ivory' : 'text-platinum/80'}`}>
                      {formatPrice(service.prices[size.slug])}
                    </span>
                    <span className="relative mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.3em] text-platinum/50">SAR</span>
                    <span className={`relative mt-2 block font-editorial text-[0.65rem] italic transition-colors ${isActive ? 'text-platinum/80' : 'text-platinum/40'}`}>
                      {size.label[isAr ? 'ar' : 'en']}
                    </span>

                    {isActive && (
                      <motion.span layoutId="size-indicator" className="absolute -bottom-px left-1/2 h-0.5 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-ivory to-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />

          {/* INCLUDED */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-6 bg-platinum/40" />
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/60">{isAr ? 'يشمل' : 'Included'}</span>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {service.includes.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: isAr ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-platinum/10">
                    <Check className="h-3 w-3 text-platinum/80" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm text-platinum/75">{item[isAr ? 'ar' : 'en']}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <div className="flex-1" />

          {/* Warranty + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-platinum/20 bg-platinum/[0.05]">
                <Shield className="h-4 w-4 text-platinum/80" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-lg text-ivory">{service.warranty.duration[isAr ? 'ar' : 'en']}</span>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.3em] text-platinum/50">{isAr ? 'الضمان' : 'Warranty'}</span>
              </div>
            </div>

            <Link
              href={`/contact?service=${service.slug}`}
              data-cursor="hover"
              className="group/btn relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-ivory via-platinum to-ivory px-8 py-4 font-mono text-[0.65rem] font-medium uppercase tracking-[0.3em] text-obsidian shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-500 hover:shadow-[0_0_60px_-5px_rgba(255,255,255,0.5)]"
            >
              <span className="relative z-10">{isAr ? 'احجز الآن' : 'Reserve Now'}</span>
              <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
            </Link>
          </motion.div>
        </div>
      </div>
    </article>
  );
}

/* Badge Chip */
function BadgeChip({ kind, isAr }: { kind: 'signature' | 'new'; isAr: boolean }) {
  const label = kind === 'signature' ? (isAr ? 'موقّعة' : 'Signature') : (isAr ? 'جديد' : 'New');
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.3em] backdrop-blur-md ${
        kind === 'signature'
          ? 'border border-amber-400/30 bg-amber-500/10 text-amber-300'
          : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {kind === 'signature' ? <Star className="h-3 w-3" fill="currentColor" /> : <Plus className="h-3 w-3" strokeWidth={2.5} />}
      {label}
    </span>
  );
}