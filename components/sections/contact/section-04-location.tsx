'use client';

/**
 * Section 04 — Location
 *
 * A two-column composition. The LEFT side is dominated by a giant
 * editorial title "Jeddah · Al-Faisaliyah" — the second word in
 * Playfair italic, taking up most of the column width. Below the
 * title sits the address, then the coordinates pill, then phone &
 * email as link rows with hover effects.
 *
 * The RIGHT side holds the real Google Maps iframe with a dark
 * filter applied so it looks native to the palette. Subtle corner
 * ornaments and a top-left coordinates chip make the map feel like
 * an artifact, not an embed.
 *
 * The header eyebrow & title use a marquee-style horizontal entrance
 * — letters slide in from the start edge in a staggered cascade.
 */
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';

// Atelier coordinates — replace with the real address coords later
const LAT = 21.485800;
const LNG = 39.192500;
const MAPS_EMBED = `https://www.google.com/maps?q=${LAT},${LNG}&hl=en&z=15&output=embed`;
const MAPS_LINK = `https://www.google.com/maps?q=${LAT},${LNG}`;

export function Location() {
  const t = useTranslations('contact.location');
  const ref = useRef<HTMLElement>(null);
  const addressLines = t.raw('address') as string[];

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const slateOp = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden py-28 md:py-40"
      data-section="location"
    >
      <ChapterSlate number="03" label={t('eyebrow')} opacity={slateOp} variant="dark" />
      <AtelierMark opacity={slateOp} variant="dark" />

      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* ── LEFT: Typography + details ─────────────── */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4"
            >
              <span className="block h-px w-12 bg-platinum/40" />
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.45em] text-platinum/70">
                {t('eyebrow')}
              </span>
            </motion.div>

            {/* Giant title — display + italic split */}
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.15 }}
              className="mt-10 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.95] tracking-tight"
            >
              <motion.span
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="block bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent"
              >
                {t('title_a')}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="block font-editorial italic text-platinum/85"
              >
                {t('title_b')}
              </motion.span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-8 max-w-md font-editorial text-base italic leading-relaxed text-platinum/70"
            >
              {t('subtitle')}
            </motion.p>

            {/* Address block */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.75 }}
              className="mt-12 flex flex-col gap-1.5"
            >
              {addressLines.map((line, i) => (
                <span
                  key={i}
                  className={`text-sm leading-relaxed ${
                    i === 0 ? 'font-medium text-ivory' : 'text-platinum/75'
                  }`}
                >
                  {line}
                </span>
              ))}
            </motion.div>

            {/* Coordinates pill */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.9 }}
              className="mt-8 inline-flex w-fit items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.025] px-4 py-2 backdrop-blur-md"
              dir="ltr"
            >
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.4em] text-platinum/60">
                {t('coordinatesLabel')}
              </span>
              <span className="block h-3 w-px bg-platinum/30" />
              <span className="font-mono text-[0.6rem] tracking-[0.15em] text-platinum/85">
                {LAT.toFixed(4)}°N · {LNG.toFixed(4)}°E
              </span>
            </motion.div>

            {/* Phone + Email links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 1.05 }}
              className="mt-10 flex flex-col gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]"
            >
              <LinkRow
                href={`tel:${t('phone').replace(/\s/g, '')}`}
                label={t('phoneLabel')}
                value={t('phone')}
                icon={<Phone className="reversible-icon h-3.5 w-3.5" strokeWidth={1.6} />}
              />
              <LinkRow
                href={`mailto:${t('email')}`}
                label={t('emailLabel')}
                value={t('email')}
                icon={<Mail className="reversible-icon h-3.5 w-3.5" strokeWidth={1.6} />}
              />
            </motion.div>
          </div>

          {/* ── RIGHT: Map ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/[0.08] lg:aspect-auto lg:min-h-[640px]"
          >
            <iframe
              src={MAPS_EMBED}
              title="Atelier location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full"
              style={{
                filter:
                  'invert(0.92) hue-rotate(180deg) brightness(0.85) contrast(0.95)',
                border: 0,
              }}
            />

            {/* Fade overlays preserve interactivity below */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-obsidian/50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-obsidian/50 to-transparent" />

            {/* Corner ornaments */}
            <span className="pointer-events-none absolute start-5 top-5 z-20 h-4 w-4 border-s border-t border-ivory/50" />
            <span className="pointer-events-none absolute end-5 top-5 z-20 h-4 w-4 border-e border-t border-ivory/50" />
            <span className="pointer-events-none absolute start-5 bottom-5 z-20 h-4 w-4 border-s border-b border-ivory/50" />
            <span className="pointer-events-none absolute end-5 bottom-5 z-20 h-4 w-4 border-e border-b border-ivory/50" />

            {/* Top-start location chip */}
            <div
              className="pointer-events-none absolute start-8 top-8 z-20 inline-flex items-center gap-2 rounded-full border border-white/[0.2] bg-obsidian/65 px-3 py-1.5 backdrop-blur-md"
              dir="ltr"
            >
              <MapPin className="h-3 w-3 text-ivory" strokeWidth={1.8} />
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-ivory/85">
                ATELIER I · JEDDAH
              </span>
            </div>

            {/* Bottom-end "Open in Maps" floating CTA */}
            <Link
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="hover"
              className="group absolute bottom-8 end-8 z-20 inline-flex items-center gap-3 rounded-full border border-white/[0.2] bg-obsidian/75 px-5 py-3 backdrop-blur-md transition-all duration-500 hover:border-ivory/50 hover:bg-obsidian/90"
            >
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-ivory">
                {t('directionsCta')}
              </span>
              <ArrowUpRight
                className="reversible-icon h-3.5 w-3.5 text-ivory transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2}
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
function LinkRow({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className="group flex items-center justify-between gap-4 bg-obsidian/30 px-5 py-4 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.1] text-platinum/70 transition-all duration-500 group-hover:border-platinum/50 group-hover:text-ivory">
          {icon}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-platinum/55">
            {label}
          </span>
          <span
            className="font-mono text-xs tracking-[0.12em] text-ivory"
            dir="ltr"
          >
            {value}
          </span>
        </div>
      </div>
      <ArrowUpRight
        className="reversible-icon h-3.5 w-3.5 text-platinum/40 transition-all duration-500 group-hover:text-ivory group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2}
      />
    </Link>
  );
}