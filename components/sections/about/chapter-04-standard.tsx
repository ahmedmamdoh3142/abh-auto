'use client';

/**
 * Chapter 04 — The Standard
 *
 * Three rules. Each rule takes its own full screen, revealed by a HARD
 * clip-path cut from the previous one — like a film scene change. This
 * is the most dramatic chapter, designed to feel architectural.
 *
 * Layout:
 *  - 400svh tall section, sticky 100svh inner viewport.
 *  - Intro panel (rules title) takes the first 25%.
 *  - Each of the 3 rules takes ~25% of the remaining scroll.
 *  - Each rule slides up from the bottom with a clip-path inset,
 *    creating the "cut" effect rather than a fade.
 *
 * Visual treatment:
 *  - Each rule has a different background tone (deep, mid, lighter)
 *    to feel like progressing through layers of stone.
 *  - Massive number "01" / "02" / "03" sits behind the rule text.
 *  - Outro fades in on top of rule 3 with the closing line.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { ChapterSlate, AtelierMark } from './chapter-slate';

interface Rule {
  n: string;
  rule: string;
  expand: string;
}

export function ChapterStandard() {
  const t = useTranslations('about.standard');
  const rules = t.raw('rules') as Rule[];
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Slate
  const slateOp = useTransform(scrollYProgress, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);

  // Intro panel — visible 0% → 18%, exits as rule 1 cuts in
  const introOp = useTransform(scrollYProgress, [0, 0.04, 0.16, 0.22], [0, 1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.05], [30, 0]);

  // Rule 1 — clips in at 18%, holds, clips out as rule 2 arrives
  const rule1Clip = useTransform(
    scrollYProgress,
    [0.18, 0.26, 0.4, 0.48],
    ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'],
  );
  const rule2Clip = useTransform(
    scrollYProgress,
    [0.42, 0.5, 0.62, 0.7],
    ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'],
  );
  const rule3Clip = useTransform(
    scrollYProgress,
    [0.64, 0.72, 0.92, 1],
    ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
  );

  // Outro fades in over rule 3
  const outroOp = useTransform(scrollYProgress, [0.88, 0.94, 0.98, 1], [0, 1, 1, 0]);

  const ruleClips = [rule1Clip, rule2Clip, rule3Clip];

  // Each rule gets a slightly different tone background
  const ruleBgs = [
    'bg-[#050608]',
    'bg-[#08090c]',
    'bg-[#0b0c10]',
  ];

  return (
    <section
      ref={ref}
      className="relative h-[300svh] w-full bg-obsidian"
      data-chapter="04"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-obsidian">
        <ChapterSlate
          number={t('chapter')}
          label={t('label')}
          opacity={slateOp}
          variant="dark"
        />
        <AtelierMark opacity={slateOp} variant="dark" />

        {/* ── Intro panel ───────────────────────────────── */}
        <motion.div
          style={{ opacity: introOp, y: introY }}
          className="absolute inset-0 z-10 flex items-center justify-center px-8"
        >
          <div className="flex flex-col items-center text-center">
            <span className="block h-px w-16 bg-platinum/60" />
            <h2 className="mt-8 font-display text-[clamp(3.5rem,11vw,9rem)] leading-[0.9] tracking-tight">
              <span className="bg-gradient-to-b from-ivory via-platinum to-ivory/60 bg-clip-text text-transparent">
                {t('intro')}
              </span>
            </h2>
            <span className="mt-8 text-[0.6rem] uppercase tracking-[0.5em] text-platinum/55">
              {t('label')}
            </span>
          </div>
        </motion.div>

        {/* ── Rules — stacked with clip-path reveals ────── */}
        {rules.map((rule, i) => (
          <motion.div
            key={i}
            style={{ clipPath: ruleClips[i], zIndex: 20 + i }}
            className={`absolute inset-0 ${ruleBgs[i]} flex items-center justify-center px-8`}
          >
            {/* Massive background number */}
            <span
              aria-hidden
              className="pointer-events-none absolute select-none font-display text-[clamp(20rem,42vw,38rem)] leading-none text-platinum/[0.04]"
              dir="ltr"
            >
              {rule.n}
            </span>

            <div className="relative mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1fr_1.4fr] md:items-center md:gap-20">
              {/* Left — rule number + label */}
              <div className="flex flex-col gap-6">
                <span
                  className="font-mono text-[0.6rem] uppercase tracking-[0.45em] text-platinum/55"
                  dir="ltr"
                >
                  RULE — {rule.n}
                </span>
                <span className="block h-px w-20 bg-platinum/60" />
                <span className="font-display text-[clamp(6rem,16vw,14rem)] leading-[0.85] tracking-tight" dir="ltr">
                  <span className="bg-gradient-to-b from-ivory via-platinum to-ivory/40 bg-clip-text text-transparent">
                    {rule.n}
                  </span>
                </span>
              </div>

              {/* Right — rule headline + body */}
              <div className="flex flex-col gap-8">
                <h3 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1] tracking-tight text-ivory balance">
                  {rule.rule}
                </h3>
                <p className="max-w-xl text-base leading-relaxed text-platinum/75 pretty">
                  {rule.expand}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* ── Outro overlay ─────────────────────────────── */}
        <motion.div
          style={{ opacity: outroOp }}
          className="absolute inset-x-0 bottom-16 z-40 flex flex-col items-center gap-4 text-center"
        >
          <span className="block h-px w-12 bg-platinum/60" />
          <p className="font-editorial text-[clamp(1rem,2vw,1.3rem)] italic text-platinum/85">
            {t('outro')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}