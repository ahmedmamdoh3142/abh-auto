'use client';

import { useEffect, useState, useRef, type RefObject } from 'react';

export function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handle = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  return pos;
}

/**
 * Tracks mouse position *relative to a given element* and exposes CSS vars
 * --mx and --my as percentages. Used by the .spotlight component.
 */
export function useSpotlight<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', `${x}%`);
      el.style.setProperty('--my', `${y}%`);
    };

    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [ref]);
}

/**
 * Magnetic attraction effect — element subtly pulls toward cursor.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const reset = () => { el.style.transform = ''; };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', reset);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', reset);
    };
  }, [strength]);

  return ref;
}
