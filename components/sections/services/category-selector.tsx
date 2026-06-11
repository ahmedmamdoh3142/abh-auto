'use client';

/**
 * CategorySelector — "The Index"
 *
 * إصلاح هذه النسخة: الخط الأبيض اللي بيبيّن التاب المختار كان معمول بـ layoutId
 * (عنصر مشترك بيتحرّك بين التابات). مع السكرول الأفقي على الموبايل، حساب الموضع
 * بيتلخبط فالخط ما بييجيش تحت التاب المختار مباشرة. الحل: شِلنا الـlayoutId
 * وخلّينا كل تاب نشط يرسم خطّه تحته مباشرة (مع fade بسيط) — فالموضع دايمًا مظبوط.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';

import type { Category, CategorySlug } from '@/lib/services-data';

interface Props {
  categories: Category[];
  active: CategorySlug;
  onChange: (slug: CategorySlug) => void;
  counts?: Record<string, number>;
}

export function CategorySelector({ categories, active, onChange, counts }: Props) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const reduce = useReducedMotion();
  const activeCategory = categories.find((c) => c.slug === active);

  return (
    <div className="sticky top-20 z-40 mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      {/* eyebrow */}
      <div className="mb-5 flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-platinum/30" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.5em] text-platinum/45">
          {isAr ? 'الفهرس' : 'The Index'}
        </span>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-platinum/30" />
      </div>

      {/* ledger bar */}
      <div className="relative rounded-2xl">
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />
        <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-platinum/20 to-transparent" />

        <div
          role="tablist"
          aria-label={isAr ? 'تصنيفات الخدمات' : 'Service categories'}
          className="mask-fade-x flex items-stretch justify-start gap-1 overflow-x-auto overflow-y-hidden px-2 py-4 md:justify-center"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((cat) => {
            const isActive = cat.slug === active;
            const count = counts?.[cat.slug];
            return (
              <button
                key={cat.slug}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onChange(cat.slug)}
                data-cursor="hover"
                className="group relative flex shrink-0 scroll-mx-6 flex-col items-center gap-1.5 rounded-xl px-5 py-2.5 transition-colors md:px-8"
              >
                {/* ambient glow (per-button, no shared layout) */}
                {isActive && (
                  <motion.span
                    aria-hidden
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(203,205,205,0.10),transparent_70%)]"
                  />
                )}

                <span
                  dir="ltr"
                  className={`font-mono text-[0.6rem] tracking-[0.45em] transition-all duration-300 ${
                    isActive ? 'text-metallic' : 'text-platinum/30 group-hover:text-platinum/55'
                  }`}
                >
                  {cat.numeral}
                </span>

                <span
                  className={`whitespace-nowrap font-display text-2xl font-light leading-none tracking-tight transition-all duration-300 ${
                    isActive ? 'text-ivory' : 'text-platinum/45 group-hover:text-platinum/80'
                  }`}
                >
                  {cat.short[isAr ? 'ar' : 'en']}
                </span>

                <span
                  dir="ltr"
                  className={`font-mono text-[0.5rem] tracking-[0.3em] transition-colors ${
                    isActive ? 'text-platinum/70' : 'text-platinum/25'
                  }`}
                >
                  {count != null ? `· ${String(count).padStart(2, '0')} ·` : '·'}
                </span>

                {/* الخط تحت التاب المختار — مرسوم تحته مباشرة (بدون layoutId) */}
                {isActive && (
                  <motion.span
                    aria-hidden
                    initial={reduce ? false : { opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 left-1/2 flex w-14 -translate-x-1/2 flex-col items-center"
                  >
                    <span className="block h-px w-full bg-gradient-to-r from-transparent via-ivory to-transparent" />
                    <span className="-mt-px h-1 w-1 rounded-full bg-ivory" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* active tagline */}
      <motion.div
        key={active}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 flex items-center justify-center gap-4"
      >
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-platinum/25" />
        <span className="text-center font-editorial text-sm italic text-platinum/60 md:text-base">
          {activeCategory?.tagline[isAr ? 'ar' : 'en']}
        </span>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-platinum/25" />
      </motion.div>
    </div>
  );
}