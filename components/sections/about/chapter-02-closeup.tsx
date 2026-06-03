'use client';

/**
 * Chapter 02 — Close-Up
 *
 * The signature Apple-product-page move: vertical scroll is translated
 * into horizontal travel across four cinematic frames. Each frame zooms
 * in on a single technical detail — film thickness, cure time, hardness,
 * warranty — letting numbers tell the craft story without prose.
 *
 * Layout:
 *  - Outer section is ~500svh tall (4 frames × ~125svh each).
 *  - Inner sticky container is 100svh, holding a horizontally laid-out
 *    track of N frames.
 *  - useScroll progress is mapped to a horizontal translate. In RTL,
 *    the track is mirrored so the visual flow always feels like
 *    "moving forward."
 *
 * Each frame contains:
 *  - A giant tag value (the headline number) in display type
 *  - A small label, title, and body
 *  - Subtle decorative scanlines anchored to the frame
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

import { ChapterSlate, AtelierMark } from './chapter-slate';

interface Frame {
  tag: string;
  title: string;
  copy: string;
}

export function ChapterCloseUp() {
  const t = useTranslations('about.closeup');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const frames = t.raw('frames') as Frame[];

  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // The track contains: intro card + frames. Total width = (N+1) viewports.
  // We move from 0 → -100% × N. In RTL we mirror direction.
  const totalTravel = frames.length; // in 100% units
  const xPct = useTransform(
    scrollYProgress,
    [0, 1],
    isRtl ? [0, totalTravel * 100] : [0, -totalTravel * 100],
  );
  const xStyle = useTransform(xPct, (v) => `${v}%`);

  // Header opacity — fades as user starts moving horizontally.
  const headerOp = useTransform(scrollYProgress, [0, 0.04, 0.1], [1, 1, 0]);

  // Per-frame progress indicator at the bottom
  const indicatorX = useTransform(
    scrollYProgress,
    [0.06, 1],
    isRtl ? ['100%', '0%'] : ['0%', '100%'],
  );

  return (
    <section
      ref={ref}
      className="relative w-full bg-obsidian"
      style={{ height: `${(totalTravel + 1) * 100}svh` }}
      data-chapter="02"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={headerOp}
          variant="dark"
        />
        <AtelierMark opacity={headerOp} variant="dark" />

        {/* ── Horizontal track ──────────────────────────── */}
        <motion.div
          style={{ x: xStyle }}
          className="flex h-full"
        >
          {/* Intro panel */}
          <div className="flex h-full w-screen shrink-0 items-center justify-center px-8">
            <div className="flex max-w-2xl flex-col items-start gap-6">
              <span className="text-[0.6rem] uppercase tracking-[0.45em] text-platinum/55">
                {t('label')} — {t('chapter')}
              </span>
              <h2 className="font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-tight">
                <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
                  {t('intro')}
                </span>
              </h2>
              <span className="mt-4 block h-px w-24 bg-gradient-to-r from-platinum/60 to-transparent rtl:bg-gradient-to-l" />
              <p className="text-sm uppercase tracking-[0.35em] text-platinum/50">
                {isRtl ? 'مرّر ←' : 'Scroll →'}
              </p>
            </div>
          </div>

          {/* Frames */}
          {frames.map((frame, i) => (
            <FrameCard key={i} frame={frame} index={i} total={frames.length} />
          ))}
        </motion.div>

        {/* ── Bottom progress rail ──────────────────────── */}
        <div className="absolute bottom-10 start-10 end-10 z-20 flex items-center gap-4">
          <span className="font-mono text-[0.55rem] tracking-[0.35em] text-platinum/55">
            01
          </span>
          <div className="relative h-px flex-1 bg-white/[0.08]">
            <motion.div
              style={{ width: indicatorX }}
              className="absolute inset-y-0 start-0 bg-gradient-to-r from-platinum/60 to-ivory rtl:bg-gradient-to-l"
            />
          </div>
          <span className="font-mono text-[0.55rem] tracking-[0.35em] text-platinum/55">
            {String(frames.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
function FrameCard({
  frame,
  index,
  total,
}: {
  frame: Frame;
  index: number;
  total: number;
}) {
  return (
    <div className="relative flex h-full w-screen shrink-0 items-center justify-center px-8 md:px-20">
      {/* Frame border decoration */}
      <span
        aria-hidden
        className="pointer-events-none absolute start-8 top-1/2 hidden h-40 -translate-y-1/2 border-s border-platinum/15 md:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute end-8 top-1/2 hidden h-40 -translate-y-1/2 border-e border-platinum/15 md:block"
      />

      <div className="grid w-full max-w-6xl items-center gap-12 md:grid-cols-[1.2fr_1fr] md:gap-20">
        {/* The giant tag */}
        <div className="flex flex-col" dir="ltr">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.4em] text-platinum/55">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <h3 className="mt-5 font-display text-[clamp(4rem,14vw,11rem)] leading-[0.85] tracking-[-0.04em]">
            <span className="bg-gradient-to-br from-ivory via-platinum to-ivory/60 bg-clip-text text-transparent">
              {frame.tag}
            </span>
          </h3>
        </div>

        {/* The story */}
        <div className="flex flex-col gap-5">
          <span className="block h-px w-12 bg-platinum/60" />
          <h4 className="font-display text-[clamp(1.5rem,3vw,2.4rem)] uppercase leading-tight tracking-tight text-ivory">
            {frame.title}
          </h4>
          <p className="max-w-md text-base leading-relaxed text-platinum/75 pretty">
            {frame.copy}
          </p>
        </div>
      </div>
    </div>
  );
}