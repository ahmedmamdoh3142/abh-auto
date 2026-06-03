'use client';

/**
 * ServicesHero — compact opening statement.
 *
 * Intentionally short (~50vh) so we get to the meat of the page fast.
 * Just an eyebrow, headline, and subtitle. The category tabs sit right
 * beneath this hero, so the user's first scroll already lands on the
 * service carousel.
 */
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

export function ServicesHero() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <section className="relative w-full pt-20 pb-10 md:pt-28 md:pb-14">
      {/* Background bloom */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.045] blur-[160px]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-5"
        >
          <span className="block h-px w-12 bg-gradient-to-r from-transparent via-platinum/40 to-platinum/60" />
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.55em] text-platinum/85">
            {isAr ? 'الأتيليه · جدّة' : 'The Atelier · Jeddah'}
          </span>
          <span className="block h-px w-12 bg-gradient-to-l from-transparent via-platinum/40 to-platinum/60" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 text-center font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-tight balance"
        >
          <span className="bg-gradient-to-b from-ivory via-platinum/95 to-ivory/55 bg-clip-text text-transparent">
            {isAr ? 'الخدمات' : 'Services'}
          </span>{' '}
          <span className="font-editorial italic text-platinum/85">
            {isAr ? 'بالتفصيل.' : 'in detail.'}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mx-auto mt-5 max-w-lg text-center font-editorial text-sm italic leading-relaxed text-platinum/65 md:text-base"
        >
          {isAr
            ? 'اختر الفئة. تصفّح الخدمات. الأسعار للأحجام الثلاثة معروضة على كل بطاقة.'
            : 'Choose a category. Browse the services. All three vehicle-size prices are shown on every card.'}
        </motion.p>
      </div>
    </section>
  );
}