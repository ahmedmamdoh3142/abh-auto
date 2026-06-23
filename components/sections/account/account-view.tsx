'use client';

/**
 * AccountView — the /account member dashboard for ABH Auto.
 * Path: components/sections/account/account-view.tsx  (export `AccountView`)
 *
 * تعديل نظام الشركاء: أضيف تبويب «شركتي» يظهر فقط للحسابات partner،
 * ويعرض PartnerPortal (تقرير الشركة المالي الكامل). باقي اللوحة كما هي تمامًا.
 *
 * الألوان تُجلب من جدول colors في القاعدة وتُمرَّر للعرض (بدل ملفات الترجمة).
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MyPromoCodes } from '@/components/sections/account/my-promo-codes';
import { useLocale, useTranslations } from 'next-intl';
import {
  LayoutGrid, CalendarCheck, Car, UserRound, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight, ArrowLeft, Clock, MapPin,
  ShieldCheck, CircleDot, Calendar, LogOut, CreditCard, Wallet, CalendarClock, Sparkles,
  Gauge, Hourglass, History, KeyRound, Hash, Building2,
} from 'lucide-react';

import {
  BRANDS, SERVICES, priceFor, currencyFmt, type VehicleSize,
} from '@/lib/booking-data';
import type { DbColor } from '@/lib/booking-data-db';
import { PhoneField, isValidPhone } from '@/components/shared/phone-field';
import { useAuth, type Vehicle, type BookingRecord, type BookingStatus } from '@/components/shared/auth-provider';
import { PartnerPortal } from '@/components/sections/account/partner-portal';

const EASE = [0.16, 1, 0.3, 1] as const;

const CAR_IMAGES = [
  '/images/project-1.webp', '/images/project-2.webp', '/images/project-3.webp', '/images/project-4.webp',
  '/images/project-5.webp', '/images/project-6.webp', '/images/project-7.webp', '/images/project-8.webp',
];
const COVER_IMAGE = '/images/cta-bg.webp';
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function carImg(seed: string) { return CAR_IMAGES[hash(seed || 'x') % CAR_IMAGES.length]; }
/* ─── Status palette ─── */
type StatusTone = { dot: string; glow: string; text: string; border: string; bg: string; bar: string; };
const STATUS_TONES: Record<BookingStatus, StatusTone> = {
  upcoming:  { dot: '#d9b25f', glow: 'rgba(217,178,95,0.55)',  text: '#e8d6a8', border: 'rgba(217,178,95,0.32)', bg: 'rgba(217,178,95,0.08)',  bar: 'linear-gradient(90deg,#d9b25f,#f0dca6)' },
  active:    { dot: '#e8893f', glow: 'rgba(232,137,63,0.6)',   text: '#f3c69c', border: 'rgba(232,137,63,0.34)', bg: 'rgba(232,137,63,0.09)',  bar: 'linear-gradient(90deg,#e8893f,#f6b27a)' },
  completed: { dot: '#46b98a', glow: 'rgba(70,185,138,0.5)',   text: '#a8e6cb', border: 'rgba(70,185,138,0.30)', bg: 'rgba(70,185,138,0.08)',  bar: 'linear-gradient(90deg,#46b98a,#7fe0b7)' },
  cancelled: { dot: '#c98a8a', glow: 'rgba(201,138,138,0.4)',  text: '#e7b4b4', border: 'rgba(124,26,26,0.4)',   bg: 'rgba(42,20,20,0.4)',     bar: 'linear-gradient(90deg,#7c1a1a,#c98a8a)' },
};

type SectionId = 'overview' | 'partner' | 'bookings' | 'garage' | 'profile';
type Tr = ReturnType<typeof useTranslations>;
type Mem = NonNullable<ReturnType<typeof useAuth>['member']>;

function useDbCities(isAr: boolean) {
  const [cities, setCities] = useState<{ code: string; label: string }[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/cities');
        const j = await res.json();
        if (alive && j?.ok && Array.isArray(j.cities) && j.cities.length) {
          setCities(j.cities.map((c: any) => ({
            code: c.code,
            label: (isAr ? c.name?.ar : c.name?.en) || c.name?.ar || c.name?.en || c.code,
          })));
        }
      } catch { /* fallback handled by caller */ }
    })();
    return () => { alive = false; };
  }, [isAr]);
  return cities;
}

export function AccountView({ colors = [] }: { colors?: DbColor[] }) {
  const t = useTranslations('account');
  const tb = useTranslations('booking');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { member, hydrated } = useAuth();

  const isPartner = String(member?.role ?? '') === 'partner';
  const [section, setSection] = useState<SectionId>('overview');
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !member) router.replace('/login?redirect=/account');
  }, [hydrated, member, router]);

  // الشركة تبدأ على تبويب «شركتي»
  useEffect(() => { if (isPartner) setSection('partner'); }, [isPartner]);

  if (!hydrated || !member) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-platinum" />
      </main>
    );
  }

  const detail = detailId ? member.bookings.find((b) => b.id === detailId) ?? null : null;

  return (
    <main className="relative">
      <AccountHero t={t} member={member} />
      <SectionNav t={t} locale={locale} section={section} setSection={setSection} isPartner={isPartner} />

      <section className="relative pb-28 pt-12 md:pt-14">
        <div className="container">
          <div className="grid grid-cols-1 [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-w-0">
          <AnimatePresence initial={false}>
            <motion.div key={section}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {section === 'overview' && <Overview t={t} tb={tb} isAr={isAr} member={member} colors={colors} onGo={setSection} onOpen={setDetailId} />}
              {section === 'partner' && <PartnerPortal />}
              {section === 'bookings' && <Bookings t={t} tb={tb} isAr={isAr} member={member} onOpen={setDetailId} />}
              {section === 'garage' && <Garage t={t} tb={tb} member={member} colors={colors} />}
              {section === 'profile' && <Profile t={t} tb={tb} isAr={isAr} member={member} />}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {detail && <BookingDetailModal t={t} tb={tb} isAr={isAr} booking={detail} onClose={() => setDetailId(null)} />}
      </AnimatePresence>
    </main>
  );
}

/* ─── Hero ─── */
function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!run || reduce) { setN(target); return; }
    let raf = 0; const start = performance.now(); const dur = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduce]);
  return n;
}

function AccountHero({ t, member }: { t: Tr; member: Mem }) {
  const since = new Date(member.since).getFullYear();
  const upcoming = member.bookings.filter((b) => b.status === 'upcoming' || b.status === 'active').length;
  const reduce = useReducedMotion();
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({ id: i, left: (i * 61) % 100, top: ((i * 29) % 70) + 10, delay: (i % 6) * 0.6, duration: 6 + (i % 4) })),
    [],
  );
  const stats = [
    { label: t('stats.vehicles'), value: member.vehicles.length, count: true, icon: Car },
    { label: t('stats.upcoming'), value: upcoming, count: true, icon: Hourglass },
    { label: t('stats.visits'), value: member.bookings.filter((b) => b.status === 'completed').length, count: true, icon: History },
    { label: t('stats.since'), value: since, count: false, icon: ShieldCheck },
  ];

  return (
    <section className="relative isolate overflow-hidden pb-12 pt-32 md:pb-16 md:pt-40">
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${COVER_IMAGE}')`, filter: 'grayscale(0.7) brightness(0.36) contrast(1.08)' }} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/90 via-obsidian/74 to-obsidian" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {!reduce && particles.map((p) => (
          <motion.span key={p.id} className="absolute h-0.5 w-0.5 rounded-full bg-platinum/40"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ opacity: [0, 0.7, 0], y: [10, -46, -92] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: 'easeOut', delay: p.delay }} />
        ))}
        <div className="glow-orb h-[30rem] w-[30rem] -left-40 -top-24 bg-platinum/[0.06]" />
      </div>

      <div className="container">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <Monogram name={member.name} size={74} ring />
            <div>
              <div className="flex items-center gap-3 text-[0.58rem] uppercase tracking-[0.34em] text-platinum/70">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-platinum/60" />{t('hero.eyebrow')}
              </div>
              <h1 className="mt-2.5 font-display text-[clamp(2.1rem,5.5vw,3.6rem)] font-light uppercase leading-[0.95] tracking-tight text-ivory">
                {t('hero.greeting')}, <span className="text-platinum">{member.name.split(' ')[0]}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-start rounded-full border border-platinum/25 bg-platinum/[0.05] px-4 py-2 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-platinum" strokeWidth={1.6} />
            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-platinum/85">{t('hero.memberSince', { year: since })}</span>
          </div>
        </motion.div>

        <motion.div initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}
          className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s, i) => <StatTile key={s.label} {...s} index={i} />)}
        </motion.div>
      </div>
    </section>
  );
}

