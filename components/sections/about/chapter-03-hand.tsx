'use client';

/**
 * Chapter 03 — The Hand
 *
 * تعديلات هذه النسخة:
 *  • تخفيف تعتيم الصورة بشكل كبير حتى تظهر البورتريه بوضوح (كانت تبدو سوداء على
 *    الموبايل): grayscale أقل + brightness أعلى + تدرّجات/vignette أخف. النص أسفل
 *    الصورة يبقى مقروءًا عبر تدرّج سفلي فقط.
 *  • تقليل ارتفاع السكشن (280svh → 190svh) لتقليل السكرول الميّت بين الفصول.
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
  const imgY = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  // Vignette أخف بكثير حتى تظهر الصورة
  const vignette = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0.7, 0.45, 0.45, 0.7]);

  const titleOp = useTransform(scrollYProgress, [0.15, 0.3, 0.85, 0.95], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0.15, 0.3], [40, 0]);
  const subOp = useTransform(scrollYProgress, [0.28, 0.45, 0.85, 0.95], [0, 1, 1, 0]);
  const subY = useTransform(scrollYProgress, [0.28, 0.45], [40, 0]);
  const bodyOp = useTransform(scrollYProgress, [0.42, 0.58, 0.85, 0.95], [0, 1, 1, 0]);
  const creditOp = useTransform(scrollYProgress, [0.6, 0.75, 0.92], [0, 1, 0]);
  const slateOp = useTransform(scrollYProgress, [0, 0.05, 0.92, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[190svh] w-full bg-obsidian"
      data-chapter="03"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ── Portrait — full bleed, camera pull-back ───── */}
        <motion.div style={{ scale: imgScale, y: imgY }} className="absolute inset-0">
          <Image
            src={whyImages[0]}
            alt={t('name')}
            fill
            sizes="100vw"
            className="object-cover"
            style={{ filter: 'grayscale(0.45) contrast(1.08) brightness(1.08)' }}
          />
        </motion.div>

        {/* Cinematic vignette — أخف (تدرّج سفلي للنص + إطار جانبي خفيف) */}
        <motion.div style={{ opacity: vignette }} aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/40 via-transparent to-obsidian/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
        </motion.div>

        {/* Film grain */}
        <div className="pointer-events-none absolute inset-0 noise opacity-40" />

        {/* ── Slate + atelier mark ──────────────────────── */}
        <ChapterSlate number={t('chapter')} label={t('label')} opacity={slateOp} variant="light" />
        <AtelierMark opacity={slateOp} variant="light" />

        {/* ── Text — bottom-aligned ─────────────────────── */}
        <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-20 md:px-16 md:pb-24">
          <div className="max-w-4xl">
            <motion.h2
              style={{ opacity: titleOp, y: titleY }}
              className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-tight text-ivory drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]"
            >
              {t('title')}
            </motion.h2>

            <motion.h2
              style={{ opacity: subOp, y: subY }}
              className="-mt-2 font-editorial text-[clamp(3rem,9vw,8rem)] font-normal italic leading-[0.92] tracking-tight text-platinum/90 drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]"
            >
              {t('subtitle')}
            </motion.h2>

            <motion.p
              style={{ opacity: bodyOp }}
              className="mt-10 max-w-xl text-base leading-relaxed text-ivory/90 pretty drop-shadow-[0_1px_10px_rgba(0,0,0,0.8)]"
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
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.45em] text-ivory/70">Portrait</span>
            <span className="block h-px w-8 bg-ivory/60" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}