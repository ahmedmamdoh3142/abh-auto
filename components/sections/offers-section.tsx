'use client';

/**
 * OffersSection — Editorial luxury offer cards (homepage).
 * البيانات (العروض + النصوص + الصور) تأتي من قاعدة البيانات عبر props.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Clock, X } from 'lucide-react';

import { SectionHeader } from '@/components/ui/section-header';
import { useSpotlight } from '@/hooks/use-mouse';
import { CardImage } from '@/components/ui/card-image';

interface OfferRow {
  slug: string;
  tag: string | null;
  title: string;
  copy: string;
  discount_label: string;
  image: string;
}

// نصوص قسم العروض (من content_blocks: offers)
interface OffersText {
  eyebrow: string;
  title: string;
  subtitle: string;
  save: string;
  off: string;
  campaign: string;
  reserve: string;
  viewAll: string;
  allTitle: string;
  mClose: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

function OfferCard({ item, index, txt }: { item: OfferRow; index: number; txt: OffersText }) {
  const ref = useRef<HTMLDivElement>(null);
  useSpotlight(ref);

  const discountMatch = item.discount_label.match(/(\d+)/);
  const discountNum = discountMatch ? discountMatch[1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: index * 0.1, ease: EASE }}
      viewport={{ once: true, margin: '-80px' }}
      ref={ref}
      className="spotlight group relative h-[560px] cursor-pointer overflow-hidden rounded-3xl border border-white/[0.08] bg-obsidian md:h-[620px]"
      data-cursor="hover"
    >
      <CardImage src={item.image} alt={item.title}
        className="scale-[1.08] object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.16]"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/60" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: 'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.10), transparent 60%)' }} />

      {/* discount rail */}
      <div className="absolute bottom-0 end-0 top-0 z-20 w-[88px] overflow-hidden md:w-[104px]">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0303 0%, #4a0a0a 30%, #6b1010 50%, #4a0a0a 70%, #1a0303 100%)' }} />
        <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-y-0 start-0 w-px bg-gradient-to-b from-transparent via-ivory/40 to-transparent" />
        <motion.div aria-hidden className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-white/[0.18] to-transparent"
          animate={{ y: ['-15%', '120%'] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }} />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2">
          <span className="text-[0.5rem] uppercase tracking-[0.4em] text-ivory/60">{txt.save}</span>
          {discountNum ? (
            <>
              <span className="font-display text-[clamp(3.5rem,7vw,5.5rem)] font-light leading-none text-ivory drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">{discountNum}</span>
              <span className="text-2xl font-light leading-none text-ivory/90">%</span>
            </>
          ) : (
            <span className="font-display text-2xl text-ivory">{item.discount_label}</span>
          )}
          <div className="mt-3 h-px w-8 bg-ivory/40" />
          <span className="text-[0.5rem] uppercase tracking-[0.32em] text-ivory/60">{txt.off}</span>
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ivory/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ivory/30 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-7 pe-[110px] md:p-8 md:pe-[124px]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-obsidian/60 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-platinum/80 ring-1 ring-white/10 backdrop-blur-md">
          <Clock className="h-2.5 w-2.5" strokeWidth={1.8} />{txt.campaign}
        </div>
        <h3 className="font-display text-2xl uppercase leading-[1.05] tracking-tight text-ivory balance md:text-3xl">{item.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-platinum/80 line-clamp-3 pretty">{item.copy}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Link href="/contact" data-cursor="hover" className="group/btn relative inline-flex items-center">
            <span aria-hidden className="absolute -inset-2 rounded-full bg-ivory/15 opacity-0 blur-lg transition-opacity duration-500 group-hover/btn:opacity-100" />
            <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-b from-ivory/40 via-white/5 to-transparent" />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/90 px-5 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_24px_-8px_rgba(203,205,205,0.5)] transition-all duration-500 group-hover/btn:-translate-y-0.5">
              {txt.reserve}
              <ArrowUpRight className="h-3 w-3 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={2.2} />
            </span>
          </Link>
          <span className="text-[0.55rem] uppercase tracking-[0.28em] text-platinum/40 tabular-nums">No. {String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 80px rgba(107,16,16,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)' }} />
    </motion.div>
  );
}

/* ── chrome "view all" capsule ── */
function ViewAllOffers({ onOpen, label }: { onOpen: () => void; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.9, ease: EASE }}
      className="mt-20 flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12"
    >
      <div className="hidden flex-1 items-center justify-end gap-3 md:flex"><span className="block h-px w-12 bg-platinum/30" /></div>
      <button onClick={onOpen} data-cursor="hover" className="group relative inline-block">
        <span aria-hidden className="absolute -inset-4 rounded-full bg-gradient-to-r from-platinum/40 via-ivory/35 to-platinum/40 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
        <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/85 via-platinum/40 to-ivory/55" />
        <span className="relative inline-flex items-center gap-4 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-9 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.15),0_22px_60px_-12px_rgba(203,205,205,0.55)] transition-all duration-500 group-hover:-translate-y-0.5">
          {label}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
        </span>
      </button>
      <div className="hidden flex-1 items-center gap-3 md:flex"><span className="block h-px w-12 bg-platinum/30" /></div>
    </motion.div>
  );
}

/* ── large overlay: the full collection ── */
function AllOffersModal({ open, onClose, items, txt }: { open: boolean; onClose: () => void; items: OfferRow[]; txt: OffersText }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] flex items-start justify-center p-3 md:p-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-obsidian/85 backdrop-blur-xl" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          <motion.div
            className="relative z-10 flex max-h-[94svh] w-full max-w-[1240px] flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)]"
            style={{ background: 'linear-gradient(180deg,#0c0d0e,#070809)' }}
            initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-gradient-to-b from-[rgba(10,11,12,0.95)] via-[rgba(10,11,12,0.7)] to-transparent px-6 py-5 backdrop-blur-md md:px-9">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.32em] text-platinum/70">
                  <span className="h-px w-7 bg-platinum/50" />{txt.eyebrow}
                </div>
                <h2 className="mt-1.5 truncate font-display text-2xl uppercase tracking-tight text-ivory md:text-3xl">{txt.allTitle}</h2>
              </div>
              <button onClick={onClose} data-cursor="hover" aria-label={txt.mClose}
                className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.05] text-ivory transition-all duration-300 hover:rotate-90 hover:bg-ivory hover:text-obsidian">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 md:p-9">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item, i) => (
                  <OfferCard key={`${item.slug}-${i}`} item={item} index={i} txt={txt} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OffersSection({
  offers,
  offersAll,
  txt,
}: {
  offers: OfferRow[];
  offersAll: OfferRow[];
  txt: OffersText;
}) {
  const [openAll, setOpenAll] = useState(false);
  const allItems = offersAll.length ? offersAll : offers;

  return (
    <section className="section overflow-hidden" id="offers">
      <div className="container">
        <SectionHeader eyebrow={txt.eyebrow} title={txt.title} subtitle={txt.subtitle} />

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((item, i) => (
            <OfferCard key={item.slug} item={item} index={i} txt={txt} />
          ))}
        </div>

        <ViewAllOffers onOpen={() => setOpenAll(true)} label={txt.viewAll} />
      </div>

      <AllOffersModal open={openAll} onClose={() => setOpenAll(false)} items={allItems} txt={txt} />
    </section>
  );
}