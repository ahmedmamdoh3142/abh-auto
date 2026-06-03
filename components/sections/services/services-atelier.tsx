'use client';

/**
 * ServicesAtelier — Stunning redesigned services page with creative layout.
 * 
 * Features:
 * - Immersive 3D-like card stack for services
 * - Floating category selector with glass morphism
 * - Spectacular animations and transitions
 * - Bento-style grid layout for service details
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ServicesHero } from './services-hero';
import { CategorySelector } from './category-selector';
import { ServiceShowcase } from './service-showcase';
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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Cinematic ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {/* Primary spotlight */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.04, 0.08, 0.04],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/4 top-1/4 h-[80rem] w-[80rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum blur-[200px]"
        />
        {/* Secondary accent */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-0 top-1/2 h-[60rem] w-[60rem] rounded-full bg-steel/30 blur-[180px]"
        />
        {/* Bottom glow */}
        <div className="absolute bottom-0 left-1/2 h-[40rem] w-full -translate-x-1/2 bg-gradient-to-t from-platinum/[0.03] to-transparent" />
      </div>

      {/* Animated grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* HERO */}
      <ServicesHero />

      {/* FLOATING CATEGORY SELECTOR */}
      <CategorySelector active={category} onChange={setCategory} />

      {/* SERVICE SHOWCASE */}
      <div className="relative z-10 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <ServiceShowcase services={services} categorySlug={category} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CONCIERGE CLOSE */}
      <ConciergeClose />
    </div>
  );
}
