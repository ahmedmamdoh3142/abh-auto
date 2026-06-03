'use client';

/**
 * Hero — ABH Auto · world-class redesign
 * Path in your repo: components/sections/hero.tsx  (export `Hero`)
 *
 * What changed & why (vs. the previous hero):
 *  - Cinematic image upgrade via a local HERO_IMAGE constant. lib/site-config.ts
 *    is read-only, so the new dark-studio Unsplash source lives here — mirroring
 *    the pattern CtaSection already uses with its CTA_IMAGE constant.
 *  - True `min-h-[100svh]` stage (mobile-correct) instead of `h-screen`.
 *  - Looping ken-burns (1.0 → 1.08 / 18s) nested *under* scroll parallax, so the
 *    loop and the scroll transform never fight over the same `scale`.
 *  - Multi-layer cinematic grade pre-applied inline (SSR === CSR, no hydration jump).
 *  - Passe-partout hairline frame that draws in from the corners on mount.
 *  - Drifting vertical scan line, four corner crosshairs, noise veil.
 *  - TWO CTAs (chrome primary + ghost secondary), as the brief requires.
 *  - Type reveals are opacity + translateY ONLY — no clipPath, no blur filter —
 *    honoring this codebase's hard-won anti-fragility rules.
 *  - Brand mark stays dir="ltr" + <bdi> so it never mirrors on RTL pages.
 *
 * New i18n keys (added to messages/en.json + ar.json):
 *   hero.cta_secondary , hero.discover
 */
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ArrowDown } from 'lucide-react';

/* Cinematic dark-studio vehicle with negative space for the wordmark.
   Defined locally because lib/site-config.ts is read-only.            */
const HERO_IMAGE =
  '/images/hero-bg.png';

const EASE = [0.16, 1, 0.3, 1] as const;
/* Lead-in syncs the reveal with the global LoadingScreen curtain.
   Bump this down if your loader resolves faster.                       */
const INTRO = 1.15;
const STAGGER = 0.15;

