'use client';

/**
 * Chapter 03 — The Hand
 *
 * A cinematic, near-silent chapter. The full viewport is filled by a
 * single high-contrast monochrome portrait. As the user scrolls:
 *
 *   1. The image starts heavily zoomed in (close on hands/eyes).
 *   2. As scroll progresses, the image SCALES DOWN slowly, "pulling
 *      back" the camera — a classic film device.
 *   3. The headline drops in from above the fold.
 *   4. The name & role appear last as a film-credit-style line.
 *
 * The chapter feels SILENT — no decorative elements, no chrome, just
 * image + type + space. This is the page's emotional anchor.
 *
 * Sticky pinned for 250svh so the camera pull-back is slow and felt.
 */
import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { whyImages } from '@/lib/site-config';
import { ChapterSlate, AtelierMark } from './chapter-slate';

export function ChapterHand() {
  const t = useTranslations('about.hand');
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Camera pull-back — image starts at 1.6x and ends at 1.0x.
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.6, 1]);
  // Subtle vertical drift to break the static frame
  const imgY = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  // Vignette intensifies on entry, eases out on exit
  const vignette = useTransform(
    scrollYProgress,
    [0, 0.3, 0.8, 1],
    [1, 0.7, 0.7, 1],
  );

  // Title — enters at 20%, holds, exits at 90%
  const titleOp = useTransform(scrollYProgress, [0.15, 0.3, 0.85, 0.95], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0.15, 0.3], [40, 0]);

  // Subtitle a beat after the title
  const subOp = useTransform(scrollYProgress, [0.28, 0.45, 0.85, 0.95], [0, 1, 1, 0]);
  const subY = useTransform(scrollYProgress, [0.28, 0.45], [40, 0]);

  // Body paragraph
  const bodyOp = useTransform(scrollYProgress, [0.42, 0.58, 0.85, 0.95], [0, 1, 1, 0]);

  // Credit line — bottom corner
  const creditOp = useTransform(scrollYProgress, [0.6, 0.75, 0.92], [0, 1, 0]);

  // Slate
  const slateOp = useTransform(scrollYProgress, [0, 0.05, 0.92, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[280svh] w-full bg-obsidian"
      data-chapter="03"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ── Portrait — full bleed, camera pull-back ───── */}
        <motion.div
          style={{ scale: imgScale, y: imgY }}
          className="absolute inset-0"
        >
          <Image
            src={whyImages[0]}
            alt={t('name')}
            fill
            priority={false}
            sizes="100vw"
            className="object-cover"
            style={{ filter: 'grayscale(0.8) contrast(1.05)' }}
          />
        </motion.div>

        {/* Cinematic vignette — heavy on edges */}
        <motion.div
          style={{ opacity: vignette }}
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-obsidian/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/70 via-transparent to-obsidian/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
        </motion.div>

        {/* Film grain */}
        <div className="pointer-events-none absolute inset-0 noise opacity-40" />

        {/* ── Slate + atelier mark ──────────────────────── */}
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={slateOp}
          variant="light"
        />
        <AtelierMark opacity={slateOp} variant="light" />

        {/* ── Text — bottom-aligned ─────────────────────── */}
        <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-20 md:px-16 md:pb-24">
          <div className="max-w-4xl">
            <motion.h2
              style={{ opacity: titleOp, y: titleY }}
              className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-tight text-ivory"
            >
              {t('title')}
            </motion.h2>

            <motion.h2
              style={{ opacity: subOp, y: subY }}
              className="-mt-2 font-editorial text-[clamp(3rem,9vw,8rem)] font-normal italic leading-[0.92] tracking-tight text-platinum/85"
            >
              {t('subtitle')}
            </motion.h2>

            <motion.p
              style={{ opacity: bodyOp }}
              className="mt-10 max-w-xl text-base leading-relaxed text-platinum/85 pretty"
            >
              {t('body')}
            </motion.p>
          </div>
        </div>

        {/* ── Film credit — bottom-end ──────────────────── */}
        <motion.div
          style={{ opacity: creditOp }}
          className="absolute bottom-10 end-10 z-10 flex flex-col items-end gap-3 text-end md:bottom-12 md:end-12"
          dir="ltr"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.45em] text-ivory/55">
              Portrait
            </span>
            <span className="block h-px w-8 bg-ivory/50" />
          </div>
          <span className="font-display text-lg uppercase tracking-tight text-ivory md:text-xl">
            {t('name')}
          </span>
          <span className="text-[0.55rem] uppercase tracking-[0.4em] text-ivory/65">
            {t('role')}
          </span>
        </motion.div>
      </div>
    </section>
  );
}