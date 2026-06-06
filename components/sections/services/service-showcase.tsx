'use client';

/**
 * ServiceShowcase — bento-style service display.
 *
 * Layout (RTL-aware): the compact cards come FIRST in the DOM, the large card
 * SECOND. With the page direction, the grid mirrors automatically:
 *   • English (LTR): small cards on the LEFT, large card opens on the RIGHT.
 *   • Arabic  (RTL): small cards on the RIGHT, large card opens on the LEFT.
 * On mobile both stack: small cards (horizontal scroll) on top, large below.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

import { ServiceCardLarge } from './service-card-large';
import { ServiceCardCompact } from './service-card-compact';
import type { Service, CategorySlug } from '@/lib/services-data';

interface Props {
  services: Service[];
  categorySlug: CategorySlug;
}

export function ServiceShowcase({ services, categorySlug }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [activeIndex, setActiveIndex] = useState(0);

  if (services.length === 0) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <p className="font-editorial text-lg italic text-platinum/50">
          {isAr ? 'لا توجد خدمات في هذه الفئة بعد.' : 'No services in this category yet.'}
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, services.length - 1);
  const featured = services[safeIndex];

  return (
    <div className="container px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Small cards first (left in LTR / right in RTL), large card second. */}
        <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:gap-8">
          {/* Compact cards rail */}
          <div className="flex flex-row gap-4 overflow-x-auto pb-4 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {services.map((service, index) => (
              <motion.div
                key={service.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 lg:flex-shrink"
              >
                <ServiceCardCompact
                  service={service}
                  isActive={index === safeIndex}
                  onClick={() => setActiveIndex(index)}
                  index={index}
                />
              </motion.div>
            ))}
          </div>

          {/* Featured large card */}
          <motion.div
            key={featured.slug}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <ServiceCardLarge service={featured} index={safeIndex} total={services.length} />
          </motion.div>
        </div>

        {/* Service counter + dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-3" dir="ltr">
            <span className="font-display text-4xl text-ivory">{String(safeIndex + 1).padStart(2, '0')}</span>
            <span className="text-2xl text-platinum/30">/</span>
            <span className="font-mono text-sm text-platinum/50">{String(services.length).padStart(2, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            {services.map((_, i) => (
              <button key={i} onClick={() => setActiveIndex(i)} data-cursor="hover" aria-label={`Service ${i + 1}`} className="group relative h-8 w-8 rounded-full">
                <span
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ${
                    i === safeIndex
                      ? 'h-3 w-3 bg-ivory shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                      : 'h-1.5 w-1.5 bg-platinum/30 group-hover:bg-platinum/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}