export function Hero() {
  const t = useTranslations('hero');
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOp = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const bgScrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);

  const wordmark = Array.from(t('brandLine'));

  return (
    <section
      ref={ref}
      data-section="hero"
      className="relative min-h-[100svh] w-full overflow-hidden bg-obsidian"
    >
      {/* ── Background: scroll parallax wraps a looping ken-burns ─────── */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY, scale: bgScrollScale }}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover object-center"
            style={{ filter: 'grayscale(0.2) brightness(0.7) contrast(1.1)' }}
          />
        </motion.div>

        {/* Three-layer cinematic grade: top fade · centre vignette · side vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-transparent to-obsidian" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_72%,rgba(0,0,0,0.92)_100%)]" />
        <div className="absolute inset-y-0 end-0 w-1/3 bg-gradient-to-l from-obsidian/70 to-transparent" />
      </motion.div>

      {/* Noise veil — opacity 0.08, overlay blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Drifting vertical scan line — −30vw → 30vw over 22s, reverse loop */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-gradient-to-b from-transparent via-platinum/15 to-transparent"
        style={{ left: '50%' }}
        initial={{ x: '-30vw' }}
        animate={{ x: '30vw' }}
        transition={{ duration: 22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />

      {/* Passe-partout frame (desktop) + corner crosshairs */}
      <PassePartout />
      <Crosshairs />

      {/* ── Content ───────────────────────────────────────────────────── */}
      <motion.div
        style={{ y: contentY, opacity: contentOp }}
        className="relative z-30 flex min-h-[100svh] flex-col items-center justify-center px-6 text-center"
      >
        {/* Eyebrow with hairline rails */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: INTRO, ease: EASE }}
          className="mb-10 flex items-center gap-5"
        >
          <span className="block h-px w-14 bg-gradient-to-r from-transparent to-platinum/55" />
          <span
            dir="ltr"
            className="text-[0.62rem] font-medium uppercase tracking-[0.5em] text-platinum/85"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {t('eyebrow')}
          </span>
          <span className="block h-px w-14 bg-gradient-to-l from-transparent to-platinum/55" />
        </motion.div>

        {/* Wordmark — Italiana, gradient ivory → platinum → ivory */}
        <h1 dir="ltr" className="relative">
          <bdi
            className="flex items-center justify-center font-display font-normal uppercase leading-[0.9]"
            style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', letterSpacing: '0.12em' }}
          >
            {wordmark.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: INTRO + STAGGER + i * 0.05, ease: EASE }}
                className={
                  ch === ' '
                    ? 'inline-block w-[0.3em]'
                    : 'inline-block bg-gradient-to-b from-ivory via-platinum to-ivory bg-clip-text text-transparent'
                }
                style={{ textShadow: ch === ' ' ? 'none' : '0 4px 30px rgba(0,0,0,0.4)' }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </bdi>
        </h1>

        {/* Tagline — Playfair italic */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: INTRO + STAGGER * 2, ease: EASE }}
          className="mt-8 font-editorial font-normal italic leading-tight text-platinum/85"
          style={{
            fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
            textShadow: '0 4px 30px rgba(0,0,0,0.4)',
          }}
        >
          {t('tagline')}
        </motion.p>

        {/* Subline — factual, ≤38ch */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: INTRO + STAGGER * 3, ease: EASE }}
          className="mt-6 max-w-[38ch] text-[1.05rem] leading-relaxed text-platinum/70"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
        >
          {t('subline')}
        </motion.p>

        {/* CTAs — chrome primary + ghost secondary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: INTRO + STAGGER * 4, ease: EASE }}
          className="mt-11 flex flex-wrap items-center justify-center gap-4"
        >
          <PrimaryCTA href="/booking">{t('cta_primary')}</PrimaryCTA>
          <GhostCTA href="/services">{t('cta_secondary')}</GhostCTA>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: INTRO + STAGGER * 5 + 0.3, ease: EASE }}
        className="absolute inset-x-0 bottom-9 z-30 flex justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[0.55rem] uppercase tracking-[0.45em] text-platinum/50">
            {t('scroll')}
          </span>
          <motion.span
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="block h-3 w-px origin-center bg-platinum/70"
          />
          <span className="flex items-center gap-1 text-[0.5rem] uppercase tracking-[0.4em] text-platinum/40">
            <ArrowDown className="h-2.5 w-2.5" strokeWidth={1.5} />
            {t('discover')}
          </span>
        </div>
      </motion.div>

      {/* Bottom seam — fades to transparent at both edges */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Decorative chrome
   ══════════════════════════════════════════════════════════════════════ */

/** Passe-partout: 1px hairlines inset 40px, drawn in from the corners. */
function PassePartout() {
  const draw = { duration: 1.6, delay: 0.4, ease: EASE };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-10 z-20 hidden md:block">
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={draw}
        className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-transparent via-platinum/25 to-transparent"
      />
      <motion.span
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={draw}
        className="absolute inset-y-0 end-0 w-px origin-top bg-gradient-to-b from-transparent via-platinum/25 to-transparent"
      />
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={draw}
        className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-r from-transparent via-platinum/25 to-transparent"
      />
      <motion.span
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={draw}
        className="absolute inset-y-0 start-0 w-px origin-bottom bg-gradient-to-b from-transparent via-platinum/25 to-transparent"
      />
    </div>
  );
}

/** Four 16×16 right-angle crosshairs, ivory/45. */
function Crosshairs() {
  const arm = 'absolute bg-ivory/45';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-6 z-20 md:inset-10">
      <span className={`${arm} left-0 top-0 h-px w-4`} />
      <span className={`${arm} left-0 top-0 h-4 w-px`} />
      <span className={`${arm} right-0 top-0 h-px w-4`} />
      <span className={`${arm} right-0 top-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 left-0 h-px w-4`} />
      <span className={`${arm} bottom-0 left-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 right-0 h-px w-4`} />
      <span className={`${arm} bottom-0 right-0 h-4 w-px`} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CTAs
   ══════════════════════════════════════════════════════════════════════ */

function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      {/* Chrome ring */}
      <span
        aria-hidden
        className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/85 via-platinum/40 to-ivory/55"
      />
      {/* Inner pill — gradient + inset highlight + platinum drop shadow */}
      <span
        className="relative inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 group-hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #cbcdcd 50%, #ffffff 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 60px -15px rgba(203,205,205,0.6)',
        }}
      >
        {children}
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={2.2}
        />
      </span>
      {/* Diagonal sheen sweep (~700ms) */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function GhostCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-9 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
    >
      {children}
      <ArrowUpRight
        className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={1.8}
      />
    </Link>
  );
}