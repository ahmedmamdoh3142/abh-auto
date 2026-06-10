'use client';

/**
 * PromoBanner — حملة الافتتاح مع عدّاد تنازلي.
 * كل النصوص + الصورة + تاريخ النهاية + قيمة الخصم تأتي من قاعدة البيانات عبر props.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Calendar } from 'lucide-react';

type BannerCopy = {
  title: string;
  highlight: string;
  copy: string;
  cta: string;
  ends: string;
  badgeUp: string;
  badgeOff: string;
  badgeValue?: string | null;            // قيمة الخصم (مثل "40%") — من الداتا
  endsAt?: string | null;                // تاريخ النهاية ISO — من الداتا
  units?: { days?: string; hrs?: string; min?: string; sec?: string };
};

function useCountdown(target: number) {
  const [tl, setTl] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTl({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff / 3_600_000) % 24),
        m: Math.floor((diff / 60_000) % 60),
        s: Math.floor((diff / 1_000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return tl;
}

export function PromoBanner({ copy, image }: { copy: BannerCopy; image: string }) {
  // تاريخ النهاية من الداتا — لا يوجد أي توقيت ثابت في الكود
  const target = useMemo(() => {
    if (!copy.endsAt) return 0;
    const t = Date.parse(copy.endsAt);
    return Number.isNaN(t) ? 0 : t;
  }, [copy.endsAt]);

  const tl = useCountdown(target);

  const units = useMemo(
    () => [
      { v: tl.d, l: copy.units?.days ?? 'DAYS' },
      { v: tl.h, l: copy.units?.hrs ?? 'HRS' },
      { v: tl.m, l: copy.units?.min ?? 'MIN' },
      { v: tl.s, l: copy.units?.sec ?? 'SEC' },
    ],
    [tl, copy.units],
  );

  const badgeValue = copy.badgeValue ?? '';

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="noise relative h-[680px] overflow-hidden rounded-[2rem] md:h-[760px]"
        >
          <Image src={image} alt="" fill sizes="100vw" className="scale-110 object-cover" priority={false} />

          <div className="absolute inset-0 bg-gradient-to-br from-obsidian via-obsidian/40 to-obsidian/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/95 via-transparent to-transparent" />

          <motion.div initial={{ opacity: 0, scale: 0.4 }} whileInView={{ opacity: 0.55, scale: 1 }} transition={{ duration: 2 }} viewport={{ once: true }}
            className="pointer-events-none absolute left-1/4 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/20 blur-[180px]" />
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 0.3 }} transition={{ duration: 2.5, delay: 0.4 }} viewport={{ once: true }}
            className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-ivory/10 blur-[140px]" />

          {[...Array(16)].map((_, i) => (
            <motion.span key={i} className="pointer-events-none absolute h-1 w-1 rounded-full bg-platinum/50"
              style={{ left: `${(i * 6.2) % 100}%`, top: `${((i * 7) % 80) + 10}%` }}
              animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.3 }} />
          ))}

          {badgeValue && <DiscountBadge value={badgeValue} badgeUp={copy.badgeUp} badgeOff={copy.badgeOff} />}

          <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-16">
            <div className="grid items-end gap-12 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}
                  className="font-display text-4xl md:text-5xl lg:text-7xl uppercase leading-[0.95] tracking-tighter text-ivory balance">
                  {copy.title}
                </motion.h2>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45 }} viewport={{ once: true }}
                  className="mt-5 flex items-center gap-4">
                  <span className="h-px w-14 bg-gradient-to-r from-platinum/80 to-transparent" />
                  <span className="text-[0.65rem] uppercase tracking-[0.38em] text-platinum/80">{copy.highlight}</span>
                </motion.div>

                <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} viewport={{ once: true }}
                  className="mt-6 max-w-xl text-base md:text-lg text-platinum/80 pretty">
                  {copy.copy}
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }} viewport={{ once: true }}
                  className="mt-10 flex flex-wrap items-center gap-5">
                  <BookingButton href="/booking">
                    <Calendar className="h-4 w-4" strokeWidth={1.6} />
                    {copy.cta}
                  </BookingButton>
                </motion.div>
              </div>

              {/* العدّاد يظهر فقط لو فيه تاريخ نهاية صالح من الداتا */}
              {target > 0 && (
                <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.5 }} viewport={{ once: true }}
                  className="glass-strong rounded-2xl p-6 md:p-8">
                  <div className="mb-5 text-[0.6rem] uppercase tracking-[0.3em] text-platinum/70">{copy.ends}</div>
                  <div className="grid grid-cols-4 gap-3">
                    {units.map((u) => <CountdownDigit key={u.l} value={u.v} label={u.l} />)}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DiscountBadge({ value, badgeUp, badgeOff }: { value: string; badgeUp: string; badgeOff: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.6, rotate: -20 }} whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}
      className="pointer-events-none absolute right-6 top-6 z-20 md:right-12 md:top-12">
      <div className="relative h-32 w-32 md:h-40 md:w-40">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full opacity-70"
          style={{ background: 'conic-gradient(from 0deg, rgba(203,205,205,0.0), rgba(255,255,255,0.6), rgba(203,205,205,0.0), rgba(255,255,255,0.4), rgba(203,205,205,0.0))', filter: 'blur(8px)' }} />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-ivory/90 via-platinum/40 to-ivory/70" />
        <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-obsidian via-obsidian/95 to-obsidian/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <span className="text-[0.5rem] uppercase tracking-[0.3em] text-platinum/70 md:text-[0.55rem]">{badgeUp}</span>
          <span className="font-display text-3xl leading-none text-ivory md:text-4xl">{value}</span>
          <span className="mt-1 text-[0.5rem] uppercase tracking-[0.3em] text-platinum/70 md:text-[0.55rem]">{badgeOff}</span>
        </div>
        <motion.span animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute -right-1 top-3 h-1.5 w-1.5 rounded-full bg-ivory" />
        <motion.span animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }} className="absolute -left-2 bottom-6 h-1 w-1 rounded-full bg-ivory" />
      </div>
    </motion.div>
  );
}

function BookingButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-cursor="hover" className="group relative inline-block">
      <span aria-hidden className="absolute -inset-2 rounded-full bg-gradient-to-r from-platinum/40 via-ivory/30 to-platinum/40 opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100" />
      <span aria-hidden className="absolute -inset-px rounded-full bg-gradient-to-br from-ivory/60 via-platinum/30 to-ivory/40 opacity-90" />
      <span className="relative inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-ivory via-platinum to-ivory/90 px-8 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-obsidian shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_60px_-12px_rgba(203,205,205,0.6)] transition-all duration-500 group-hover:-translate-y-0.5">
        {children}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-1 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  const controls = useAnimation();
  useEffect(() => { controls.start({ opacity: [0.6, 1], y: [4, 0] }); }, [value, controls]);
  return (
    <div className="text-center">
      <motion.div animate={controls} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-3xl leading-none tabular-nums text-metallic md:text-4xl">
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-platinum/60">{label}</div>
    </div>
  );
}