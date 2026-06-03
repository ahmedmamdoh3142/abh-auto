'use client';

/**
 * ServicesAtelier — the page composition.
 *
 * State surface: just one piece — the active category. The carousel
 * owns its own service-index state and resets when category changes.
 *
 * No state machine. No clipPath. No AnimatePresence mode="wait" for
 * the category swap — we use a key-based remount of the carousel
 * (with a smooth fade) which is rock-solid and lets each carousel
 * own its own internal animations cleanly.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ServicesHero } from './services-hero';
import { CategoryTabs } from './category-tabs';
import { ServiceCarousel } from './service-carousel';
import { ConciergeClose } from './concierge-close';
import {
  categories,
  servicesByCategory,
  type CategorySlug,
} from '@/lib/services-data';

export function ServicesAtelier() {
  const [category, setCategory] = useState<CategorySlug>(categories[0].slug);
  const services = servicesByCategory(category);

  return (
    <div
      className="relative w-full"
      style={{ ['--nav-h' as any]: 'var(--nav-h, 72px)' } as React.CSSProperties}
    >
      {/* Fixed ambient background — never crashes, never blocks */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[15%] h-[55rem] w-[55rem] -translate-x-1/2 rounded-full bg-platinum/[0.04] blur-[200px]" />
        <div className="absolute right-[5%] top-[60%] h-[35rem] w-[35rem] rounded-full bg-platinum/[0.03] blur-[180px]" />
      </div>

      {/* Subtle grid lines */}
      <div
        aria-hidden
        className="grid-lines pointer-events-none absolute inset-0 opacity-20"
      />

      {/* HERO */}
      <ServicesHero />

      {/* CATEGORY TABS */}
      <div className="container relative">
        <CategoryTabs active={category} onChange={setCategory} />
      </div>

      {/* CAROUSEL — key forces remount when category changes,
          which triggers each card's entry animations afresh */}
      <div className="container relative pt-12 md:pt-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <ServiceCarousel services={services} resetKey={category} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CLOSE */}
      <ConciergeClose />
    </div>
  );
}