function StatTile({ label, value, count, icon: Icon, index }: { label: string; value: number; count: boolean; icon: React.ElementType; index: number }) {
  const [run, setRun] = useState(false);
  useEffect(() => { const id = setTimeout(() => setRun(true), 250 + index * 90); return () => clearTimeout(id); }, [index]);
  const shown = useCountUp(value, count && run);
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.55, ease: EASE }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-500 hover:border-white/[0.16]">
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-platinum/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <Icon aria-hidden className="absolute end-4 top-4 h-4 w-4 text-platinum/25 transition-colors duration-500 group-hover:text-platinum/45" strokeWidth={1.6} />
      <div className="font-display text-[2.4rem] leading-none tabular-nums text-ivory md:text-[2.7rem]">{count ? shown : value}</div>
      <div className="mt-2.5 text-[0.55rem] uppercase tracking-[0.22em] text-steel">{label}</div>
    </motion.div>
  );
}

/* ─── Top nav ─── */
function SectionNav({ t, locale, section, setSection, isPartner }: { t: Tr; locale: string; section: SectionId; setSection: (s: SectionId) => void; isPartner?: boolean }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const items: { id: SectionId; icon: React.ElementType }[] = [
    { id: 'overview', icon: LayoutGrid },
    ...(isPartner ? [{ id: 'partner' as SectionId, icon: Building2 }] : []),
    { id: 'bookings', icon: CalendarCheck },
    { id: 'garage', icon: Car }, { id: 'profile', icon: UserRound },
  ];
  const navLabel = (id: SectionId) => id === 'partner' ? (locale === 'ar' ? 'شركتي' : 'My company') : t(`nav.${id}`);
  return (
    <div className="sticky top-[84px] z-30 border-y border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
      <div className="container">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 overflow-x-auto py-3">
            {items.map(({ id, icon: Icon }) => {
              const on = section === id;
              return (
                <button key={id} data-cursor="hover" onClick={() => setSection(id)}
                  className="relative flex flex-none items-center gap-2.5 rounded-full px-4 py-2.5 transition-colors duration-300">
                  {on && <motion.span layoutId="acct-pill" aria-hidden className="absolute inset-0 -z-10 rounded-full border border-white/[0.1] bg-white/[0.06]" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <Icon className={`reversible-icon h-[16px] w-[16px] ${on ? 'text-ivory' : 'text-platinum/55'}`} strokeWidth={1.7} />
                  <span className={`whitespace-nowrap text-[0.68rem] uppercase tracking-[0.16em] ${on ? 'text-ivory' : 'text-platinum/60'}`}>{navLabel(id)}</span>
                </button>
              );
            })}
          </div>
          <button data-cursor="hover" onClick={() => { signOut(); router.push('/'); }}
            className="hidden flex-none items-center gap-2 rounded-full px-4 py-2.5 text-[0.66rem] uppercase tracking-[0.16em] text-platinum/55 transition-colors hover:text-[#e7b4b4] sm:flex">
            <LogOut className="reversible-icon h-4 w-4" strokeWidth={1.7} />{t('nav.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Overview ─── */
function Overview({ t, tb, isAr, member, colors, onGo, onOpen }: { t: Tr; tb: Tr; isAr: boolean; member: Mem; colors: DbColor[]; onGo: (s: SectionId) => void; onOpen: (id: string) => void }) {
  const next = useMemo(() => {
    const live = member.bookings.filter((b) => b.status === 'upcoming' || b.status === 'active');
    return live.sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null;
  }, [member.bookings]);
  const recent = member.bookings.filter((b) => b.status === 'completed').slice(0, 2);

  return (
    <div className="space-y-12">
      <MyPromoCodes />
      <div className="space-y-5">
        <SubHead>{t('overview.nextTitle')}</SubHead>
        {next ? <NextAppointment t={t} tb={tb} isAr={isAr} b={next} onOpen={onOpen} />
          : <EmptyCard icon={Calendar} title={t('overview.noUpcoming')} cta={t('overview.book')} href="/booking" />}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <SubHead>{t('overview.garageTitle')}</SubHead>
          <NavLink onClick={() => onGo('garage')}>{t('overview.manageGarage')}</NavLink>
        </div>
        {member.vehicles.length ? (
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
            {member.vehicles.map((v) => <div key={v.id} className="w-[280px] flex-none snap-start"><VehicleCard t={t} v={v} colors={colors} compact /></div>)}
            <button data-cursor="hover" onClick={() => onGo('garage')}
              className="group grid w-[200px] flex-none snap-start place-items-center rounded-[24px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]">
              <span className="flex flex-col items-center gap-2.5 text-platinum/55 transition-colors group-hover:text-platinum">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.03]"><Plus className="h-5 w-5" strokeWidth={1.8} /></span>
                <span className="text-[0.6rem] uppercase tracking-[0.16em]">{t('garage.addVehicle')}</span>
              </span>
            </button>
          </div>
        ) : <EmptyCard icon={Car} title={t('garage.empty')} cta={t('garage.addVehicle')} onClick={() => onGo('garage')} />}
      </div>

      {recent.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <SubHead>{t('overview.recentTitle')}</SubHead>
            <NavLink onClick={() => onGo('bookings')}>{t('overview.viewAll')}</NavLink>
          </div>
          <div className="space-y-4">{recent.map((b) => <BookingCard key={b.id} t={t} tb={tb} isAr={isAr} b={b} onOpen={onOpen} compact />)}</div>
        </div>
      )}
    </div>
  );
}

function NextAppointment({ t, tb, isAr, b, onOpen }: { t: Tr; tb: Tr; isAr: boolean; b: BookingRecord; onOpen: (id: string) => void }) {
  const days = daysUntil(b.date);
  const tone = STATUS_TONES[b.status];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="group relative overflow-hidden rounded-[28px] border border-white/[0.1]">
      <div aria-hidden className="absolute inset-0 scale-[1.04] bg-cover bg-center transition-[transform,filter] duration-[1200ms] ease-out group-hover:scale-[1.1] group-hover:grayscale-0"
        style={{ backgroundImage: `url('${carImg(b.plate || b.id)}')`, filter: 'grayscale(0.55) brightness(0.5) contrast(1.05)' }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/75 to-[#050608]/30" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: tone.bar, opacity: 0.9 }} />
      <div aria-hidden className="pointer-events-none absolute -inset-x-10 -top-20 h-40 blur-3xl" style={{ background: `radial-gradient(closest-side, ${tone.glow}, transparent)`, opacity: 0.5 }} />

      <div className="relative p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5"><StatusChip t={t} status={b.status} /><PaymentChip t={t} branch={b.payment === 'branch'} /></div>
            <h3 className="mt-4 break-words font-display text-3xl uppercase leading-none text-ivory md:text-[2.6rem]">{b.vehicleLabel}</h3>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <MetaChip icon={MapPin}>{tb(`branches.${b.branchKey}`)}</MetaChip>
              <MetaChip icon={Clock}>{fmtDate(b.date, isAr)} · {b.time}</MetaChip>
            </div>
          </div>
          {days !== null && days >= 0 && b.status === 'upcoming' && (
            <div className="rounded-3xl border border-white/12 bg-obsidian/40 px-6 py-4 text-center backdrop-blur-sm">
              <div className="font-display text-5xl leading-none text-ivory tabular-nums">{days}</div>
              <div className="mt-1.5 text-[0.52rem] uppercase tracking-[0.22em] text-platinum/70">{days === 0 ? t('overview.today') : t('overview.daysAway')}</div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {b.serviceSnapshots?.map((snap: any, idx: number) => (
            <ServiceChip key={idx}>{snap?.[isAr ? 'ar' : 'en'] || b.serviceSlugs[idx]}</ServiceChip>
          ))}
        </div>

        {b.status === 'active' && <ServiceRail t={t} stage={b.stage ?? 0} />}

        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <div>
            <div className="text-[0.52rem] uppercase tracking-[0.24em] text-steel">{t('bookings.total')}</div>
            <div dir="ltr" className="mt-1 font-display text-2xl text-ivory tabular-nums">{fmtMoney(b.total)} <span className="text-sm text-platinum/70">{tb('currency')}</span></div>
          </div>
          <button data-cursor="hover" onClick={() => onOpen(b.id)}><Pill>{t('bookings.viewDetails')}</Pill></button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Bookings ─── */
function Bookings({ t, tb, isAr, member, onOpen }: { t: Tr; tb: Tr; isAr: boolean; member: Mem; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<'live' | 'past'>('live');
  const live = member.bookings.filter((b) => b.status === 'upcoming' || b.status === 'active').sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = member.bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled').sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const tabs: { id: 'live' | 'past'; label: string; count: number }[] = [
    { id: 'live', label: t('bookings.tabLive'), count: live.length },
    { id: 'past', label: t('bookings.tabPast'), count: past.length },
  ];
  const list = tab === 'live' ? live : past;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative inline-grid grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
          {tabs.map((it) => {
            const on = tab === it.id;
            return (
              <button key={it.id} data-cursor="hover" onClick={() => setTab(it.id)} className="relative z-10 rounded-full px-5 py-2.5 text-[0.62rem] uppercase tracking-[0.16em] transition-colors duration-300">
                {on && <motion.span layoutId="bk-tab" aria-hidden className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-white to-platinum shadow-[0_10px_30px_-12px_rgba(203,205,205,0.6)]" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <span className={on ? 'text-obsidian' : 'text-platinum/70'}>{it.label}<span className={`ms-1.5 ${on ? 'text-obsidian/60' : 'text-steel'}`}>{it.count}</span></span>
              </button>
            );
          })}
        </div>
        <Link href="/booking" data-cursor="hover" className="hidden sm:block"><Pill>{t('bookings.newBooking')}</Pill></Link>
      </div>

      <AnimatePresence initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0
            ? <div className="col-span-full"><EmptyCard icon={tab === 'live' ? Calendar : CalendarCheck} title={tab === 'live' ? t('bookings.emptyLive') : t('bookings.emptyPast')} cta={t('bookings.newBooking')} href="/booking" /></div>
            : list.map((b) => <BookingGridCard key={b.id} t={t} tb={tb} isAr={isAr} b={b} onOpen={onOpen} />)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BookingGridCard({ t, tb, isAr, b, onOpen }: { t: Tr; tb: Tr; isAr: boolean; b: BookingRecord; onOpen: (id: string) => void }) {
  const isActive = b.status === 'active';
  const isPast = b.status === 'completed' || b.status === 'cancelled';
  const stage = b.stage ?? 0;
  const tone = STATUS_TONES[b.status];
  const stageSteps = [t('bookings.stages.received'), t('bookings.stages.inService'), t('bookings.stages.quality'), t('bookings.stages.ready')];
  const currentStageLabel = stageSteps[stage] || stageSteps[0];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} whileHover={{ y: -4 }}
      className="group relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-obsidian/20 transition-all duration-500 hover:border-white/25 hover:shadow-2xl">
      <div className="absolute inset-0">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-105" style={{ backgroundImage: `url('${carImg(b.plate || b.id)}')`, filter: 'brightness(0.95) contrast(1.05)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/30 via-obsidian/60 to-obsidian/20" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-20 w-[3px]" style={{ background: tone.bar, opacity: 0.85 }} />
      <div className="relative z-10 flex flex-1 flex-col p-5 md:p-6 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <StatusChip t={t} status={b.status} />
            {b.status !== 'cancelled' && <PaymentChip t={t} branch={b.payment === 'branch'} />}
          </div>
          <div className="text-end">
            <div className="text-[0.5rem] uppercase tracking-[0.2em] text-steel">{t('bookings.total')}</div>
            <div dir="ltr" className="font-display text-xl tabular-nums text-ivory md:text-2xl">{fmtMoney(b.total)} <span className="text-xs text-platinum/70">{tb('currency')}</span></div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="mt-auto space-y-3">
          <div>
            <h3 className="font-display text-2xl uppercase leading-tight text-ivory md:text-3xl">{b.vehicleLabel}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-platinum/90">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.6} />{tb(`branches.${b.branchKey}`)}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.6} />{fmtDate(b.date, isAr)} · {b.time}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {b.serviceSnapshots?.slice(0, 2).map((snap: any, idx: number) => (
              <span key={idx} className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[0.6rem] tracking-wide text-platinum/90">{snap?.[isAr ? 'ar' : 'en'] || b.serviceSlugs[idx]}</span>
            ))}
            {b.serviceSnapshots && b.serviceSnapshots.length > 2 && (
              <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[0.6rem] tracking-wide text-platinum/90">+{b.serviceSnapshots.length - 2}</span>
            )}
          </div>
          {isActive && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[0.55rem] uppercase tracking-[0.14em]">
                <span style={{ color: tone.text }}>{t('bookings.inProgress')}</span>
                <span className="text-steel">{stage + 1}/{stageSteps.length}</span>
              </div>
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/15">
                <motion.div className="absolute left-0 top-0 h-full" style={{ background: tone.bar }} initial={{ width: 0 }} animate={{ width: `${((stage + 1) / stageSteps.length) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
              </div>
              <div className="mt-1 text-right text-[0.5rem] uppercase tracking-[0.1em] text-platinum/80">{currentStageLabel}</div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            {isPast ? (
              <Link href="/booking" data-cursor="hover" className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-platinum/90 transition-colors hover:bg-black/50">{t('bookings.rebook')}</Link>
            ) : (<div />)}
            <button data-cursor="hover" onClick={() => onOpen(b.id)} className="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-platinum/90 transition-all duration-300 hover:text-ivory">
              {t('bookings.viewDetails')}<ArrowUpRight className="reversible-icon h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BookingCard({ t, tb, isAr, b, onOpen, compact }: { t: Tr; tb: Tr; isAr: boolean; b: BookingRecord; onOpen: (id: string) => void; compact?: boolean }) {
  const isActive = b.status === 'active';
  const tone = STATUS_TONES[b.status];
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={['group relative overflow-hidden rounded-[24px] border bg-white/[0.02] transition-colors duration-300', isActive ? 'border-platinum/25' : 'border-white/[0.08] hover:border-white/15'].join(' ')}>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-[3px]" style={{ background: tone.bar, opacity: 0.8 }} />
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-32 w-full flex-none overflow-hidden sm:h-auto sm:w-44">
          <div aria-hidden className="absolute inset-0 bg-cover bg-center transition-[transform,filter] duration-[1200ms] ease-out group-hover:scale-105 group-hover:grayscale-0" style={{ backgroundImage: `url('${carImg(b.plate || b.id)}')`, filter: 'grayscale(0.6) brightness(0.55)' }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/70 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-obsidian/80" />
        </div>
        <div className="flex-1 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusChip t={t} status={b.status} />
                {b.status !== 'cancelled' && <PaymentChip t={t} branch={b.payment === 'branch'} />}
                <span dir="ltr" className="font-display text-sm tracking-[0.14em] text-platinum/70">{b.id}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl uppercase leading-none text-ivory">{b.vehicleLabel}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.serviceSnapshots?.map((snap: any, idx: number) => (<ServiceChip key={idx}>{snap?.[isAr ? 'ar' : 'en'] || b.serviceSlugs[idx]}</ServiceChip>))}
              </div>
              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.74rem] text-platinum/60">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-platinum/50" strokeWidth={1.7} />{tb(`branches.${b.branchKey}`)}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-platinum/50" strokeWidth={1.7} />{fmtDate(b.date, isAr)} · {b.time}</span>
              </div>
            </div>
            <div className="text-end">
              <div className="text-[0.5rem] uppercase tracking-[0.22em] text-steel">{t('bookings.total')}</div>
              <div dir="ltr" className="mt-1 font-display text-xl text-ivory tabular-nums">{fmtMoney(b.total)}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.16em] text-platinum/60">{tb('currency')}</div>
            </div>
          </div>
          {isActive && <ServiceRail t={t} stage={b.stage ?? 0} />}
          {!compact && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
              {(b.status === 'completed' || b.status === 'cancelled') && <Link href="/booking" data-cursor="hover"><GhostMini>{t('bookings.rebook')}</GhostMini></Link>}
              <button data-cursor="hover" onClick={() => onOpen(b.id)} className="ms-auto inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-platinum/70 transition-colors hover:text-ivory">
                {t('bookings.viewDetails')}<ArrowUpRight className="reversible-icon h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ServiceRail({ t, stage }: { t: Tr; stage: number }) {
  const steps = [t('bookings.stages.received'), t('bookings.stages.inService'), t('bookings.stages.quality'), t('bookings.stages.ready')];
  const tone = STATUS_TONES.active;
  return (
    <div className="mt-5 rounded-2xl border border-white/[0.07] bg-obsidian/50 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.2em]" style={{ color: tone.text }}>
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: tone.dot }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} /></span>
        {t('bookings.inProgress')}
      </div>
      <div className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-0 top-[11px] h-px bg-white/10" />
        <motion.span aria-hidden className="absolute top-[11px] h-px" style={{ insetInlineStart: 0, background: tone.bar }} initial={false} animate={{ width: `${(stage / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} />
        {steps.map((s, i) => {
          const done = i < stage; const active = i === stage;
          const dotStyle: React.CSSProperties | undefined = active ? { borderColor: 'transparent', background: tone.bar, color: '#1a1208' } : done ? { borderColor: tone.border, background: tone.bg, color: tone.text } : undefined;
          const labelStyle: React.CSSProperties | undefined = active ? { color: '#f5f5f0' } : done ? { color: tone.text } : undefined;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
              <span style={dotStyle} className={`grid h-6 w-6 place-items-center rounded-full border text-[0.5rem] transition-all duration-500 ${active || done ? '' : 'border-white/12 bg-white/[0.03] text-steel'}`}>
                {done ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <CircleDot className="h-3 w-3" strokeWidth={2} />}
              </span>
              <span style={labelStyle} className={`max-w-[6rem] text-center text-[0.5rem] uppercase tracking-[0.12em] ${active || done ? '' : 'text-steel'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Booking detail drawer ─── */
function BookingDetailModal({ t, tb, isAr, booking, onClose }: { t: Tr; tb: Tr; isAr: boolean; booking: BookingRecord; onClose: () => void }) {
  const { updateBooking, cancelBooking } = useAuth();
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view');
  const [cancelReason, setCancelReason] = useState('');
  const editable = booking.status === 'upcoming';
  const size = (booking.size ?? 'large') as VehicleSize;
  const tone = STATUS_TONES[booking.status];

  return (
    <Modal onClose={onClose} title={t('bookings.detail.title')} wide>
      <AnimatePresence mode="wait">
        {mode === 'view' && (
          <motion.div key="view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
            <div className="relative -mx-6 -mt-2 mb-6 h-40 overflow-hidden md:-mx-8 md:h-48">
              <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${carImg(booking.plate || booking.id)}')`, filter: 'grayscale(0.5) brightness(0.55)' }} />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0c0d0e] via-[#0c0d0e]/40 to-transparent" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: tone.bar, opacity: 0.9 }} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 md:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><StatusChip t={t} status={booking.status} /><PaymentChip t={t} branch={booking.payment === 'branch'} /></div>
                  <h3 className="mt-2.5 font-display text-2xl uppercase leading-none text-ivory md:text-3xl">{booking.vehicleLabel}</h3>
                </div>
                {booking.plate && <LicensePlate text={booking.plate} />}
              </div>
            </div>

            {booking.status === 'active' && <div className="mb-6"><ServiceRail t={t} stage={booking.stage ?? 0} /></div>}

            <div className="space-y-2.5">
              <DetailRow k={t('bookings.detail.reference')} mono>{booking.id}</DetailRow>
              <DetailRow k={t('bookings.detail.dateTime')}>{fmtDate(booking.date, isAr)} · {booking.time}</DetailRow>
              <DetailRow k={t('bookings.detail.branch')}>{tb(`branches.${booking.branchKey}`)}</DetailRow>
              <DetailRow k={t('bookings.detail.payment')}>{booking.payment === 'branch' ? t('bookings.payAtBranch') : t('bookings.paid')}</DetailRow>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-[0.58rem] uppercase tracking-[0.24em] text-platinum/70">{t('bookings.detail.services')}</div>
              <div className="space-y-2">
                {booking.serviceSnapshots?.map((snap: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                    <span className="inline-flex items-center gap-2.5 text-sm text-ivory/90"><Sparkles className="h-3.5 w-3.5 text-platinum/60" strokeWidth={1.6} />{snap?.[isAr ? 'ar' : 'en'] || booking.serviceSlugs[idx]}</span>
                    <span dir="ltr" className="font-display text-sm text-platinum tabular-nums">
                      {(() => {
                        const meta = SERVICES.find((x) => x.slug === booking.serviceSlugs[idx]);
                        return meta && !meta.onRequest ? currencyFmt(priceFor(meta, size)) : tb('onRequest');
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between rounded-2xl border border-platinum/20 bg-platinum/[0.05] px-5 py-4">
              <span className="text-[0.58rem] uppercase tracking-[0.24em] text-platinum/80">{t('bookings.detail.total')}</span>
              <span dir="ltr" className="font-display text-3xl text-ivory tabular-nums">{fmtMoney(booking.total)} <span className="text-base text-platinum/70">{tb('currency')}</span></span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {editable && <button data-cursor="hover" onClick={() => setMode('reschedule')}><GhostMini><CalendarClock className="h-3.5 w-3.5" strokeWidth={1.8} />{t('bookings.reschedule')}</GhostMini></button>}
              {editable && (
                <button data-cursor="hover" onClick={() => setMode('cancel')}
                  className="ms-auto inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-platinum/55 transition-colors hover:border-[#7c1a1a]/50 hover:text-[#e7b4b4]">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />{t('bookings.cancel')}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'reschedule' && (
          <motion.div key="resched" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease: EASE }}>
            <ReschedulePanel t={t} tb={tb} isAr={isAr} booking={booking}
              onBack={() => setMode('view')}
              onSave={async (date, time) => { await updateBooking(booking.id, { date, time }); setMode('view'); }} />
          </motion.div>
        )}

        {mode === 'cancel' && (
          <motion.div key="cancel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="py-4 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#7c1a1a]/40 bg-[#2a1414]/40 text-[#e7b4b4]"><Trash2 className="h-7 w-7" strokeWidth={1.5} /></span>
            <h3 className="mt-5 font-display text-2xl font-light uppercase tracking-tight text-ivory">{t('bookings.cancelTitle')}</h3>
            <p className="mx-auto mt-3 max-w-[38ch] text-sm leading-relaxed text-platinum/65">{t('bookings.cancelConfirm', { vehicle: booking.vehicleLabel, date: fmtDate(booking.date, isAr) })}</p>
            <div className="mx-auto mt-5 max-w-[42ch] text-start">
              <label className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-platinum/70">
                {isAr ? 'سبب الإلغاء *' : 'Cancellation reason *'}
              </label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3}
                placeholder={isAr ? 'مثال: تغيّرت ظروفي / غيّرت رأيي…' : 'e.g. plans changed…'}
                className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-ivory outline-none transition-colors focus:border-platinum/50" />
              {!cancelReason.trim() && <p className="mt-2 text-[0.66rem] text-[#c98a8a]">{isAr ? 'لازم تكتب السبب قبل التأكيد.' : 'Please enter a reason.'}</p>}
            </div>
            <div className="mt-7 flex items-center justify-center gap-3">
              <button data-cursor="hover" onClick={() => setMode('view')}><GhostMini>{t('bookings.keep')}</GhostMini></button>
              <button data-cursor="hover"
                disabled={!cancelReason.trim()}
                onClick={async () => { await cancelBooking(booking.id, cancelReason.trim()); onClose(); }}
                className={`inline-flex items-center gap-2 rounded-full border border-[#7c1a1a]/50 bg-[#2a1414]/50 px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#e7b4b4] transition-colors hover:bg-[#2a1414]/80 ${cancelReason.trim() ? '' : 'pointer-events-none opacity-40'}`}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />{t('bookings.confirmCancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function DetailRow({ k, children, mono }: { k: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-2.5 text-sm">
      <span className="text-[0.62rem] uppercase tracking-[0.16em] text-platinum/55">{k}</span>
      <span dir={mono ? 'ltr' : undefined} className={`text-end text-ivory/90 ${mono ? 'font-display tracking-[0.12em]' : ''}`}>{children}</span>
    </div>
  );
}

function ReschedulePanel({ t, tb, isAr, booking, onBack, onSave }: { t: Tr; tb: Tr; isAr: boolean; booking: BookingRecord; onBack: () => void; onSave: (date: string, time: string) => Promise<void> }) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!date || !time) return;
    setSaving(true);
    try { await onSave(date, time); } finally { setSaving(false); }
  };
  return (
    <div>
      <PanelHead onBack={onBack} title={t('bookings.rescheduleTitle')} sub={t('bookings.rescheduleHint')} />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <MiniCalendar isAr={isAr} value={date} onPick={setDate} />
        <div>
          <div className="mb-3 text-[0.58rem] uppercase tracking-[0.24em] text-platinum/70">{t('bookings.pickTime')}</div>
          <TimeGrid tb={tb} value={time} onPick={setTime} />
        </div>
      </div>
      <div className="mt-7 flex items-center justify-end gap-3">
        <button data-cursor="hover" onClick={onBack}><GhostMini>{t('garage.cancel')}</GhostMini></button>
        <button data-cursor="hover" onClick={handleSave} disabled={!date || !time || saving} className={date && time && !saving ? '' : 'pointer-events-none opacity-40'}>
          <Pill>{saving ? t('bookings.saving') : t('bookings.saveReschedule')}</Pill>
        </button>
      </div>
    </div>
  );
}

function PanelHead({ onBack, title, sub }: { onBack: () => void; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <button data-cursor="hover" onClick={onBack} aria-label="Back" className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory"><ArrowLeft className="reversible-icon h-4 w-4" strokeWidth={1.8} /></button>
      <div>
        <h3 className="font-display text-xl font-light uppercase tracking-tight text-ivory md:text-2xl">{title}</h3>
        <p className="mt-1.5 text-sm text-platinum/60">{sub}</p>
      </div>
    </div>
  );
}

function MiniCalendar({ isAr, value, onPick }: { isAr: boolean; value: string; onPick: (iso: string) => void }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const init = value ? new Date(value) : today;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const { y, m } = view;
  const startDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());
  const monthLabel = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1));
  const dow = useMemo(() => {
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { weekday: 'narrow' }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
  }, [isAr]);
  const nav = (dir: number) => { let nm = m + dir, ny = y; if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; } if (ny < today.getFullYear() || (ny === today.getFullYear() && nm < today.getMonth())) return; setView({ y: ny, m: nm }); };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDow; i++) cells.push(<span key={`e${i}`} />);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const past = date < today; const sel = value === iso; const isToday = date.getTime() === today.getTime();
    cells.push(
      <button key={iso} type="button" disabled={past} data-cursor={past ? undefined : 'hover'} onClick={past ? undefined : () => onPick(iso)}
        className={['grid aspect-square place-items-center rounded-[10px] border font-display text-[0.9rem] tabular-nums transition-all duration-200',
          past ? 'cursor-not-allowed border-transparent text-steel/35 line-through decoration-steel/30'
            : sel ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian'
              : 'border-transparent text-ivory/85 hover:border-white/20 hover:bg-white/[0.05]',
          isToday && !sel ? 'shadow-[inset_0_0_0_1px_rgba(203,205,205,0.3)]' : ''].join(' ')}>{d}</button>,
    );
  }

  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" data-cursor="hover" disabled={prevDisabled} onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-platinum transition-all duration-300 hover:border-white/30 hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="reversible-icon h-3.5 w-3.5" /></button>
        <span className="font-display text-base tracking-[0.02em] text-ivory">{monthLabel}</span>
        <button type="button" data-cursor="hover" onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-platinum transition-all duration-300 hover:border-white/30 hover:text-ivory"><ChevronRight className="reversible-icon h-3.5 w-3.5" /></button>
      </div>
      <div className="mb-1.5 grid grid-cols-7 gap-1">{dow.map((d, i) => <span key={i} className="text-center text-[0.5rem] uppercase tracking-[0.1em] text-steel">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  );
}

function TimeGrid({ tb, value, onPick }: { tb: Tr; value: string; onPick: (t: string) => void }) {
  const groups = [
    { label: tb('step3.morning'), slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
    { label: tb('step3.afternoon'), slots: ['12:00', '12:30', '13:00', '14:00', '15:00', '16:00'] },
    { label: tb('step3.evening'), slots: ['17:00', '18:00', '19:00', '20:00', '21:00', '21:30'] },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-2 text-[0.52rem] uppercase tracking-[0.18em] text-steel">{g.label}</div>
          <div className="grid grid-cols-3 gap-2">
            {g.slots.map((s) => {
              const on = value === s;
              return (
                <button key={s} type="button" data-cursor="hover" dir="ltr" onClick={() => onPick(s)}
                  className={['rounded-xl border py-2.5 text-center font-display text-sm tabular-nums transition-all duration-200', on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/12 bg-white/[0.02] text-ivory/85 hover:border-white/25'].join(' ')}>{s}</button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Garage ─── */
function Garage({ t, tb, member, colors }: { t: Tr; tb: Tr; member: Mem; colors: DbColor[] }) {
  const { removeVehicle } = useAuth();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Vehicle | null>(null);

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-light uppercase tracking-tight text-ivory md:text-3xl">{t('garage.title')}</h2>
          <p className="mt-2 max-w-[44ch] text-sm text-platinum/60">{t('garage.subtitle')}</p>
        </div>
        <button data-cursor="hover" onClick={() => setAdding(true)} className="hidden sm:block"><Pill icon={Plus}>{t('garage.addVehicle')}</Pill></button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {member.vehicles.map((v) => <VehicleCard key={v.id} t={t} v={v} colors={colors} onEdit={() => setEditing(v)} onRemove={() => setConfirm(v)} />)}
        <button data-cursor="hover" onClick={() => setAdding(true)}
          className="group grid min-h-[230px] place-items-center rounded-[26px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]">
          <span className="flex flex-col items-center gap-3 text-platinum/55 transition-colors group-hover:text-platinum">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/12 bg-white/[0.03]"><Plus className="h-5 w-5" strokeWidth={1.8} /></span>
            <span className="text-[0.62rem] uppercase tracking-[0.18em]">{t('garage.addVehicle')}</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {(adding || editing) && <VehicleModal t={t} vehicle={editing} colors={colors} onClose={() => { setAdding(false); setEditing(null); }} />}
        {confirm && <ConfirmDialog t={t} vehicle={confirm} onCancel={() => setConfirm(null)} onConfirm={() => { removeVehicle(confirm.id); setConfirm(null); }} />}
      </AnimatePresence>
    </div>
  );
}

function VehicleCard({ t, v, colors, onEdit, onRemove, compact }: { t: Tr; v: Vehicle; colors: DbColor[]; onEdit?: () => void; onRemove?: () => void; compact?: boolean }) {
  const brand = BRANDS.find((b: any) => b.id === v.brandId);
  const color = colors.find((c) => c.key === v.colorKey);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={`group relative overflow-hidden rounded-[26px] border border-white/[0.08] transition-colors duration-300 hover:border-white/20 ${compact ? 'h-[200px]' : 'h-[260px]'}`}>
      <div aria-hidden className="absolute inset-0 scale-[1.04] bg-cover bg-center transition-[transform,filter] duration-[1400ms] ease-out group-hover:scale-[1.1] group-hover:grayscale-0"
        style={{ backgroundImage: `url('${carImg(v.id || v.plate)}')`, filter: 'grayscale(0.6) brightness(0.6) contrast(1.05)' }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/45 to-obsidian/10" />

      <div className="relative flex items-start justify-between p-5">
        {color && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-obsidian/50 px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.14em] text-platinum/90 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }} />{color.name}
          </span>
        )}
        {(onEdit || onRemove) && (
          <div className="flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {onEdit && <IconBtn label={t('garage.edit')} onClick={onEdit}><Pencil className="h-3.5 w-3.5" strokeWidth={1.8} /></IconBtn>}
            {onRemove && <IconBtn label={t('garage.remove')} danger onClick={onRemove}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} /></IconBtn>}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="font-display text-2xl uppercase leading-none text-ivory">{brand?.name ?? '—'}</h3>
          <div className="mt-1 truncate font-display text-sm uppercase text-platinum">{v.model}{v.year && <span className="text-steel"> · {v.year}</span>}</div>
        </div>
        {v.plate && <LicensePlate text={v.plate} />}
      </div>
    </motion.div>
  );
}

const PLATE_DIGITS_RE = /[0-9\u0660-\u0669]/g;
function splitPlate(plate: string) {
  const p = plate || '';
  const digits = (p.match(PLATE_DIGITS_RE) || []).join('');
  const letters = p.replace(PLATE_DIGITS_RE, '').replace(/\s+/g, ' ').trim();
  return { digits, letters };
}
function joinPlate(digits: string, letters: string) {
  return [digits.trim(), letters.trim()].filter(Boolean).join(' ');
}

function VehicleModal({ t, vehicle, colors, onClose }: { t: Tr; vehicle: Vehicle | null; colors: DbColor[]; onClose: () => void }) {
  const { addVehicle, updateVehicle } = useAuth();
  const initSplit = splitPlate(vehicle?.plate ?? '');
  const [v, setV] = useState({
    brandId: vehicle?.brandId ?? '',
    model: vehicle?.model ?? '',
    colorKey: vehicle?.colorKey ?? '',
    plateDigits: (vehicle as any)?.plateDigits ?? initSplit.digits,
    plateLetters: (vehicle as any)?.plateLetters ?? initSplit.letters,
    year: vehicle?.year ?? '',
  });
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const brand = BRANDS.find((b: any) => b.id === v.brandId);
  const valid = v.brandId && v.model && v.colorKey && v.plateDigits.trim().length >= 1;

  const save = () => {
    if (!valid) { setTouched(true); return; }
    const payload = {
      brandId: v.brandId, model: v.model, colorKey: v.colorKey, year: v.year,
      plateDigits: v.plateDigits.trim(), plateLetters: v.plateLetters.trim(),
      plate: joinPlate(v.plateDigits, v.plateLetters),
    };
    if (vehicle) updateVehicle(vehicle.id, payload as any);
    else addVehicle(payload as any);
    onClose();
  };

  return (
    <Modal onClose={onClose} title={vehicle ? t('garage.editTitle') : t('garage.addTitle')}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('garage.brand')}><Select value={v.brandId} placeholder={t('garage.brandPlaceholder')} options={BRANDS.map((b: any) => ({ value: b.id, label: b.name }))} onChange={(x) => set({ brandId: x, model: '' })} /></Field>
          <Field label={t('garage.model')}><Select value={v.model} placeholder={t('garage.modelPlaceholder')} disabled={!brand} options={(brand?.models ?? []).map((m: string) => ({ value: m, label: m }))} onChange={(x) => set({ model: x })} /></Field>
        </div>
        <Field label={t('garage.color')}>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const on = v.colorKey === c.key;
              return (
                <button key={c.key} type="button" data-cursor="hover" title={c.name} onClick={() => set({ colorKey: c.key })}
                  className={['relative grid h-10 w-10 place-items-center rounded-full transition-all duration-300', on ? 'ring-2 ring-ivory ring-offset-2 ring-offset-[#0c0d0e]' : 'ring-1 ring-white/15 hover:ring-white/40'].join(' ')}>
                  <span className="h-8 w-8 rounded-full" style={{ background: c.hex, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)' }} />
                  {on && <Check className="absolute h-4 w-4" strokeWidth={2.8} style={{ color: c.light ? '#000' : '#fff' }} />}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t('garage.plate')}>
          <div dir="ltr" className="grid grid-cols-[1.1fr_1.4fr] gap-3">
            <input value={v.plateDigits} inputMode="numeric" dir="ltr"
              onChange={(e) => set({ plateDigits: e.target.value.replace(/[^0-9\u0660-\u0669]/g, '').slice(0, 4) })}
              placeholder="1234"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-center font-display text-lg tracking-[0.22em] text-ivory placeholder:font-sans placeholder:tracking-normal placeholder:text-steel/50 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
            <input value={v.plateLetters}
              onChange={(e) => set({ plateLetters: e.target.value.replace(/[0-9\u0660-\u0669]/g, '').replace(/\s+/g, '').split('').slice(0, 4).join(' ') })}
              placeholder="أ ب ج"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-center font-display text-lg tracking-[0.22em] text-ivory placeholder:font-sans placeholder:tracking-normal placeholder:text-steel/50 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
          </div>
        </Field>

        <Field label={t('garage.year')}>
          <input value={v.year} dir="ltr" inputMode="numeric" onChange={(e) => set({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder={t('garage.yearPlaceholder')}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
        </Field>

        {touched && !valid && <p className="text-[0.66rem] text-[#c98a8a]">{t('garage.fillAll')}</p>}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button data-cursor="hover" onClick={onClose}><GhostMini>{t('garage.cancel')}</GhostMini></button>
          <button data-cursor="hover" onClick={save}><Pill>{t('garage.save')}</Pill></button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Profile ─── */
function Profile({ t, tb, isAr, member }: { t: Tr; tb: Tr; isAr: boolean; member: Mem }) {
  const { updateProfile } = useAuth();
  const [v, setV] = useState({ name: member.name, email: member.email, phone: member.phone, city: member.city });
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<typeof v>) => { setV((s) => ({ ...s, ...p })); setSaved(false); };
  const dirty = v.name !== member.name || v.email !== member.email || v.phone !== member.phone || v.city !== member.city;
  const phoneOk = !v.phone.trim() || isValidPhone(v.phone);
  const phoneError = touched && !phoneOk ? (isAr ? 'رقم غير صحيح' : 'Invalid phone number') : null;
  const save = () => { if (!phoneOk) { setTouched(true); return; } updateProfile(v); setSaved(true); };

  const role = member.role;
  const isPrivileged = role === 'admin' || role === 'staff';

  const dbCities = useDbCities(isAr);
  const cityOptions = dbCities
    ? dbCities.map((c) => ({ value: c.code, label: c.label }))
    : CITY_KEYS.map((c) => ({ value: c, label: tb.has(`cities.${c}`) ? tb(`cities.${c}`) : c }));

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <h2 className="font-display text-2xl font-light uppercase tracking-tight text-ivory md:text-3xl">{t('profile.title')}</h2>
        <p className="mt-2 text-sm text-platinum/60">{t('profile.subtitle')}</p>
      </div>

      {isPrivileged && <AdminGateway t={t} role={role} isAr={isAr} />}

      <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.02]">
        <div className="relative h-32 md:h-40">
          <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${COVER_IMAGE}')`, filter: 'grayscale(0.6) brightness(0.5)' }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0b0c] via-[#0a0b0c]/40 to-transparent" />
          <div className="absolute -bottom-8 start-6 md:start-8"><Monogram name={v.name || member.name} size={72} ring /></div>
        </div>

        <div className="px-6 pb-7 pt-12 md:px-8 md:pt-14">
          <div className="mb-7">
            <div className="truncate font-display text-xl uppercase tracking-wide text-ivory">{v.name || member.name}</div>
            <div dir="ltr" className="truncate text-[0.74rem] text-platinum/60">{member.email}</div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t('profile.fullName')}><Input value={v.name} onChange={(x) => set({ name: x })} /></Field>
            <Field label={t('profile.phone')}>
              <PhoneField isAr={isAr} value={v.phone} onChange={(p) => set({ phone: p })} error={phoneError} />
            </Field>
            <Field label={t('profile.email')}><Input value={v.email} dir="ltr" onChange={(x) => set({ email: x })} /></Field>
            <Field label={t('profile.city')}><Select value={v.city} placeholder={tb('step3.cityPlaceholder')} options={cityOptions} onChange={(x) => set({ city: x })} /></Field>
          </div>
          <div className="mt-8 flex items-center justify-end gap-4">
            <AnimatePresence>
              {saved && !dirty && <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.16em] text-platinum"><Check className="h-3.5 w-3.5" strokeWidth={2.4} />{t('profile.saved')}</motion.span>}
            </AnimatePresence>
            <button data-cursor="hover" onClick={save} disabled={!dirty || !phoneOk} className={dirty && phoneOk ? '' : 'pointer-events-none opacity-40'}><Pill>{t('profile.save')}</Pill></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminGateway({ t, role, isAr }: { t: Tr; role: string; isAr: boolean }) {
  const roleLabel = t.has(`profile.roles.${role}`) ? t(`profile.roles.${role}`) : (role === 'admin' ? (isAr ? 'مدير' : 'Admin') : (isAr ? 'موظّف' : 'Staff'));
  const title = t.has('profile.adminGateTitle') ? t('profile.adminGateTitle') : (isAr ? 'لوحة التحكّم' : 'Control panel');
  const sub = t.has('profile.adminGateSub') ? t('profile.adminGateSub') : (isAr ? 'أدوات الإدارة والتشغيل الخاصة بفريق ABH.' : 'Management & operations tools for the ABH team.');
  const cta = t.has('profile.adminGateCta') ? t('profile.adminGateCta') : (isAr ? 'فتح الداشبورد' : 'Open dashboard');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="group relative mb-6 overflow-hidden rounded-[26px] border border-platinum/25 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-px">
      <span aria-hidden className="pointer-events-none absolute -inset-px rounded-[26px] opacity-60" style={{ background: 'conic-gradient(from 180deg at 50% 50%, transparent, rgba(203,205,205,0.25), transparent)' }} />
      <div className="relative flex flex-wrap items-center justify-between gap-5 rounded-[25px] bg-[#0b0c0d]/80 px-6 py-5 backdrop-blur-xl md:px-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-platinum/30 bg-platinum/[0.08]"><KeyRound className="h-5 w-5 text-platinum" strokeWidth={1.7} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg uppercase tracking-tight text-ivory">{title}</h3>
              <span className="rounded-full border border-platinum/30 bg-platinum/[0.07] px-2.5 py-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-platinum">{roleLabel}</span>
            </div>
            <p className="mt-1 max-w-[42ch] text-[0.78rem] leading-relaxed text-platinum/60">{sub}</p>
          </div>
        </div>
        <Link href="/admin" data-cursor="hover" className="flex-none"><Pill icon={Gauge}>{cta}</Pill></Link>
      </div>
    </motion.div>
  );
}

/* ─── Shared primitives ─── */
const CITY_KEYS = ['jeddah', 'makkah'] as const;

function SubHead({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3"><span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{children}</span><span className="h-px flex-1 bg-gradient-to-r from-white/12 to-transparent" /></div>;
}
function NavLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button data-cursor="hover" onClick={onClick} className="link-magnetic !text-[0.7rem] uppercase tracking-[0.16em] text-platinum/70">{children}</button>;
}

function Monogram({ name, size = 32, ring }: { name: string; size?: number; ring?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'A';
  return (
    <span className="relative grid flex-none place-items-center rounded-full border border-white/15 bg-gradient-to-br from-white/[0.1] to-white/[0.02] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]" style={{ height: size, width: size }}>
      {ring && <motion.span aria-hidden animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full opacity-50" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(203,205,205,0.5), transparent)', filter: 'blur(3px)' }} />}
      <span aria-hidden className="absolute inset-[3px] rounded-full border border-white/[0.06]" />
      <span className="font-display uppercase tracking-wide text-platinum" style={{ fontSize: size * 0.32 }}>{initials}</span>
    </span>
  );
}

function StatusChip({ t, status }: { t: Tr; status: BookingStatus }) {
  const s = STATUS_TONES[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.16em] backdrop-blur-sm"
      style={{ borderColor: s.border, background: s.bg, color: s.text }}>
      {status === 'active'
        ? <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: s.dot }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.glow}` }} /></span>
        : <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.glow}` }} />}
      {t(`bookings.status.${status}`)}
    </span>
  );
}

function PaymentChip({ t, branch }: { t: Tr; branch: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.14em] backdrop-blur-sm ${branch ? 'border-white/12 bg-obsidian/40 text-platinum/75' : 'border-platinum/30 bg-platinum/[0.06] text-platinum'}`}>
      {branch ? <Wallet className="h-3 w-3" strokeWidth={1.8} /> : <CreditCard className="h-3 w-3" strokeWidth={1.8} />}
      {branch ? t('bookings.payAtBranch') : t('bookings.paid')}
    </span>
  );
}

function ServiceChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[0.6rem] tracking-wide text-platinum/90 backdrop-blur-sm">{children}</span>;
}
function MetaChip({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-obsidian/40 px-3 py-1.5 text-[0.62rem] tracking-wide text-platinum/75 backdrop-blur-sm"><Icon className="h-3.5 w-3.5 text-platinum/55" strokeWidth={1.7} />{children}</span>;
}

function LicensePlate({ text }: { text: string }) {
  return (
    <div dir="ltr" className="flex flex-none items-stretch overflow-hidden rounded-md border border-white/30 bg-gradient-to-b from-[#f6f6f4] to-[#dcdcd8] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col items-center justify-center bg-[#0a0b0c] px-1.5 py-1"><span className="text-[0.36rem] font-bold leading-none tracking-wider text-ivory">KSA</span><span className="mt-0.5 text-[0.42rem] leading-none text-platinum">★</span></div>
      <div className="flex items-center px-2.5"><span className="font-display text-sm font-semibold tracking-[0.18em] text-obsidian">{text}</span></div>
    </div>
  );
}

function daysUntil(date: string): number | null {
  const d = new Date(date); if (isNaN(+d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((+d - +today) / 86400000);
}
function fmtDate(date: string, isAr: boolean): string {
  const d = new Date(date); if (isNaN(+d)) return date;
  return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long' });
}
function fmtMoney(n: number): string { return new Intl.NumberFormat('en-US').format(n); }

function EmptyCard({ icon: Icon, title, cta, href, onClick }: { icon: React.ElementType; title: string; cta: string; href?: string; onClick?: () => void }) {
  const btn = <Pill>{cta}</Pill>;
  return (
    <div className="relative grid place-items-center overflow-hidden rounded-[24px] border border-dashed border-white/12 px-6 py-14 text-center">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.08]" style={{ backgroundImage: `url('${COVER_IMAGE}')`, filter: 'grayscale(1)' }} />
      <span className="grid h-14 w-14 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-platinum/60"><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
      <p className="mt-5 max-w-[34ch] text-sm text-platinum/65">{title}</p>
      <div className="mt-6">{href ? <Link href={href} data-cursor="hover">{btn}</Link> : <button data-cursor="hover" onClick={onClick}>{btn}</button>}</div>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.4, ease: EASE }}
        className={`glass-strong relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-[28px] border border-white/[0.1] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.85)] ${wide ? 'max-w-xl' : 'max-w-lg'}`}>
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-[#0c0d0e]/90 px-6 py-4 backdrop-blur-md md:px-8">
          <h3 className="font-display text-xl font-light uppercase tracking-tight text-ivory md:text-2xl">{title}</h3>
          <button data-cursor="hover" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 md:p-8">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmDialog({ t, vehicle, onCancel, onConfirm }: { t: Tr; vehicle: Vehicle; onCancel: () => void; onConfirm: () => void }) {
  const brand = BRANDS.find((b: any) => b.id === vehicle.brandId);
  return (
    <Modal title={t('garage.removeTitle')} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-platinum/70">{t('garage.removeConfirm', { vehicle: `${brand?.name ?? ''} ${vehicle.model}`.trim() })}</p>
      <div className="mt-7 flex items-center justify-end gap-3">
        <button data-cursor="hover" onClick={onCancel}><GhostMini>{t('garage.cancel')}</GhostMini></button>
        <button data-cursor="hover" onClick={onConfirm} className="inline-flex items-center gap-2 rounded-full border border-[#7c1a1a]/50 bg-[#2a1414]/50 px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#e7b4b4] transition-colors hover:bg-[#2a1414]/80">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />{t('garage.remove')}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2.5 block text-[0.6rem] uppercase tracking-[0.24em] text-platinum/80">{label}</span>{children}</label>;
}
function Input({ value, onChange, dir }: { value: string; onChange: (v: string) => void; dir?: 'ltr' | 'rtl' }) {
  return <input value={value} dir={dir} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-sm text-ivory outline-none transition-all duration-300 focus:border-platinum/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(203,205,205,0.07)]" />;
}
function Select({ value, placeholder, options, onChange, disabled }: { value: string; placeholder: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" data-cursor="hover" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className={['flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-start text-sm transition-colors duration-300', disabled ? 'cursor-not-allowed border-white/8 bg-white/[0.02] text-steel/50' : open ? 'border-platinum/50 bg-white/[0.05] text-ivory' : 'border-white/12 bg-white/[0.03] text-ivory hover:border-white/25'].join(' ')}>
        <span className={selected ? 'text-ivory' : 'text-steel/70'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>
      <AnimatePresence>
        {open && !disabled && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[#0c0d0e]/96 p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {options.map((o) => {
              const on = o.value === value;
              return (
                <button key={o.value} type="button" data-cursor="hover" onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
                  className={['flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-start text-sm transition-colors duration-200', on ? 'bg-white/[0.08] text-ivory' : 'text-platinum/80 hover:bg-white/[0.05] hover:text-ivory'].join(' ')}>
                  {o.label}{on && <Check className="h-3.5 w-3.5 text-platinum" strokeWidth={2.4} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button data-cursor="hover" onClick={onClick} aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-obsidian/60 text-platinum/80 backdrop-blur-sm transition-all duration-300 ${danger ? 'hover:border-[#7c1a1a]/60 hover:text-[#e7b4b4]' : 'hover:border-white/35 hover:text-ivory'}`}>
      {children}
    </button>
  );
}

function Pill({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <span className="group/btn relative inline-block">
      <span aria-hidden className="absolute -inset-2 rounded-full bg-gradient-to-r from-platinum/40 via-ivory/30 to-platinum/40 opacity-0 blur-xl transition-opacity duration-700 group-hover/btn:opacity-100" />
      <span className="relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-obsidian transition-transform duration-500 group-hover/btn:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9),0 16px 50px -15px rgba(203,205,205,0.6)' }}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}{children}
        {!Icon && <ArrowUpRight className="reversible-icon h-3.5 w-3.5 transition-transform duration-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={2.2} />}
      </span>
    </span>
  );
}
function GhostMini({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-ivory backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]">{children}</span>;
}