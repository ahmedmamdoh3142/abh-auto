'use client';

/**
 * Section 01 — Overture
 *
 * A grand opening, intentionally form-less. The visitor arrives to a
 * single oversized statement that pairs:
 *   - "Begin a" in display ivory
 *   - "private conversation." in editorial italic platinum
 *
 * Above the title: a live status pill with a pulsing dot and the
 * Jeddah clock. Below: a centered, animated scroll prompt pointing
 * down to the letter composer in section 02.
 *
 * The hero stretches the type to its limits — the line "private
 * conversation." spans a comfortable 8vw and reads as a sentence,
 * not a slogan. We use a slow horizontal split-reveal — left half
 * of each letter rises from below, right half descends from above —
 * to give the heading a deliberate, almost mechanical entrance.
 *
 * No CTA button here. The Overture only sets the tone. Scrolling is
 * the action.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { useAtelierStatus } from '@/hooks/use-atelier-status';

const EASE = [0.16, 1, 0.3, 1] as const;
const BOOKING_IMAGE = '/images/hero-bg.webp';

export function Overture() {
  const t = useTranslations('contact.overture');
  const status = useAtelierStatus();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroOp = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0]);
  const heroBlur = useTransform(scrollYProgress, [0.4, 1], [0, 14]);
  const heroFilter = useTransform(heroBlur, (v) => `blur(${v}px)`);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
  }));

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44"
      data-section="overture"
    >
      {/* faint cinematic plate behind the band */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={BOOKING_IMAGE}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.18]"
          style={{ filter: 'grayscale(0.5) brightness(0.5) contrast(1.1)' }}
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute h-0.5 w-0.5 rounded-full bg-platinum/50"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.8, 0], y: [10, -50, -100] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      <motion.div
        style={{ y: heroY, opacity: heroOp, filter: heroFilter }}
        className="container relative z-10"
      >
        {/* Top chip — live status */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7 flex items-center justify-center"
        >
          <StatusPill status={status} t={t} />
        </motion.div>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          {t('eyebrow')}
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        {/* Headline — two-line split-reveal */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: EASE }}
              className="inline-block bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent"
            >
              {t('title_a')}
            </motion.span>
          </span>
          <span className="block overflow-hidden mt-1 md:mt-2">
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }}
              className="inline-block font-editorial italic text-platinum/85"
            >
              {t('title_b')}
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg"
        >
          {t('subtitle')}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.55, ease: EASE }}
          className="mx-auto mt-10 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent"
        />
      </motion.div>

      {/* Scroll prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.4 }}
        className="absolute inset-x-0 bottom-10 z-10 flex justify-center"
      >
        <ScrollPrompt label={t('scrollPrompt')} />
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   StatusPill — live atelier status with pulse + clock
   ═══════════════════════════════════════════════════════════ */
function StatusPill({
  status,
  t,
}: {
  status: ReturnType<typeof useAtelierStatus>;
  t: ReturnType<typeof useTranslations>;
}) {
  const isOpen = status?.open ?? false;
  return (
    <div
      className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2.5 backdrop-blur-md"
      dir="ltr"
      suppressHydrationWarning
    >
      <span className="relative grid h-2 w-2 place-items-center">
        {isOpen && (
          <motion.span
            animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-emerald-400"
          />
        )}
        <span
          className={`relative h-1.5 w-1.5 rounded-full ${
            isOpen
              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]'
              : 'bg-platinum/60'
          }`}
        />
      </span>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-platinum/85">
        {status ? (isOpen ? t('statusOpen') : t('statusClosed')) : '—'}
      </span>
      <span className="block h-3 w-px bg-platinum/30" />
      <span
        className="font-mono text-[0.55rem] tracking-[0.15em] tabular-nums text-platinum/65"
        suppressHydrationWarning
      >
        {status?.localTime.slice(0, 5) ?? '--:--'} JED
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ScrollPrompt — animated rail + word
   ═══════════════════════════════════════════════════════════ */
function ScrollPrompt({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-[0.55rem] uppercase tracking-[0.45em] text-platinum/55">
        {label}
      </span>
      <motion.span
        animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="block h-12 w-px origin-top bg-gradient-to-b from-platinum/80 to-transparent"
      />
    </div>
  );
}