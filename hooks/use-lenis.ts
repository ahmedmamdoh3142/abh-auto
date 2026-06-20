'use client';

/**
 * useLenis — Tuned for cinematic smoothness, with deferred startup for perf.
 *
 *  • يبدأ Lenis بعد أول رسم + خمول المتصفح (requestIdleCallback) بدل البدء فورًا،
 *    حتى لا يضيف إلى الـ Total Blocking Time في اللحظة الأولى الحرجة.
 *    المستخدم لا يُمرّر في أول ~ثانية، فلا فرق محسوس في التجربة.
 *  • lerp يعطي إحساسًا فيزيائيًا طبيعيًا. يُحترم تفضيل reduced-motion.
 */
import { useEffect } from 'react';
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function getLenis() {
  return lenisInstance;
}

export function useLenis() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let rafId = 0;
    let started = false;
    let cancelStart: () => void = () => {};

    const start = () => {
      if (started) return;
      started = true;

      const lenis = new Lenis({
        lerp: 0.08,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        syncTouch: false,
      });
      lenisInstance = lenis;
      document.documentElement.classList.add('lenis', 'lenis-smooth');

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    };

    // أجّل البدء حتى يخمل المتصفح بعد الرسم الأول (مع حد أقصى 1.2ث احتياطيًا).
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const idleId = w.requestIdleCallback(start, { timeout: 1200 });
      cancelStart = () => w.cancelIdleCallback?.(idleId);
    } else {
      const tId = window.setTimeout(start, 400);
      cancelStart = () => clearTimeout(tId);
    }

    // لو المستخدم بدأ يمرّر قبل ما نبدأ، ابدأ فورًا حتى لا يضيع أول scroll.
    const onFirstScroll = () => start();
    window.addEventListener('wheel', onFirstScroll, { once: true, passive: true });
    window.addEventListener('touchstart', onFirstScroll, { once: true, passive: true });

    return () => {
      cancelStart();
      window.removeEventListener('wheel', onFirstScroll);
      window.removeEventListener('touchstart', onFirstScroll);
      if (rafId) cancelAnimationFrame(rafId);
      lenisInstance?.destroy();
      lenisInstance = null;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, []);
}