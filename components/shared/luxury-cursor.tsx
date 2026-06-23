'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Two-layer cursor:
 *   - a small dot (instant follow)
 *   - a large soft ring (lagged spring follow, scales on hover-interactives)
 *
 * Disabled on touch devices via CSS (hover: none) and bailed early in JS.
 *
 * تحسين الأداء:
 *   النسخة السابقة كانت تُبقي حلقة requestAnimationFrame تعمل **للأبد** حتى لو
 *   الماوس ثابت. الآن نوقف الحلقة عندما تستقر الحلقة عند الماوس، ونعيد تشغيلها
 *   فقط عند الحركة → لا rAF مستمر على سطح المكتب أثناء السكون.
 */
export function LuxuryCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [variant, setVariant] = useState<'default' | 'hover'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    let rafId = 0;
    let looping = false;

    const animate = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      // أوقف الحلقة عند الاستقرار؛ تُستأنف عند الحركة التالية
      if (Math.abs(mouseX - ringX) < 0.1 && Math.abs(mouseY - ringY) < 0.1) {
        looping = false;
        return;
      }
      rafId = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (!looping) {
        looping = true;
        rafId = requestAnimationFrame(animate);
      }
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setActive(true);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      startLoop();
    };

    const onLeave = () => setActive(false);
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [data-cursor="hover"], input, textarea, [role="button"]')) {
        setVariant('hover');
      } else {
        setVariant('default');
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-luxury-dot pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-ivory mix-blend-difference transition-opacity duration-300"
        style={{ opacity: active ? 1 : 0 }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-luxury-ring pointer-events-none fixed left-0 top-0 z-[9998] rounded-full border border-platinum/60 mix-blend-difference transition-[width,height,opacity,background-color] duration-500"
        style={{
          width: variant === 'hover' ? 64 : 36,
          height: variant === 'hover' ? 64 : 36,
          backgroundColor: variant === 'hover' ? 'rgba(203,205,205,0.08)' : 'transparent',
          opacity: active ? 1 : 0,
        }}
      />
    </>
  );
}