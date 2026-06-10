'use client';

/**
 * ServicesSection — Editorial service showcase (homepage).
 * البيانات (خدمات + أسعار قبل/بعد + ضمان + منافع) تأتي من الـ props (القاعدة).
 */
import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowUpRight, Plus, ShieldCheck, X } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSpotlight } from '@/hooks/use-mouse';

type SizePrice = { price: number; old: number | null };

interface ServiceRow {
  slug: string;
  title: string;
  blurb: string;
  long: string;
  image: string;
  warranty: string | null;
  is_on_request: boolean;
  benefits: string[];
  prices: Record<string, SizePrice>;   // { size: { price, old } }
}

interface ServicesText {
  eyebrow: string;
  title: string;
  subtitle: string;
  discover: string;
  viewAll: string;
  request: string;
}

const SIZES = ['small', 'medium', 'large'] as const;
const fmt = (n: number) => n.toLocaleString('en-US');

const COPY = {
  en: { priceTitle: 'Pricing by vehicle size', small: 'Small', medium: 'Medium', large: 'Large', warrantyLabel: 'Warranty', bookService: 'Book this service', currency: 'SAR', onRequest: 'On request' },
  ar: { priceTitle: 'الأسعار حسب حجم السيارة', small: 'صغيرة', medium: 'وسط', large: 'كبيرة', warrantyLabel: 'الضمان', bookService: 'احجز هذه الخدمة', currency: 'ر.س', onRequest: 'حسب الطلب' },
} as const;

/* -------------------------------------------------------------------------- */
function ServiceCard({ item, index, discover, onOpen }: { item: ServiceRow; index: number; discover: string; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useSpotlight(ref);

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
      <Image src={item.image} alt={item.title} fill
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
            {discover}
            <ArrowUpRight className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
          </span>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 90px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.10)' }} />
    </motion.button>
  );
}

/* ── pricing-by-size + warranty (السعر القديم مشطوب + النهائي إن وُجد خصم) ── */
function PricingBlock({ item }: { item: ServiceRow }) {
  const isAr = useLocale() === 'ar';
  const c = COPY[isAr ? 'ar' : 'en'];

  if (item.is_on_request || !item.prices || Object.keys(item.prices).length === 0) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2">
        <span className="text-sm text-ivory">{c.onRequest}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="whitespace-nowrap text-[0.6rem] uppercase tracking-[0.3em] text-platinum">{c.priceTitle}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-platinum/30 to-transparent" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {SIZES.map((size) => {
          const sp = item.prices[size];
          if (!sp) return null;
          const price = Number(sp.price) || 0;
          const old = sp.old != null ? Number(sp.old) : null;
          const hasDiscount = old != null && old > price;   // سعرين مختلفين فقط
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

              {/* السعر القديم مشطوب — يظهر فقط لو فيه خصم فعلي */}
              {hasDiscount && (
                <div dir="ltr" className="mt-1.5 font-display text-sm text-steel line-through decoration-[#c98a8a]/70 tabular-nums">
                  {fmt(old!)}
                </div>
              )}

              {/* السعر النهائي */}
              <div className="mt-0.5 flex items-baseline justify-center gap-1">
                <span dir="ltr" className={`font-display text-2xl tabular-nums ${hasDiscount ? 'text-[#e7b4b4]' : 'text-ivory'}`}>{fmt(price)}</span>
              </div>
              <div className="mt-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-steel">{c.currency}</div>
            </div>
          );
        })}
      </div>

      {item.warranty && (
        <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-platinum" strokeWidth={1.6} />
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-platinum/85">{c.warrantyLabel}</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="text-sm text-ivory">{item.warranty}</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function ViewAllCTA({ label }: { label: string }) {
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
          {label}
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
export function ServicesSection({ services, txt }: { services: ServiceRow[]; txt: ServicesText }) {
  const isAr = useLocale() === 'ar';
  const c = COPY[isAr ? 'ar' : 'en'];
  const visibleItems = services.slice(0, 3);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const active = openIndex !== null ? visibleItems[openIndex] : null;

  return (
    <section className="section overflow-hidden" id="services">
      <div className="container">
        <SectionHeader eyebrow={txt.eyebrow} title={txt.title} subtitle={txt.subtitle} />

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, i) => (
            <ServiceCard key={item.slug} item={item} index={i} discover={txt.discover} onOpen={() => setOpenIndex(i)} />
          ))}
        </div>

        <ViewAllCTA label={txt.viewAll} />
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(o: boolean) => !o && setOpenIndex(null)}>
        {/* DialogContent لا يتمرّر بنفسه — التمرير داخل حاوية داخلية، فيبقى زر X ثابتًا */}
        <DialogContent className="max-w-5xl overflow-hidden p-0 [&>button:first-child]:hidden">
          {/* زر إغلاق ثابت (absolute بالنسبة للمودال، مش بيتمرّر مع المحتوى) */}
          <button
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full bg-obsidian/80 text-ivory ring-1 ring-white/20 backdrop-blur-md transition-all hover:bg-ivory hover:text-obsidian hover:ring-white/50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {/* حاوية التمرير الداخلية */}
          <div className="max-h-[88vh] overflow-y-auto">
            {active && (
              <div className="grid lg:grid-cols-[1.1fr_1fr]">
                <div className="relative h-72 min-h-[400px] lg:h-auto">
                  <Image src={active.image} alt={active.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
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
                      <div key={b} className="flex items-start gap-2.5 text-sm text-ivory">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-platinum" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  <PricingBlock item={active} />

                  <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row">
                    <Link href="/booking" className="flex-1">
                      <Button variant="primary" size="md" arrow className="w-full">{c.bookService}</Button>
                    </Link>
                    <Link href="/services" className="flex-1">
                      <Button variant="ghost" size="md" className="w-full">{txt.viewAll}</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}