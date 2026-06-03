'use client';

/**
 * Chapter 01 — The Obsession
 *
 * A sticky-pinned manifesto. As the user scrolls through the chapter's
 * extra height (300vh tall section), the inner viewport stays fixed
 * and five lines of the manifesto reveal one at a time, each in a
 * different visual weight.
 *
 * This is the chapter that establishes the brand's *voice*. The line
 * "We are in the business of right." is the climax — it gets the
 * largest type and the brightest gradient.
 *
 * Mechanics:
 *  - 300svh tall section with a sticky 100svh inner container.
 *  - Each line is mapped to a scroll-progress range. Earlier lines fade
 *    *out* as later lines arrive, creating a film-like cross-cut.
 *  - The chapter number "01" sits in the corner as a film slate.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { ChapterSlate, AtelierMark } from './chapter-slate';

/** Helper — interpolate a line's opacity across an in/out range. */
function useLineMotion(
  progress: MotionValue<number>,
  inRange: [number, number],
  outRange: [number, number],
) {
  const opacity = useTransform(
    progress,
    [inRange[0], inRange[1], outRange[0], outRange[1]],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [inRange[0], inRange[1]], [40, 0]);
  const blur = useTransform(progress, [inRange[0], inRange[1]], [12, 0]);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);
  return { opacity, y, filter };
}

export function ChapterObsession() {
  const t = useTranslations('about.obsession');
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Five lines, each owning a slice of the scroll range.
  const l1 = useLineMotion(scrollYProgress, [0.02, 0.12], [0.22, 0.32]);
  const l2 = useLineMotion(scrollYProgress, [0.12, 0.22], [0.32, 0.42]);
  const l3 = useLineMotion(scrollYProgress, [0.22, 0.32], [0.42, 0.52]);
  const l4 = useLineMotion(scrollYProgress, [0.42, 0.52], [0.65, 0.78]);
  const l5 = useLineMotion(scrollYProgress, [0.52, 0.65], [0.85, 1]);

  // Footnote arrives last, fades with chapter exit.
  const footOp = useTransform(scrollYProgress, [0.78, 0.88, 0.96], [0, 1, 0]);
  const footY = useTransform(scrollYProgress, [0.78, 0.88], [20, 0]);

  // Chapter slate (top corner) — visible across whole chapter.
  const slateOp = useTransform(scrollYProgress, [0, 0.06, 0.94, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[320svh] w-full bg-obsidian"
      data-chapter="01"
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={slateOp}
          variant="dark"
        />
        <AtelierMark opacity={slateOp} variant="dark" />


        {/* ── Manifesto stack ──────────────────────────── */}
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-1 px-8 md:px-16">
          {/* Group A — the "We are not in the business of fast" */}
          <div className="relative w-full">
            <motion.h2
              style={l1}
              className="font-display text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.95] tracking-tight text-platinum/70"
            >
              {t('line1')}
            </motion.h2>
            <motion.h2
              style={l2}
              className="absolute inset-0 font-display text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.95] tracking-tight text-platinum/85"
            >
              {t('line1')}{' '}
              <span className="italic">{t('line2')}</span>
            </motion.h2>
            <motion.h2
              style={l3}
              className="absolute inset-0 font-display text-[clamp(2.5rem,7vw,6rem)] font-normal leading-[0.95] tracking-tight text-ivory/70"
            >
              {t('line1')} <span className="italic">{t('line2')}</span>{' '}
              <span className="text-platinum/40 line-through decoration-[0.5px]">
                {t('line3')}
              </span>
            </motion.h2>
          </div>

          {/* Group B — the climax */}
          <div className="relative mt-12 w-full md:mt-20">
            <motion.h2
              style={l4}
              className="font-display text-[clamp(3rem,9vw,8rem)] font-normal leading-[0.92] tracking-tight"
            >
              <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
                {t('line4')}
              </span>
            </motion.h2>
            <motion.h2
              style={l5}
              className="mt-2 font-editorial text-[clamp(3.5rem,11vw,10rem)] font-normal italic leading-[0.9] tracking-tight"
            >
              <span className="bg-gradient-to-br from-ivory via-platinum to-ivory/70 bg-clip-text text-transparent">
                {t('line5')}
              </span>
            </motion.h2>
          </div>

          {/* Footnote */}
          <motion.div
            style={{ opacity: footOp, y: footY }}
            className="mt-16 flex items-center gap-4"
          >
            <span className="block h-px w-12 bg-platinum/50" />
            <span className="text-[0.6rem] uppercase tracking-[0.4em] text-platinum/65">
              {t('footnote')}
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}