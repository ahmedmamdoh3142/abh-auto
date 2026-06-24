'use client';

/**
 * LuckyWheel — عجلة الحظ (سلفر فاخر). Path: components/sections/wheel/lucky-wheel.tsx
 * إصلاح: الـviewBox كان بيقص الإطار المعدني من الأطراف → وسّعناه بحَشو (PAD)
 * وخلّينا الـSVG overflow:visible، وحطّينا ظلًّا ثابتًا خلف العجلة (مش بيلفّ معاها).
 * منطق اللف لم يتغيّر (السيرفر يحدّد الفائز).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Sparkles, Copy, Check, Gift, Lock, Clock } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Segment { id: number; label: { ar?: string; en?: string }; hex: string; kind: string; value: number; }
interface WheelData {
  active: boolean; requireLogin?: boolean; loggedIn?: boolean;
  title?: { ar?: string; en?: string }; subtitle?: { ar?: string; en?: string } | null;
  canSpin?: boolean; nextAt?: string | null; segments?: Segment[];
}
interface SpinRes { ok: boolean; error?: string; segmentIndex?: number; won?: boolean; code?: string | null; expiresAt?: string | null; nextAt?: string | null; }

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

export function LuckyWheel() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);

  const [data, setData] = useState<WheelData | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinRes | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    try {
      const j: WheelData = await fetch('/api/wheel').then((r) => r.json());
      setData(j);
    } catch { setData({ active: false }); }
  };
  useEffect(() => { load(); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);

  const segments = data?.segments ?? [];
  const n = segments.length;
  const seg = n > 0 ? 360 / n : 0;
  const segLabel = (s: Segment) => (isAr ? s.label?.ar : s.label?.en) || s.label?.ar || s.label?.en || '—';

  const doSpin = async () => {
    if (spinning || n === 0) return;
    setErr(null); setResult(null); setSpinning(true);
    try {
      const r: SpinRes = await fetch('/api/wheel', { method: 'POST' }).then((x) => x.json());
      if (!r.ok) {
        setSpinning(false);
        setErr(r.error === 'cooldown' ? 'cooldown' : r.error === 'unauthorized' ? 'login' : 'generic');
        if (r.nextAt && data) setData({ ...data, canSpin: false, nextAt: r.nextAt });
        return;
      }
      const idx = r.segmentIndex ?? 0;
      const target = 360 * 6 - (idx * seg + seg / 2);
      setRotation((prev) => prev - (prev % 360) + target);
      timer.current = setTimeout(() => { setResult(r); setSpinning(false); load(); }, 4700);
    } catch { setSpinning(false); setErr('generic'); }
  };

  const copy = async () => {
    if (!result?.code) return;
    try { await navigator.clipboard.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  const title = useMemo(() => (isAr ? data?.title?.ar : data?.title?.en) || T('عجلة الحظ', 'Lucky Wheel'), [data, isAr]);
  const subtitle = (isAr ? data?.subtitle?.ar : data?.subtitle?.en) || T('لِفّ واكسب مكافأة فورية', 'Spin to win an instant reward');

  if (!data) {
    return <div className="grid place-items-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-platinum" /></div>;
  }
  if (!data.active) return null;

  const SIZE = 360, R = 168, CX = SIZE / 2, CY = SIZE / 2, PAD = 28;
  const VB = `${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`;
  const nextDate = data.nextAt ? new Date(data.nextAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' }) : null;
  const needLogin = data.requireLogin && !data.loggedIn;
  const onCooldown = !needLogin && data.canSpin === false;
  const idle = !spinning && !needLogin && !onCooldown;

  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
      <style>{`@keyframes abhWheelGlow{0%,100%{opacity:.32;transform:scale(.96)}50%{opacity:.6;transform:scale(1.04)}}`}</style>

      <div className="flex items-center gap-3 text-[0.58rem] uppercase tracking-[0.34em] text-platinum/70">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />
        <Sparkles className="h-3.5 w-3.5 text-platinum" strokeWidth={1.8} />{T('حصري للأعضاء', 'Members only')}
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-platinum/60" />
      </div>
      <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-light uppercase leading-none tracking-tight text-ivory">{title}</h2>
      <p className="mt-3 text-sm text-platinum/65">{subtitle}</p>

      {/* العجلة — حاوية أكبر شوية من الرسم عشان الظل والتوهّج ما يتقصّوش */}
      <div className="relative mt-9 grid place-items-center" style={{ width: SIZE + 24, maxWidth: '94vw' }}>
        {/* ظل ثابت خلف العجلة (لا يلفّ) */}
        <span aria-hidden className="pointer-events-none absolute rounded-full"
          style={{ inset: 14, boxShadow: '0 38px 80px -22px rgba(0,0,0,0.7)' }} />
        {/* توهّج نابض */}
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(203,205,205,0.28), transparent 72%)', filter: 'blur(36px)', animation: idle ? 'abhWheelGlow 3.6s ease-in-out infinite' : 'none', opacity: idle ? undefined : 0.3 }} />

        {/* المؤشّر */}
        <div className="absolute z-20" aria-hidden style={{ top: -6, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.6))' }}>
          <svg width="34" height="40" viewBox="0 0 34 40">
            <path d="M17 38 L3 8 Q17 0 31 8 Z" fill="url(#pg)" stroke="#0c0d0e" strokeWidth="1.5" />
            <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#9fa3a6" /></linearGradient></defs>
          </svg>
        </div>

        <motion.div className="relative aspect-square w-full" animate={{ rotate: rotation }} transition={{ duration: 4.6, ease: [0.12, 0.66, 0.12, 1] }}>
          <svg viewBox={VB} className="h-full w-full" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" /><stop offset="0.35" stopColor="#8a8d90" /><stop offset="0.5" stopColor="#e8e8e8" /><stop offset="0.7" stopColor="#6f7174" /><stop offset="1" stopColor="#ffffff" />
              </linearGradient>
              <radialGradient id="hub" cx="38%" cy="32%" r="75%">
                <stop offset="0" stopColor="#ffffff" /><stop offset="0.45" stopColor="#cbcdcd" /><stop offset="1" stopColor="#5e6164" />
              </radialGradient>
              <radialGradient id="gloss" cx="35%" cy="28%" r="70%">
                <stop offset="0" stopColor="rgba(255,255,255,0.5)" /><stop offset="0.4" stopColor="rgba(255,255,255,0.06)" /><stop offset="1" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            {/* الإطار المعدني */}
            <circle cx={CX} cy={CY} r={R + 13} fill="#0c0d0e" stroke="url(#rim)" strokeWidth="7" />
            <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

            {/* القطاعات */}
            {segments.map((s, i) => {
              const a0 = i * seg, a1 = (i + 1) * seg, mid = a0 + seg / 2;
              const lp = polar(CX, CY, R * 0.62, mid);
              const dark = i % 2 === 0;
              return (
                <g key={s.id}>
                  <path d={wedge(CX, CY, R, a0, a1)} fill={s.hex} opacity={dark ? 0.95 : 0.8} stroke="#0c0d0e" strokeWidth="1.5" />
                  <text x={lp.x} y={lp.y} fill="#0c0d0e" fontSize="13" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${mid}, ${lp.x}, ${lp.y})`} style={{ letterSpacing: '0.02em' }}>
                    {segLabel(s).slice(0, 14)}
                  </text>
                </g>
              );
            })}

            {/* نتوءات معدنية عند حدود القطاعات */}
            {segments.map((_, i) => {
              const p = polar(CX, CY, R + 5, i * seg);
              return <circle key={`peg-${i}`} cx={p.x} cy={p.y} r="3.2" fill="url(#rim)" stroke="#0c0d0e" strokeWidth="0.8" />;
            })}

            {/* لمعة زجاجية ثابتة */}
            <circle cx={CX} cy={CY} r={R} fill="url(#gloss)" style={{ mixBlendMode: 'screen' }} />

            {/* المحور اللامع */}
            <circle cx={CX} cy={CY} r="28" fill="#0c0d0e" stroke="url(#rim)" strokeWidth="3" />
            <circle cx={CX} cy={CY} r="18" fill="url(#hub)" />
            <circle cx={CX - 5} cy={CY - 6} r="5" fill="rgba(255,255,255,0.55)" />
          </svg>
        </motion.div>
      </div>

      {/* الزرّ / الحالات */}
      <div className="mt-9 w-full">
        {needLogin ? (
          <a href="/login?redirect=/offers" data-cursor="hover"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ivory transition-all hover:-translate-y-0.5 hover:border-white/30">
            <Lock className="h-4 w-4" strokeWidth={1.8} />{T('سجّل دخولك للّف', 'Log in to spin')}
          </a>
        ) : onCooldown ? (
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-7 py-4 text-[0.66rem] uppercase tracking-[0.18em] text-platinum/70">
            <Clock className="h-4 w-4" strokeWidth={1.8} />
            {nextDate ? T(`ارجع يوم ${nextDate}`, `Come back ${nextDate}`) : T('لفّيت بالفعل', 'Already spun')}
          </div>
        ) : (
          <button data-cursor="hover" onClick={doSpin} disabled={spinning}
            className={`group relative inline-flex items-center gap-2.5 rounded-full px-10 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-obsidian transition-transform duration-500 ${spinning ? 'opacity-60' : 'hover:-translate-y-0.5'}`}
            style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9),0 18px 55px -15px rgba(203,205,205,0.6)' }}>
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            {spinning ? T('بتلفّ…', 'Spinning…') : T('لِفّ العجلة', 'Spin the wheel')}
          </button>
        )}
        {err === 'cooldown' && <p className="mt-4 text-[0.7rem] text-[#e7b4b4]">{T('لِفّيت قبل كده — استنى دورك الجاي.', 'You already spun — wait for your next turn.')}</p>}
        {err === 'generic' && <p className="mt-4 text-[0.7rem] text-[#e7b4b4]">{T('حصل خطأ، جرّب تاني.', 'Something went wrong, try again.')}</p>}
      </div>

      {/* الكشف عن النتيجة */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center p-4">
            <div aria-hidden onClick={() => setResult(null)} className="absolute inset-0 bg-obsidian/85 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="glass-strong relative z-10 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/[0.1] p-8 text-center shadow-[0_50px_120px_-40px_rgba(0,0,0,0.85)]">
              {result.won ? (
                <>
                  <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-60 w-60 -translate-x-1/2 -translate-y-1/3 rounded-full bg-platinum/25 blur-[80px]" />
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg,#fff,#cbcdcd)', boxShadow: '0 14px 40px -12px rgba(203,205,205,0.6)' }}>
                    <Gift className="h-9 w-9 text-obsidian" strokeWidth={1.6} />
                  </motion.span>
                  <h3 className="mt-6 font-display text-3xl font-light uppercase tracking-tight text-ivory">{T('مبروووك!', 'You won!')}</h3>
                  <p className="mt-2 text-sm text-platinum/65">{T('كوبونك جاهز ومحفوظ في «أكوادي».', 'Your coupon is saved in “My codes”.')}</p>
                  <button onClick={copy} data-cursor="hover"
                    className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-platinum/40 bg-platinum/[0.08] px-5 py-4 transition-colors hover:border-platinum/70">
                    <span dir="ltr" className="font-display text-xl tracking-[0.18em] text-ivory">{result.code}</span>
                    <span className="inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.16em] text-platinum/70">
                      {copied ? <><Check className="h-4 w-4 text-[#46b98a]" />{T('اتنسخ', 'Copied')}</> : <><Copy className="h-4 w-4" />{T('انسخ', 'Copy')}</>}
                    </span>
                  </button>
                  {result.expiresAt && (
                    <p className="mt-3 text-[0.66rem] text-steel">
                      {T('صالح حتى', 'Valid until')} {new Date(result.expiresAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-platinum/70">
                    <Sparkles className="h-8 w-8" strokeWidth={1.4} />
                  </span>
                  <h3 className="mt-6 font-display text-2xl font-light uppercase tracking-tight text-ivory">{T('حظ أوفر المرة الجاية', 'Better luck next time')}</h3>
                  <p className="mt-2 text-sm text-platinum/60">{T('متزعّلش — رجّع لِفّ في الجولة الجاية.', 'Don’t worry — spin again next round.')}</p>
                </>
              )}
              <button onClick={() => setResult(null)} data-cursor="hover"
                className="mt-7 w-full rounded-full border border-white/12 px-6 py-3 text-[0.64rem] uppercase tracking-[0.18em] text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
                {T('تمام', 'Done')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}