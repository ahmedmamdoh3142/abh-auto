'use client';

/**
 * CategorySelector — Stunning floating category tabs with glass morphism.
 * 
 * Features:
 * - Sticky floating bar with blur backdrop
 * - Animated icon indicators
 * - Smooth transitions between categories
 */
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { 
  Droplets, 
  Shield, 
  Lock, 
  Sparkles, 
  Package 
} from 'lucide-react';

import { categories, type CategorySlug } from '@/lib/services-data';

interface Props {
  active: CategorySlug;
  onChange: (slug: CategorySlug) => void;
}

const categoryIcons: Record<CategorySlug, React.ReactNode> = {
  coatings: <Droplets className="h-4 w-4" />,
  protection: <Shield className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
  detailing: <Sparkles className="h-4 w-4" />,
  bundles: <Package className="h-4 w-4" />,
};

export function CategorySelector({ active, onChange }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const activeCategory = categories.find((c) => c.slug === active);

  return (
    <div className="sticky top-24 z-40 mx-auto w-full max-w-5xl px-4 pb-8 pt-4">
      {/* Main floating bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-obsidian/60 p-2 backdrop-blur-2xl shadow-[0_8px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent" />

        {/* Tab items */}
        <div className="relative flex items-center justify-center gap-1" role="tablist">
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
                className="group relative flex items-center gap-2.5 rounded-xl px-4 py-3 transition-all md:px-6"
              >
                {/* Active background */}
                {isActive && (
                  <motion.span
                    layoutId="category-active-bg"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  />
                )}

                {/* Icon */}
                <span
                  className={`relative transition-all duration-300 ${
                    isActive
                      ? 'text-ivory scale-110'
                      : 'text-platinum/40 group-hover:text-platinum/70 group-hover:scale-105'
                  }`}
                >
                  {categoryIcons[cat.slug]}
                </span>

                {/* Label - hidden on mobile, visible on md+ */}
                <span
                  className={`relative hidden font-sans text-sm tracking-wide transition-colors md:block ${
                    isActive ? 'text-ivory' : 'text-platinum/50 group-hover:text-ivory'
                  }`}
                >
                  {cat.short[isAr ? 'ar' : 'en']}
                </span>

                {/* Numeral badge */}
                <span
                  className={`relative hidden font-mono text-[0.5rem] tracking-[0.3em] transition-colors lg:block ${
                    isActive ? 'text-platinum/70' : 'text-platinum/30'
                  }`}
                >
                  {cat.numeral}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Active tagline */}
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 flex items-center justify-center gap-4"
      >
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-platinum/30" />
        <span className="font-editorial text-sm italic text-platinum/60">
          {activeCategory?.tagline[isAr ? 'ar' : 'en']}
        </span>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-platinum/30" />
      </motion.div>
    </div>
  );
}
