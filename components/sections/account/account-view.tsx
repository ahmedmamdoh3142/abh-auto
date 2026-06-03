'use client';

/**
 * AccountView — the /account member dashboard for ABH Auto.
 * Path: components/sections/account/account-view.tsx  (export `AccountView`)
 *
 * Cinematic, image-led member space — staged like a luxury marque's owner
 * portal (Porsche / Bentley garages), in the house language (obsidian / ivory
 * / platinum / steel, Italiana display, EASE, framer-motion, RTL, next-intl):
 *
 *   OVERVIEW   greeting + stats, a full-bleed "next appointment" card backed by
 *              the car, a garage strip, recent visits.
 *   BOOKINGS   segmented Upcoming/active vs Past; cards with a car thumbnail and
 *              a live service-progress rail on active reservations.
 *   GARAGE     image-backed vehicle cards (colour blooms on hover, as the
 *              services cards do); add / edit / remove.
 *   PROFILE    editable details over a cinematic cover.
 *
 * Real car imagery is drawn from the existing /images/project-*.png plates,
 * picked deterministically per vehicle so it's stable between renders.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  LayoutGrid, CalendarCheck, Car, UserRound, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ArrowUpRight, Clock, MapPin, ShieldCheck, CircleDot, Calendar, LogOut,
} from 'lucide-react';

import { BRANDS, COLORS } from '@/lib/booking-data';
import { useAuth, type Vehicle, type BookingRecord, type BookingStatus } from '@/components/shared/auth-provider';

const EASE = [0.16, 1, 0.3, 1] as const;

/* Cinematic car plates already shipping in /public/images. Picked
   deterministically per vehicle so the same car always wears the same shot. */
const CAR_IMAGES = [
  '/images/project-1.png', '/images/project-2.png', '/images/project-3.png', '/images/project-4.png',
  '/images/project-5.png', '/images/project-6.png', '/images/project-7.png', '/images/project-8.png',
];
const COVER_IMAGE = '/images/cta-bg.png';
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function carImg(seed: string) { return CAR_IMAGES[hash(seed || 'x') % CAR_IMAGES.length]; }

type SectionId = 'overview' | 'bookings' | 'garage' | 'profile';
type Tr = ReturnType<typeof useTranslations>;
type Mem = NonNullable<ReturnType<typeof useAuth>['member']>;

export function AccountView() {
  const t = useTranslations('account');
  const tb = useTranslations('booking');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { member, hydrated } = useAuth();

  const [section, setSection] = useState<SectionId>('overview');

  useEffect(() => {
    if (hydrated && !member) router.replace('/login?redirect=/account');
  }, [hydrated, member, router]);

  if (!hydrated || !member) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-platinum" />
      </main>
    );
  }

  return (
    <main className="relative">
      <AccountHero t={t} member={member} />
      <SectionNav t={t} section={section} setSection={setSection} />

      <section className="relative pb-28 pt-10 md:pt-12">
        <div className="container">
          <AnimatePresence mode="wait">
            <motion.div key={section}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {section === 'overview' && <Overview t={t} tb={tb} isAr={isAr} member={member} onGo={setSection} />}
              {section === 'bookings' && <Bookings t={t} tb={tb} isAr={isAr} member={member} />}
              {section === 'garage' && <Garage t={t} tb={tb} member={member} />}
              {section === 'profile' && <Profile t={t} tb={tb} member={member} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Hero — cinematic banner                                               */
/* ════════════════════════════════════════════════════════════════════ */
function AccountHero({ t, member }: { t: Tr; member: Mem }) {
  const since = new Date(member.since).getFullYear();
  const upcoming = member.bookings.filter((b) => b.status === 'upcoming' || b.status === 'active').length;
  const particles = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ id: i, left: (i * 61) % 100, top: ((i * 29) % 70) + 12, delay: (i % 6) * 0.6, duration: 6 + (i % 4) })),
    [],
  );
  const stats = [
    { label: t('stats.vehicles'), value: member.vehicles.length },
    { label: t('stats.upcoming'), value: upcoming },
    { label: t('stats.visits'), value: member.bookings.filter((b) => b.status === 'completed').length },
    { label: t('stats.since'), value: since },
  ];

  return (
    <section className="relative isolate overflow-hidden pt-32 md:pt-40">
      {/* cinematic plate */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${COVER_IMAGE}')`, filter: 'grayscale(0.7) brightness(0.4) contrast(1.08)' }} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-obsidian/85 via-obsidian/70 to-obsidian" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {particles.map((p) => (
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
            <Monogram name={member.name} size={72} ring />
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
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.5, ease: EASE }}
              className="glass rounded-3xl border border-white/[0.08] p-5">
              <div className="font-display text-3xl tabular-nums text-ivory md:text-4xl">{s.value}</div>
              <div className="mt-1.5 text-[0.56rem] uppercase tracking-[0.2em] text-steel">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Editorial top nav                                                     */
