'use client';

/**
 * useLenis — Tuned for cinematic smoothness.
 *
 * Key tuning decisions:
 *  - lerp (linear interpolation) is preferred over fixed `duration`. It
 *    gives a more natural "physical" feeling where heavy scrolls travel
 *    faster than tiny ones.
 *  - Easing eased out of an exponential makes the deceleration buttery.
 *  - wheelMultiplier slightly above 1 makes the wheel feel responsive,
 *    while touchMultiplier above 1 makes mobile flicks feel snappy.
 *  - The `lenis` class is added to <html> so our CSS in globals.css
 *    cooperates correctly with the smooth-scroll behaviour.
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

    // Respect users who prefer reduced motion — skip Lenis entirely.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const lenis = new Lenis({
      // lerp gives a physical feel — lower = smoother / more weight
      lerp: 0.08,
      // Easing for non-user-scroll programmatic scrolls (anchor links etc.)
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      syncTouch: false,
    });

    lenisInstance = lenis;

    // Hint <html> so CSS can react (see globals.css `.lenis` rules)
    document.documentElement.classList.add('lenis', 'lenis-smooth');

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisInstance = null;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, []);
}