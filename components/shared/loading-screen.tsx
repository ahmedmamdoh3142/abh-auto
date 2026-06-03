'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function LoadingScreen() {
  const t = useTranslations('loader');
  const tBrand = useTranslations('brand');
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let start: number | null = null;
    const total = 1400;
    let raf: number;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.floor(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(20px)' }}
          transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-obsidian noise"
        >
          {/* Ambient light */}
          <motion.div
            className="absolute inset-0 bg-radial-spotlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
          />

          {/* Floating particles — deterministic positions to avoid SSR/CSR mismatch */}
          {[...Array(18)].map((_, i) => {
            // Pseudo-random but deterministic
            const left = ((i * 73) % 100);
            const top  = ((i * 47) % 100);
            const dur  = 3 + (i % 5) * 0.4;
            const dly  = (i % 7) * 0.3;
            return (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-platinum/40"
                style={{ left: `${left}%`, top: `${top}%` }}
                initial={{ opacity: 0, y: 0 }}
                animate={{
                  y: -120,
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: dur,
                  repeat: Infinity,
                  delay: dly,
                  ease: 'easeOut',
                }}
              />
            );
          })}

          {/* Logo mark */}
          <div className="relative z-10 flex flex-col items-center gap-10 px-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <svg width="78" height="78" viewBox="0 0 78 78" fill="none" className="drop-shadow-[0_0_30px_rgba(203,205,205,0.4)]">
                <defs>
                  <linearGradient id="logoMetal" x1="0" y1="0" x2="78" y2="78" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#cbcdcd" />
                    <stop offset="0.5" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#666a6e" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M39 4 L70 22 L70 56 L39 74 L8 56 L8 22 Z"
                  stroke="url(#logoMetal)"
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
                />
                <motion.path
                  d="M39 18 L56 28 L56 50 L39 60 L22 50 L22 28 Z"
                  stroke="url(#logoMetal)"
                  strokeWidth="1"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
                />
                <motion.circle
                  cx="39"
                  cy="39"
                  r="3"
                  fill="url(#logoMetal)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                />
              </svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="font-display text-xl tracking-[0.32em] text-metallic uppercase">
                {tBrand('name')}
              </div>
              <div className="text-[0.65rem] tracking-[0.3em] text-platinum/60 uppercase">
                {t('tagline')}
              </div>
            </motion.div>

            {/* Progress */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="flex flex-col items-center gap-3 w-72"
            >
              <div className="relative h-px w-full overflow-hidden bg-white/10">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-platinum to-transparent"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
              <div className="font-mono text-[0.65rem] tracking-[0.3em] text-platinum/70 tabular-nums">
                {String(progress).padStart(3, '0')} / 100
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
