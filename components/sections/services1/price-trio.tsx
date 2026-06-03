'use client';

/**
 * PriceTrio — three side-by-side price columns (S / M / L).
 *
 * This is the heart of the card. Each column shows:
 *   - Size letter (S / M / L) in a small chip
 *   - The price in display type, large
 *   - "SAR" suffix
 *   - On hover: column lifts, background fills with platinum gradient,
 *     and the size's example vehicles reveal underneath.
 *
 * Layout is a clean three-column grid with vertical dividers between
 * columns. No animations on entry — they're handled by the parent card.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

import { formatPrice, sizes, type SizeSlug } from '@/lib/services-data';

interface Props {
  prices: Record<SizeSlug, number>;
}

export function PriceTrio({ prices }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [hovered, setHovered] = useState<SizeSlug | null>(null);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.025] to-white/[0.005] backdrop-blur-xl"
      onMouseLeave={() => setHovered(null)}
    >
      <div className="grid grid-cols-3" dir="ltr">
        {sizes.map((size, i) => {
          const isHovered = hovered === size.slug;
          const isFirst = i === 0;
          return (
            <button
              key={size.slug}
              type="button"
              data-cursor="hover"
              onMouseEnter={() => setHovered(size.slug)}
              className={`group relative flex flex-col items-center gap-1.5 px-3 py-5 text-center transition-all ${
                !isFirst ? 'border-s border-white/[0.06]' : ''
              }`}
              aria-label={`Price for ${size.label.en}`}
            >
              {/* Active platinum fill */}
              {isHovered && (
                <motion.span
                  layoutId="price-trio-fill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 bg-gradient-to-b from-platinum/[0.12] via-platinum/[0.06] to-transparent"
                  aria-hidden
                />
              )}

              {/* Size letter chip */}
              <span
                className={`relative font-mono text-[0.55rem] uppercase tracking-[0.4em] transition-colors ${
                  isHovered ? 'text-ivory' : 'text-platinum/55'
                }`}
              >
                {size.slug.toUpperCase()}
              </span>

              {/* Price */}
              <span
                className={`relative flex items-baseline gap-1 transition-all ${
                  isHovered ? '-translate-y-0.5 scale-[1.04]' : ''
                }`}
                style={{ transformOrigin: 'center' }}
              >
                <span
                  className={`font-display text-2xl leading-none tabular-nums transition-colors md:text-3xl ${
                    isHovered ? 'text-ivory' : 'text-platinum/90'
                  }`}
                >
                  {formatPrice(prices[size.slug])}
                </span>
              </span>

              {/* SAR suffix */}
              <span className="relative font-mono text-[0.5rem] uppercase tracking-[0.4em] text-platinum/50">
                SAR
              </span>

              {/* Size label */}
              <span
                className={`relative mt-1 font-editorial text-[0.7rem] italic transition-colors ${
                  isHovered ? 'text-platinum/85' : 'text-platinum/55'
                }`}
              >
                {size.label[isAr ? 'ar' : 'en']}
              </span>

              {/* Examples — reveal on hover (CSS grid lerp) */}
              <span
                className="relative grid w-full grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr]"
                aria-hidden={!isHovered}
              >
                <span className="min-h-0">
                  <span className="block pt-2 font-mono text-[0.5rem] leading-relaxed tracking-[0.25em] text-platinum/65">
                    {size.examples[isAr ? 'ar' : 'en']}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}