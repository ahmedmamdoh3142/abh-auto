'use client';

/**
 * MarqueeStrip — seamless infinite word strip under the hero.
 * Path: components/sections/marquee-strip.tsx  (export `MarqueeStrip`)
 *
 * Gapless, deterministically:
 *  - Measure the width of ONE pass of the items, and the strip's own width.
 *  - copies = ceil(stripWidth / passWidth) + 1  → a single "block" is ALWAYS
 *    at least one screen wider than the strip. (Computed in one shot, no guessing.)
 *  - Render that block TWICE and translate the track left by exactly the block
 *    width (px). When the first block leaves, the identical second block is
 *    already covering the screen, so the words flow on with no empty space.
 *  - Re-measures after paint, after fonts load, on resize, via ResizeObserver.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

const SPEED = 70; // px per second — constant regardless of width

function Word({ item }: { item: string }) {
  return (
    <div className="flex shrink-0 items-center gap-10 pe-10 md:gap-16 md:pe-16">
      <div className="flex items-center gap-3 md:gap-4">
        <Sparkles className="h-3 w-3 shrink-0 text-platinum/60 md:h-3.5 md:w-3.5" />
        <span className="whitespace-nowrap font-display text-xl uppercase leading-none tracking-tight text-ivory/30 sm:text-2xl md:text-4xl">
          {item}
        </span>
      </div>
      <span className="h-px w-10 shrink-0 bg-platinum/20 md:w-12" />
    </div>
  );
}

export function MarqueeStrip() {
  const t = useTranslations();
  const items = (t.raw('marquee') as string[]) ?? [];
  const wrapRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(6);
  const [blockW, setBlockW] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const calc = () => {
      const pass = passRef.current?.scrollWidth ?? 0;
      const wrap = wrapRef.current?.clientWidth ?? window.innerWidth;
      if (!pass) return;
      const c = Math.max(2, Math.ceil(wrap / pass) + 1);
      setCopies(c);
      setBlockW(pass * c); // exact width of one block (c identical passes)
    };
    calc();
    const raf = requestAnimationFrame(calc);
    const ro = new ResizeObserver(calc);
    if (passRef.current) ro.observe(passRef.current);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', calc);
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(calc).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', calc);
    };
  }, [items.length]);

  if (!items.length) return null;

  const block = Array.from({ length: copies }, () => items).flat();
  const duration = Math.max(12, blockW / SPEED);

  return (
    <div ref={wrapRef} className="relative overflow-hidden border-y border-white/[0.06] bg-obsidian/60 py-6 md:py-10">
      {/* edge fades — narrow on phones so the strip stays readable */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-obsidian to-transparent sm:w-24 md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-obsidian to-transparent sm:w-24 md:w-32" />

      {/* hidden single pass — used only to measure one pass width */}
      <div aria-hidden ref={passRef} className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
        {items.map((item, i) => <Word key={`p-${i}`} item={item} />)}
      </div>

      <motion.div
        key={blockW}
        className="flex w-max will-change-transform"
        animate={{ x: [0, -blockW] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        <div className="flex shrink-0">
          {block.map((item, i) => <Word key={`a-${i}`} item={item} />)}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {block.map((item, i) => <Word key={`b-${i}`} item={item} />)}
        </div>
      </motion.div>
    </div>
  );
}