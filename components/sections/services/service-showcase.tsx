'use client';

/**
 * ServiceShowcase — bento-style service display (RTL-aware).
 *
 * إصلاح جوهري (min-w-0):
 *  عمود الجريد بتاع الكروت الصغيّرة كان بياخد عرض كل الكروت مجمّعة (لأن
 *  min-width الافتراضي للعنصر في الجريد = auto)، فـ:
 *    1) السكرول الأفقي ما كانش بيشتغل (المحتوى "بيمدّد" الحاوية بدل ما يسكرول).
 *    2) نفس العمود بيمدّد، فالكرت الكبير بياخد العرض الضخم ده مش عرض الشاشة.
 *  إضافة min-w-0 على خلايا الجريد (والحاويات الداخلية) بتحل الاتنين معًا:
 *  الكروت الصغيّرة بترجع تعمل سكرول، والكرت الكبير بياخد عرض الشاشة الصح.
 *
 * (تعديل) التنقّل على الموبايل: بدّلنا النقط (dots) تحت الكرت الكبير بسهمين
 *  «السابق/التالي» + عدّاد. اتجاه السهم يتظبط تلقائيًا حسب اللغة (RTL/LTR).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [edge, setEdge] = useState<{ top: boolean; bottom: boolean; scrollable: boolean }>({
    top: false, bottom: false, scrollable: false,
  });

  useEffect(() => { setActiveIndex(0); }, [categorySlug]);

  const recalcEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight > el.clientHeight + 4;
    setEdge({
      scrollable,
      top: el.scrollTop > 6,
      bottom: scrollable && el.scrollTop + el.clientHeight < el.scrollHeight - 6,
    });
  }, []);

  useEffect(() => {
    recalcEdges();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', recalcEdges, { passive: true });
    window.addEventListener('resize', recalcEdges);
    return () => { el.removeEventListener('scroll', recalcEdges); window.removeEventListener('resize', recalcEdges); };
  }, [recalcEdges, services.length]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  const move = useCallback((dir: 1 | -1) => {
    setActiveIndex((i) => Math.min(services.length - 1, Math.max(0, i + dir)));
  }, [services.length]);

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
  const atStart = safeIndex === 0;
  const atEnd = safeIndex === services.length - 1;

  // قناع التلاشي الرأسي (ديسكتوب فقط)
  const maskImage = !edge.scrollable
    ? undefined
    : edge.top && edge.bottom
      ? 'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)'
      : edge.top
        ? 'linear-gradient(to bottom, transparent 0, #000 7%)'
        : edge.bottom
          ? 'linear-gradient(to bottom, #000 93%, transparent 100%)'
          : undefined;

  return (
    <div className="container px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8">
          {/* ── Compact rail ── (min-w-0 حتى يشتغل السكرول الأفقي) */}
          <div className="min-w-0">
            <div className="min-w-0 lg:sticky lg:top-24">
              <div className="mb-4 hidden items-center justify-between px-1 lg:flex">
                <div className="flex items-center gap-3">
                  <span className="h-px w-6 bg-platinum/40" />
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.4em] text-platinum/60">
                    {isAr ? 'اختر خدمتك' : 'Select service'}
                  </span>
                </div>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 font-mono text-[0.55rem] tabular-nums tracking-[0.2em] text-platinum/60" dir="ltr">
                  {String(safeIndex + 1).padStart(2, '0')} / {String(services.length).padStart(2, '0')}
                </span>
              </div>

              <div className="relative min-w-0">
                <div
                  ref={scrollRef}
                  className="atelier-scroll flex w-full max-w-full flex-row gap-4 overflow-x-auto overflow-y-hidden pb-4 pe-4 lg:max-h-[calc(100vh-12rem)] lg:flex-col lg:gap-4 lg:overflow-x-hidden lg:overflow-y-auto lg:pb-2 lg:pe-2"
                  style={maskImage ? { WebkitMaskImage: maskImage, maskImage } : undefined}
                  role="tablist"
                  aria-orientation="vertical"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); move(1); }
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
                  }}
                  tabIndex={0}
                >
                  {services.map((service, index) => (
                      <div
                        key={service.slug}
                        ref={(el) => { itemRefs.current[index] = el; }}
                        style={{ animationDelay: `${index * 0.06}s` }}
                        className="ss-card-in flex-shrink-0 scroll-mt-2 lg:flex-shrink"
                        role="tab"
                        aria-selected={index === safeIndex}
                      >
                        <ServiceCardCompact
                          service={service}
                          isActive={index === safeIndex}
                          onClick={() => setActiveIndex(index)}
                          index={index}
                        />
                      </div>
                    ))}
                  {/* سبيسر نهاية — يضمن ظهور آخر كرت كامل في السكرول الأفقي */}
                  <div aria-hidden className="w-3 flex-shrink-0 lg:hidden" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Featured large card ── (min-w-0 حتى ياخد عرض الشاشة فقط) */}
          <motion.div
            key={featured.slug}
            className="min-w-0"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <ServiceCardLarge service={featured} index={safeIndex} total={services.length} />
          </motion.div>
        </div>

        {/* ── تنقّل الموبايل: سهم السابق/التالي + عدّاد (بدل النقط) ── */}
        {services.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-10 flex items-center justify-center gap-5 lg:hidden"
          >
            {/* السابق */}
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={atStart}
              data-cursor="hover"
              aria-label={isAr ? 'الخدمة السابقة' : 'Previous service'}
              className={`group flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ${
                atStart
                  ? 'cursor-not-allowed border-white/[0.06] text-platinum/20'
                  : 'border-white/[0.12] bg-white/[0.03] text-platinum/70 hover:border-platinum/40 hover:bg-white/[0.06] hover:text-ivory active:scale-95'
              }`}
            >
              {isAr
                ? <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
                : <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} />}
            </button>

            {/* العدّاد */}
            <span dir="ltr" className="min-w-[76px] select-none text-center font-mono text-[0.72rem] tabular-nums tracking-[0.22em]">
              <span className="text-ivory">{String(safeIndex + 1).padStart(2, '0')}</span>
              <span className="mx-1.5 text-platinum/30">/</span>
              <span className="text-platinum/50">{String(services.length).padStart(2, '0')}</span>
            </span>

            {/* التالي */}
            <button
              type="button"
              onClick={() => move(1)}
              disabled={atEnd}
              data-cursor="hover"
              aria-label={isAr ? 'الخدمة التالية' : 'Next service'}
              className={`group flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ${
                atEnd
                  ? 'cursor-not-allowed border-white/[0.06] text-platinum/20'
                  : 'border-white/[0.12] bg-white/[0.03] text-platinum/70 hover:border-platinum/40 hover:bg-white/[0.06] hover:text-ivory active:scale-95'
              }`}
            >
              {isAr
                ? <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} />
                : <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />}
            </button>
          </motion.div>
        )}
      </div>

      <style>{`
      .ss-card-in{opacity:0;transform:translateY(16px);animation:ssCardIn .45s cubic-bezier(.16,1,.3,1) forwards;}
      @keyframes ssCardIn{to{opacity:1;transform:none}}
      @media (prefers-reduced-motion: reduce){ .ss-card-in{animation:none;opacity:1;transform:none} }

      .atelier-scroll{ scrollbar-width: thin; scrollbar-color: rgba(203,205,205,0.3) transparent; }
      .atelier-scroll::-webkit-scrollbar{ width: 5px; height: 5px; }
      .atelier-scroll::-webkit-scrollbar-track{ background: transparent; }
      .atelier-scroll::-webkit-scrollbar-thumb{ background: linear-gradient(rgba(203,205,205,0.38), rgba(203,205,205,0.12)); border-radius: 999px; }
      .atelier-scroll::-webkit-scrollbar-thumb:hover{ background: rgba(203,205,205,0.55); }
    `}</style>
    </div>
  );
}