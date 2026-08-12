'use client';

/**
 * ServicesAtelier — DB-driven. يستقبل categories + services كـ props.
 *
 * إصلاح الأداء: الأوربتان الخلفيتان (blur 180–200px) كانتا framer بـrepeat:Infinity
 * (حلقتا rAF + تحريك عناصر blur عملاقة على الـmain thread). حُوّلتا إلى CSS
 * keyframes وتُعطَّل حركتهما على الموبايل ومع prefers-reduced-motion (يبقى التوهّج
 * ثابتًا، فلا تكلفة إعادة رسم أثناء التمرير على الأجهزة البطيئة).
 *
 * (ملاحظة: AnimatePresence أُزيل سابقًا لمنع قفل framer عند التبديل السريع.)
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { ServicesHero } from './services-hero';
import { CategorySelector } from './category-selector';
import { ServiceShowcase } from './service-showcase';
import { ConciergeClose } from './concierge-close';
import { TierToggle } from '@/components/shared/tier-toggle';
import type { TierCode } from '@/lib/shared/tier';
import type { Category, Service, CategorySlug } from '@/lib/services-data';

export function ServicesAtelier({
  categories,
  services,
}: {
  categories: Category[];
  services: Service[];
}) {
  const [tier, setTier] = useState<TierCode>('signature');
  const [category, setCategory] = useState<CategorySlug>(categories[0]?.slug ?? 'coatings');

  const tierServices = useMemo(() => services.filter((s) => s.tier === tier), [services, tier]);

  const visibleServices = useMemo(
    () => tierServices.filter((s) => s.category === category),
    [tierServices, category],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of tierServices) m[s.category] = (m[s.category] ?? 0) + 1;
    return m;
  }, [tierServices]);

  // لو الخط اتغيّر ومفيش خدمات في الفئة الحالية، انقل لأول فئة فيها خدمات
  useEffect(() => {
    if (!tierServices.some((s) => s.category === category)) {
      const first = categories.find((c) => tierServices.some((s) => s.category === c.slug));
      if (first) setCategory(first.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <style>{`
        .atl-orb1{left:25%;top:25%;transform:translate(-50%,-50%);animation:atlOrb1 12s ease-in-out infinite;}
        @keyframes atlOrb1{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.2)}}
        .atl-orb2{animation:atlOrb2 18s ease-in-out infinite;}
        @keyframes atlOrb2{0%,100%{transform:scale(1.2) translateX(0)}50%{transform:scale(1) translateX(50px)}}
        @media (prefers-reduced-motion: reduce),(max-width: 820px){
          .atl-orb1,.atl-orb2{animation:none!important}
        }
      `}</style>

      {/* Cinematic ambient background — CSS animated */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="atl-orb1 absolute h-[80rem] w-[80rem] rounded-full bg-platinum/[0.06] blur-[200px]" />
        <div className="atl-orb2 absolute right-0 top-1/2 h-[60rem] w-[60rem] rounded-full bg-steel/30 blur-[180px]" />
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-2">
        <TierToggle active={tier} onChange={setTier} />
      </div>

      <CategorySelector
        categories={categories}
        active={category}
        onChange={setCategory}
        counts={counts}
      />

      <div className="relative z-10 pb-20">
        {/* بدون AnimatePresence — تركيب فوري + أنيميشن دخول فقط */}
        <motion.div
  key={`${category}-${tier}`}
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