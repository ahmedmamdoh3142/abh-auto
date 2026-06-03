'use client';

/**
 * CategoryTabs — five category pills with a sliding underline indicator.
 *
 * The active tab is marked by an animated underline that slides between
 * tabs using Framer Motion's layoutId — the standard luxury-site pattern
 * (Linear, Stripe, Apple all use this).
 *
 * Each tab shows:
 *   - Roman numeral (small, tabular-nums for alignment)
 *   - Short name (e.g. "Bundles")
 * Active tab also reveals the tagline below the strip in italic.
 *
 * Layout is horizontally scrollable on mobile, centered on desktop.
 */
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

import { categories, type CategorySlug } from '@/lib/services-data';

interface Props {
  active: CategorySlug;
  onChange: (slug: CategorySlug) => void;
}

export function CategoryTabs({ active, onChange }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const activeCategory = categories.find((c) => c.slug === active);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Tabs strip */}
      <div className="relative w-full">
        {/* Bottom hairline — runs full width */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-platinum/20 to-transparent"
        />

        <div
          className="mx-auto flex w-full max-w-5xl items-stretch gap-1 overflow-x-auto px-4 md:justify-center md:gap-2 md:overflow-visible"
          role="tablist"
          aria-label="Service categories"
        >
          {categories.map((cat) => {
            const isActive = cat.slug === active;
            return (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(cat.slug)}
                data-cursor="hover"
                className="group relative shrink-0 px-4 pb-4 pt-5 transition-colors md:px-7"
              >
                {/* Hovering background tint — desktop only */}
                <span
                  aria-hidden
                  className="absolute inset-x-2 inset-y-1 -z-10 rounded-lg bg-white/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <span className="flex flex-col items-center gap-1.5">
                  <span
                    className={`font-mono text-[0.55rem] uppercase tracking-[0.45em] transition-colors ${
                      isActive ? 'text-platinum/85' : 'text-platinum/40 group-hover:text-platinum/65'
                    }`}
                    dir="ltr"
                  >
                    {cat.numeral}
                  </span>
                  <span
                    className={`font-display text-base leading-none tracking-tight whitespace-nowrap transition-colors md:text-lg ${
                      isActive ? 'text-ivory' : 'text-platinum/55 group-hover:text-ivory'
                    }`}
                  >
                    {cat.short[isAr ? 'ar' : 'en']}
                  </span>
                </span>

                {/* Active underline — slides with layoutId */}
                {isActive && (
                  <motion.span
                    layoutId="category-tab-underline"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 32,
                    }}
                    className="absolute inset-x-3 bottom-0 h-[2px] bg-gradient-to-r from-platinum/40 via-ivory to-platinum/40 md:inset-x-5"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tagline */}
      <motion.span
        key={active}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="font-editorial text-sm italic text-platinum/65"
      >
        {activeCategory?.tagline[isAr ? 'ar' : 'en']}
      </motion.span>
    </div>
  );
}