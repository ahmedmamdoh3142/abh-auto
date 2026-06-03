'use client';

/**
 * WhySection — 5-card image grid: "Why ABH Auto".
 *
 * Layout mirrors the reference (manus-style):
 *  - Five tall image cards in a responsive grid (1 / 2 / 5 columns).
 *  - Bottom-anchored title + description over a top-to-bottom black fade.
 *  - Glass-numbered chip in the top-end corner.
 *  - Slow zoom + overlay shift on hover.
 *
 * Adapted to the ABH luxury palette (platinum / ivory / steel) instead
 * of plain greys. Translation-driven, RTL-aware.
 */
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { SectionHeader } from '@/components/ui/section-header';
import { whyImages } from '@/lib/site-config';

interface WhyItem {
  title: string;
  copy: string;
}

export function WhySection() {
  const t = useTranslations('why');
  const items = t.raw('items') as WhyItem[];

  return (
    <section className="section relative overflow-hidden" id="about">
      <div className="container">
        {/* Centered header */}
        <SectionHeader
          eyebrow={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
          align="center"
          className="mx-auto max-w-3xl"
        />

        {/* 5-card image grid */}
        <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {items.map((reason, idx) => (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.9,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative h-[420px] cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-obsidian"
              data-cursor="hover"
            >
              {/* ─── Background image ────────────────────────────── */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                style={{ backgroundImage: `url('${whyImages[idx % whyImages.length]}')` }}
              />

              {/* ─── Cinematic overlays ──────────────────────────── */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent transition-opacity duration-700 group-hover:from-obsidian/95 group-hover:via-obsidian/40" />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/50" />

              {/* Faint top hairline */}
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-platinum/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* ─── Numbered chip (top-end) ─────────────────────── */}
              <div className="absolute top-5 end-5 z-20">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08] backdrop-blur-md ring-1 ring-white/15 transition-all duration-500 group-hover:bg-ivory group-hover:ring-white/40">
                  <span className="font-display text-lg leading-none text-ivory transition-colors duration-500 group-hover:text-obsidian">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* ─── Bottom content ──────────────────────────────── */}
              <div className="relative z-10 flex h-full flex-col justify-end p-6">
                {/* Animated rail above title */}
                <span className="mb-4 block h-px w-8 bg-platinum/60 transition-all duration-700 group-hover:w-16 group-hover:bg-ivory" />

                <h3 className="font-display text-xl uppercase leading-tight tracking-tight text-ivory balance md:text-[1.35rem]">
                  {reason.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-platinum/80 transition-colors duration-500 group-hover:text-platinum pretty">
                  {reason.copy}
                </p>
              </div>

              {/* Inner glow on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                style={{
                  boxShadow:
                    'inset 0 0 70px rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.10)',
                }}
              />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}