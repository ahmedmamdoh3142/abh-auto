'use client';

/**
 * LuckyWheel — عجلة الحظ (معدن فاخر). Path: components/sections/wheel/lucky-wheel.tsx
 *
 * تحسينات هذه النسخة:
 *  • مظهر معدني راقٍ: إطار غنميتال بمسامير، قطاعات بسطوع معدني مولّد من لون كل
 *    قطاع، محور ذهبي بمقبض فضّي لامع، ومؤشّر ذهبي — مطابق للتصميم المطلوب.
 *  • الكتابة بتتلفّ على عدة أسطر تلقائيًا فما تتقصّش، ولون النص يتبدّل (غامق/فاتح)
 *    حسب سطوع القطاع للوضوح، مع أيقونة صغيرة حسب نوع الجائزة.
 *  • منطق اللف لم يتغيّر (السيرفر يحدّد الفائز).
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

/* ── هندسة ── */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

/* ── ألوان ── */
function hexToRgb(hex: string) {
  let h = (hex || '#cccccc').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 200, g: 200, b: 200 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function lum(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
const textColor = (hex: string) => (lum(hex) > 0.58 ? '#0b0c0d' : '#f6f4ee');

/* ── تقطيع النص لأسطر تلقائيًا (يمنع القص) ── */
function wrapLabel(text: string, maxChars = 9, maxLines = 3): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['—'];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    const tail = lines.slice(maxLines - 1).join(' ');
    return [...head, tail];
  }
  return lines;
}

