'use client';

/**
 * ServiceCarousel — horizontal carousel of service cards within a category.
 *
 * Implementation:
 *   - A track of cards laid out side-by-side at 100% width each
 *   - Track translates by index × -100% (or +100% in RTL)
 *   - Navigation via arrow buttons, keyboard arrows, and touch drag
 *   - Counter "01 / 03" + dot pagination at the bottom
 *
 * Resets to index 0 when the `cards` array changes (category switch).
 *
 * This is intentionally a simple translate-based carousel with no
 * snap-scroll behaviour. Predictable, bulletproof, performs well.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { ServiceCard } from './service-card';
import type { Service } from '@/lib/services-data';

interface Props {
  services: Service[];
  /** Identifier that changes when category switches — triggers reset to 0. */
  resetKey: string;
}

export function ServiceCarousel({ services, resetKey }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = services.length;
  const canPrev = index > 0;
  const canNext = index < count - 1;

  // Reset to first card when category changes
  useEffect(() => {
    setIndex(0);
  }, [resetKey]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(count - 1, i + 1));
  }, [count]);

  // Keyboard navigation
  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // In RTL, left arrow advances forward; in LTR, right arrow does.
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isAr) goNext();
        else goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isAr) goPrev();
        else goNext();
      }
    },
    [isAr, goPrev, goNext],
  );

  // Empty state — defensive
  if (count === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="font-editorial italic text-platinum/65">
          {isAr ? 'لا توجد خدمات في هذه الفئة بعد.' : 'No services in this category yet.'}
        </p>
      </div>
    );
  }

  // Translate the track — negative for LTR, positive for RTL
  const translatePercent = isAr ? index * 100 : -index * 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKey}
      className="relative w-full focus:outline-none"
      role="region"
      aria-label="Service cards"
      aria-roledescription="carousel"
    >
      {/* ── Carousel viewport ──────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl touch-pan-y"
        style={{ height: 'min(86vh, 820px)' }}
        // Touch drag detection at the viewport level (mobile-friendly).
        // Desktop users use the arrow buttons / keyboard / dots.
        onTouchStart={(e) => {
          (containerRef.current as any).__startX = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const startX = (containerRef.current as any).__startX;
          if (typeof startX !== 'number') return;
          const endX = e.changedTouches[0].clientX;
          const delta = endX - startX;
          if (Math.abs(delta) < 60) return;
          const wantsNext = isAr ? delta > 0 : delta < 0;
          if (wantsNext && canNext) goNext();
          else if (!wantsNext && canPrev) goPrev();
        }}
      >
        <motion.div
          className="flex h-full"
          style={{ width: `${count * 100}%` }}
          animate={{ x: `${translatePercent / count}%` }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 18,
            mass: 0.8,
          }}
        >
          {services.map((service, i) => (
            <div
              key={service.slug}
              className="h-full px-2 md:px-3"
              style={{ width: `${100 / count}%` }}
              aria-hidden={i !== index}
            >
              <CardWrapper isActive={i === index}>
                <ServiceCard service={service} index={i} total={count} />
              </CardWrapper>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Controls row ───────────────────────────── */}
      <div className="mt-8 flex items-center justify-between gap-4 md:mt-10">
        {/* Prev */}
        <NavButton
          onClick={isAr ? goNext : goPrev}
          disabled={isAr ? !canNext : !canPrev}
          direction="prev"
          label={isAr ? 'التالي' : 'Previous'}
        />

        {/* Counter + dots */}
        <div className="flex items-center gap-5" dir="ltr">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/65 tabular-nums">
            <span className="text-ivory">{String(index + 1).padStart(2, '0')}</span>
            <span className="text-platinum/30"> / </span>
            {String(count).padStart(2, '0')}
          </span>

          <div className="flex items-center gap-1.5">
            {services.map((s, i) => {
              const isActive = i === index;
              return (
                <button
                  key={s.slug}
                  type="button"
                  data-cursor="hover"
                  onClick={() => setIndex(i)}
                  className="grid h-6 place-items-center px-1"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span
                    className={`block h-px transition-all duration-500 ${
                      isActive ? 'w-7 bg-ivory' : 'w-3 bg-platinum/35 hover:bg-platinum/65'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Next */}
        <NavButton
          onClick={isAr ? goPrev : goNext}
          disabled={isAr ? !canPrev : !canNext}
          direction="next"
          label={isAr ? 'السابق' : 'Next'}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CardWrapper — wraps each card with active/inactive opacity
   ═══════════════════════════════════════════════════════════ */
function CardWrapper({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="h-full"
      animate={{
        opacity: isActive ? 1 : 0.4,
        scale: isActive ? 1 : 0.96,
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NavButton — circular prev/next button
   ═══════════════════════════════════════════════════════════ */
function NavButton({
  onClick,
  disabled,
  direction,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  direction: 'prev' | 'next';
  label: string;
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-cursor={disabled ? undefined : 'hover'}
      aria-label={label}
      className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.025] backdrop-blur-md transition-all duration-500 hover:border-platinum/45 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.12] disabled:hover:bg-white/[0.025]"
    >
      <Icon
        className="reversible-icon h-4 w-4 text-platinum/85 transition-all group-hover:text-ivory"
        strokeWidth={1.6}
      />
      {/* Subtle expanding ring on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border border-platinum/40 opacity-0 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 group-disabled:opacity-0"
      />
    </button>
  );
}