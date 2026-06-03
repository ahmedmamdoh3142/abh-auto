'use client';

/**
 * AmbientOrbs — Massive, slow-drifting light orbs fixed to the viewport.
 *
 * These render BEHIND every section (pointer-events: none) and drift on
 * scroll using framer-motion's scroll-linked transforms. They sell the
 * sense of three-dimensional depth and break the "flat black" feel.
 *
 * Mount once in the root layout, inside <main>.
 */
import { useScroll, useTransform, motion } from 'framer-motion';

export function AmbientOrbs() {
  const { scrollYProgress } = useScroll();

  // Each orb drifts at a different rate (parallax depth cue)
  const y1 = useTransform(scrollYProgress, [0, 1], ['0vh', '-40vh']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0vh', '-80vh']);
  const y3 = useTransform(scrollYProgress, [0, 1], ['0vh', '-60vh']);
  const y4 = useTransform(scrollYProgress, [0, 1], ['0vh', '-100vh']);
  const y5 = useTransform(scrollYProgress, [0, 1], ['0vh', '-30vh']);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1 — Platinum bloom, top-left (always present, anchors hero) */}
      <motion.div
        style={{ y: y1 }}
        className="glow-orb"
        // inline styles for size/colour to avoid Tailwind purge issues
      >
        <div
          className="h-[60vw] w-[60vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(203,205,205,0.10) 0%, rgba(203,205,205,0.03) 40%, transparent 70%)',
            filter: 'blur(140px)',
            position: 'absolute',
            top: '-10vh',
            left: '-15vw',
          }}
        />
      </motion.div>

      {/* 2 — Cool steel bloom, right side */}
      <motion.div style={{ y: y2 }} className="glow-orb">
        <div
          className="h-[50vw] w-[50vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(102,106,110,0.12) 0%, rgba(102,106,110,0.04) 45%, transparent 70%)',
            filter: 'blur(160px)',
            position: 'absolute',
            top: '40vh',
            right: '-15vw',
          }}
        />
      </motion.div>

      {/* 3 — Warm amber whisper, middle-left */}
      <motion.div style={{ y: y3 }} className="glow-orb">
        <div
          className="h-[45vw] w-[45vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(140,118,90,0.07) 0%, rgba(140,118,90,0.02) 45%, transparent 70%)',
            filter: 'blur(140px)',
            position: 'absolute',
            top: '110vh',
            left: '-10vw',
          }}
        />
      </motion.div>

      {/* 4 — Deep navy pool, right-lower */}
      <motion.div style={{ y: y4 }} className="glow-orb">
        <div
          className="h-[55vw] w-[55vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(60,80,110,0.08) 0%, rgba(60,80,110,0.02) 45%, transparent 70%)',
            filter: 'blur(170px)',
            position: 'absolute',
            top: '180vh',
            right: '-20vw',
          }}
        />
      </motion.div>

      {/* 5 — Platinum reprise, lower middle */}
      <motion.div style={{ y: y5 }} className="glow-orb">
        <div
          className="h-[40vw] w-[40vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(203,205,205,0.08) 0%, rgba(203,205,205,0.02) 45%, transparent 70%)',
            filter: 'blur(150px)',
            position: 'absolute',
            top: '250vh',
            left: '20vw',
          }}
        />
      </motion.div>
    </div>
  );
}