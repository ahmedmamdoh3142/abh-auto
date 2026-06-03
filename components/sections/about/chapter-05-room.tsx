'use client';

/**
 * Chapter 05 — The Room
 *
 * A wide, atmospheric reveal of the workshop. The full-bleed image
 * parallaxes slowly. Over it, a 2×2 grid of environmental specs
 * (Air / Light / Temp / Bays) fades in one at a time as the user
 * scrolls — each spec is a "data point" that confirms the body copy.
 *
 * The body copy itself appears in two phases:
 *   - Phase 1: the headline "The room is half the work."
 *   - Phase 2: the explanatory paragraph + specs
 *
 * The chapter ends with a slow fade to black so the next chapter
 * (Remains) starts from silence.
 */
import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { whyImages } from '@/lib/site-config';
import { ChapterSlate, AtelierMark } from './chapter-slate';

interface Spec {
  k: string;
  v: string;
}

export function ChapterRoom() {
  const t = useTranslations('about.room');
  const specs = t.raw('specs') as Spec[];
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Image parallax
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.15, 1.05]);

  // Vignette intensifies near edges
  const vignetteOp = useTransform(scrollYProgress, [0, 0.5, 1], [0.5, 0.85, 1]);

  // Slate
  const slateOp = useTransform(scrollYProgress, [0, 0.05, 0.92, 1], [0, 1, 1, 0]);

  // Phase 1 — headline
  const introOp = useTransform(scrollYProgress, [0.1, 0.25, 0.45, 0.55], [0, 1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0.1, 0.25], [40, 0]);

  // Phase 2 — body + specs
  const bodyOp = useTransform(scrollYProgress, [0.5, 0.62, 0.88, 0.95], [0, 1, 1, 0]);
  const bodyY = useTransform(scrollYProgress, [0.5, 0.62], [40, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[300svh] w-full bg-obsidian"
      data-chapter="05"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ── Background image ──────────────────────────── */}
        <motion.div
          style={{ y: imgY, scale: imgScale }}
          className="absolute inset-0"
        >
          <Image
            src={whyImages[3]}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            style={{ filter: 'grayscale(0.6) brightness(0.85)' }}
          />
        </motion.div>

        {/* Vignette */}
        <motion.div
          style={{ opacity: vignetteOp }}
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-obsidian/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_20%,rgba(0,0,0,0.6)_100%)]" />
        </motion.div>

        {/* ── Slate ─────────────────────────────────────── */}
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={slateOp}
          variant="light"
        />
        <AtelierMark opacity={slateOp} variant="light" />

        {/* ── Phase 1 — headline centered ───────────────── */}
        <motion.div
          style={{ opacity: introOp, y: introY }}
          className="absolute inset-0 z-10 flex items-center justify-center px-8"
        >
          <h2 className="max-w-5xl text-center font-display text-[clamp(2.5rem,8vw,7rem)] leading-[0.95] tracking-tight text-ivory balance">
            <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
              {t('intro')}
            </span>
          </h2>
        </motion.div>

        {/* ── Phase 2 — body + specs grid ───────────────── */}
        <motion.div
          style={{ opacity: bodyOp, y: bodyY }}
          className="absolute inset-0 z-10 flex items-end px-8 pb-16 md:items-center md:px-16"
        >
          <div className="mx-auto grid w-full max-w-6xl items-end gap-12 md:grid-cols-2 md:gap-20">
            {/* Body */}
            <div className="flex flex-col gap-6">
              <span className="block h-px w-12 bg-platinum/60" />
              <p className="max-w-md font-editorial text-[clamp(1.2rem,2vw,1.6rem)] italic leading-[1.45] text-ivory/90 pretty">
                {t('body')}
              </p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              {specs.map((spec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 + i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex flex-col gap-3 bg-obsidian/40 p-6 backdrop-blur-md"
                >
                  <span className="text-[0.55rem] font-medium uppercase tracking-[0.35em] text-platinum/65">
                    {spec.k}
                  </span>
                  <span className="font-display text-2xl uppercase tracking-tight text-ivory md:text-3xl">
                    {spec.v}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}