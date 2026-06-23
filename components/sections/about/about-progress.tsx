'use client';

/**
 * AboutProgress — Vertical chapter scrubber.
 *
 * تعديل ضروري بعد تأجيل الفصول: الفصول 01–07 الآن تُركَّب لاحقًا (ssr:false)،
 * فلو رصدنا الأقسام مرة واحدة عند mount سنجد القسم "00" فقط. لذلك نستخدم
 * MutationObserver لإعادة الفحص وربط IntersectionObserver بأي قسم جديد
 * [data-chapter] يظهر في DOM. مخفي على الموبايل.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

const chapters = [
  { id: '00', label: 'Cold Open',  labelAr: 'بداية' },
  { id: '01', label: 'Obsession',  labelAr: 'الهوس' },
  { id: '02', label: 'Close-Up',   labelAr: 'عن قُرب' },
  { id: '03', label: 'The Hand',   labelAr: 'اليد' },
  { id: '04', label: 'Standard',   labelAr: 'المعيار' },
  { id: '05', label: 'The Room',   labelAr: 'الغرفة' },
  { id: '06', label: 'Remains',    labelAr: 'ما يبقى' },
  { id: '07', label: 'Invitation', labelAr: 'الدعوة' },
] as const;

export function AboutProgress() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observed = new Set<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = chapters.findIndex(
          (c) => c.id === visible.target.getAttribute('data-chapter'),
        );
        if (idx >= 0) setActive(idx);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    // يربط أي قسم فصل غير مرصود بعد (يشمل الفصول المؤجَّلة عند ظهورها)
    const scan = () => {
      for (const { id } of chapters) {
        const el = document.querySelector<HTMLElement>(`[data-chapter="${id}"]`);
        if (el && !observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      }
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-1/2 end-6 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex"
      aria-hidden
    >
      {chapters.map((chapter, i) => {
        const isActive = i === active;
        return (
          <div key={chapter.id} className="flex items-center gap-3">
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="font-mono text-[0.55rem] uppercase tracking-[0.35em] text-platinum/80"
                  dir="ltr"
                >
                  {chapter.id} — {isAr ? chapter.labelAr : chapter.label}
                </motion.span>
              )}
            </AnimatePresence>

            <motion.span
              animate={{
                width: isActive ? 28 : 12,
                opacity: isActive ? 1 : 0.4,
                backgroundColor: isActive ? '#cbcdcd' : '#8a8e92',
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="block h-px rounded-full"
            />
          </div>
        );
      })}
    </div>
  );
}