/* ── أيقونة صغيرة حسب نوع الجائزة ── */
function SegIcon({ kind, color }: { kind: string; color: string }) {
  if (kind === 'gift_service') {
    return (
      <g fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <rect x={-7} y={-3.5} width={14} height={9.5} rx={1.2} />
        <path d="M-7 0 H7" /><path d="M0 -3.5 V6" />
        <path d="M0 -3.5 C-2.4 -8 -7.5 -6.6 -4.6 -3.5" />
        <path d="M0 -3.5 C2.4 -8 7.5 -6.6 4.6 -3.5" />
      </g>
    );
  }
  if (kind === 'nothing') {
    return <path d="M0 -8 L1.7 -1.7 L8 0 L1.7 1.7 L0 8 L-1.7 1.7 L-8 0 L-1.7 -1.7 Z" fill={color} />;
  }
  if (kind === 'promo_percent') {
    return (
      <g stroke={color} strokeWidth={1.6} strokeLinecap="round">
        <line x1={-5.5} y1={5.5} x2={5.5} y2={-5.5} />
        <circle cx={-4} cy={-4} r={1.7} fill={color} stroke="none" />
        <circle cx={4} cy={4} r={1.7} fill={color} stroke="none" />
      </g>
    );
  }
  // promo_fixed → وسم
  return (
    <g fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round">
      <path d="M-6 -1.5 L0 -7 L6 -1.5 L6 6 H-6 Z" />
      <circle cx={0} cy={1} r={1.6} fill={color} stroke="none" />
    </g>
  );
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

  /* أبعاد العجلة */
  const SIZE = 380, R = 172, CX = SIZE / 2, CY = SIZE / 2, RIM = 26, PAD = 34;
  const RO = R + RIM;               // نصف قطر الإطار الخارجي
  const RBOLT = R + RIM / 2 + 1;    // مدار المسامير
  const VB = `${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`;
  const BOLTS = 16;

  const nextDate = data.nextAt ? new Date(data.nextAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' }) : null;
  const needLogin = data.requireLogin && !data.loggedIn;
  const onCooldown = !needLogin && data.canSpin === false;
  const idle = !spinning && !needLogin && !onCooldown;

  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
      <style>{`@keyframes abhWheelGlow{0%,100%{opacity:.3;transform:scale(.95)}50%{opacity:.58;transform:scale(1.05)}}`}</style>

      <div className="flex items-center gap-3 text-[0.58rem] uppercase tracking-[0.34em] text-platinum/70">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />
        <Sparkles className="h-3.5 w-3.5 text-platinum" strokeWidth={1.8} />{T('حصري للأعضاء', 'Members only')}
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-platinum/60" />
      </div>
      <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-light uppercase leading-none tracking-tight text-ivory">{title}</h2>
      <p className="mt-3 text-sm text-platinum/65">{subtitle}</p>

      {/* العجلة */}
      <div className="relative mt-9 grid place-items-center" style={{ width: SIZE + 28, maxWidth: '94vw' }}>
        {/* ظل ثابت خلف العجلة (لا يلفّ) */}
        <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ inset: 16, boxShadow: '0 44px 90px -26px rgba(0,0,0,0.75)' }} />
        {/* توهّج نابض */}
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(217,178,95,0.20), rgba(203,205,205,0.16), transparent 72%)', filter: 'blur(40px)', animation: idle ? 'abhWheelGlow 3.6s ease-in-out infinite' : 'none', opacity: idle ? undefined : 0.28 }} />

        {/* المؤشّر الذهبي */}
        <div className="absolute z-20" aria-hidden style={{ top: -10, filter: 'drop-shadow(0 5px 9px rgba(0,0,0,.65))' }}>
          <svg width="40" height="48" viewBox="0 0 40 48">
            <path d="M20 46 L5 11 Q20 1 35 11 Z" fill="url(#ptr)" stroke="#3a2c0d" strokeWidth="1.4" />
            <circle cx="20" cy="13" r="3.2" fill="#fff7e0" opacity="0.65" />
            <defs>
              <linearGradient id="ptr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f7e6a8" /><stop offset="0.5" stopColor="#d9b25f" /><stop offset="1" stopColor="#9c7a32" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <motion.div className="relative aspect-square w-full" animate={{ rotate: rotation }} transition={{ duration: 4.6, ease: [0.12, 0.66, 0.12, 1] }}>
          <svg viewBox={VB} className="h-full w-full" style={{ overflow: 'visible' }}>
            <defs>
              {/* الإطار المعدني */}
              <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e9ebec" /><stop offset="0.3" stopColor="#7d8084" /><stop offset="0.5" stopColor="#f2f3f4" /><stop offset="0.72" stopColor="#5c5f63" /><stop offset="1" stopColor="#e9ebec" />
              </linearGradient>
              <radialGradient id="rimFace" cx="40%" cy="34%" r="78%">
                <stop offset="0" stopColor="#34373b" /><stop offset="0.6" stopColor="#1b1d20" /><stop offset="1" stopColor="#101113" />
              </radialGradient>
              <linearGradient id="boltG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fdfdfd" /><stop offset="0.5" stopColor="#a9acae" /><stop offset="1" stopColor="#5d6064" />
              </linearGradient>
              {/* المحور الذهبي + المقبض */}
              <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f7e6a8" /><stop offset="0.5" stopColor="#caa24f" /><stop offset="1" stopColor="#7d5f28" />
              </linearGradient>
              <radialGradient id="knob" cx="38%" cy="30%" r="78%">
                <stop offset="0" stopColor="#ffffff" /><stop offset="0.45" stopColor="#cfd2d2" /><stop offset="1" stopColor="#55585b" />
              </radialGradient>
              <radialGradient id="gloss" cx="36%" cy="26%" r="72%">
                <stop offset="0" stopColor="rgba(255,255,255,0.5)" /><stop offset="0.4" stopColor="rgba(255,255,255,0.05)" /><stop offset="1" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              {/* تدرّج معدني لكل قطاع — مولّد من لون القطاع، باتجاه إضاءة موحّد */}
              {segments.map((s, i) => (
                <linearGradient key={`wg-${i}`} id={`wedge-${i}`} gradientUnits="userSpaceOnUse"
                  x1={CX - R} y1={CY - R} x2={CX + R} y2={CY + R}>
                  <stop offset="0" stopColor={shade(s.hex, 0.34)} />
                  <stop offset="0.5" stopColor={s.hex} />
                  <stop offset="1" stopColor={shade(s.hex, -0.36)} />
                </linearGradient>
              ))}
            </defs>

            {/* جسم الإطار الخارجي */}
            <circle cx={CX} cy={CY} r={RO} fill="url(#rimFace)" />
            <circle cx={CX} cy={CY} r={RO - 2} fill="none" stroke="url(#rim)" strokeWidth="3.5" />
            <circle cx={CX} cy={CY} r={R + 3} fill="none" stroke="url(#rim)" strokeWidth="4.5" />

            {/* القطاعات */}
            {segments.map((s, i) => {
              const a0 = i * seg, a1 = (i + 1) * seg, mid = a0 + seg / 2;
              return (
                <path key={`w-${s.id}`} d={wedge(CX, CY, R, a0, a1)} fill={`url(#wedge-${i})`} stroke="#0a0a0b" strokeWidth="1.4" />
              );
            })}

            {/* خطوط فاصلة لامعة رفيعة */}
            {segments.map((_, i) => {
              const p = polar(CX, CY, R, i * seg);
              return <line key={`sep-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" />;
            })}

            {/* النصوص — HTML داخل foreignObject عشان العربي يتشكّل صح على iOS Safari
                (الـSVG <text> بيبوّظ تواصل الحروف على الأيفون). يلف ويتسكيل مع العجلة عادي. */}
            {segments.map((s, i) => {
              const mid = i * seg + seg / 2;
              const lines = wrapLabel(segLabel(s));
              const fs = lines.length >= 3 ? 10.5 : lines.length === 2 ? 11.5 : 12.5;
              const lc = polar(CX, CY, R * 0.6, mid);
              const tc = textColor(s.hex);
              let rot = mid; if (mid > 90 && mid < 270) rot += 180;
              const W = 108, H = 84;
              return (
                <g key={`t-${s.id}`} transform={`rotate(${rot} ${lc.x} ${lc.y})`}>
                  <foreignObject x={lc.x - W / 2} y={lc.y - H / 2} width={W} height={H} style={{ overflow: 'visible' }}>
                    <div
                      style={{
                        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 5, textAlign: 'center',
                        direction: isAr ? 'rtl' : 'ltr', color: tc, fontFamily: 'inherit', fontWeight: 700,
                        lineHeight: 1.12, WebkitFontSmoothing: 'antialiased',
                      }}>
                      <div style={{ fontSize: fs, letterSpacing: '0.01em', textShadow: '0 1px 2px rgba(0,0,0,0.22)' }}>
                        {lines.map((ln, k) => <div key={k}>{ln}</div>)}
                      </div>
                      <svg width={17} height={17} viewBox="-10 -10 20 20" style={{ display: 'block', flexShrink: 0 }}>
                        <SegIcon kind={s.kind} color={tc} />
                      </svg>
                    </div>
                  </foreignObject>
                </g>
              );
            })}

            {/* مسامير معدنية على الإطار */}
            {Array.from({ length: BOLTS }).map((_, i) => {
              const p = polar(CX, CY, RBOLT, (360 / BOLTS) * i);
              return (
                <g key={`bolt-${i}`}>
                  <circle cx={p.x} cy={p.y} r="3.6" fill="url(#boltG)" stroke="#0a0a0b" strokeWidth="0.8" />
                  <circle cx={p.x - 1} cy={p.y - 1.1} r="1.1" fill="rgba(255,255,255,0.7)" />
                </g>
              );
            })}

            {/* لمعة زجاجية ثابتة */}
            <circle cx={CX} cy={CY} r={R} fill="url(#gloss)" style={{ mixBlendMode: 'screen' }} pointerEvents="none" />

            {/* المحور الذهبي + المقبض الفضّي */}
            <circle cx={CX} cy={CY} r="38" fill="#0c0d0e" />
            <circle cx={CX} cy={CY} r="38" fill="none" stroke="url(#goldRing)" strokeWidth="5.5" />
            <circle cx={CX} cy={CY} r="29" fill="none" stroke="url(#goldRing)" strokeWidth="2.4" opacity="0.85" />
            <circle cx={CX} cy={CY} r="20" fill="url(#knob)" stroke="#3b3d40" strokeWidth="1" />
            <circle cx={CX - 6} cy={CY - 7} r="5.5" fill="rgba(255,255,255,0.6)" />
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
            style={{ background: 'linear-gradient(135deg,#f7e6a8 0%,#d9b25f 50%,#f7e6a8 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7),0 18px 55px -15px rgba(217,178,95,0.55)' }}>
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
                  <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-60 w-60 -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#d9b25f]/25 blur-[80px]" />
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ background: 'linear-gradient(135deg,#f7e6a8,#d9b25f)', boxShadow: '0 14px 40px -12px rgba(217,178,95,0.6)' }}>
                    <Gift className="h-9 w-9 text-obsidian" strokeWidth={1.6} />
                  </motion.span>
                  <h3 className="mt-6 font-display text-3xl font-light uppercase tracking-tight text-ivory">{T('مبروووك!', 'You won!')}</h3>
                  <p className="mt-2 text-sm text-platinum/65">{T('كوبونك جاهز ومحفوظ في «أكوادي».', 'Your coupon is saved in “My codes”.')}</p>
                  <button onClick={copy} data-cursor="hover"
                    className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#d9b25f]/40 bg-[#d9b25f]/[0.08] px-5 py-4 transition-colors hover:border-[#d9b25f]/70">
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