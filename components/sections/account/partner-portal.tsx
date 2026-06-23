'use client';

/**
 * PartnerPortal — لوحة الشركة داخل /account (تبويب «شركتي»، يظهر فقط للحسابات partner).
 * Path: components/sections/account/partner-portal.tsx
 *
 * نسخة بريميوم متوازنة:
 *   • بطاقات مالية واضحة (عمولتك / المستلَم / المتبقّي / الحجوزات) بتدرّجات وحواف ملوّنة.
 *   • تبويب الملخّص: رسم شهري + أبرز الخدمات (أشرطة ترتيب).
 *   • تبويب الحجوزات: صف واضح + جدول بنود داخلي بعناوين (خدمة/حجم/سعر/عمولة).
 *   • تبويب الخدمات: ترتيب كامل بأشرطة نسبة.
 *   • تبويب الدفعات: سجل ما استلمته.
 *
 * مفهوم: العمولة من حقّ الشركة. لا نعرض «صافي المالك» هنا.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  Wallet, Coins, Clock3, TrendingUp, CalendarCheck, ChevronRight,
  ReceiptText, Building2, BadgeCheck, Hourglass, Car, MapPin, Hash, CreditCard, Layers,
} from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

type Item = { name: string; size: string; unit: number; commission: number };
type Booking = {
  id: string; reference: string; vehicle: string; plate: string; size: string; branch: string;
  date: string | null; time: string; total: number; commission: number;
  paymentStatus: string; status: string; createdAt: string | null; items: Item[];
};
type Report = {
  company: { name: string; since: string | null };
  summary: { bookingsCount: number; revenueTotal: number; commissionTotal: number; paidTotal: number; outstanding: number; lastBookingAt: string | null; lastPayoutAt: string | null };
  monthly: { month: string; bookingsCount: number; revenue: number; commission: number }[];
  services: { name: string; timesBooked: number; revenue: number; commission: number }[];
  bookings: Booking[];
  payouts: { amount: number; method: string; reference: string; proofImage?: string; paidAt: string | null }[];
};

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));

export function PartnerPortal() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = T('ريال', 'SAR');
  const loc = isAr ? 'ar-EG' : 'en-US';
  const fmtDate = (iso: string | null) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(+d) ? '—' : d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }); };

  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'bookings' | 'services' | 'payouts'>('overview');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await fetch('/api/partner/me').then((r) => r.json());
        if (alive && j?.ok) setData(j);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="grid place-items-center py-24"><div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-platinum" /></div>;
  }
  if (!data) {
    return <div className="rounded-[24px] border border-dashed border-white/12 px-6 py-16 text-center text-sm text-platinum/60">{T('تعذّر تحميل تقرير الشركة.', 'Could not load company report.')}</div>;
  }

  const s = data.summary;
  const tabs = [
    ['overview', T('الملخّص', 'Overview')],
    ['bookings', T(`الحجوزات (${data.bookings.length})`, `Bookings (${data.bookings.length})`)],
    ['services', T('الخدمات', 'Services')],
    ['payouts', T(`الدفعات (${data.payouts.length})`, `Payouts (${data.payouts.length})`)],
  ] as const;

  return (
    <div className="space-y-10">
      {/* ترويسة الشركة */}
      <div className="relative overflow-hidden rounded-[26px] border border-platinum/20 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-px">
        <span aria-hidden className="pointer-events-none absolute -inset-px rounded-[26px] opacity-50" style={{ background: 'conic-gradient(from 180deg at 50% 50%, transparent, rgba(203,205,205,0.22), transparent)' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-5 rounded-[25px] bg-[#0b0c0d]/80 px-6 py-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl border border-platinum/30 bg-platinum/[0.08]"><Building2 className="h-6 w-6 text-platinum" strokeWidth={1.6} /></span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-display text-2xl uppercase tracking-tight text-ivory">{data.company.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-platinum/30 bg-platinum/[0.07] px-2.5 py-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-platinum"><BadgeCheck className="h-3 w-3" strokeWidth={2} />{T('شريك', 'Partner')}</span>
              </div>
              <p className="mt-1 text-[0.78rem] text-platinum/60">{T('لوحة الشريك — أسعارك الخاصة وعمولاتك مع ABH.', 'Partner dashboard — your private pricing & commission with ABH.')}</p>
            </div>
          </div>
          <div className="text-end">
            <div className="text-[0.52rem] uppercase tracking-[0.2em] text-steel">{T('شريك منذ', 'Partner since')}</div>
            <div className="font-display text-lg text-ivory">{fmtDate(data.company.since)}</div>
          </div>
        </div>
      </div>

      {/* البطاقات المالية */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={Coins} label={T('إجمالي عمولتك', 'Your commission')} value={fmtMoney(s.commissionTotal)} ccy={ccy} accent="#cbcdcd" isAr={isAr} />
        <StatCard icon={Wallet} label={T('المُستلَم', 'Received')} value={fmtMoney(s.paidTotal)} ccy={ccy} accent="#9fd4b0" isAr={isAr} />
        <StatCard icon={Hourglass} label={T('المتبقّي لك', 'Outstanding')} value={fmtMoney(s.outstanding)} ccy={ccy} accent={s.outstanding > 0 ? '#cbcdcd' : undefined} highlight={s.outstanding > 0} isAr={isAr} />
        <StatCard icon={CalendarCheck} label={T('الحجوزات', 'Bookings')} value={String(s.bookingsCount)} isAr={isAr} />
      </div>

      {/* تبويبات — segmented ثابتة (بدون layoutId حتى لا يختفي الاسم) */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1.5 sm:grid-cols-4">
        {tabs.map(([id, label]) => {
          const on = tab === id;
          return (
            <button key={id} data-cursor="hover" onClick={() => setTab(id as any)}
              className="flex items-center justify-center rounded-xl px-3 py-3 text-center text-[0.72rem] tracking-[0.04em] transition-all duration-300"
              style={{
                color: on ? '#0c0d0e' : 'rgba(203,205,205,0.65)',
                fontWeight: on ? 600 : 500,
                background: on ? 'linear-gradient(135deg,#ffffff,#cbcdcd)' : 'transparent',
                boxShadow: on ? '0 6px 18px -8px rgba(203,205,205,0.5)' : 'none',
              }}>
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
          {tab === 'overview' && <OverviewTab data={data} T={T} ccy={ccy} isAr={isAr} onSeeServices={() => setTab('services')} />}
          {tab === 'bookings' && <BookingsTab bookings={data.bookings} T={T} ccy={ccy} isAr={isAr} fmtDate={fmtDate} />}
          {tab === 'services' && <ServicesTab services={data.services} T={T} ccy={ccy} isAr={isAr} />}
          {tab === 'payouts' && <PayoutsTab payouts={data.payouts} T={T} ccy={ccy} fmtDate={fmtDate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, ccy, accent, highlight, isAr }: { icon: React.ElementType; label: string; value: string; ccy?: string; accent?: string; highlight?: boolean; isAr?: boolean }) {
  const align = isAr ? 'right' : 'left';
  return (
    <div className="group relative overflow-hidden rounded-3xl border p-5 transition-colors duration-500"
      style={{ borderColor: highlight ? 'rgba(203,205,205,0.3)' : 'rgba(255,255,255,0.08)', background: highlight ? 'linear-gradient(155deg,rgba(203,205,205,0.08),rgba(255,255,255,0.012))' : 'rgba(255,255,255,0.02)' }}>
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-60" style={{ background: `linear-gradient(90deg,transparent,${accent || 'rgba(203,205,205,0.5)'},transparent)` }} />
      <Icon aria-hidden className="absolute end-4 top-4 h-4 w-4" strokeWidth={1.6} style={{ color: accent ? accent + 'aa' : 'rgba(203,205,205,0.3)' }} />
      <div className="font-display text-[2.1rem] leading-none tabular-nums md:text-[2.4rem]" dir="ltr" style={{ color: accent || '#fff', textAlign: align }}>{value}{ccy && <span className="text-sm text-steel"> {ccy}</span>}</div>
      <div className="mt-2.5 text-[0.55rem] uppercase tracking-[0.2em] text-steel" style={{ textAlign: align }}>{label}</div>
    </div>
  );
}

/* ─── تبويب الملخّص ─── */
function OverviewTab({ data, T, ccy, isAr, onSeeServices }: { data: Report; T: (a: string, e: string) => string; ccy: string; isAr: boolean; onSeeServices: () => void }) {
  const max = Math.max(1, ...data.monthly.map((m) => m.revenue));
  return (
    <div className="space-y-9">
      {data.monthly.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.18em] text-platinum/80"><TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} />{T('الأداء الشهري', 'Monthly performance')}</span>
            <div className="flex gap-3 text-[0.55rem] text-steel">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg,#cbcdcd,#8a8d90)' }} />{T('مبيعات', 'Sales')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#cbcdcd]" />{T('عمولة', 'Commission')}</span>
            </div>
          </div>
          <div className="flex h-36 items-end gap-2">
            {data.monthly.map((m, i) => {
              const h = Math.max(4, (m.revenue / max) * 110);
              const ch = Math.max(2, (m.commission / max) * 110);
              return (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-28 w-full max-w-[32px] items-end justify-center" title={`${m.month}: ${fmtMoney(m.revenue)} ${ccy}`}>
                    <div className="w-[68%] rounded-t" style={{ height: h, background: 'linear-gradient(180deg,#cbcdcd,#8a8d90)' }} />
                    <div className="absolute bottom-0 w-[26%] rounded-t" style={{ height: ch, insetInlineEnd: '12%', background: '#cbcdcd' }} />
                  </div>
                  <span className="text-[0.5rem] text-steel">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* أبرز الخدمات — جريد كروت بميداليات */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[0.58rem] uppercase tracking-[0.24em] text-platinum/80">{T('أبرز خدماتك', 'Your top services')}</span>
          </div>
          {data.services.length > 6 && (
            <button data-cursor="hover" onClick={onSeeServices} className="inline-flex items-center gap-1 text-[0.62rem] uppercase tracking-[0.12em] text-platinum/70 transition-colors hover:text-ivory">
              {T('عرض الكل', 'View all')}<ChevronRight className="reversible-icon h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
        {data.services.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-6 text-center text-sm text-steel">{T('لا توجد حجوزات بعد.', 'No bookings yet.')}</p>
        ) : (
          <ServiceMedalGrid services={data.services.slice(0, 6)} T={T} ccy={ccy} />
        )}
      </div>
    </div>
  );
}

/* ─── جريد كروت الخدمات بميداليات (للملخّص) ─── */
const MEDALS: Record<number, { ring: string; bg: string; text: string; label: [string, string] }> = {
  0: { ring: 'rgba(255,255,255,0.55)', bg: 'linear-gradient(135deg,#ffffff,#cbcdcd)', text: '#0c0d0e', label: ['الأول', '1st'] },
  1: { ring: 'rgba(192,197,201,0.5)', bg: 'linear-gradient(135deg,#c7ccd0,#9aa0a5)', text: '#0c0d0e', label: ['الثاني', '2nd'] },
  2: { ring: 'rgba(176,141,107,0.5)', bg: 'linear-gradient(135deg,#b08d6b,#8a6a4d)', text: '#0c0d0e', label: ['الثالث', '3rd'] },
};

function ServiceMedalGrid({ services, T, ccy }: { services: Report['services']; T: (a: string, e: string) => string; ccy: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => {
        const medal = MEDALS[i];
        return (
          <div key={i} className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-white/20">
            {medal && <span aria-hidden className="pointer-events-none absolute -end-8 -top-8 h-20 w-20 rounded-full opacity-[0.08]" style={{ background: medal.bg }} />}
            {/* رأس الكارت: الميدالية + الترتيب */}
            <div className="mb-3 flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl text-[0.82rem] font-bold tabular-nums"
                style={medal
                  ? { background: medal.bg, color: medal.text, boxShadow: `0 0 0 1px ${medal.ring}, 0 4px 14px -4px ${medal.ring}` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(203,205,205,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {i + 1}
              </span>
              {medal && (
                <span className="rounded-full border px-2.5 py-0.5 text-[0.5rem] uppercase tracking-[0.14em]"
                  style={{ borderColor: medal.ring, color: 'rgba(245,245,240,0.85)', background: 'rgba(255,255,255,0.03)' }}>
                  {T(medal.label[0], medal.label[1])}
                </span>
              )}
            </div>
            {/* اسم الخدمة */}
            <div className="mb-4 line-clamp-2 min-h-[2.4em] text-[0.92rem] leading-snug text-ivory/90">{s.name}</div>
            {/* التفاصيل — كل خلية متمركزة: العنوان فوق والرقم تحته في النص بالظبط */}
            <div className="mt-auto grid grid-cols-3 border-t border-white/[0.06] pt-3.5">
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-[0.46rem] uppercase tracking-[0.1em] text-steel">{T('مرّات', 'Booked')}</div>
                <div className="font-display text-lg leading-none tabular-nums text-ivory">{s.timesBooked}</div>
              </div>
              <div className="flex flex-col items-center gap-1.5 border-x border-white/[0.06]">
                <div className="text-[0.46rem] uppercase tracking-[0.1em] text-steel">{T('مبيعات', 'Sales')}</div>
                <div dir="ltr" className="font-display text-lg leading-none tabular-nums text-ivory">{fmtMoney(s.revenue)}</div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-[0.46rem] uppercase tracking-[0.1em] text-steel">{T('عمولة', 'Comm.')}</div>
                <div dir="ltr" className="font-display text-lg leading-none tabular-nums text-platinum">{fmtMoney(s.commission)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── تبويب الخدمات الكامل ─── */
function ServicesTab({ services, T, ccy, isAr }: { services: Report['services']; T: (a: string, e: string) => string; ccy: string; isAr: boolean }) {
  if (services.length === 0) {
    return <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-sm text-steel">{T('لا توجد حجوزات بعد.', 'No bookings yet.')}</p>;
  }
  const totalOrders = services.reduce((a, s) => a + s.timesBooked, 0);
  const totalComm = services.reduce((a, s) => a + s.commission, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label={T('عدد الخدمات', 'Services')} value={String(services.length)} icon={Layers} isAr={isAr} />
        <MiniStat label={T('إجمالي الطلبات', 'Total orders')} value={String(totalOrders)} icon={CalendarCheck} isAr={isAr} />
        <MiniStat label={T('إجمالي العمولة', 'Total comm.')} value={fmtMoney(totalComm)} ccy={ccy} accent="#cbcdcd" icon={Coins} isAr={isAr} />
      </div>
      <ServiceMedalGrid services={services} T={T} ccy={ccy} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, ccy, accent, isAr }: { icon: React.ElementType; label: string; value: string; ccy?: string; accent?: string; isAr?: boolean }) {
  const align = isAr ? 'right' : 'left';
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-[0.52rem] uppercase tracking-[0.14em] text-steel" style={{ justifyContent: 'flex-start' }}><Icon className="h-3 w-3" strokeWidth={1.7} />{label}</div>
      <div dir="ltr" className="mt-2 font-display text-xl tabular-nums" style={{ color: accent || '#f5f5f0', textAlign: align }}>{value}{ccy && <span className="text-[0.62rem] text-steel"> {ccy}</span>}</div>
    </div>
  );
}

/* ─── تبويب الحجوزات ─── */
function BookingsTab({ bookings, T, ccy, isAr, fmtDate }: { bookings: Booking[]; T: (a: string, e: string) => string; ccy: string; isAr: boolean; fmtDate: (s: string | null) => string }) {
  if (bookings.length === 0) {
    return <p className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-sm text-steel">{T('لا توجد حجوزات بعد.', 'No bookings yet.')}</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-[0.68rem] text-steel">{T('اضغط على أي حجز لعرض بنوده بالتفصيل.', 'Tap any booking to expand its line items.')}</p>
      {bookings.map((b) => <PartnerBookingRow key={b.id} b={b} T={T} ccy={ccy} isAr={isAr} fmtDate={fmtDate} />)}
    </div>
  );
}

function PartnerBookingRow({ b, T, ccy, isAr, fmtDate }: { b: Booking; T: (a: string, e: string) => string; ccy: string; isAr: boolean; fmtDate: (s: string | null) => string }) {
  const [open, setOpen] = useState(false);
  const tone: Record<string, string> = { upcoming: '#cbcdcd', active: '#cbcdcd', completed: '#9fd4b0', cancelled: '#e7b4b4' };
  const toneBg: Record<string, string> = { upcoming: 'rgba(203,205,205,.1)', active: 'rgba(203,205,205,.1)', completed: 'rgba(159,212,176,.1)', cancelled: 'rgba(231,180,180,.1)' };
  const label: Record<string, [string, string]> = { upcoming: ['قادم', 'Upcoming'], active: ['جارٍ', 'Active'], completed: ['مكتمل', 'Done'], cancelled: ['ملغي', 'Cancelled'] };
  const sl = label[b.status] || ['', ''];
  const c = tone[b.status] || '#888';

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white/[0.02] transition-colors ${open ? 'border-white/15' : 'border-white/[0.07]'}`}>
      {/* الصف الرئيسي */}
      <button data-cursor="hover" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5" style={{ textAlign: isAr ? 'right' : 'left' }}>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-platinum"><Car className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-ivory">{b.vehicle}</div>
          <div className="mt-1 flex items-center gap-2 text-[0.6rem] text-steel">
            <span dir="ltr" className="inline-flex items-center gap-1"><Hash className="h-2.5 w-2.5" strokeWidth={2} />{b.reference}</span>
            <span className="hidden sm:inline">· {fmtDate(b.date || b.createdAt)}</span>
          </div>
        </div>
        <span className="flex-none rounded-full px-2.5 py-1 text-[0.58rem] font-semibold" style={{ color: c, background: toneBg[b.status], border: `1px solid ${c}40` }}>{isAr ? sl[0] : sl[1]}</span>
        <div className="hidden flex-none sm:block" style={{ width: 96 }}>
          <div className="text-[0.5rem] uppercase tracking-[0.1em] text-steel" style={{ textAlign: isAr ? 'left' : 'right' }}>{T('الإجمالي', 'Total')}</div>
          <div dir="ltr" className="mt-0.5 font-display text-sm tabular-nums text-ivory" style={{ textAlign: isAr ? 'left' : 'right' }}>{fmtMoney(b.total)} {ccy}</div>
        </div>
        <div className="hidden flex-none sm:block" style={{ width: 78 }}>
          <div className="text-[0.5rem] uppercase tracking-[0.1em] text-steel" style={{ textAlign: isAr ? 'left' : 'right' }}>{T('عمولتك', 'Comm.')}</div>
          <div dir="ltr" className="mt-0.5 font-display text-[0.82rem] tabular-nums text-platinum" style={{ textAlign: isAr ? 'left' : 'right' }}>+{fmtMoney(b.commission)}</div>
        </div>
        <ChevronRight className={`h-4 w-4 flex-none text-steel transition-transform ${open ? 'rotate-90' : ''}`} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="border-t border-white/[0.06] bg-black/20">
          {/* بطاقات معلومات */}
          <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4">
            {b.plate && <InfoCell icon={Hash} label={T('اللوحة', 'Plate')} value={b.plate} ltr isAr={isAr} />}
            {b.branch && <InfoCell icon={MapPin} label={T('الفرع', 'Branch')} value={b.branch} isAr={isAr} />}
            {b.time && <InfoCell icon={Clock3} label={T('الوقت', 'Time')} value={b.time} ltr isAr={isAr} />}
            <InfoCell icon={CreditCard} label={T('الدفع', 'Payment')} value={b.paymentStatus} isAr={isAr} />
          </div>

          {/* جدول البنود بعناوين */}
          <div className="px-4 pb-4">
            <div className="overflow-hidden rounded-xl border border-white/[0.07]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-[0.52rem] font-normal uppercase tracking-[0.1em] text-steel" style={{ textAlign: isAr ? 'right' : 'left' }}>{T('الخدمة', 'Service')}</th>
                    <th className="px-3 py-2.5 text-center text-[0.52rem] font-normal uppercase tracking-[0.1em] text-steel">{T('الحجم', 'Size')}</th>
                    <th className="px-3 py-2.5 text-[0.52rem] font-normal uppercase tracking-[0.1em] text-steel" style={{ textAlign: isAr ? 'left' : 'right' }}>{T('السعر', 'Price')}</th>
                    <th className="px-3 py-2.5 text-[0.52rem] font-normal uppercase tracking-[0.1em] text-steel" style={{ textAlign: isAr ? 'left' : 'right' }}>{T('عمولتك', 'Comm.')}</th>
                  </tr>
                </thead>
                <tbody>
                  {b.items.map((it, idx) => (
                    <tr key={idx} className="border-t border-white/[0.05]">
                      <td className="px-3 py-2.5 text-[0.82rem] text-ivory/90">{it.name}</td>
                      <td className="px-3 py-2.5 text-center text-[0.7rem] text-steel">{it.size || '—'}</td>
                      <td className="px-3 py-2.5" style={{ textAlign: isAr ? 'left' : 'right' }}><span dir="ltr" className="font-display text-[0.82rem] tabular-nums text-platinum">{fmtMoney(it.unit)} {ccy}</span></td>
                      <td className="px-3 py-2.5" style={{ textAlign: isAr ? 'left' : 'right' }}><span dir="ltr" className="font-display text-[0.82rem] tabular-nums text-[#cbcdcd]">+{fmtMoney(it.commission)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* إجماليات */}
          <div className="flex flex-wrap gap-2.5 px-4 pb-4">
            <TotalPill label={T('إجمالي الحجز', 'Booking total')} value={`${fmtMoney(b.total)} ${ccy}`} tone="#f5f5f0" isAr={isAr} />
            <TotalPill label={T('عمولتك', 'Your commission')} value={`${fmtMoney(b.commission)} ${ccy}`} tone="#cbcdcd" isAr={isAr} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, ltr, isAr }: { icon: React.ElementType; label: string; value: string; ltr?: boolean; isAr?: boolean }) {
  const align = isAr ? 'right' : 'left';
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[0.5rem] uppercase tracking-[0.1em] text-steel" style={{ justifyContent: 'flex-start' }}><Icon className="h-3 w-3" strokeWidth={1.7} />{label}</div>
      <div dir={ltr ? 'ltr' : undefined} className="mt-1.5 truncate text-[0.8rem] text-ivory" style={{ textAlign: align, unicodeBidi: ltr ? 'plaintext' : undefined }}>{value}</div>
    </div>
  );
}

function TotalPill({ label, value, tone, isAr }: { label: string; value: string; tone: string; isAr?: boolean }) {
  const neutral = tone === '#f5f5f0';
  const align = isAr ? 'right' : 'left';
  return (
    <div className="flex-1 rounded-xl px-4 py-3" style={{ minWidth: 130, border: `1px solid ${neutral ? 'rgba(255,255,255,0.1)' : tone + '33'}`, background: neutral ? 'rgba(255,255,255,0.03)' : tone + '12' }}>
      <div className="text-[0.5rem] uppercase tracking-[0.1em] text-steel" style={{ textAlign: align }}>{label}</div>
      <div dir="ltr" className="mt-1 font-display text-base tabular-nums" style={{ color: tone, textAlign: align }}>{value}</div>
    </div>
  );
}

/* ─── تبويب الدفعات ─── */
function PayoutsTab({ payouts, T, ccy, fmtDate }: { payouts: Report['payouts']; T: (a: string, e: string) => string; ccy: string; fmtDate: (s: string | null) => string }) {
  if (payouts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/12 px-6 py-16 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.02] text-steel"><ReceiptText className="h-6 w-6" strokeWidth={1.5} /></span>
        <p className="text-sm text-steel">{T('لم تستلم أي دفعات بعد.', 'No payouts received yet.')}</p>
        <p className="mt-1 text-[0.72rem] text-steel/70">{T('ستظهر هنا كل دفعة عمولة تستلمها من ABH.', 'Every commission payout you receive from ABH will appear here.')}</p>
      </div>
    );
  }
  const total = payouts.reduce((a, p) => a + p.amount, 0);
  const last = payouts.reduce((a, p) => {
    if (!p.paidAt) return a;
    if (!a) return p.paidAt;
    return new Date(p.paidAt) > new Date(a) ? p.paidAt : a;
  }, null as string | null);

  return (
    <div className="space-y-5">
      {/* بطاقة ملخّص أنيقة */}
      <div className="relative overflow-hidden rounded-3xl border border-[#9fd4b0]/25 bg-gradient-to-br from-[#9fd4b0]/[0.1] to-[#9fd4b0]/[0.02] p-6">
        <span aria-hidden className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-[#9fd4b0]/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.18em] text-[#9fd4b0]/80"><Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />{T('إجمالي ما استلمته', 'Total received')}</div>
            <div dir="ltr" className="mt-2 font-display text-[2.6rem] leading-none tabular-nums text-[#9fd4b0]" style={{ textAlign: 'start' }}>{fmtMoney(total)} <span className="text-base text-steel">{ccy}</span></div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-[0.5rem] uppercase tracking-[0.14em] text-steel">{T('عدد الدفعات', 'Payouts')}</div>
              <div className="mt-1.5 font-display text-2xl tabular-nums text-ivory" style={{ textAlign: 'start' }}>{payouts.length}</div>
            </div>
            <div>
              <div className="text-[0.5rem] uppercase tracking-[0.14em] text-steel">{T('آخر دفعة', 'Latest')}</div>
              <div className="mt-1.5 text-sm text-ivory">{fmtDate(last)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* جريد كروت الدفعات */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {payouts.map((p, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-300 hover:border-[#9fd4b0]/25">
            <span aria-hidden className="pointer-events-none absolute -end-6 -top-6 h-16 w-16 rounded-full bg-[#9fd4b0]/[0.06]" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[#9fd4b0]/30 bg-[#9fd4b0]/[0.1] text-[#9fd4b0]"><ReceiptText className="h-5 w-5" strokeWidth={1.6} /></span>
              <span className="rounded-full border border-[#9fd4b0]/25 bg-[#9fd4b0]/[0.08] px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-[#9fd4b0]">{T('مستلَمة', 'Received')}</span>
            </div>
            <div dir="ltr" className="relative mt-4 font-display text-2xl tabular-nums text-[#9fd4b0]" style={{ textAlign: 'start' }}>{fmtMoney(p.amount)} <span className="text-sm text-steel">{ccy}</span></div>
            <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[0.7rem] text-steel">
              <span className="truncate">{p.method || T('دفعة عمولة', 'Commission payout')}{p.reference ? ` · ${p.reference}` : ''}</span>
              <span className="inline-flex flex-none items-center gap-1 text-platinum/70"><Clock3 className="h-3 w-3" strokeWidth={1.7} />{fmtDate(p.paidAt)}</span>
            </div>
            {p.proofImage && (
              <a href={p.proofImage} target="_blank" rel="noreferrer"
                 className="group/proof relative mt-3 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2 transition-colors hover:border-[#9fd4b0]/30">
                <span className="relative h-11 w-11 flex-none overflow-hidden rounded-lg border border-white/12">
                  <img src={p.proofImage} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="text-[0.66rem] text-platinum/80">{T('إثبات التحويل', 'Transfer proof')}</span>
                  <span className="inline-flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.12em] text-platinum/60 transition-colors group-hover/proof:text-[#9fd4b0]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {T('عرض', 'View')}
                  </span>
                </span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PartnerPortal;