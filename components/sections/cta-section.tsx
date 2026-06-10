'use client';

/**
 * CtaSection — Cinematic full-bleed call-to-action.
 *
 * Closing scene of the homepage narrative. Two CTAs of escalating
 * commitment: a primary chrome pill (Book Consultation) and a glass
 * outline (Speak to an Advisor). The primary button uses a layered
 * chrome ring + animated halo + shimmer sweep on hover.
 */
import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Phone } from 'lucide-react';

import { RevealText } from '@/components/animations/reveal-text';

const CTA_IMAGE =
  '/images/project-4.webp';

export function CtaSection() {
  const t = useTranslations('cta');
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.0, 1.08]);
  const overlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.4, 0.7, 1],
    [0.7, 0.55, 0.55, 0.7],
  );

  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: (i * 53) % 100,
    top: (i * 37) % 100,
    delay: (i % 7) * 0.5,
    duration: 5 + (i % 5),
    size: i % 3 === 0 ? 2 : 1,
  }));

  return (
    <section
      ref={ref}
      id="cta"
      className="relative isolate h-[82svh] min-h-[620px] w-full overflow-hidden"
    >
      {/* Background */}
      <motion.div
        className="absolute inset-0 -z-30"
        style={{ y: bgY, scale: bgScale }}
      >
        <Image
          src={CTA_IMAGE}
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      <motion.div
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_85%)]"
        style={{ opacity: overlayOpacity }}
      />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-obsidian/70 via-obsidian/40 to-obsidian/95" />

      <div className="grid-lines absolute inset-0 -z-10 opacity-30" />
      <div className="noise absolute inset-0 -z-10 opacity-[0.04]" />

      {/* Particles */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-platinum/60"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 0.8, 0],
              y: [20, -60, -120],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Centre spotlight */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.05] blur-[140px]" />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="container mx-auto px-6 md:px-10">
          <div className="mx-auto max-w-5xl text-center">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.45em] text-platinum/70"
            >
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-platinum/60" />
              {t('eyebrow')}
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-platinum/60" />
            </motion.div>

            {/* Headline */}
            <h2 className="mt-10 font-display text-hero-sm md:text-hero font-light leading-[0.92] tracking-tight text-ivory">
              <RevealText text={t('title_a')} className="block" />
              <span className="block">
                <RevealText text={t('title_b')} className="text-metallic" delay={0.25} />
              </span>
            </h2>


            {/* CTAs — premium pair */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center justify-center gap-5"
            >
              <ChromePrimaryButton href="/contact">
                {t('primary')}
              </ChromePrimaryButton>
              <GlassSecondaryButton href="/contact">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.6} />
                {t('secondary')}
              </GlassSecondaryButton>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Fade into footer */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent to-obsidian" />
    </section>
  );
}

/**
 * ChromePrimaryButton — Mirror-polished chrome pill with halo, ring,
 * shimmer sweep on hover. The flagship CTA component.
 */
function ChromePrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      {/* Outer animated halo */}
      <span
        aria-hidden
        className="absolute -inset-3 rounded-full bg-gradient-to-r from-platinum/50 via-ivory/40 to-platinum/50 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
      />

      {/* Chrome ring */}
      <span
        aria-hidden
        className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/80 via-platinum/40 to-ivory/50"
      />

      {/* Inner pill */}
      <span className="relative inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/95 px-10 py-5 text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,0,0,0.12),0_22px_70px_-15px_rgba(203,205,205,0.65)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.18),0_30px_90px_-12px_rgba(203,205,205,0.9)]">
        {children}
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          strokeWidth={2.2}
        />
      </span>

      {/* Shimmer sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span className="absolute -inset-y-2 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}

/**
 * GlassSecondaryButton — Smoky glass capsule with chrome top-light.
 * Complements the chrome primary without competing.
 */
function GlassSecondaryButton({
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
        className="absolute -inset-px rounded-full bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-90"
      />
      <span className="relative inline-flex items-center gap-3 rounded-full bg-white/[0.04] px-9 py-5 text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-ivory backdrop-blur-2xl ring-1 ring-white/15 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:bg-white/[0.08] group-hover:ring-white/30">
        {children}
        <ArrowUpRight
          className="h-4 w-4 text-platinum transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ivory"
          strokeWidth={1.8}
        />
      </span>
    </Link>
  );
}
