'use client';

/**
 * StatsSection — dazzling, but quiet.
 * البيانات تأتي من قاعدة البيانات عبر props (مش من site-config أو next-intl).
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;
const COUNT_MS = 2000;

type StatRow = { code: string; value: number | string; suffix: string; label: string };

/** Defensive ease-out (cubic) count-up driven by requestAnimationFrame. */
function useCountUp(target: number, run: boolean, duration = COUNT_MS) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, run, duration]);

  return value;
}

function Stat({
  value,
  suffix,
  label,
  index,
  run,
}: {
  value: number;
  suffix: string;
  label: string;
  index: number;
  run: boolean;
}) {
  const current = useCountUp(value, run);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
      className="relative px-6 text-center lg:px-10"
    >
      {/* Vertical divider before columns 2..4 (desktop only) */}
      {index % 4 !== 0 && (
        <span
          aria-hidden
          className="absolute inset-y-2 start-0 hidden w-px bg-gradient-to-b from-transparent via-platinum/30 to-transparent lg:block"
        />
      )}

      <span
        dir="ltr"
        className="block font-display leading-[1.1] text-metallic tabular-nums"
        style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}
      >
        {current.toLocaleString('en-US')}
        {suffix}
      </span>

      {/* Baseline rule — draws in with the count */}
      <motion.span
        aria-hidden
        className="mx-auto mt-7 block h-px w-16 origin-center bg-gradient-to-r from-transparent via-platinum/60 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: COUNT_MS / 1000, delay: index * 0.12, ease: EASE }}
      />

      <p className="mt-5 text-[0.65rem] uppercase tracking-[0.32em] text-platinum/70">{label}</p>
    </motion.div>
  );
}

export function StatsSection({ stats, eyebrow }: { stats: StatRow[]; eyebrow: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div className="container relative">
        {/* Quiet eyebrow */}
        <div className="mb-16 flex items-center justify-center gap-4 md:mb-24">
          <span className="block h-px w-12 bg-gradient-to-r from-transparent to-platinum/50" />
          <span className="text-[0.6rem] uppercase tracking-[0.5em] text-platinum/85">
            {eyebrow}
          </span>
          <span className="block h-px w-12 bg-gradient-to-l from-transparent to-platinum/50" />
        </div>

        <div ref={ref} className="grid grid-cols-2 gap-y-16 lg:grid-cols-4 lg:gap-y-0">
          {stats.map((stat, i) => (
            <Stat
              key={stat.code}
              value={Number(stat.value)}
              suffix={stat.suffix}
              label={stat.label}
              index={i}
              run={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}