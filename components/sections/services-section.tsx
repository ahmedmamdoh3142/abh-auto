'use client';

/**
 * ServicesSection — Editorial service showcase (homepage).
 *
 * Surfaces the first three services in a refined grid; a chrome CTA links to
 * the full catalogue. Opening a service reveals a dossier with a NEW pricing
 * block: price by vehicle size (Small / Medium / Large) and the warranty, all
 * in the house style. The primary action ("Book this service") routes to the
 * booking flow at /booking.
 */
import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, Check, Plus, ShieldCheck } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSpotlight } from '@/hooks/use-mouse';
import { serviceImages } from '@/lib/site-config';

interface ServiceItem {
  slug: string;
  title: string;
  blurb: string;
  long: string;
  benefits: string[];
}

const HOMEPAGE_LIMIT = 3;

/* ── Pricing model (SAR). Size price = base × multiplier, rounded to 50. ──
 * Everything the upgraded dossier needs (size/warranty/labels) lives here in
 * the component, so no extra i18n keys have to be merged for services.
 * Unknown slugs simply hide the pricing block. */
const SERVICE_BASE: Record<string, number> = {
  ceramic: 3200, ppf: 6800, full_detail: 1400, polish: 900, interior: 750, engine: 450,
};
const SIZE_MULT: Record<'small' | 'medium' | 'large', number> = { small: 1, medium: 1.25, large: 1.55 };
const SIZES = ['small', 'medium', 'large'] as const;
const priceFor = (base: number, mult: number) => Math.round((base * mult) / 50) * 50;
const fmt = (n: number) => n.toLocaleString('en-US');

/* Inline, locale-aware copy for the new pricing/warranty UI. */
const COPY = {
  en: { priceTitle: 'Pricing by vehicle size', small: 'Small', medium: 'Medium', large: 'Large', warrantyLabel: 'Warranty', bookService: 'Book this service', viewAll: 'View all', currency: 'SAR' },
  ar: { priceTitle: 'الأسعار حسب حجم السيارة', small: 'صغيرة', medium: 'وسط', large: 'كبيرة', warrantyLabel: 'الضمان', bookService: 'احجز هذه الخدمة', viewAll: 'عرض الكل', currency: 'ر.س' },
} as const;

/* Warranty period per service slug, both locales. */
const WARRANTY: Record<'en' | 'ar', Record<string, string>> = {
  en: { ceramic: '5 years', ppf: '10 years', full_detail: '3 months', polish: '6 months', interior: '3 months', engine: '1 month' },
  ar: { ceramic: '5 سنوات', ppf: '10 سنوات', full_detail: '3 شهور', polish: '6 شهور', interior: '3 شهور', engine: 'شهر واحد' },
};

/* -------------------------------------------------------------------------- */
function ServiceCard({ item, index, onOpen }: { item: ServiceItem; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useSpotlight(ref);
  const t = useTranslations('services');

  return (
    <motion.button
      ref={ref}
      onClick={onOpen}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: '-80px' }}
      className="spotlight group relative h-[540px] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-obsidian text-start md:h-[620px]"
      data-cursor="hover"
    >
      <Image src={serviceImages[item.slug] ?? serviceImages.ceramic} alt={item.title} fill
        className="scale-[1.08] object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.16]"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/70" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: 'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.10), transparent 60%)' }} />
      <div aria-hidden className="absolute end-6 top-6 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-ivory ring-1 ring-white/15 backdrop-blur-md transition-all duration-500 group-hover:bg-ivory group-hover:text-obsidian group-hover:ring-white/40">
        <Plus className="h-4 w-4 transition-transform duration-500 group-hover:rotate-90" strokeWidth={1.6} />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 p-7 md:p-8">
        <h3 className="font-display text-3xl uppercase leading-[1.05] tracking-tight text-ivory balance md:text-4xl">{item.title}</h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-platinum/85 line-clamp-2 pretty">{item.blurb}</p>
        <div className="mt-7 flex items-center gap-3">
          <span className="block h-px w-8 bg-platinum/60 transition-all duration-700 group-hover:w-16 group-hover:bg-ivory" />
          <span className="inline-flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-ivory">
            {t('discover')}
            <ArrowUpRight className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
          </span>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 90px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.10)' }} />
    </motion.button>
  );
}

