'use client';

/**
 * SectionDivider — A breath between sections.
 *
 * Renders a thin, fading platinum hairline with an optional centerpiece
 * (small dot + diamond). Used between major homepage sections so the eye
 * has a moment of pause without losing the dark continuity.
 *
 * Three styles:
 *   - "minimal"  : pure gradient hairline (default)
 *   - "diamond"  : hairline + centered diamond glyph
 *   - "dot"      : hairline + centered platinum dot
 */
import { motion } from 'framer-motion';

interface Props {
  variant?: 'minimal' | 'diamond' | 'dot';
  className?: string;
}

export function SectionDivider({ variant = 'minimal', className = '' }: Props) {
  return (
    <div
      aria-hidden
      className={`relative mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-12 md:px-10 md:py-16 ${className}`}
    >
      {/* Left fading hairline */}
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="block h-px flex-1 origin-right bg-gradient-to-r from-transparent via-platinum/30 to-platinum/40"
      />

      {/* Centerpiece */}
      {variant !== 'minimal' && (
        <motion.span
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-5 flex items-center justify-center"
        >
          {variant === 'diamond' && (
            <span className="relative grid h-2.5 w-2.5 rotate-45 place-items-center bg-gradient-to-br from-ivory via-platinum to-steel">
              <span className="absolute inset-[1px] bg-obsidian" />
              <span className="relative h-1 w-1 bg-platinum" />
            </span>
          )}
          {variant === 'dot' && (
            <span className="relative h-1.5 w-1.5 rounded-full bg-platinum shadow-[0_0_12px_rgba(203,205,205,0.6)]" />
          )}
        </motion.span>
      )}

      {/* Right fading hairline */}
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="block h-px flex-1 origin-left bg-gradient-to-l from-transparent via-platinum/30 to-platinum/40"
      />
    </div>
  );
}