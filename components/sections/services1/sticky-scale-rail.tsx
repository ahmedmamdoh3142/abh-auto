'use client';

/**
 * StickyScaleRail — a thin glass bar that appears below the Navbar
 * once the user scrolls past the hero. It carries the scale switcher
 * (so they can always change scale without scrolling back), the active
 * lane name (updated as they scroll), and a count of how many services
 * are visible at the current scale.
 *
 * Visibility is controlled by an IntersectionObserver on a "sentinel"
 * div placed at the bottom of the hero. When the sentinel leaves the
 * viewport upward, the rail fades in.
 *
 * The rail sits at `top: var(--nav-h)` so it lives just under the
 * Navbar — never overlapping it.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

  
import {
  lanes,
  scales,
  type LaneSlug,
  type ScaleSlug,
} from '@/lib/services-data';

interface Props {
  visible: boolean;
  activeLane: LaneSlug | null;
  scale: ScaleSlug;
  onScaleChange: (s: ScaleSlug) => void;
}

export function StickyScaleRail({
  visible,
  activeLane,
  scale,
  onScaleChange,
}: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const lane = activeLane ? lanes.find((l) => l.slug === activeLane) : null;
  const scl = scales.find((s) => s.slug === scale) ?? scales[1];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 z-30"
          style={{ top: 'var(--nav-h, 72px)' }}
        >
          {/* Top hairline */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-platinum/40 to-transparent"
          />

          <div className="border-b border-white/[0.06] bg-obsidian/65 backdrop-blur-xl">
            <div className="container relative flex items-center justify-between gap-4 py-3">
              {/* Start: active lane indicator */}
              <div className="flex min-w-0 items-center gap-3" dir={isAr ? 'rtl' : 'ltr'}>
                <span className="block h-px w-5 shrink-0 bg-platinum/40" />
                <AnimatePresence mode="wait">
                  {lane ? (
                    <motion.div
                      key={lane.slug}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <span
                        className="font-display text-base leading-none text-platinum/75"
                        dir="ltr"
                      >
                        {lane.numeral}
                      </span>
                      <span className="font-display text-base text-ivory truncate">
                        {lane.name[isAr ? 'ar' : 'en']}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-[0.55rem] uppercase tracking-[0.35em] text-platinum/55"
                    >
                      {isAr ? 'الأتيليه' : 'The Atelier'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Center: scale switcher */}
              <ScaleSwitcher
                value={scale}
                onChange={onScaleChange}
                variant="rail"
              />

              {/* End: scale label */}
              <div className="hidden items-center gap-3 md:flex" dir="ltr">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.35em] text-platinum/55">
                  {scl.label[isAr ? 'ar' : 'en']}
                </span>
                <span className="block h-px w-5 bg-platinum/40" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}