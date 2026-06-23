'use client';

/**
 * SmoothScrollProvider — Lenis smooth scrolling, gated for performance.
 *
 * Path: components/shared/smooth-scroll-provider.tsx
 *
 * لماذا أُعيدت كتابته:
 *   النسخة السابقة كانت تستدعي useLenis() الذي يفتح حلقة requestAnimationFrame
 *   تعمل **طوال عمر الصفحة**. هذه الحلقة المستمرة هي مصدر رئيسي للـ"Other"
 *   الضخم في الـmain-thread (≈33s) وللتعليق لحظة الفتح على الأجهزة البطيئة.
 *
 * ما الذي تغيّر:
 *   1) لا يُفعَّل Lenis إطلاقًا على الأجهزة اللمسية أو مع prefers-reduced-motion
 *      → على الموبايل لا توجد حلقة rAF أصلًا (نستخدم تمرير المتصفح الأصلي، وهو
 *      أسرع وأكثر سلاسة على اللمس على أي حال).
 *   2) تُوقَف الحلقة تمامًا عندما يكون التبويب مخفيًا (visibilitychange).
 *   3) تفكيك نظيف: cancelAnimationFrame + lenis.destroy().
 *
 * يستبدل هذا الملف الاعتماد على hooks/use-lenis.ts (يمكنك حذف ذلك الهوك).
 */
import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // الموبايل/اللمس وتقليل الحركة: تمرير أصلي بلا حلقة rAF
    if (coarse || reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let raf = 0;
    let running = true;

    const loop = (time: number) => {
      lenis.raf(time);
      if (running) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // إيقاف الحلقة عند إخفاء التبويب (يوفّر الـmain-thread أثناء عدم المشاهدة)
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}