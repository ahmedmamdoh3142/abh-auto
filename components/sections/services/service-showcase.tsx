'use client';

/**
 * ServiceShowcase — Stunning bento-grid style service display.
 * 
 * Features:
 * - Featured service takes center stage with large card
 * - Secondary services in creative grid layout
 * - Hover interactions with 3D transforms
 * - Staggered entrance animations
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

  const featured = services[activeIndex];
  const others = services.filter((_, i) => i !== activeIndex);

  return (
    <div className="container px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Main grid layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
          {/* Featured service - large card */}
          <motion.div
            key={featured.slug}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 lg:order-1"
          >
            <ServiceCardLarge
              service={featured}
              index={activeIndex}
              total={services.length}
            />
          </motion.div>

          {/* Sidebar with other services */}
          <div className="order-1 flex flex-row gap-4 overflow-x-auto pb-4 lg:order-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {services.map((service, index) => (
              <motion.div
                key={service.slug}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex-shrink-0 lg:flex-shrink"
              >
                <ServiceCardCompact
                  service={service}
                  isActive={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  index={index}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Service counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-3" dir="ltr">
            <span className="font-display text-4xl text-ivory">
              {String(activeIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-2xl text-platinum/30">/</span>
            <span className="font-mono text-sm text-platinum/50">
              {String(services.length).padStart(2, '0')}
            </span>
          </div>
          
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {services.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="group relative h-8 w-8 rounded-full"
              >
                <span
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                    i === activeIndex
                      ? 'h-3 w-3 rounded-full bg-ivory shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                      : 'h-1.5 w-1.5 rounded-full bg-platinum/30 group-hover:bg-platinum/60'
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
