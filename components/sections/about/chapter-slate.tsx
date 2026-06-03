'use client';

/**
 * ChapterSlate + AtelierMark — Unified cinema-style chrome.
 *
 * Used by chapters 01–07 to display the chapter number, label and a
 * vertical atelier mark on the trailing edge of the viewport.
 *
 * Two visual variants:
 *   - "dark"  → chapters on black/dim backgrounds (default)
 *   - "light" → chapters with bright imagery behind (ch.03, ch.05)
 */
import { motion, type MotionValue } from 'framer-motion';

type Variant = 'dark' | 'light';

interface ChapterSlateProps {
  number: string;
  label: string;
  opacity?: MotionValue<number> | number;
  variant?: Variant;
}

const DARK = {
  tick: 'bg-platinum/60',
  eyebrow: 'text-platinum/55',
  number: 'text-platinum/85',
  rule: 'bg-platinum/40',
  label: 'text-platinum/70',
  vrFade: 'from-transparent via-platinum/40 to-transparent',
  vrText: 'text-platinum/55',
};

const LIGHT = {
  tick: 'bg-ivory/70',
  eyebrow: 'text-ivory/65',
  number: 'text-ivory',
  rule: 'bg-ivory/50',
  label: 'text-ivory/80',
  vrFade: 'from-transparent via-ivory/55 to-transparent',
  vrText: 'text-ivory/70',
};

export function ChapterSlate({
  number,
  label,
  opacity,
  variant = 'dark',
}: ChapterSlateProps) {
  const tone = variant === 'light' ? LIGHT : DARK;

  return (
    <motion.div
      style={opacity !== undefined ? { opacity } : undefined}
      className="absolute top-10 start-10 z-30 md:top-12 md:start-12"
      dir="ltr"
    >
      <div className="flex items-start gap-4">
        <span className={`mt-1.5 block h-px w-6 ${tone.tick}`} />
        <div className="flex flex-col gap-2">
          <span className={`font-mono text-[0.5rem] uppercase tracking-[0.45em] ${tone.eyebrow}`}>
            Chapter
          </span>
          <span className={`font-display text-3xl leading-none ${tone.number}`}>
            {number}
          </span>
          <span className={`mt-1 block h-px w-12 ${tone.rule}`} />
          <span className={`text-[0.55rem] uppercase tracking-[0.4em] ${tone.label}`}>
            {label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface AtelierMarkProps {
  opacity?: MotionValue<number> | number;
  variant?: Variant;
}

export function AtelierMark({ opacity, variant = 'dark' }: AtelierMarkProps) {
  const tone = variant === 'light' ? LIGHT : DARK;

  return (
    <motion.div
      style={opacity !== undefined ? { opacity } : undefined}
      aria-hidden
      className="absolute end-10 top-1/2 z-30 hidden -translate-y-1/2 md:end-12 md:block"
      dir="ltr"
    >
      <div className="flex flex-col items-center gap-4">
        <span className={`block h-16 w-px bg-gradient-to-b ${tone.vrFade}`} />
        <span className={`font-mono text-[0.5rem] uppercase tracking-[0.55em] [writing-mode:vertical-rl] ${tone.vrText}`}>
          ABH · Atelier
        </span>
        <span className={`block h-16 w-px bg-gradient-to-b ${tone.vrFade}`} />
      </div>
    </motion.div>
  );
}