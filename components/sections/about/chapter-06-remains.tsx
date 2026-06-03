'use client';

/**
 * Chapter 06 — What Remains
 *
 * Numbers are not "stats." They are evidence. Each number arrives
 * alone, claims the screen, then yields to the next. The effect is
 * architectural — like inscriptions on a monument.
 *
 * Layout:
 *  - 500svh tall, sticky 100svh inner viewport.
 *  - Intro (15%) → 4 numbers × 18% each → outro fade (15%).
 *  - Each number occupies the full viewport with massive display type.
 *  - As one fades up and out, the next fades in from below.
 *  - A persistent counter "01/04" in the corner tracks progress.
 */
import { useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { useTranslations } from 'next-intl';

import { ChapterSlate, AtelierMark } from './chapter-slate';

interface Item {
  v: string;
  unit: string;
  k: string;
}

export function ChapterRemains() {
  const t = useTranslations('about.remains');
  const items = t.raw('items') as Item[];
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Slate
  const slateOp = useTransform(scrollYProgress, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

  // Intro (centered title) — visible at start
  const introOp = useTransform(scrollYProgress, [0, 0.05, 0.13, 0.18], [0, 1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.05], [30, 0]);

  // Each number takes a slice. With 4 numbers and ~80% of scroll to
  // distribute, each gets ~20%.
  const slice = 0.18;
  const start = 0.18;

  // Persistent counter — top-right
  const activeIndex = useTransform(scrollYProgress, (v) => {
    if (v < start) return -1;
    if (v >= start + slice * items.length) return items.length;
    return Math.floor((v - start) / slice);
  });

  return (
    <section
      ref={ref}
      className="relative h-[550svh] w-full bg-obsidian"
      data-chapter="06"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Atmospheric bloom */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[55rem] w-[55rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.05] blur-[180px]"
          animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Grid lines */}
        <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

        {/* ── Slate + atelier mark ──────────────────────── */}
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={slateOp}
          variant="dark"
        />
        <AtelierMark opacity={slateOp} variant="dark" />

        {/* ── Live evidence counter — bottom-right ──────── */}
        <motion.div
          style={{ opacity: slateOp }}
          className="absolute bottom-10 end-10 z-30 flex flex-col items-end gap-2 md:bottom-12 md:end-12"
          dir="ltr"
        >
          <ActiveCounter active={activeIndex} total={items.length} />
        </motion.div>

        {/* ── Intro ─────────────────────────────────────── */}
        <motion.div
          style={{ opacity: introOp, y: introY }}
          className="absolute inset-0 z-10 flex items-center justify-center px-8"
        >
          <div className="flex max-w-4xl flex-col items-center text-center">
            <span className="block h-px w-16 bg-platinum/60" />
            <h2 className="mt-8 font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] tracking-tight">
              <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
                {t('intro')}
              </span>
            </h2>
          </div>
        </motion.div>

        {/* ── Numbers — one at a time ───────────────────── */}
        {items.map((item, i) => {
          const inAt = start + i * slice;
          const peakAt = inAt + slice * 0.4;
          const outAt = inAt + slice;
          return (
            <NumberPanel
              key={i}
              item={item}
              index={i}
              total={items.length}
              progress={scrollYProgress}
              range={[inAt, peakAt, outAt]}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */

function ActiveCounter({
  active,
  total,
}: {
  active: MotionValue<number>;
  total: number;
}) {
  const [n, setN] = useState(0);
  useMotionValueEvent(active, 'change', (v) => {
    const clamped = Math.max(0, Math.min(total, Math.round(v + 1)));
    if (clamped !== n) setN(clamped);
  });
  return (
    <>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/55">
        Evidence
      </span>
      <span className="font-display text-2xl leading-none text-platinum/70">
        {String(Math.max(1, n)).padStart(2, '0')}
        <span className="text-platinum/30"> / </span>
        {String(total).padStart(2, '0')}
      </span>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
function NumberPanel({
  item,
  index,
  total,
  progress,
  range,
}: {
  item: Item;
  index: number;
  total: number;
  progress: MotionValue<number>;
  range: [number, number, number];
}) {
  const [inAt, peakAt, outAt] = range;

  const op = useTransform(
    progress,
    [inAt, peakAt - 0.02, outAt - 0.04, outAt],
    [0, 1, 1, 0],
  );
  // Combined y motion: enter from 60 → 0, then exit 0 → -60
  const y = useTransform(
    progress,
    [inAt, peakAt, outAt - 0.04, outAt],
    [60, 0, 0, -60],
  );

  return (
    <motion.div
      style={{ opacity: op, y }}
      className="absolute inset-0 z-20 flex items-center justify-center px-8"
    >
      <div className="flex w-full max-w-6xl flex-col items-center text-center">
        {/* Tiny lead-in */}
        <span
          className="mb-12 font-mono text-[0.55rem] uppercase tracking-[0.5em] text-platinum/50"
          dir="ltr"
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>

        {/* The number — gigantic */}
        <div className="flex items-baseline gap-3" dir="ltr">
          <span className="font-display text-[clamp(8rem,28vw,24rem)] leading-[0.85] tracking-[-0.06em]">
            <span className="bg-gradient-to-b from-ivory via-platinum to-ivory/30 bg-clip-text text-transparent">
              {item.v}
            </span>
          </span>
          {item.unit && (
            <span className="font-display text-[clamp(2rem,5vw,4rem)] leading-none text-platinum/60">
              {item.unit}
            </span>
          )}
        </div>

        {/* Hairline */}
        <span className="mt-10 block h-px w-16 bg-platinum/50" />

        {/* Label */}
        <p className="mt-8 max-w-xl text-[clamp(0.85rem,1.4vw,1.05rem)] uppercase tracking-[0.3em] text-platinum/75">
          {item.k}
        </p>
      </div>
    </motion.div>
  );
}