/* ════════════════════════════════════════════════════════════════════ */
function SectionNav({ t, section, setSection }: { t: Tr; section: SectionId; setSection: (s: SectionId) => void }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const items: { id: SectionId; icon: React.ElementType }[] = [
    { id: 'overview', icon: LayoutGrid }, { id: 'bookings', icon: CalendarCheck },
    { id: 'garage', icon: Car }, { id: 'profile', icon: UserRound },
  ];
  return (
    <div className="sticky top-[84px] z-30 mt-10 border-y border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
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
                  <span className={`whitespace-nowrap text-[0.68rem] uppercase tracking-[0.16em] ${on ? 'text-ivory' : 'text-platinum/60'}`}>{t(`nav.${id}`)}</span>
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

/* ════════════════════════════════════════════════════════════════════ */
/*  Overview                                                              */
/* ════════════════════════════════════════════════════════════════════ */
function Overview({ t, tb, isAr, member, onGo }: { t: Tr; tb: Tr; isAr: boolean; member: Mem; onGo: (s: SectionId) => void }) {
  const next = useMemo(() => {
    const live = member.bookings.filter((b) => b.status === 'upcoming' || b.status === 'active');
    return live.sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null;
  }, [member.bookings]);
  const recent = member.bookings.filter((b) => b.status === 'completed').slice(0, 2);

  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SubHead>{t('overview.nextTitle')}</SubHead>
        {next ? <NextAppointment t={t} tb={tb} isAr={isAr} b={next} onGo={onGo} />
          : <EmptyCard icon={Calendar} title={t('overview.noUpcoming')} cta={t('overview.book')} href="/booking" />}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <SubHead>{t('overview.garageTitle')}</SubHead>
          <NavLink onClick={() => onGo('garage')}>{t('overview.manageGarage')}</NavLink>
        </div>
        {member.vehicles.length ? (
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
            {member.vehicles.map((v) => <div key={v.id} className="w-[280px] flex-none snap-start"><VehicleCard tb={tb} t={t} v={v} compact /></div>)}
            <button data-cursor="hover" onClick={() => onGo('garage')}
              className="group grid h-auto w-[200px] flex-none snap-start place-items-center rounded-[24px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]">
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
          <div className="space-y-4">{recent.map((b) => <BookingCard key={b.id} t={t} tb={tb} isAr={isAr} b={b} compact />)}</div>
        </div>
      )}
    </div>
  );
}

function NextAppointment({ t, tb, isAr, b, onGo }: { t: Tr; tb: Tr; isAr: boolean; b: BookingRecord; onGo: (s: SectionId) => void }) {
  const days = daysUntil(b.date);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="group relative overflow-hidden rounded-[28px] border border-white/[0.1]"
    >
      {/* car backdrop */}
      <div aria-hidden className="absolute inset-0 scale-[1.04] bg-cover bg-center transition-[transform,filter] duration-[1200ms] ease-out group-hover:scale-[1.1] group-hover:grayscale-0"
        style={{ backgroundImage: `url('${carImg(b.plate || b.id)}')`, filter: 'grayscale(0.55) brightness(0.5) contrast(1.05)' }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/75 to-[#050608]/30" />
      <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/50 to-transparent" />

      <div className="relative p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <StatusChip t={t} status={b.status} />
            <h3 className="mt-4 font-display text-3xl uppercase leading-none text-ivory md:text-[2.6rem]">{b.vehicleLabel}</h3>
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

        <div className="mt-5 flex flex-wrap gap-2">{b.serviceSlugs.map((s) => <ServiceChip key={s}>{tb(`svc.${s}.name`)}</ServiceChip>)}</div>

        {b.status === 'active' && <ServiceRail t={t} stage={b.stage ?? 0} />}

        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <div>
            <div className="text-[0.52rem] uppercase tracking-[0.24em] text-steel">{t('bookings.total')}</div>
            <div dir="ltr" className="mt-1 font-display text-2xl text-ivory tabular-nums">{fmtMoney(b.total)} <span className="text-sm text-platinum/70">{tb('currency')}</span></div>
          </div>
          <button data-cursor="hover" onClick={() => onGo('bookings')}><Pill>{t('bookings.viewDetails')}</Pill></button>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Bookings                                                              */
/* ════════════════════════════════════════════════════════════════════ */
function Bookings({ t, tb, isAr, member }: { t: Tr; tb: Tr; isAr: boolean; member: Mem }) {
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
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
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

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-4">
          {list.length === 0
            ? <EmptyCard icon={tab === 'live' ? Calendar : CalendarCheck} title={tab === 'live' ? t('bookings.emptyLive') : t('bookings.emptyPast')} cta={t('bookings.newBooking')} href="/booking" />
            : list.map((b) => <BookingCard key={b.id} t={t} tb={tb} isAr={isAr} b={b} />)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BookingCard({ t, tb, isAr, b, compact }: { t: Tr; tb: Tr; isAr: boolean; b: BookingRecord; compact?: boolean }) {
  const isActive = b.status === 'active';
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={['group relative overflow-hidden rounded-[24px] border bg-white/[0.02] transition-colors duration-300', isActive ? 'border-platinum/25' : 'border-white/[0.08] hover:border-white/15'].join(' ')}>
      <div className="flex flex-col sm:flex-row">
        {/* car thumbnail */}
        <div className="relative h-32 w-full flex-none overflow-hidden sm:h-auto sm:w-44">
          <div aria-hidden className="absolute inset-0 bg-cover bg-center transition-[transform,filter] duration-[1200ms] ease-out group-hover:scale-105 group-hover:grayscale-0"
            style={{ backgroundImage: `url('${carImg(b.plate || b.id)}')`, filter: 'grayscale(0.6) brightness(0.55)' }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/70 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-obsidian/80" />
        </div>

        <div className="flex-1 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip t={t} status={b.status} />
                <span dir="ltr" className="font-display text-sm tracking-[0.14em] text-platinum/70">{b.id}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl uppercase leading-none text-ivory">{b.vehicleLabel}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">{b.serviceSlugs.map((s) => <ServiceChip key={s}>{tb(`svc.${s}.name`)}</ServiceChip>)}</div>
              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.74rem] text-platinum/60">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-platinum/50" strokeWidth={1.7} />{tb(`branches.${b.branchKey}`)}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-platinum/50" strokeWidth={1.7} />{fmtDate(b.date, isAr)} · {b.time}</span>
                {b.plate && <span dir="ltr" className="font-display tracking-[0.12em] text-platinum/55">{b.plate}</span>}
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
              {b.status === 'upcoming' && <GhostMini>{t('bookings.reschedule')}</GhostMini>}
              {(b.status === 'completed' || b.status === 'cancelled') && <Link href="/booking" data-cursor="hover"><GhostMini>{t('bookings.rebook')}</GhostMini></Link>}
              <button data-cursor="hover" className="ms-auto inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-platinum/70 transition-colors hover:text-ivory">
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
  return (
    <div className="mt-5 rounded-2xl border border-white/[0.07] bg-obsidian/50 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.2em] text-platinum/70">
        <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-platinum opacity-70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-platinum" /></span>
        {t('bookings.inProgress')}
      </div>
      <div className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-0 top-[11px] h-px bg-white/10" />
        <motion.span aria-hidden className="absolute top-[11px] h-px bg-gradient-to-r from-platinum/50 via-ivory to-platinum/50"
          initial={false} animate={{ width: `${(stage / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} style={{ insetInlineStart: 0 }} />
        {steps.map((s, i) => {
          const done = i < stage; const active = i === stage;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
              <span className={['grid h-6 w-6 place-items-center rounded-full border text-[0.5rem] transition-all duration-500',
                active ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : done ? 'border-platinum/50 bg-platinum/10 text-ivory' : 'border-white/12 bg-white/[0.03] text-steel'].join(' ')}>
                {done ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <CircleDot className="h-3 w-3" strokeWidth={2} />}
              </span>
              <span className={`max-w-[6rem] text-center text-[0.5rem] uppercase tracking-[0.12em] ${active ? 'text-ivory' : done ? 'text-platinum/70' : 'text-steel'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Garage                                                                */
/* ════════════════════════════════════════════════════════════════════ */
function Garage({ t, tb, member }: { t: Tr; tb: Tr; member: Mem }) {
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
        {member.vehicles.map((v) => <VehicleCard key={v.id} tb={tb} t={t} v={v} onEdit={() => setEditing(v)} onRemove={() => setConfirm(v)} />)}
        <button data-cursor="hover" onClick={() => setAdding(true)}
          className="group grid min-h-[230px] place-items-center rounded-[26px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]">
          <span className="flex flex-col items-center gap-3 text-platinum/55 transition-colors group-hover:text-platinum">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/12 bg-white/[0.03]"><Plus className="h-5 w-5" strokeWidth={1.8} /></span>
            <span className="text-[0.62rem] uppercase tracking-[0.18em]">{t('garage.addVehicle')}</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {(adding || editing) && <VehicleModal t={t} tb={tb} vehicle={editing} onClose={() => { setAdding(false); setEditing(null); }} />}
        {confirm && <ConfirmDialog t={t} vehicle={confirm} onCancel={() => setConfirm(null)} onConfirm={() => { removeVehicle(confirm.id); setConfirm(null); }} />}
      </AnimatePresence>
    </div>
  );
}

function VehicleCard({ t, tb, v, onEdit, onRemove, compact }: { t: Tr; tb: Tr; v: Vehicle; onEdit?: () => void; onRemove?: () => void; compact?: boolean }) {
  const brand = BRANDS.find((b: any) => b.id === v.brandId);
  const color = COLORS.find((c: any) => c.key === v.colorKey);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={`group relative overflow-hidden rounded-[26px] border border-white/[0.08] transition-colors duration-300 hover:border-white/20 ${compact ? 'h-[200px]' : 'h-[260px]'}`}>
      {/* car photo */}
      <div aria-hidden className="absolute inset-0 scale-[1.04] bg-cover bg-center transition-[transform,filter] duration-[1400ms] ease-out group-hover:scale-[1.1] group-hover:grayscale-0"
        style={{ backgroundImage: `url('${carImg(v.id || v.plate)}')`, filter: 'grayscale(0.6) brightness(0.6) contrast(1.05)' }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/45 to-obsidian/10" />

      {/* top row */}
      <div className="relative flex items-start justify-between p-5">
        {color && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-obsidian/50 px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.14em] text-platinum/90 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: (color as any).hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }} />{tb(`colors.${v.colorKey}`)}
          </span>
        )}
        {(onEdit || onRemove) && (
          <div className="flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {onEdit && <IconBtn label={t('garage.edit')} onClick={onEdit}><Pencil className="h-3.5 w-3.5" strokeWidth={1.8} /></IconBtn>}
            {onRemove && <IconBtn label={t('garage.remove')} danger onClick={onRemove}><Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} /></IconBtn>}
          </div>
        )}
      </div>

      {/* bottom */}
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

function VehicleModal({ t, tb, vehicle, onClose }: { t: Tr; tb: Tr; vehicle: Vehicle | null; onClose: () => void }) {
  const { addVehicle, updateVehicle } = useAuth();
  const [v, setV] = useState({ brandId: vehicle?.brandId ?? '', model: vehicle?.model ?? '', colorKey: vehicle?.colorKey ?? '', plate: vehicle?.plate ?? '', year: vehicle?.year ?? '' });
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const brand = BRANDS.find((b: any) => b.id === v.brandId);
  const valid = v.brandId && v.model && v.colorKey && v.plate.trim().length >= 2;
  const save = () => { if (!valid) { setTouched(true); return; } if (vehicle) updateVehicle(vehicle.id, v); else addVehicle(v); onClose(); };

  return (
    <Modal onClose={onClose} title={vehicle ? t('garage.editTitle') : t('garage.addTitle')}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('garage.brand')}>
            <Select value={v.brandId} placeholder={t('garage.brandPlaceholder')} options={BRANDS.map((b: any) => ({ value: b.id, label: b.name }))} onChange={(x) => set({ brandId: x, model: '' })} />
          </Field>
          <Field label={t('garage.model')}>
            <Select value={v.model} placeholder={t('garage.modelPlaceholder')} disabled={!brand} options={(brand?.models ?? []).map((m: string) => ({ value: m, label: m }))} onChange={(x) => set({ model: x })} />
          </Field>
        </div>
        <Field label={t('garage.color')}>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((c: any) => {
              const on = v.colorKey === c.key;
              return (
                <button key={c.key} type="button" data-cursor="hover" title={tb(`colors.${c.key}`)} onClick={() => set({ colorKey: c.key })}
                  className={['relative grid h-10 w-10 place-items-center rounded-full transition-all duration-300', on ? 'ring-2 ring-ivory ring-offset-2 ring-offset-[#0c0d0e]' : 'ring-1 ring-white/15 hover:ring-white/40'].join(' ')}>
                  <span className="h-8 w-8 rounded-full" style={{ background: c.hex, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)' }} />
                  {on && <Check className="absolute h-4 w-4" strokeWidth={2.8} style={{ color: ['white', 'silver', 'beige', 'yellow', 'gold'].includes(c.key) ? '#000' : '#fff' }} />}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('garage.plate')}>
            <input value={v.plate} dir="ltr" onChange={(e) => set({ plate: e.target.value.toUpperCase().slice(0, 10) })} placeholder={t('garage.platePlaceholder')}
              className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 font-display text-lg tracking-[0.22em] text-ivory placeholder:font-sans placeholder:tracking-normal placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
          </Field>
          <Field label={t('garage.year')}>
            <input value={v.year} dir="ltr" inputMode="numeric" onChange={(e) => set({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder={t('garage.yearPlaceholder')}
              className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
          </Field>
        </div>
        {touched && !valid && <p className="text-[0.66rem] text-[#c98a8a]">{t('garage.fillAll')}</p>}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button data-cursor="hover" onClick={onClose}><GhostMini>{t('garage.cancel')}</GhostMini></button>
          <button data-cursor="hover" onClick={save}><Pill>{t('garage.save')}</Pill></button>
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Profile                                                               */
/* ════════════════════════════════════════════════════════════════════ */
function Profile({ t, tb, member }: { t: Tr; tb: Tr; member: Mem }) {
  const { updateProfile } = useAuth();
  const [v, setV] = useState({ name: member.name, email: member.email, phone: member.phone, city: member.city });
  const [saved, setSaved] = useState(false);
  const set = (p: Partial<typeof v>) => { setV((s) => ({ ...s, ...p })); setSaved(false); };
  const dirty = v.name !== member.name || v.email !== member.email || v.phone !== member.phone || v.city !== member.city;
  const save = () => { updateProfile(v); setSaved(true); };

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <h2 className="font-display text-2xl font-light uppercase tracking-tight text-ivory md:text-3xl">{t('profile.title')}</h2>
        <p className="mt-2 text-sm text-platinum/60">{t('profile.subtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.02]">
        {/* cinematic cover */}
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
            <Field label={t('profile.phone')}><Input value={v.phone} dir="ltr" onChange={(x) => set({ phone: x })} /></Field>
            <Field label={t('profile.email')}><Input value={v.email} dir="ltr" onChange={(x) => set({ email: x })} /></Field>
            <Field label={t('profile.city')}>
              <Select value={v.city} placeholder={tb('step3.cityPlaceholder')} options={CITY_KEYS.map((c) => ({ value: c, label: tb(`cities.${c}`) }))} onChange={(x) => set({ city: x })} />
            </Field>
          </div>

          <div className="mt-8 flex items-center justify-end gap-4">
            <AnimatePresence>
              {saved && !dirty && (
                <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.16em] text-platinum">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} />{t('profile.saved')}
                </motion.span>
              )}
            </AnimatePresence>
            <button data-cursor="hover" onClick={save} disabled={!dirty} className={dirty ? '' : 'pointer-events-none opacity-40'}><Pill>{t('profile.save')}</Pill></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/*  Shared primitives                                                     */
/* ════════════════════════════════════════════════════════════════════ */
const CITY_KEYS = ['cairo', 'alexandria', 'giza', 'nasr_city', 'new_cairo', 'maadi', 'zamalek', 'october'] as const;

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/12 to-transparent" />
    </div>
  );
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
  const map: Record<BookingStatus, { cls: string; dot: string }> = {
    upcoming: { cls: 'border-platinum/30 bg-obsidian/50 text-platinum backdrop-blur-sm', dot: 'bg-platinum' },
    active: { cls: 'border-ivory/30 bg-obsidian/50 text-ivory backdrop-blur-sm', dot: 'bg-ivory' },
    completed: { cls: 'border-white/12 bg-white/[0.03] text-platinum/70', dot: 'bg-steel' },
    cancelled: { cls: 'border-[#7c1a1a]/40 bg-[#2a1414]/40 text-[#e7b4b4]', dot: 'bg-[#c98a8a]' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.16em] ${s.cls}`}>
      {status === 'active'
        ? <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ivory opacity-70" /><span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} /></span>
        : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {t(`bookings.status.${status}`)}
    </span>
  );
}

function ServiceChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/12 bg-obsidian/40 px-3 py-1 text-[0.62rem] tracking-wide text-platinum/85 backdrop-blur-sm">{children}</span>;
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

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.4, ease: EASE }}
        className="glass-strong relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/[0.1] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.85)] md:p-8">
        <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-platinum/40 to-transparent" />
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-xl font-light uppercase tracking-tight text-ivory md:text-2xl">{title}</h3>
          <button data-cursor="hover" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory"><X className="h-4 w-4" /></button>
        </div>
        {children}
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