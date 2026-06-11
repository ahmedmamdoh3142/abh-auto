'use client';

/**
 * ServicesAtelier — DB-driven. يستقبل categories + services كـ props.
 *
 * ⚠️ إصلاح البَج: كان فيه <AnimatePresence mode="wait"> حوالين محتوى التصنيف.
 * الـ"wait" بيمنع التصنيف الجديد ما يركّبش (mount) لحد ما الـexit بتاع القديم
 * يخلّص. لما بتدوس بسرعة على التابات، framer ساعات بيدخل في حالة قفل (deadlock)
 * فالخدمات الجديدة عمرها ما بتظهر إلا بعد ريفرش. الحل: شِلنا الـAnimatePresence
 * خالص، والمحتوى دلوقتي بيتركّب فورًا مع كل تغيير تصنيف وبيعمل أنيميشن دخول بس.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { ServicesHero } from './services-hero';
import { CategorySelector } from './category-selector';
import { ServiceShowcase } from './service-showcase';
import { ConciergeClose } from './concierge-close';
import type { Category, Service, CategorySlug } from '@/lib/services-data';

export function ServicesAtelier({
  categories,
  services,
}: {
  categories: Category[];
  services: Service[];
}) {
  const [category, setCategory] = useState<CategorySlug>(categories[0]?.slug ?? 'coatings');

  const visibleServices = useMemo(
    () => services.filter((s) => s.category === category),
    [services, category],
  );

  // عدد الخدمات في كل تصنيف — يظهر كرقم صغير جوه التاب
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of services) m[s.category] = (m[s.category] ?? 0) + 1;
    return m;
  }, [services]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Cinematic ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/4 top-1/4 h-[80rem] w-[80rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum blur-[200px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-0 top-1/2 h-[60rem] w-[60rem] rounded-full bg-steel/30 blur-[180px]"
        />
        <div className="absolute bottom-0 left-1/2 h-[40rem] w-full -translate-x-1/2 bg-gradient-to-t from-platinum/[0.03] to-transparent" />
      </div>

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

      <ServicesHero />

      <CategorySelector
        categories={categories}
        active={category}
        onChange={setCategory}
        counts={counts}
      />

      <div className="relative z-10 pb-20">
        {/* بدون AnimatePresence — تركيب فوري + أنيميشن دخول فقط */}
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ServiceShowcase services={visibleServices} categorySlug={category} />
        </motion.div>
      </div>

      <ConciergeClose />
    </div>
  );
}