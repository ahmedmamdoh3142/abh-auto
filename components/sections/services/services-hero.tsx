'use client';

/**
 * ServicesHero — Stunning immersive hero with floating text and particle effects.
 */
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;
const BOOKING_IMAGE = '/images/hero-bg.webp';

export function ServicesHero() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: ((i * 37) % 80) + 10,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
  }));

  return (
    <section className="relative isolate overflow-hidden pb-4 pt-36 text-center md:pb-8 md:pt-44">
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

      <div className="container">
        {/* Eyebrow with badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-7 flex items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.42em] text-platinum/70"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/60" />
          <span className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-2.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-platinum/80" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-platinum/80">
              {isAr ? 'المركز · جدّة' : 'The Center · Jeddah'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/60" />
        </motion.div>

        {/* Main heading with staggered reveal */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-light leading-[0.95] tracking-tight">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: EASE }}
              className="inline-block bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent"
            >
              {isAr ? 'خدمات احترافية' : 'Premium Services'}
            </motion.span>
          </span>
          <span className="block overflow-hidden mt-1 md:mt-2">
            <motion.span
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }}
              className="inline-block font-editorial italic text-platinum/85"
            >
              {isAr ? 'تعكس فخامة سيارتك.' : 'That Reflect Your Vehicle’s Prestige.'}
            </motion.span>
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="pretty mx-auto mt-6 max-w-[48ch] text-base leading-[1.85] text-platinum/70 md:text-lg"
        >
          {isAr
            ? 'استكشف حلول العناية والتجهيز المصممة للحفاظ على المظهر المثالي والأداء الاستثنائي.'
            : 'Explore advanced detailing and care solutions designed to maintain a flawless look and exceptional presence.'}
        </motion.p>

        {/* Drawn baseline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.55, ease: EASE }}
          className="mx-auto mt-10 h-px w-[min(420px,70%)] origin-center bg-gradient-to-r from-transparent via-platinum/40 to-transparent"
        />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-12 w-px bg-gradient-to-b from-transparent via-platinum/50 to-transparent"
          />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.5em] text-platinum/40">
            {isAr ? 'استكشف' : 'Explore'}
          </span>
        </motion.div>
      </div>
    </section>
  );
}