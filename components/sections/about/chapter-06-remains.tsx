'use client';

/**
 * Chapter 06 — What Remains
 *
 * تعديلات هذه النسخة:
 *  • تقليل الارتفاع (550svh → 340svh) لتقليل السكرول الميّت.
 *  • إعادة ضبط النطاقات: start=0.1 و slice=0.21 بحيث آخر رقم يخرج عند ~0.94
 *    فلا يبقى ذيل طويل فاضي في نهاية السكشن.
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

  const slateOp = useTransform(scrollYProgress, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

  // Intro أقصر — يخرج عند 0.1 مع دخول أول رقم
  const introOp = useTransform(scrollYProgress, [0, 0.03, 0.07, 0.1], [0, 1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.04], [30, 0]);

  // توزيع أحكم: يبدأ مبكرًا وكل رقم يأخذ شريحة أكبر فينتهي قرب النهاية
  const slice = 0.21;
  const start = 0.1;

  const activeIndex = useTransform(scrollYProgress, (v) => {
    if (v < start) return -1;
    if (v >= start + slice * items.length) return items.length;
    return Math.floor((v - start) / slice);
  });

  return (
    <section
      ref={ref}
      className="relative h-[340svh] w-full bg-obsidian"
      data-chapter="06"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Atmospheric bloom — CSS (لا framer infinite) */}
        <style>{`
          .rem-bloom{left:50%;top:50%;transform:translate(-50%,-50%);animation:remBloom 14s ease-in-out infinite;}
          @keyframes remBloom{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.4}50%{transform:translate(-50%,-50%) scale(1.06);opacity:.8}}
          @media (prefers-reduced-motion: reduce),(max-width:820px){.rem-bloom{animation:none}}
        `}</style>
        <div
          aria-hidden
          className="rem-bloom pointer-events-none absolute z-0 h-[55rem] w-[55rem] rounded-full bg-platinum/[0.05] blur-[180px]"
        />

        {/* Grid lines */}
        <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

        {/* ── Slate + atelier mark ──────────────────────── */}
        <ChapterSlate number={t('chapter')} label={t('label')} opacity={slateOp} variant="dark" />
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

function ActiveCounter({ active, total }: { active: MotionValue<number>; total: number }) {
  const [n, setN] = useState(0);
  useMotionValueEvent(active, 'change', (v) => {
    const clamped = Math.max(0, Math.min(total, Math.round(v + 1)));
    if (clamped !== n) setN(clamped);
  });
  return (
    <>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/55">Evidence</span>
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

  const op = useTransform(progress, [inAt, peakAt - 0.02, outAt - 0.04, outAt], [0, 1, 1, 0]);
  const y = useTransform(progress, [inAt, peakAt, outAt - 0.04, outAt], [60, 0, 0, -60]);

  return (
    <motion.div style={{ opacity: op, y }} className="absolute inset-0 z-20 flex items-center justify-center px-8">
      <div className="flex w-full max-w-6xl flex-col items-center text-center">
        <span className="mb-12 font-mono text-[0.55rem] uppercase tracking-[0.5em] text-platinum/50" dir="ltr">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>

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

        <span className="mt-10 block h-px w-16 bg-platinum/50" />

        <p className="mt-8 max-w-xl text-[clamp(0.85rem,1.4vw,1.05rem)] uppercase tracking-[0.3em] text-platinum/75">
          {item.k}
        </p>
      </div>
    </motion.div>
  );
}