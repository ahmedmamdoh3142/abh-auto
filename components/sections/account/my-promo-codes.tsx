'use client';

/**
 * MyPromoCodes — قسم أكواد الخصم الموجّهة في صفحة /account.
 * Path: components/sections/account/my-promo-codes.tsx
 *
 * (طلب 7) كل كرت يعرض اسم المناسبة (label) فوق القيمة لو موجود.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Tag, Copy, Check, Clock, Sparkles, Ticket } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

type Promo = {
  code: string;
  label: string | null;
  kind: 'percentage' | 'fixed';
  discountPercent: number;
  fixedAmount: number;
  minOrder: number;
  expiresAt: string | null;
  status: 'active' | 'used' | 'expired' | 'inactive';
};

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

export function MyPromoCodes() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = T('ريال', 'SAR');
  const loc = isAr ? 'ar-EG' : 'en-US';
  const fmtDate = (iso: string | null) => { if (!iso) return T('بلا انتهاء', 'No expiry'); const d = new Date(iso); return isNaN(+d) ? '—' : d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }); };

  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/account/promos').then((r) => r.json());
        if (alive && j?.ok) setPromos(j.promos);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading || promos.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{T('أكوادك الخاصة', 'Your private codes')}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-white/12 to-transparent" />
      </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((p, i) => <PromoTicket key={p.code} p={p} i={i} T={T} ccy={ccy} fmtDate={fmtDate} isAr={isAr} />)}
      </div>
    </div>
  );
}

function PromoTicket({ p, i, T, ccy, fmtDate, isAr }: {
  p: Promo; i: number; T: (a: string, e: string) => string; ccy: string; fmtDate: (s: string | null) => string; isAr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const live = p.status === 'active';

  const valueLabel = p.kind === 'fixed' ? `${fmt(p.fixedAmount)} ${ccy}` : `${p.discountPercent}%`;
  const statusMeta = {
    active:   { ar: 'متاح',   en: 'Active',  color: '#9fd4b0', bg: 'rgba(159,212,176,0.1)', bd: 'rgba(159,212,176,0.3)' },
    used:     { ar: 'مُستخدَم', en: 'Used',    color: '#888c90', bg: 'rgba(255,255,255,0.03)', bd: 'rgba(255,255,255,0.1)' },
    expired:  { ar: 'منتهٍ',  en: 'Expired', color: '#e7b4b4', bg: 'rgba(231,180,180,0.08)', bd: 'rgba(231,180,180,0.25)' },
    inactive: { ar: 'موقوف',  en: 'Paused',  color: '#888c90', bg: 'rgba(255,255,255,0.03)', bd: 'rgba(255,255,255,0.1)' },
  }[p.status];

  const copy = async () => {
    try { await navigator.clipboard.writeText(p.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
      className="group relative overflow-hidden rounded-[18px] border"
      style={{ borderColor: live ? 'rgba(203,205,205,0.25)' : 'rgba(255,255,255,0.08)', background: live ? 'linear-gradient(135deg,rgba(203,205,205,0.07),rgba(255,255,255,0.01))' : 'rgba(255,255,255,0.02)', opacity: live ? 1 : 0.7 }}>
      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${statusMeta.color},transparent)` }} />
      <span aria-hidden className="pointer-events-none absolute -end-6 -top-6 opacity-[0.05]"><Ticket className="h-24 w-24" strokeWidth={1} /></span>
      <span aria-hidden className="absolute -start-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />
      <span aria-hidden className="absolute -end-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-obsidian" />

      <div className="relative p-4">
        {/* الرأس: نوع + حالة */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.18em] text-platinum/70">
            <Tag className="h-3 w-3" strokeWidth={1.8} />{T('كود خصم', 'Promo code')}
          </span>
          <span className="rounded-full border px-2.5 py-0.5 text-[0.5rem] uppercase tracking-[0.14em]"
            style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: statusMeta.bd }}>
            {isAr ? statusMeta.ar : statusMeta.en}
          </span>
        </div>

        {/* (طلب 7) اسم المناسبة */}
        {p.label && (
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg border border-platinum/20 bg-platinum/[0.05] px-2.5 py-1 text-[0.66rem] text-platinum/90">
            <Sparkles className="h-3 w-3 text-platinum/60" strokeWidth={1.7} />
            <span className="truncate" style={{ maxWidth: 200 }}>{p.label}</span>
          </div>
        )}

        {/* القيمة الكبيرة */}
        <div className="mb-4 flex items-end gap-2" style={{ justifyContent: isAr ? 'flex-end' : 'flex-start' }}>
          <span className="font-display text-[2.0rem] leading-none tabular-nums text-ivory" dir="ltr">{valueLabel}</span>
          <span className="mb-1 text-[0.6rem] uppercase tracking-[0.16em] text-platinum/60">{T('خصم', 'off')}</span>
        </div>

        {/* الكود القابل للنسخ */}
        <button onClick={live ? copy : undefined} data-cursor={live ? 'hover' : undefined} disabled={!live}
          className="group/code flex w-full items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors duration-300"
          style={{ borderColor: live ? 'rgba(203,205,205,0.35)' : 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', cursor: live ? 'pointer' : 'default' }}>
          <span dir="ltr" className="min-w-0 truncate font-display text-lg tracking-[0.16em] text-ivory" style={{ textDecoration: p.status === 'used' || p.status === 'expired' ? 'line-through' : 'none' }}>{p.code}</span>
          {live && (
            <span className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em] transition-colors"
              style={{ color: copied ? '#9fd4b0' : 'rgba(203,205,205,0.7)' }}>
              {copied ? <><Check className="h-3.5 w-3.5" strokeWidth={2.4} />{T('تم', 'Copied')}</> : <><Copy className="h-3.5 w-3.5" strokeWidth={1.8} />{T('نسخ', 'Copy')}</>}
            </span>
          )}
        </button>

        {/* التفاصيل */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.68rem] text-platinum/60">
          {p.minOrder > 0 && (
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-platinum/45" strokeWidth={1.7} />{T(`حد أدنى ${fmt(p.minOrder)} ${ccy}`, `Min ${fmt(p.minOrder)} ${ccy}`)}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3 text-platinum/45" strokeWidth={1.7} />{fmtDate(p.expiresAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default MyPromoCodes;