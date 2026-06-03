'use client';

/**
 * StepDetails — act 03. A clean, simple contact form (name / phone / email /
 * city / branch) plus two field-style triggers that each open a popover:
 *   • Date  → calendar popover, past dates disabled.
 *   • Time  → grouped time-slot popover (morning / afternoon / evening),
 *             booked slots disabled.
 * Inline validation gates the advance to payment.
 */
import { useState, useRef, useEffect } from 'react';
import type { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { CITIES, BRANCHES } from '@/lib/booking-data';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';
import { Heading, Field, Select } from './step-vehicle';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function StepDetails({
  t, isAr, data, set, onBack, onNext,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  set: (patch: Partial<BookingState>) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);

  const errors: Record<string, string | null> = {
    name: data.name.trim() ? null : t('step3.validation.nameRequired'),
    phone: data.phone.trim() ? null : t('step3.validation.phoneRequired'),
    email: !data.email.trim()
      ? t('step3.validation.emailRequired')
      : EMAIL_RE.test(data.email) ? null : t('step3.validation.emailInvalid'),
    city: data.city ? null : t('step3.validation.cityRequired'),
    branch: data.branch ? null : t('step3.validation.branchRequired'),
    date: data.date ? null : t('step3.validation.dateRequired'),
    time: data.time ? null : t('step3.validation.timeRequired'),
  };
  const valid = Object.values(errors).every((e) => e === null);
  const handleNext = () => { if (valid) onNext(); else setTouched(true); };

  const dateNice = data.date
    ? new Date(data.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long' })
    : '';

  return (
    <div>
      <Heading index="03" label={t('steps.customer')} title={t('step3.heading')} sub={t('step3.subheading')} />

      <div className="mt-9 grid gap-x-6 gap-y-7 md:grid-cols-2">
        <Field label={t('step3.fullName')}>
          <IconInput icon={User} value={data.name} onChange={(v) => set({ name: v })}
            placeholder={t('step3.fullNamePlaceholder')} error={touched ? errors.name : null} />
        </Field>

        <Field label={t('step3.phone')}>
          <IconInput icon={Phone} value={data.phone} onChange={(v) => set({ phone: v })}
            placeholder={t('step3.phonePlaceholder')} dir="ltr" error={touched ? errors.phone : null} />
        </Field>

        <Field label={t('step3.email')}>
          <IconInput icon={Mail} value={data.email} onChange={(v) => set({ email: v })}
            placeholder={t('step3.emailPlaceholder')} dir="ltr" error={touched ? errors.email : null} />
        </Field>

        <Field label={t('step3.city')}>
          <Select value={data.city} placeholder={t('step3.cityPlaceholder')}
            options={CITIES.map((c) => ({ value: c, label: t(`cities.${c}`) }))}
            onChange={(v) => set({ city: v })} />
          {touched && errors.city && <Err>{errors.city}</Err>}
        </Field>

        <Field label={t('step3.branch')}>
          <Select value={data.branch} placeholder={t('step3.branchPlaceholder')}
            options={BRANCHES.map((b) => ({ value: b, label: t(`branches.${b}`) }))}
            onChange={(v) => set({ branch: v })} />
          {touched && errors.branch && <Err>{errors.branch}</Err>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          {/* Date popover trigger */}
          <Field label={t('step3.date')}>
            <DatePopover
              isAr={isAr}
              value={data.date}
              display={dateNice}
              placeholder={t('step3.datePlaceholder')}
              calMonth={data.calMonth}
              setCalMonth={(cm) => set({ calMonth: cm })}
              onPick={(iso) => set({ date: iso })}
            />
            {touched && errors.date && <Err>{errors.date}</Err>}
          </Field>

          {/* Time popover trigger */}
          <Field label={t('step3.time')}>
            <TimePopover
              t={t}
              value={data.time}
              placeholder={t('step3.timePlaceholder')}
              onPick={(time) => set({ time })}
            />
            {touched && errors.time && <Err>{errors.time}</Err>}
          </Field>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <button onClick={onBack} data-cursor="hover"><GhostPill>{t('step3.back')}</GhostPill></button>
        <button onClick={handleNext} data-cursor="hover"><PrimaryPill>{t('step3.continue')}</PrimaryPill></button>
      </div>
    </div>
  );
}

/* ── trigger button shared look ── */
function TriggerButton({
  icon: Icon, filled, children, onClick, open,
}: { icon: React.ElementType; filled: boolean; children: React.ReactNode; onClick: () => void; open: boolean }) {
  return (
    <button
      type="button" data-cursor="hover" onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-2xl border bg-white/[0.03] px-5 py-4 text-start text-sm transition-colors duration-300',
        open ? 'border-platinum/50 bg-white/[0.05]' : 'border-white/12 hover:border-white/25',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 flex-none text-platinum/60" strokeWidth={1.8} />
      <span className={filled ? 'text-ivory' : 'text-steel/70'}>{children}</span>
    </button>
  );
}

/* ── Date popover ── */
function DatePopover({
  isAr, value, display, placeholder, calMonth, setCalMonth, onPick,
}: {
  isAr: boolean; value: string; display: string; placeholder: string;
  calMonth: { y: number; m: number } | null;
  setCalMonth: (cm: { y: number; m: number }) => void;
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const month = calMonth ?? { y: today.getFullYear(), m: today.getMonth() };
  const { y, m } = month;
  const startDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());
  const nav = (dir: number) => {
    let nm = m + dir, ny = y;
    if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; }
    if (ny < today.getFullYear() || (ny === today.getFullYear() && nm < today.getMonth())) return;
    setCalMonth({ y: ny, m: nm });
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDow; i++) cells.push(<span key={`e${i}`} />);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const past = date < today; const sel = value === iso; const isToday = date.getTime() === today.getTime();
    cells.push(
      <button key={iso} type="button" disabled={past} data-cursor={past ? undefined : 'hover'}
        onClick={past ? undefined : () => { onPick(iso); setOpen(false); }}
        className={[
          'grid aspect-square place-items-center rounded-[10px] border font-display text-[0.9rem] tabular-nums transition-all duration-200',
          past ? 'cursor-not-allowed border-transparent text-steel/35 line-through decoration-steel/30'
            : sel ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian'
            : 'border-transparent text-ivory/85 hover:border-white/20 hover:bg-white/[0.05]',
          isToday && !sel ? 'shadow-[inset_0_0_0_1px_rgba(203,205,205,0.3)]' : '',
        ].join(' ')}
      >{d}</button>,
    );
  }

  return (
    <div className="relative" ref={ref}>
      <TriggerButton icon={Calendar} filled={!!display} open={open} onClick={() => setOpen((o) => !o)}>
        {display || placeholder}
      </TriggerButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute z-40 mt-2 w-[300px] max-w-[88vw] rounded-2xl border border-white/12 bg-[#0c0d0e]/97 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button type="button" data-cursor="hover" disabled={prevDisabled} onClick={() => nav(-1)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-platinum transition-all duration-300 hover:border-white/30 hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronLeft className="reversible-icon h-3.5 w-3.5" />
              </button>
              <span className="font-display text-base tracking-[0.02em]">{MONTHS[m]} {y}</span>
              <button type="button" data-cursor="hover" onClick={() => nav(1)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/12 text-platinum transition-all duration-300 hover:border-white/30 hover:text-ivory">
                <ChevronRight className="reversible-icon h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mb-1.5 grid grid-cols-7 gap-1">
              {DOW.map((d) => <span key={d} className="text-center text-[0.5rem] uppercase tracking-[0.1em] text-steel">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">{cells}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Time popover ── */
function TimePopover({
  t, value, placeholder, onPick,
}: { t: ReturnType<typeof useTranslations>; value: string; placeholder: string; onPick: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));

  const [h, mm] = value ? value.split(':') : ['', ''];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const setH = (nh: string) => onPick(`${nh}:${mm || '00'}`);
  const setM = (nm: string) => onPick(`${h || '09'}:${nm}`);

  return (
    <div className="relative" ref={ref}>
      <TriggerButton icon={Clock} filled={!!value} open={open} onClick={() => setOpen((o) => !o)}>
        {value || placeholder}
      </TriggerButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute z-40 mt-2 w-[280px] max-w-[88vw] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/97 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {/* live readout */}
            <div className="flex items-center justify-center gap-1 border-b border-white/[0.06] py-4">
              <span dir="ltr" className="font-display text-3xl tabular-nums text-ivory">{h || '--'}</span>
              <span className="font-display text-3xl text-platinum/50">:</span>
              <span dir="ltr" className="font-display text-3xl tabular-nums text-ivory">{mm || '--'}</span>
            </div>
            <div className="grid grid-cols-2">
              <Column label={t('step3.hour')} values={hours} active={h} onSelect={setH} />
              <div className="border-s border-white/[0.06]">
                <Column label={t('step3.minute')} values={mins} active={mm} onSelect={setM} />
              </div>
            </div>
            <button type="button" data-cursor="hover" onClick={() => setOpen(false)}
              className="w-full border-t border-white/[0.06] py-3 text-[0.6rem] uppercase tracking-[0.24em] text-platinum/80 transition-colors hover:text-ivory">
              {t('step3.confirmTime')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Column({ label, values, active, onSelect }: { label: string; values: string[]; active: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-col">
      <span className="px-3 pb-1 pt-3 text-center text-[0.5rem] uppercase tracking-[0.2em] text-steel">{label}</span>
      <div className="scrollbar-thin max-h-[168px] overflow-y-auto px-2 pb-2">
        {values.map((v) => {
          const sel = active === v;
          return (
            <button key={v} type="button" data-cursor="hover" onClick={() => onSelect(v)}
              className={[
                'mb-1 grid w-full place-items-center rounded-lg py-2 font-display text-base tabular-nums transition-all duration-200',
                sel ? 'bg-gradient-to-br from-white to-platinum text-obsidian' : 'text-ivory/80 hover:bg-white/[0.05]',
              ].join(' ')}
            >{v}</button>
          );
        })}
      </div>
    </div>
  );
}

function useOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function IconInput({
  icon: Icon, value, onChange, placeholder, dir, error,
}: {
  icon: React.ElementType; value: string; onChange: (v: string) => void;
  placeholder: string; dir?: 'ltr' | 'rtl'; error?: string | null;
}) {
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input
          value={value} dir={dir} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={[
            'w-full rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors duration-300',
            error ? 'border-[#7c1a1a]/70 focus:border-[#7c1a1a]' : 'border-white/12 focus:border-platinum/50 focus:bg-white/[0.05]',
          ].join(' ')}
        />
      </div>
      {error && <Err>{error}</Err>}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <span className="mt-2 block text-[0.6rem] tracking-wide text-[#c98a8a]">{children}</span>;
}