/* ── NEW: pricing-by-size + warranty block for the dossier ── */
function PricingBlock({ slug }: { slug: string }) {
  const isAr = useLocale() === 'ar';
  const c = COPY[isAr ? 'ar' : 'en'];
  const base = SERVICE_BASE[slug];
  if (!base) return null;
  const warranty = WARRANTY[isAr ? 'ar' : 'en'][slug] ?? '';

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="whitespace-nowrap text-[0.6rem] uppercase tracking-[0.3em] text-platinum">{c.priceTitle}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-platinum/30 to-transparent" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {SIZES.map((size) => {
          const featured = size === 'large';
          return (
            <div
              key={size}
              className={[
                'relative overflow-hidden rounded-2xl border p-4 text-center transition-colors duration-300',
                featured ? 'border-platinum/40 bg-platinum/[0.06]' : 'border-white/10 bg-white/[0.02]',
              ].join(' ')}
            >
              {featured && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-platinum/60 to-transparent" />}
              <div className="text-[0.5rem] uppercase tracking-[0.2em] text-steel">{c[size]}</div>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span dir="ltr" className="font-display text-2xl text-ivory tabular-nums">{fmt(priceFor(base, SIZE_MULT[size]))}</span>
              </div>
              <div className="mt-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-steel">{c.currency}</div>
            </div>
          );
        })}
      </div>

      {warranty && (
        <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-platinum" strokeWidth={1.6} />
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-platinum/85">{c.warrantyLabel}</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-sm text-ivory">{warranty}</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function ViewAllCTA() {
  const t = useTranslations('services');
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="mt-20 flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12"
    >
      <div className="hidden flex-1 items-center justify-end gap-3 md:flex"><span className="block h-px w-12 bg-platinum/30" /></div>
      <Link href="/services" data-cursor="hover" className="group relative inline-block">
        <span aria-hidden className="absolute -inset-4 rounded-full bg-gradient-to-r from-platinum/40 via-ivory/35 to-platinum/40 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
        <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/85 via-platinum/40 to-ivory/55" />
        <span className="relative inline-flex items-center gap-4 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-9 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.15),0_22px_60px_-12px_rgba(203,205,205,0.55)] transition-all duration-500 group-hover:-translate-y-0.5">
          {t('viewAll')}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
        </span>
      </Link>
      <div className="hidden flex-1 items-center gap-3 md:flex"><span className="block h-px w-12 bg-platinum/30" /></div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
export function ServicesSection() {
  const t = useTranslations('services');
  const isAr = useLocale() === 'ar';
  const c = COPY[isAr ? 'ar' : 'en'];
  const items = t.raw('items') as ServiceItem[];
  const visibleItems = items.slice(0, HOMEPAGE_LIMIT);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const active = openIndex !== null ? visibleItems[openIndex] : null;

  return (
    <section className="section overflow-hidden" id="services">
      <div className="container">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, i) => (
            <ServiceCard key={item.slug} item={item} index={i} onOpen={() => setOpenIndex(i)} />
          ))}
        </div>

        <ViewAllCTA />
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(o: boolean) => !o && setOpenIndex(null)}>
        <DialogContent>
          {active && (
            <div className="grid lg:grid-cols-[1.1fr_1fr]">
              <div className="relative h-72 min-h-[400px] lg:h-auto">
                <Image src={serviceImages[active.slug] ?? serviceImages.ceramic} alt={active.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-obsidian/60 lg:to-obsidian" />
              </div>

              <div className="flex flex-col gap-6 p-8 md:p-12">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[0.6rem] tracking-[0.3em] text-platinum/60">SERVICE · 0{(openIndex ?? 0) + 1}</span>
                  <span className="block h-px flex-1 bg-platinum/20" />
                </div>

                <DialogTitle className="font-display text-3xl uppercase leading-tight tracking-tight text-ivory balance md:text-4xl">{active.title}</DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-platinum/80 pretty">{active.long}</DialogDescription>

                <div className="hairline" />

                <div className="grid grid-cols-2 gap-4">
                  {active.benefits.map((b) => (
                    <div key={b} className="flex items-start gap-2 text-sm text-ivory">
                      <Check className="reversible-icon mt-0.5 h-4 w-4 shrink-0 text-platinum" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {/* NEW — pricing by size + warranty */}
                <PricingBlock slug={active.slug} />

                <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row">
                  <Link href="/booking" className="flex-1">
                    <Button variant="primary" size="md" arrow className="w-full">{c.bookService}</Button>
                  </Link>
                  <Link href="/services" className="flex-1">
                    <Button variant="ghost" size="md" className="w-full">{c.viewAll}</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}