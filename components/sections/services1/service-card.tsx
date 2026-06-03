'use client';

/**
 * ServiceCard — the centerpiece. A two-panel hero card filling 90vh.
 *
 * Left panel  : full-bleed cinematic image with a slow ken-burns zoom
 * Right panel : structured content
 *   - Chapter indicator (numeral / total)
 *   - Service name + italic tagline
 *   - Description paragraph
 *   - "Included" bulleted list (ticks reveal one-by-one)
 *   - Price trio (S / M / L)
 *   - Warranty block
 *   - Reserve CTA
 *
 * The card is rendered statically once per service. Entry animations
 * (slide + fade) are handled by the parent carousel. Within the card,
 * only hover states animate.
 *
 * Mobile: panels stack vertically — image on top (45vh), content below.
 */
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowUpRight, Check, Shield, Sparkles, Plus, Clock } from 'lucide-react';

import { PriceTrio } from './price-trio';
import { ROMANS, type Service } from '@/lib/services-data';

interface Props {
  service: Service;
  index: number;
  total: number;
}

export function ServiceCard({ service, index, total }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <article className="relative grid h-full w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.025] via-white/[0.01] to-transparent backdrop-blur-md md:grid-cols-[1.1fr_1fr]">
      {/* ─── LEFT: Cinematic Image ──────────────────── */}
      <div className="relative h-[42vh] overflow-hidden md:h-full">
        {/* Image with ken-burns zoom */}
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Image
            src={service.image}
            alt={service.name.en}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            priority={index === 0}
            className="object-cover"
            style={{ filter: 'grayscale(0.3) brightness(0.85) contrast(1.05)' }}
          />
        </motion.div>

        {/* Cinematic gradient grade */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/30 via-transparent to-obsidian/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-transparent to-obsidian/60" />

        {/* Subtle noise */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Corner ornaments */}
        <span className="pointer-events-none absolute start-5 top-5 h-4 w-4 border-s border-t border-ivory/45" />
        <span className="pointer-events-none absolute end-5 top-5 h-4 w-4 border-e border-t border-ivory/45" />
        <span className="pointer-events-none absolute start-5 bottom-5 h-4 w-4 border-s border-b border-ivory/45" />
        <span className="pointer-events-none absolute end-5 bottom-5 h-4 w-4 border-e border-b border-ivory/45" />

        {/* Top: chapter indicator + duration chip */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 p-5 md:p-7" dir="ltr">
          <div className="flex items-center gap-3">
            <span className="block h-px w-5 bg-ivory/55" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-ivory/75">
              {ROMANS[index] ?? String(index + 1)} / {ROMANS[total - 1] ?? String(total)}
            </span>
          </div>

          {service.badge && <BadgeChip kind={service.badge} isAr={isAr} />}
        </div>

        {/* Bottom: service name (image-side title) */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-5 md:p-7">
          <div className="flex items-center gap-2.5 font-mono text-[0.5rem] uppercase tracking-[0.35em] text-ivory/65" dir="ltr">
            <Clock className="h-3 w-3" strokeWidth={1.6} />
            <span>{service.duration[isAr ? 'ar' : 'en']}</span>
          </div>
          <h2
            className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[0.95] tracking-tight text-ivory"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {service.name[isAr ? 'ar' : 'en']}
          </h2>
        </div>
      </div>

      {/* ─── RIGHT: Content panel ────────────────────── */}
      <div className="relative flex flex-col gap-5 overflow-y-auto p-6 md:gap-6 md:p-9 lg:p-11">
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-editorial text-base italic leading-relaxed text-platinum/85 md:text-lg"
        >
          {service.tagline[isAr ? 'ar' : 'en']}
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm leading-relaxed text-platinum/70 pretty md:text-[0.95rem]"
        >
          {service.description[isAr ? 'ar' : 'en']}
        </motion.p>

        {/* Divider */}
        <span className="block h-px w-full bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />

        {/* INCLUDED list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="block h-px w-6 bg-platinum/50" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/65">
              {isAr ? 'يشمل' : 'Included'}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {service.includes.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: isAr ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.3 + i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-2.5"
              >
                <Check
                  className="reversible-icon mt-0.5 h-3.5 w-3.5 shrink-0 text-platinum/70"
                  strokeWidth={2}
                />
                <span className="text-sm leading-snug text-platinum/85">
                  {item[isAr ? 'ar' : 'en']}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <span className="block h-px w-full bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />

        {/* Price trio */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.3 + service.includes.length * 0.07 + 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <PriceTrio prices={service.prices} />
        </motion.div>

        {/* Warranty + CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.3 + service.includes.length * 0.07 + 0.3,
          }}
          className="flex flex-col gap-5 pt-1 md:flex-row md:items-end md:justify-between"
        >
          <Warranty service={service} isAr={isAr} />
          <ReserveButton slug={service.slug} isAr={isAr} />
        </motion.div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
   Warranty block
   ═══════════════════════════════════════════════════════════ */
function Warranty({ service, isAr }: { service: Service; isAr: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-platinum/30 bg-platinum/[0.08]">
        <Shield className="h-3.5 w-3.5 text-platinum/85" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2" dir="ltr">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.4em] text-platinum/55">
            {isAr ? 'الضمان' : 'Warranty'}
          </span>
          <span className="block h-px w-3 bg-platinum/40" />
          <span className="font-display text-sm text-ivory">
            {service.warranty.duration[isAr ? 'ar' : 'en']}
          </span>
        </div>
        <span className="text-[0.7rem] leading-snug text-platinum/65">
          {service.warranty.notes
            .map((n) => n[isAr ? 'ar' : 'en'])
            .join(' · ')}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Reserve button
   ═══════════════════════════════════════════════════════════ */
function ReserveButton({ slug, isAr }: { slug: string; isAr: boolean }) {
  return (
    <Link
      href={`/contact?service=${slug}`}
      data-cursor="hover"
      className="group relative inline-flex shrink-0 items-center gap-2.5 self-start overflow-hidden rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-6 py-3 font-mono text-[0.6rem] font-medium uppercase tracking-[0.34em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_-10px_rgba(203,205,205,0.5)] transition-all duration-500 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_50px_-12px_rgba(203,205,205,0.7)] md:self-end"
    >
      <span className="relative">{isAr ? 'احجز' : 'Reserve'}</span>
      <ArrowUpRight
        className="reversible-icon relative h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2}
      />
      {/* Sheen sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100"
      />
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════
   Badge chip
   ═══════════════════════════════════════════════════════════ */
function BadgeChip({ kind, isAr }: { kind: 'signature' | 'new'; isAr: boolean }) {
  const label =
    kind === 'signature'
      ? isAr
        ? 'موقّعة'
        : 'Signature'
      : isAr
        ? 'جديد'
        : 'New';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.5rem] uppercase tracking-[0.32em] backdrop-blur-md ${
        kind === 'signature'
          ? 'border border-platinum/50 bg-ivory/15 text-ivory'
          : 'border border-ivory/30 bg-obsidian/40 text-ivory/85'
      }`}
    >
      {kind === 'signature' ? (
        <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
      ) : (
        <Plus className="h-2.5 w-2.5" strokeWidth={2.4} />
      )}
      {label}
    </span>
  );
}