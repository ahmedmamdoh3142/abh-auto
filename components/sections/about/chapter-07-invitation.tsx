'use client';

/**
 * Chapter 07 — Invitation
 *
 * The page does not end with a sales pitch. It ends with an offer.
 * Two short lines, one chrome capsule, and a quiet secondary link.
 *
 * Everything that came before earned the right to make this offer.
 * The chapter is deliberately short and centered — the page exhales.
 *
 * No sticky pinning. No scroll-driven choreography. Just whileInView
 * reveals because the user has done all the work; let them rest here.
 */
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

import { ChapterSlate, AtelierMark } from './chapter-slate';

export function ChapterInvitation() {
  const t = useTranslations('about.invitation');

  return (
    <section
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-obsidian px-8 py-32"
      data-chapter="07"
    >
      {/* Platinum bloom */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[55rem] w-[55rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.05] blur-[180px]"
        animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Slate + atelier mark */}
      <ChapterSlate
        number={t('chapter')}
        label={t('label')}
        variant="dark"
      />
      <AtelierMark variant="dark" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Top ornament */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <span className="block h-1 w-1 rounded-full bg-platinum/70 shadow-[0_0_12px_rgba(203,205,205,0.6)]" />
          <span className="block h-px w-32 bg-gradient-to-r from-platinum/40 via-platinum/70 to-platinum/40 md:w-48" />
          <span className="block h-1 w-1 rounded-full bg-platinum/70 shadow-[0_0_12px_rgba(203,205,205,0.6)]" />
        </motion.div>

        {/* Line 1 */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-tight balance"
        >
          <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
            {t('line')}
          </span>
        </motion.h2>

        {/* Line 2 — italic */}
        <motion.h3
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 font-editorial text-[clamp(3rem,9vw,7rem)] font-normal italic leading-[0.95] tracking-tight"
        >
          <span className="bg-gradient-to-br from-platinum/90 via-ivory to-platinum/60 bg-clip-text text-transparent">
            {t('sub')}
          </span>
        </motion.h3>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex flex-col items-center gap-8"
        >
          <PrimaryCTA href="/contact">{t('cta')}</PrimaryCTA>

        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
function PrimaryCTA({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      <span
        aria-hidden
        className="absolute -inset-4 rounded-full bg-platinum/30 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/60"
      />
      <span className="relative inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-10 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.15),0_18px_60px_-15px_rgba(203,205,205,0.6)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_30px_80px_-12px_rgba(203,205,205,0.85)]">
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}