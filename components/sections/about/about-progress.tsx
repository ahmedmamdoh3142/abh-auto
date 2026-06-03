'use client';

/**
 * AboutProgress — Vertical chapter scrubber.
 *
 * Sits fixed on the right edge of the viewport (left in RTL) and shows:
 *  - 7 chapter dots
 *  - The active chapter highlighted with a longer "rail"
 *  - The current chapter label revealed on the active dot
 *
 * Tracks chapters via IntersectionObserver on each <section data-chapter>.
 * Hidden on mobile to preserve screen real estate.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

const chapters = [
  { id: '00', label: 'Cold Open',  labelAr: 'بداية' },
  { id: '01', label: 'Obsession',  labelAr: 'الهوس' },
  { id: '02', label: 'Close-Up',   labelAr: 'عن قُرب' },
  { id: '03', label: 'The Hand',   labelAr: 'اليد' },
  { id: '04', label: 'Standard',   labelAr: 'المعيار' },
  { id: '05', label: 'The Room',   labelAr: 'الغرفة' },
  { id: '06', label: 'Remains',    labelAr: 'ما يبقى' },
  { id: '07', label: 'Invitation', labelAr: 'الدعوة' },
] as const;

export function AboutProgress() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = chapters
      .map(({ id }) => document.querySelector<HTMLElement>(`[data-chapter="${id}"]`))
      .filter((el): el is HTMLElement => !!el);

    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible chapter
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = chapters.findIndex(
          (c) => c.id === visible.target.getAttribute('data-chapter'),
        );
        if (idx >= 0) setActive(idx);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-1/2 end-6 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex"
      aria-hidden
    >
      {chapters.map((chapter, i) => {
        const isActive = i === active;
        return (
          <div
            key={chapter.id}
            className="flex items-center gap-3"
          >
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="font-mono text-[0.55rem] uppercase tracking-[0.35em] text-platinum/70"
                  dir="ltr"
                >
                  {chapter.id} — {isAr ? chapter.labelAr : chapter.label}
                </motion.span>
              )}
            </AnimatePresence>

            <motion.span
              animate={{
                width: isActive ? 28 : 12,
                opacity: isActive ? 1 : 0.3,
                backgroundColor: isActive ? '#cbcdcd' : '#666a6e',
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="block h-px rounded-full"
            />
          </div>
        );
      })}
    </div>
  );
}