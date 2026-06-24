'use client';

/**
 * MembershipPanel — قسم «عضويتي» في /account (إعادة تصميم فاخرة).
 * Path: components/sections/account/membership-panel.tsx
 *
 *  • بطاقة عضوية كبيرة بطابع «بطاقة معدنية» (ميدالية + نقش غائر + توهّج المستوى
 *    + شريط تقدّم أنيق).
 *  • سلّم المستويات صار «كروت جريد» احترافية: كل كرت يعرض المستوى، الشرط،
 *    الخصم الدائم، وكل المزايا — مع حالات (مستواك/مفتوح/مقفول).
 *
 * مصدر البيانات: /api/account/loyalty → { tiers, loyalty }.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Shield, Sparkles, Gem, Crown, Lock, Check, TrendingUp } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

type Tier = {
  code: string;
  name: { ar?: string; en?: string };
  threshold: number;
  discountPercent: number;
  perks: { ar: string[]; en: string[] };
  hex: string;
  icon: string;
  sort: number;
};
type Loyalty = {
  lifetimeSpend: number;
  bookingsCount: number;
  current: Tier;
  next: Tier | null;
  progressPct: number;
  remainingToNext: number;
};

const ICONS: Record<string, React.ElementType> = { shield: Shield, sparkles: Sparkles, gem: Gem, crown: Crown };
const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

export function MembershipPanel() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = T('ريال', 'SAR');

  const [data, setData] = useState<{ tiers: Tier[]; loyalty: Loyalty } | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/account/loyalty').then((r) => r.json());
        if (!alive) return;
        if (j?.ok && j.enabled) setData({ tiers: j.tiers, loyalty: j.loyalty });
        else setEnabled(false);
      } catch { if (alive) setEnabled(false); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (!enabled) return null;
  if (loading) {
    return (
      <div className="grid place-items-center rounded-[28px] border border-white/[0.06] py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-platinum" />
      </div>
    );
  }
  if (!data) return null;

  const { tiers, loyalty } = data;
  const cur = loyalty.current;
  const nameOf = (t: Tier) => (isAr ? t.name.ar : t.name.en) || t.name.ar || t.name.en || t.code;

  return (
    <div className="space-y-14">
      {/* ═══════════ البطاقة الكبيرة ═══════════ */}
      <div className="space-y-5">
        <Head>{T('بطاقتي', 'My card')}</Head>
        <MemberCard T={T} ccy={ccy} tier={cur} loyalty={loyalty} nameOf={nameOf} />
      </div>

      {/* ═══════════ سلّم المستويات (جريد) ═══════════ */}
      <div className="space-y-5">
        <Head>{T('مستويات العضوية', 'Membership tiers')}</Head>
        <p className="-mt-1 max-w-[60ch] text-[0.82rem] leading-relaxed text-platinum/55">
          {T('كل ما إنفاقك يزيد، توصل لمستوى أعلى بخصم دائم ومزايا أكتر. دي كل المستويات والمميزات بتاعتها.',
             'As your spend grows, you climb to higher tiers with a bigger standing discount and more perks. Here is every tier and what it unlocks.')}
        </p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map((t, i) => (
            <TierCard key={t.code} T={T} ccy={ccy} tier={t} idx={i} nameOf={nameOf} isAr={isAr}
              state={t.code === cur.code ? 'current' : loyalty.lifetimeSpend >= t.threshold ? 'unlocked' : 'locked'} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ البطاقة المعدنية ═══════════ */
function MemberCard({ T, ccy, tier, loyalty, nameOf }: {
  T: (a: string, e: string) => string; ccy: string; tier: Tier; loyalty: Loyalty; nameOf: (t: Tier) => string;
}) {
  const reduce = useReducedMotion();
  const Icon = ICONS[tier.icon] ?? Shield;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
      className="relative overflow-hidden rounded-[30px] p-px"
      style={{ background: `linear-gradient(135deg, ${tier.hex}66, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.02))` }}>
      <div className="relative overflow-hidden rounded-[29px] bg-gradient-to-br from-[#101113] via-[#0b0c0d] to-[#070809] p-7 md:p-10">
        {/* نقش غائر + توهّج المستوى */}
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{ background: `radial-gradient(120% 80% at 100% 0%, ${tier.hex}1f, transparent 55%)` }} />
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 9px)' }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${tier.hex},transparent)`, opacity: 0.7 }} />

        {/* الزاوية: شعار + كلمة العضوية */}
        <div className="absolute end-7 top-7 text-end md:end-10 md:top-9">
          <div className="font-display text-lg uppercase tracking-[0.3em] text-ivory/90">ABH</div>
          <div className="mt-0.5 text-[0.5rem] uppercase tracking-[0.34em] text-platinum/45">{T('عضوية', 'Member')}</div>
        </div>

        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center">
          {/* الميدالية */}
          <div className="relative h-32 w-32 flex-none">
            {!reduce && (
              <motion.span aria-hidden animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full opacity-80"
                style={{ background: `conic-gradient(from 0deg, transparent, ${tier.hex}, transparent 40%, ${tier.hex}99, transparent 75%)`, filter: 'blur(8px)' }} />
            )}
            <span aria-hidden className="absolute inset-2 rounded-full"
              style={{ background: `linear-gradient(135deg,#fff 0%, ${tier.hex} 55%, rgba(0,0,0,0.5) 100%)` }} />
            <span aria-hidden className="absolute inset-[7px] rounded-full"
              style={{ background: 'conic-gradient(from 90deg, rgba(255,255,255,.25), rgba(0,0,0,.25), rgba(255,255,255,.18), rgba(0,0,0,.3))', opacity: 0.4 }} />
            <span className="absolute inset-[11px] grid place-items-center rounded-full bg-gradient-to-br from-obsidian via-obsidian to-[#0b0c0d] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
              <Icon className="h-10 w-10" strokeWidth={1.3} style={{ color: tier.hex }} />
            </span>
          </div>

          {/* النصوص */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 text-[0.55rem] uppercase tracking-[0.3em] text-platinum/65">
              <span className="h-px w-7" style={{ background: tier.hex }} />{T('مستواك الحالي', 'Your tier')}
            </div>
            <h3 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.2rem)] font-light uppercase leading-none text-ivory">{nameOf(tier)}</h3>

            <div className="mt-6 flex flex-wrap items-end gap-x-9 gap-y-4">
              <Stat label={T('خصم دائم', 'Standing discount')} value={tier.discountPercent > 0 ? `${tier.discountPercent}%` : '—'} accent={tier.discountPercent > 0 ? tier.hex : undefined} big />
              <Stat label={T('إجمالي إنفاقك', 'Lifetime spend')} value={fmt(loyalty.lifetimeSpend)} unit={ccy} />
              <Stat label={T('حجوزاتك', 'Bookings')} value={String(loyalty.bookingsCount)} />
            </div>
          </div>
        </div>

        {/* التقدّم */}
        <div className="relative mt-9">
          {loyalty.next ? (
            <>
              <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
                <span className="text-[0.78rem] text-platinum/70">
                  {T('باقي ', 'Just ')}
                  <span dir="ltr" className="font-display text-ivory">{fmt(loyalty.remainingToNext)} {ccy}</span>
                  {T(' للترقية إلى ', ' to reach ')}
                  <span style={{ color: loyalty.next.hex }}>{nameOf(loyalty.next)}</span>
                </span>
                <span dir="ltr" className="font-display text-[0.78rem] tabular-nums text-platinum/60">{loyalty.progressPct}%</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.span className="absolute inset-y-0 start-0 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${loyalty.progressPct}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
                  style={{ background: `linear-gradient(90deg, ${tier.hex}, ${loyalty.next.hex})` }} />
                <span aria-hidden className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 7px)' }} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-[0.74rem] tracking-wide"
              style={{ borderColor: `${tier.hex}40`, background: `${tier.hex}10`, color: tier.hex }}>
              <Crown className="h-3.5 w-3.5" strokeWidth={1.8} />
              {T('وصلت لأعلى مستوى — كامل المزايا مفتوحة ليك', 'Top tier reached — every perk unlocked')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, unit, accent, big }: { label: string; value: string; unit?: string; accent?: string; big?: boolean }) {
  return (
    <div>
      <div className="text-[0.5rem] uppercase tracking-[0.24em] text-steel">{label}</div>
      <div dir="ltr" className={`mt-1 font-display tabular-nums ${big ? 'text-4xl' : 'text-2xl'}`}
        style={{ color: accent ?? '#cbcdcd' }}>
        {value}{unit && <span className="ms-1 text-xs text-steel">{unit}</span>}
      </div>
    </div>
  );
}

