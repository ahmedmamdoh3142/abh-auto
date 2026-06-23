'use client';

/**
 * AmbientOrbs — Massive, slow-drifting light orbs fixed to the viewport.
 *
 * تحسين الأداء:
 *   هذه خمس طبقات blur ضخمة (حتى 170px على عناصر بعرض 40–60vw) مربوطة بالسكرول.
 *   على الموبايل/اللمس هي السبب الأكبر للتقطيع أثناء التمرير (rasterization مكلفة
 *   + خمس تحويلات لكل فريم). لذلك نُعطّلها كليًا على اللمس وعلى prefers-reduced-motion،
 *   ونُبقيها كإحساس عمق على سطح المكتب فقط مع will-change للتركيب على الـGPU.
 *
 * تُركّب عبر DeferredChrome (dynamic ssr:false) داخل <main> في الـlayout.
 */
import { useScroll, useTransform, motion } from 'framer-motion';

function shouldDisable(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return (
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function AmbientOrbs() {
  const { scrollYProgress } = useScroll();

  // Each orb drifts at a different rate (parallax depth cue)
  const y1 = useTransform(scrollYProgress, [0, 1], ['0vh', '-40vh']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0vh', '-80vh']);
  const y3 = useTransform(scrollYProgress, [0, 1], ['0vh', '-60vh']);
  const y4 = useTransform(scrollYProgress, [0, 1], ['0vh', '-100vh']);
  const y5 = useTransform(scrollYProgress, [0, 1], ['0vh', '-30vh']);

  // كل الـhooks فوق تُستدعى دائمًا، فالخروج المبكر هنا آمن (لا يخالف قواعد الـhooks).
  // المكوّن client-only (يُحمَّل عبر dynamic ssr:false) فلا يوجد عدم تطابق SSR.
  if (shouldDisable()) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1 — Platinum bloom, top-left */}
      <motion.div style={{ y: y1, willChange: 'transform' }} className="glow-orb">
        <div
          className="h-[60vw] w-[60vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(203,205,205,0.10) 0%, rgba(203,205,205,0.03) 40%, transparent 70%)',
            filter: 'blur(140px)', position: 'absolute', top: '-10vh', left: '-15vw',
          }}
        />
      </motion.div>

      {/* 2 — Cool steel bloom, right side */}
      <motion.div style={{ y: y2, willChange: 'transform' }} className="glow-orb">
        <div
          className="h-[50vw] w-[50vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(102,106,110,0.12) 0%, rgba(102,106,110,0.04) 45%, transparent 70%)',
            filter: 'blur(160px)', position: 'absolute', top: '40vh', right: '-15vw',
          }}
        />
      </motion.div>

      {/* 3 — Warm amber whisper, middle-left */}
      <motion.div style={{ y: y3, willChange: 'transform' }} className="glow-orb">
        <div
          className="h-[45vw] w-[45vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(140,118,90,0.07) 0%, rgba(140,118,90,0.02) 45%, transparent 70%)',
            filter: 'blur(140px)', position: 'absolute', top: '110vh', left: '-10vw',
          }}
        />
      </motion.div>

      {/* 4 — Deep navy pool, right-lower */}
      <motion.div style={{ y: y4, willChange: 'transform' }} className="glow-orb">
        <div
          className="h-[55vw] w-[55vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(60,80,110,0.08) 0%, rgba(60,80,110,0.02) 45%, transparent 70%)',
            filter: 'blur(170px)', position: 'absolute', top: '180vh', right: '-20vw',
          }}
        />
      </motion.div>

      {/* 5 — Platinum reprise, lower middle */}
      <motion.div style={{ y: y5, willChange: 'transform' }} className="glow-orb">
        <div
          className="h-[40vw] w-[40vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(203,205,205,0.08) 0%, rgba(203,205,205,0.02) 45%, transparent 70%)',
            filter: 'blur(150px)', position: 'absolute', top: '250vh', left: '20vw',
          }}
        />
      </motion.div>
    </div>
  );
}