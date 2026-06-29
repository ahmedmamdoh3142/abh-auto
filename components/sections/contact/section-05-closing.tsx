'use client';

/**
 * Section 05 — Closing Scene
 *
 * Full-bleed atelier image with title floating on the left side and
 * the hours ledger floating on the right as a glass card. The image
 * is the protagonist — large, cinematic, slowly drifting on parallax.
 *
 * The page closes not with a CTA but with a sense of place. The
 * visitor sees where their letter is going. Hours are practical
 * useful info on the right, but the image carries the emotion.
 */
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';
import { useAtelierStatus } from '@/hooks/use-atelier-status';

const CLOSING_IMAGE =
  '/images/cta-service.webp';

interface HoursRow {
  days: string;
  hours: string;
}

export function ClosingScene() {
  const t = useTranslations('contact.closing');
  const ref = useRef<HTMLElement>(null);
  const rows = t.raw('hoursRows') as HoursRow[];
  const status = useAtelierStatus();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const slateOp = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  const todayRow =
    status === null
      ? -1
      : status.weekday === 5
        ? 1
        : status.weekday === 6
          ? 2
          : 0;

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-obsidian py-0"
      data-section="closing"
    >

      <div className="relative h-[100svh] min-h-[700px] w-full overflow-hidden">
        {/* Parallax image */}
        <motion.div
          style={{ y: imgY, scale: imgScale }}
          className="absolute inset-0"
        >
          <Image
            src={CLOSING_IMAGE}
            alt="The ABH Auto atelier"
            fill
            priority={false}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>

        {/* Cinematic grade */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/50 to-obsidian/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/55 via-transparent to-obsidian/30" />
        <div className="pointer-events-none absolute inset-0 noise opacity-30" />

        {/* Content container */}
        <div className="container relative z-10 flex h-full items-center">
          <div className="grid w-full items-end gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-16">
            {/* LEFT: title */}
            <div className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4"
              >
                <span className="block h-px w-12 bg-ivory/50" />
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.45em] text-ivory/75">
                  {t('eyebrow')}
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.15 }}
                className="mt-10 font-display text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight"
              >
                <motion.span
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-ivory"
                >
                  {t('title_a')}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 1.1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="block font-editorial italic text-platinum/90"
                >
                  {t('title_b')}
                </motion.span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-10 max-w-md font-editorial text-base italic leading-relaxed text-ivory/80"
              >
                {t('subtitle')}
              </motion.p>
            </div>

            {/* RIGHT: hours card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.15] bg-obsidian/55 p-7 backdrop-blur-xl md:p-9"
            >
              <span className="pointer-events-none absolute start-5 top-5 h-4 w-4 border-s border-t border-ivory/40" />
              <span className="pointer-events-none absolute end-5 top-5 h-4 w-4 border-e border-t border-ivory/40" />
              <span className="pointer-events-none absolute start-5 bottom-5 h-4 w-4 border-s border-b border-ivory/40" />
              <span className="pointer-events-none absolute end-5 bottom-5 h-4 w-4 border-e border-b border-ivory/40" />

              <div className="flex items-center gap-3">
                <span className="block h-px w-8 bg-ivory/60" />
                <span className="text-[0.55rem] font-medium uppercase tracking-[0.4em] text-ivory/75">
                  {t('hoursTitle')}
                </span>
              </div>

              <div className="mt-7 flex flex-col divide-y divide-white/[0.08]">
                {rows.map((row, i) => {
                  const isToday = i === todayRow;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{
                        duration: 0.7,
                        delay: 0.5 + i * 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="relative flex items-center justify-between gap-4 py-4"
                    >
                      {isToday && (
                        <motion.span
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true, margin: '-50px' }}
                          transition={{
                            duration: 0.8,
                            delay: 0.7 + i * 0.1,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="absolute -start-7 top-1/2 block h-7 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-ivory to-transparent"
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm leading-relaxed ${
                            isToday ? 'font-medium text-ivory' : 'text-ivory/65'
                          }`}
                        >
                          {row.days}
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-ivory/15 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.32em] text-ivory ring-1 ring-ivory/30">
                            {t('todayBadge')}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono text-sm tracking-[0.12em] ${
                          isToday ? 'text-ivory' : 'text-ivory/60'
                        }`}
                        dir="ltr"
                      >
                        {row.hours}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Live time footer */}
              {status && (
                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.08] pt-5" dir="ltr">
                  <span className="relative grid h-2 w-2 place-items-center">
                    {status.open && (
                      <motion.span
                        animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 2.4, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-emerald-400"
                      />
                    )}
                    <span
                      className={`relative h-1.5 w-1.5 rounded-full ${
                        status.open
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                          : 'bg-platinum/60'
                      }`}
                    />
                  </span>
                  <span
                    className="font-mono text-xs tracking-[0.18em] tabular-nums text-ivory/85"
                    suppressHydrationWarning
                  >
                    {status.localTime}
                  </span>
                  <span className="block h-3 w-px bg-ivory/30" />
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.35em] text-ivory/65">
                    {t('timezone')}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}