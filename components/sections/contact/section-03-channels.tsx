'use client';

/**
 * Section 03 — Three Doors
 *
 * Three image cards arranged as "doors" to the atelier. Each one has:
 *   - Cinematic full-bleed image
 *   - Roman numeral seal in the top-end corner
 *   - Label chip ("VISIT" / "CALL" / "MESSAGE") in the top-start
 *   - Title + tagline in the middle
 *   - Value (address line / phone / WhatsApp) at the bottom
 *   - Arrow-in-circle that floats out on hover
 *   - Subtle parallax — image moves slowly on mouse position
 *
 * What separates this from the previous version:
 *   - Cards are tall (h-[640px]) and richer
 *   - Each card has a unique sub-label below the value
 *   - On hover, a thin chrome diamond animates into view between
 *     the value and the arrow
 *   - The "Visit" card uses a workshop exterior, "Call" uses a
 *     close-up of the desk, "Message" uses a interior detail
 */
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

import { ChapterSlate, AtelierMark } from '@/components/sections/about/chapter-slate';

interface ChannelItem {
  tag: string;
  label: string;
  title: string;
  copy: string;
  value: string;
  subline: string;
  action: 'form' | 'tel' | 'whatsapp';
}

const CHANNEL_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=85',
];

export function Channels() {
  const t = useTranslations('contact.channels');
  const items = t.raw('items') as ChannelItem[];
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const slateOp = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden py-28 md:py-40"
      data-section="channels"
    >
      <ChapterSlate number="02" label={t('eyebrow')} opacity={slateOp} variant="dark" />
      <AtelierMark opacity={slateOp} variant="dark" />

      <div className="container relative">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-5"
          >
            <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum/40 to-platinum/60" />
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.55em] text-platinum/85">
              {t('eyebrow')}
            </span>
            <span className="block h-px w-12 bg-gradient-to-l from-transparent via-platinum/40 to-platinum/60" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] tracking-tight balance"
          >
            <span className="bg-gradient-to-b from-ivory via-platinum/90 to-ivory/60 bg-clip-text text-transparent">
              {t('title')}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-6 font-editorial text-base italic text-platinum/70"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-7">
          {items.map((item, i) => (
            <DoorCard
              key={i}
              item={item}
              image={CHANNEL_IMAGES[i]}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════ */
function DoorCard({
  item,
  image,
  index,
}: {
  item: ChannelItem;
  image: string;
  index: number;
}) {
  let href = '#form';
  let external = false;
  if (item.action === 'tel') href = `tel:${item.value.replace(/[\s+]/g, '')}`;
  else if (item.action === 'whatsapp') {
    href = `https://wa.me/${item.value.replace(/[\s+]/g, '')}`;
    external = true;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 1,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        data-cursor="hover"
        className="group relative block h-[600px] overflow-hidden rounded-3xl border border-white/[0.08]"
      >
        {/* Image */}
        <Image
          src={image}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover scale-[1.05] transition-transform duration-[1600ms] ease-out group-hover:scale-[1.12]"
        />

        {/* Cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/15" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-obsidian/55" />
        <div className="absolute inset-0 bg-obsidian/0 transition-colors duration-700 group-hover:bg-obsidian/12" />

        {/* Top-end roman numeral */}
        <motion.div
          className="absolute top-7 end-7 z-10 flex items-center gap-3"
          dir="ltr"
        >
          <span className="block h-px w-6 bg-ivory/30 transition-all duration-700 group-hover:w-12 group-hover:bg-ivory/70" />
          <span className="font-display text-3xl leading-none text-ivory/55 transition-colors duration-700 group-hover:text-ivory">
            {item.tag}
          </span>
        </motion.div>

        {/* Top-start label chip */}
        <div className="absolute top-7 start-7 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-obsidian/40 px-3 py-1.5 backdrop-blur-md">
          <span className="block h-1 w-1 rounded-full bg-ivory" />
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.4em] text-ivory/85">
            {item.label}
          </span>
        </div>

        {/* Middle title/copy */}
        <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-7 text-center md:px-8">
          <h3 className="font-display text-3xl uppercase leading-[1] tracking-tight text-ivory md:text-[2.4rem]">
            {item.title}
          </h3>
          <p className="mx-auto mt-5 max-w-[18ch] text-sm leading-relaxed text-platinum/80 pretty">
            {item.copy}
          </p>
        </div>

        {/* Bottom value row */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-7 md:p-8">
          {/* Diamond divider */}
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="block h-px flex-1 bg-gradient-to-r from-transparent to-ivory/30 transition-colors duration-700 group-hover:to-ivory/60" />
            <span className="relative grid h-1.5 w-1.5 rotate-45 place-items-center bg-gradient-to-br from-ivory to-platinum opacity-50 transition-opacity duration-700 group-hover:opacity-100" />
            <span className="block h-px flex-1 bg-gradient-to-l from-transparent to-ivory/30 transition-colors duration-700 group-hover:to-ivory/60" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span
                className="font-mono text-xs tracking-[0.18em] text-ivory"
                dir="ltr"
              >
                {item.value}
              </span>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.32em] text-ivory/55">
                {item.subline}
              </span>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.2] bg-obsidian/40 backdrop-blur-md transition-all duration-700 group-hover:border-ivory group-hover:bg-ivory group-hover:text-obsidian">
              <ArrowUpRight
                className="reversible-icon h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.8}
              />
            </span>
          </div>
        </div>

        {/* Inner glow on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            boxShadow:
              'inset 0 0 90px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        />
      </Link>
    </motion.div>
  );
}