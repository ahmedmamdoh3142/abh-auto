'use client';

/**
 * StepDetails — act 03. Contact form + date/time popovers.
 * المواعيد دلوقتي كل ساعة (مش نص ساعة)، من 10ص لـ 9م.
 * المدن تأتي من القاعدة عبر /api/cities (مع fallback آمن للستاتيك المترجم).
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import type { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import { CITIES, BRANCHES, branchLabel, cityLabel } from '@/lib/booking-data';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';
import { Heading, Field, Select } from './step-vehicle';
import { PhoneField, isValidPhone } from '@/components/shared/phone-field';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const OPEN_MIN = 10 * 60;   // 10:00 AM
const CLOSE_MIN = 21 * 60;  // 09:00 PM
const SLOT_STEP = 60;       // كل ساعة

/* مدن من القاعدة — مصدر واحد للحقيقة. عند الفشل نرجع للستاتيك المترجم. */
function useCityOptions(isAr: boolean): { value: string; label: string }[] {
  const [db, setDb] = useState<{ value: string; label: string }[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/cities');
        const j = await res.json();
        if (alive && j?.ok && Array.isArray(j.cities) && j.cities.length) {
          setDb(j.cities.map((c: any) => ({
            value: c.code,
            label: (isAr ? c.name?.ar : c.name?.en) || c.name?.ar || c.name?.en || c.code,
          })));
        }
      } catch { /* fallback */ }
    })();
    return () => { alive = false; };
  }, [isAr]);

  return db ?? CITIES.map((c) => ({ value: c, label: cityLabel(c, isAr) }));
}

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
  const cityOptions = useCityOptions(isAr);

  const errors: Record<string, string | null> = {
    name: data.name.trim() ? null : t('step3.validation.nameRequired'),
    phone: !data.phone.trim()
      ? t('step3.validation.phoneRequired')
      : isValidPhone(data.phone) ? null : t('step3.validation.phoneInvalid'),
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
          <PhoneField isAr={isAr} value={data.phone} onChange={(p) => set({ phone: p })}
            placeholder={t('step3.phonePlaceholder')} error={touched ? errors.phone : null} />
        </Field>

        <Field label={t('step3.email')}>
          <IconInput icon={Mail} value={data.email} onChange={(v) => set({ email: v })}
            placeholder={t('step3.emailPlaceholder')} dir="ltr" error={touched ? errors.email : null} />
        </Field>

        <Field label={t('step3.city')}>
          <Select value={data.city} placeholder={t('step3.cityPlaceholder')}
            options={cityOptions}
            onChange={(v) => set({ city: v })} />
          {touched && errors.city && <Err>{errors.city}</Err>}
        </Field>

        <Field label={t('step3.branch')}>
          <Select value={data.branch} placeholder={t('step3.branchPlaceholder')}
            options={BRANCHES.map((b) => ({ value: b, label: branchLabel(b, isAr) }))}
            onChange={(v) => set({ branch: v })} />
          {touched && errors.branch && <Err>{errors.branch}</Err>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('step3.date')}>
            <DatePopover isAr={isAr} value={data.date} display={dateNice}
              placeholder={t('step3.datePlaceholder')} calMonth={data.calMonth}
              setCalMonth={(cm) => set({ calMonth: cm })} onPick={(iso) => set({ date: iso })} />
            {touched && errors.date && <Err>{errors.date}</Err>}
          </Field>

          <Field label={t('step3.time')}>
            <TimePopover t={t} value={data.time} placeholder={t('step3.timePlaceholder')} onPick={(time) => set({ time })} />
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

function TriggerButton({ icon: Icon, filled, children, onClick, open }: { icon: React.ElementType; filled: boolean; children: React.ReactNode; onClick: () => void; open: boolean }) {
  return (
    <button type="button" data-cursor="hover" onClick={onClick}
      className={['flex w-full items-center gap-3 rounded-2xl border bg-white/[0.03] px-5 py-4 text-start text-sm transition-colors duration-300',
        open ? 'border-platinum/50 bg-white/[0.05]' : 'border-white/12 hover:border-white/25'].join(' ')}>
      <Icon className="h-4 w-4 flex-none text-platinum/60" strokeWidth={1.8} />
      <span className={filled ? 'text-ivory' : 'text-steel/70'}>{children}</span>
    </button>
  );
}

function DatePopover({ isAr, value, display, placeholder, calMonth, setCalMonth, onPick }: {
  isAr: boolean; value: string; display: string; placeholder: string;
  calMonth: { y: number; m: number } | null; setCalMonth: (cm: { y: number; m: number }) => void; onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const place = usePlacement(ref, open, 380);

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
    const isFriday = date.getDay() === 5; // الجمعة إجازة
    const disabled = past || isFriday;
    cells.push(
      <button key={iso} type="button" disabled={disabled} data-cursor={disabled ? undefined : 'hover'}
        onClick={disabled ? undefined : () => { onPick(iso); setOpen(false); }}
        title={isFriday && !past ? (isAr ? 'الجمعة إجازة' : 'Closed on Friday') : undefined}
        className={['grid aspect-square place-items-center rounded-[10px] border font-display text-[0.9rem] tabular-nums transition-all duration-200',
          past ? 'cursor-not-allowed border-transparent text-steel/35 line-through decoration-steel/30'
            : isFriday ? 'cursor-not-allowed border-transparent text-steel/30'
            : sel ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian'
            : 'border-transparent text-ivory/85 hover:border-white/20 hover:bg-white/[0.05]',
          isToday && !sel ? 'shadow-[inset_0_0_0_1px_rgba(203,205,205,0.3)]' : ''].join(' ')}>{d}</button>,
    );
  }

  return (
    <div className="relative" ref={ref}>
      <TriggerButton icon={Calendar} filled={!!display} open={open} onClick={() => setOpen((o) => !o)}>
        {display || placeholder}
      </TriggerButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: place === 'up' ? 8 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: place === 'up' ? 8 : -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`absolute z-40 ${place === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} w-[300px] max-w-[90vw] rounded-2xl border border-white/12 bg-[#0c0d0e]/97 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl`}>
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

function TimePopover({ t, value, placeholder, onPick }: { t: ReturnType<typeof useTranslations>; value: string; placeholder: string; onPick: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const place = usePlacement(ref, open, 440);

  const initParts = value ? to12Parts(value) : null;
  const [text, setText] = useState(initParts ? `${initParts.h}:${pad(initParts.m)}` : '');
  const [mer, setMer] = useState<'AM' | 'PM'>(initParts ? initParts.mer : 'AM');

  const onText = (raw: string) => {
    let s = raw.replace(/[^\d]/g, '').slice(0, 4);
    if (s.length >= 3) s = s.slice(0, s.length - 2) + ':' + s.slice(s.length - 2);
    setText(s);
  };

  const { h, m } = parseText(text);
  const hOk = h !== null && h >= 1 && h <= 12;
  const mEff = m === null ? 0 : m;
  const mOk = mEff >= 0 && mEff <= 59;
  const cand = hOk && mOk ? to24(h as number, mEff, mer) : null;
  const inWindow = cand !== null && within(cand);
  const isValid = cand !== null && inWindow;
  const outOfRange = cand !== null && !inWindow;

  const slots = useMemo(buildSlots, []);
  const groups = [
    { key: 'morning', label: t('step3.morning'), items: slots.filter((s) => mins(s) < 12 * 60) },
    { key: 'afternoon', label: t('step3.afternoon'), items: slots.filter((s) => mins(s) >= 12 * 60 && mins(s) < 17 * 60) },
    { key: 'evening', label: t('step3.evening'), items: slots.filter((s) => mins(s) >= 17 * 60) },
  ];

  const apply = (v: string) => { onPick(v); setOpen(false); };
  const done = () => { if (isValid && cand) apply(cand); };
  const pickSlot = (v: string) => { const p = to12Parts(v); setText(`${p.h}:${pad(p.m)}`); setMer(p.mer); apply(v); };

  const display = value ? fmt12(value) : '';

  return (
    <div className="relative" ref={ref}>
      <TriggerButton icon={Clock} filled={!!display} open={open} onClick={() => setOpen((o) => !o)}>
        {display || placeholder}
      </TriggerButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: place === 'up' ? 8 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: place === 'up' ? 8 : -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`absolute z-40 ${place === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} w-[300px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/97 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl`}>
            <div className="border-b border-white/[0.06] px-4 pb-3 pt-4">
              <div className="flex items-center justify-center gap-3">
                <input dir="ltr" inputMode="numeric" value={text} onChange={(e) => onText(e.target.value)} placeholder="--:--" aria-label="time"
                  className={['w-[5.2rem] bg-transparent text-center font-display text-[2.4rem] leading-none tabular-nums outline-none transition-colors placeholder:text-steel/35',
                    outOfRange ? 'text-[#e7a3a3]' : 'text-ivory'].join(' ')} />
                <div className="flex flex-col gap-1">
                  {(['AM', 'PM'] as const).map((mm) => {
                    const on = mer === mm;
                    return (
                      <button key={mm} type="button" data-cursor="hover" onClick={() => setMer(mm)}
                        className={['rounded-lg px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-all duration-200',
                          on ? 'bg-gradient-to-br from-white to-platinum text-obsidian' : 'border border-white/12 text-platinum/70 hover:border-white/30 hover:text-ivory'].join(' ')}>
                        {t(`step3.${mm === 'AM' ? 'am' : 'pm'}`)}</button>
                    );
                  })}
                </div>
              </div>
              {outOfRange
                ? <p className="mt-2.5 text-center text-[0.62rem] tracking-wide text-[#c98a8a]">{t('step3.timeOutOfRange')}</p>
                : <p className="mt-2.5 text-center text-[0.52rem] uppercase tracking-[0.18em] text-steel">{t('step3.timeRange')}</p>}
            </div>

            <div className="scrollbar-thin max-h-[210px] space-y-3 overflow-y-auto p-3">
              {groups.map((g) => g.items.length ? (
                <div key={g.key}>
                  <div className="mb-1.5 px-1 text-[0.5rem] uppercase tracking-[0.2em] text-steel">{g.label}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {g.items.map((s) => {
                      const on = value === s;
                      return (
                        <button key={s} type="button" data-cursor="hover" dir="ltr" onClick={() => pickSlot(s)}
                          className={['rounded-lg border py-2 text-center font-display text-[0.82rem] tabular-nums transition-all duration-200',
                            on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/10 bg-white/[0.02] text-ivory/85 hover:border-white/25'].join(' ')}>
                          {fmt12Short(s)}</button>
                      );
                    })}
                  </div>
                </div>
              ) : null)}
            </div>

            <button type="button" data-cursor="hover" disabled={!isValid} onClick={done}
              className="w-full border-t border-white/[0.06] py-3 text-[0.6rem] uppercase tracking-[0.24em] text-platinum/85 transition-colors hover:text-ivory disabled:cursor-not-allowed disabled:text-steel/40">
              {t('step3.timeDone')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function parseText(text: string): { h: number | null; m: number | null } {
  if (!text) return { h: null, m: null };
  const [hp, mp] = text.split(':');
  const h = hp ? parseInt(hp, 10) : NaN;
  const m = mp !== undefined && mp !== '' ? parseInt(mp, 10) : NaN;
  return { h: isNaN(h) ? null : h, m: mp === undefined ? null : (isNaN(m) ? null : m) };
}
function to24(h12: number, m: number, mer: 'AM' | 'PM'): string { let h = h12 % 12; if (mer === 'PM') h += 12; return `${pad(h)}:${pad(m)}`; }
function to12Parts(v: string): { h: number; m: number; mer: 'AM' | 'PM' } {
  const [H, M] = v.split(':').map(Number);
  const mer: 'AM' | 'PM' = H >= 12 ? 'PM' : 'AM';
  let h = H % 12; if (h === 0) h = 12;
  return { h, m: M || 0, mer };
}
function fmt12(v: string): string { const p = to12Parts(v); return `${p.h}:${pad(p.m)} ${p.mer}`; }
function fmt12Short(v: string): string { const p = to12Parts(v); return `${p.h}:${pad(p.m)}`; }
function mins(v: string): number { const [H, M] = v.split(':').map(Number); return H * 60 + M; }
function within(v: string): boolean { const t = mins(v); return t >= OPEN_MIN && t <= CLOSE_MIN; }
function buildSlots(): string[] {
  const out: string[] = [];
  for (let t = OPEN_MIN; t <= CLOSE_MIN; t += SLOT_STEP) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

function usePlacement(ref: React.RefObject<HTMLElement>, open: boolean, estimated: number) {
  const [place, setPlace] = useState<'up' | 'down'>('down');
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom; const above = r.top;
      const mobile = window.innerWidth < 768;
      if (mobile) setPlace(above > 220 ? 'up' : 'down');
      else setPlace(below < estimated && above > below ? 'up' : 'down');
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => { window.removeEventListener('resize', compute); window.removeEventListener('scroll', compute, true); };
  }, [open, estimated, ref]);
  return place;
}

function useOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function IconInput({ icon: Icon, value, onChange, placeholder, dir, error }: {
  icon: React.ElementType; value: string; onChange: (v: string) => void; placeholder: string; dir?: 'ltr' | 'rtl'; error?: string | null;
}) {
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-platinum/60" strokeWidth={1.8} />
        <input value={value} dir={dir} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={['w-full rounded-2xl border bg-white/[0.03] px-5 py-4 ps-11 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors duration-300',
            error ? 'border-[#7c1a1a]/70 focus:border-[#7c1a1a]' : 'border-white/12 focus:border-platinum/50 focus:bg-white/[0.05]'].join(' ')} />
      </div>
      {error && <Err>{error}</Err>}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <span className="mt-2 block text-[0.6rem] tracking-wide text-[#c98a8a]">{children}</span>;
}