/* ═══════════ كرت مستوى (جريد) ═══════════ */
function TierCard({ T, ccy, tier, idx, state, nameOf, isAr }: {
  T: (a: string, e: string) => string; ccy: string; tier: Tier; idx: number;
  state: 'current' | 'unlocked' | 'locked'; nameOf: (t: Tier) => string; isAr: boolean;
}) {
  const Icon = ICONS[tier.icon] ?? Shield;
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';
  const perks = (isAr ? tier.perks?.ar : tier.perks?.en) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.08, ease: EASE }}
      className="group relative flex flex-col overflow-hidden rounded-[24px] border bg-gradient-to-b from-white/[0.035] to-white/[0.01] transition-all duration-500"
      style={{
        borderColor: isCurrent ? `${tier.hex}66` : 'rgba(255,255,255,0.08)',
        boxShadow: isCurrent ? `0 24px 60px -32px ${tier.hex}aa` : undefined,
        opacity: isLocked ? 0.72 : 1,
      }}>
      {/* شريط علوي بلون المستوى */}
      <span aria-hidden className="h-1 w-full flex-none" style={{ background: `linear-gradient(90deg, transparent, ${tier.hex}, transparent)` }} />

      <div className="flex flex-col gap-4 p-5">
        {/* الرأس */}
        <div className="flex items-start justify-between gap-2">
          <span className="relative grid h-12 w-12 flex-none place-items-center rounded-full"
            style={{ background: isLocked ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg,#fff, ${tier.hex} 60%, rgba(0,0,0,.4))` }}>
            {isLocked
              ? <Lock className="h-4 w-4 text-steel" strokeWidth={1.8} />
              : <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-obsidian">
                  <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: tier.hex }} />
                </span>}
          </span>
          {isCurrent ? (
            <span className="rounded-full px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.16em]" style={{ background: `${tier.hex}1f`, color: tier.hex }}>
              {T('مستواك', 'You')}
            </span>
          ) : isLocked ? (
            <span className="rounded-full border border-white/12 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.16em] text-steel">{T('مقفول', 'Locked')}</span>
          ) : (
            <span className="rounded-full border border-white/12 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.16em] text-platinum/70">{T('مفتوح', 'Unlocked')}</span>
          )}
        </div>

        {/* الاسم + الخصم */}
        <div>
          <h4 className="font-display text-2xl uppercase leading-none text-ivory">{nameOf(tier)}</h4>
          <div className="mt-2 flex items-baseline gap-2">
            {tier.discountPercent > 0 ? (
              <>
                <span dir="ltr" className="inline-flex items-center gap-1 font-display text-3xl tabular-nums" style={{ color: isLocked ? '#666a6e' : tier.hex }}>
                  <TrendingUp className="h-4 w-4" strokeWidth={2} />{tier.discountPercent}%
                </span>
                <span className="text-[0.55rem] uppercase tracking-[0.16em] text-steel">{T('خصم دائم', 'standing off')}</span>
              </>
            ) : (
              <span className="text-[0.7rem] uppercase tracking-[0.14em] text-platinum/60">{T('عضوية مجانية', 'Free to join')}</span>
            )}
          </div>
          <div className="mt-2 text-[0.68rem] text-platinum/50">
            {tier.threshold > 0
              ? T(`عند إنفاق ${fmt(tier.threshold)} ${ccy}`, `At ${fmt(tier.threshold)} ${ccy} spend`)
              : T('من أول تسجيل', 'From sign-up')}
          </div>
        </div>

        {/* المزايا */}
        {perks.length > 0 && (
          <>
            <span aria-hidden className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
            <ul className="space-y-2.5">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[0.78rem] leading-snug text-platinum/75">
                  <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full"
                    style={{ background: isLocked ? 'rgba(255,255,255,0.05)' : `${tier.hex}22` }}>
                    <Check className="h-2.5 w-2.5" strokeWidth={2.6} style={{ color: isLocked ? '#666a6e' : tier.hex }} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/12 to-transparent" />
    </div>
  );
}

export default MembershipPanel;