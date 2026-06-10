'use client';

/**
 * StepVehicle — act 01 of the booking flow.
 * لوحة السيارة الآن جزئين: أرقام + حروف (تُخزَّن مدمجة في data.plate).
 */
import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Check, ChevronDown, Plus, Car } from 'lucide-react';

import { COLORS, type Brand } from '@/lib/booking-data';
import type { Vehicle } from '@/components/shared/auth-provider';
import type { BookingState } from './booking-flow';
import { PrimaryPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── أدوات اللوحة: أرقام + حروف ──────────────────────────── */
const DIGITS_RE = /[0-9\u0660-\u0669]/g;            // أرقام لاتيني + عربي
export function splitPlate(plate: string): { digits: string; letters: string } {
  const p = plate || '';
  const digits = (p.match(DIGITS_RE) || []).join('');
  const letters = p.replace(DIGITS_RE, '').replace(/\s+/g, ' ').trim();
  return { digits, letters };
}
export function joinPlate(digits: string, letters: string): string {
  return [digits.trim(), letters.trim()].filter(Boolean).join(' ');
}
const onlyDigits = (s: string) => s.replace(/[^0-9\u0660-\u0669]/g, '').slice(0, 4);
// الحروف تتفصل تلقائيًا: "أبج" -> "أ ب ج" (4 حروف كحد أقصى)
const onlyLetters = (s: string) =>
  s.replace(DIGITS_RE, '').replace(/\s+/g, '').split('').slice(0, 4).join(' ');

export function StepVehicle({
  t, isAr, data, onChange, bookingImage, onNext, garage = [], brands,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  onChange: (patch: Partial<BookingState>) => void;
  bookingImage: string;
  onNext: () => void;
  garage?: Vehicle[];
  brands: Brand[];
}) {
  const brand = brands.find((b) => b.id === data.brandId);
  const color = COLORS.find((c) => c.key === data.colorKey);
  // مكتمل = ماركة + موديل + لون + على الأقل رقم واحد في اللوحة
  const complete = !!(data.brandId && data.model && data.colorKey && DIGITS_RE.test(data.plate || ''));

  const { digits, letters } = splitPlate(data.plate);
  const [mode, setMode] = useState<'pick' | 'new'>(garage.length > 0 ? 'pick' : 'new');

  const pickVehicle = (v: Vehicle) =>
    onChange({ brandId: v.brandId, model: v.model, colorKey: v.colorKey, plate: v.plate });

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        {mode === 'pick' && garage.length > 0 ? (
          <div>
            <Heading index="01" label={t('steps.vehicle')} title={t('step1.garageTitle')} sub={t('step1.garageHint')} />

            <div className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {garage.map((v, i) => {
                const b = brands.find((x) => x.id === v.brandId);
                const c = COLORS.find((x) => x.key === v.colorKey);
                const on = data.brandId === v.brandId && data.model === v.model && data.plate === v.plate;
                return (
                  <motion.button
                    key={v.id} data-cursor="hover" onClick={() => pickVehicle(v)}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.45, ease: EASE }}
                    className={[
                      'group relative overflow-hidden rounded-[20px] border p-5 text-start transition-all duration-300',
                      on ? 'border-platinum/50 bg-platinum/[0.06] shadow-[0_24px_60px_-34px_rgba(203,205,205,0.5)]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/25',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between">
                      <span className="relative grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-obsidian/70">
                        <span className="font-display text-base uppercase text-platinum">{(b?.name ?? '?').charAt(0)}</span>
                        {c && <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0b0c]" style={{ background: (c as any).hex }} />}
                      </span>
                      <span className={[
                        'grid h-6 w-6 place-items-center rounded-full border transition-all duration-300',
                        on ? 'border-transparent bg-gradient-to-br from-white to-platinum text-obsidian' : 'border-white/20 text-transparent',
                      ].join(' ')}>
                        <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                      </span>
                    </div>
                    <div className="mt-4 font-display text-lg uppercase leading-none text-ivory">{b?.name ?? '—'}</div>
                    <div className="mt-1 text-[0.72rem] uppercase tracking-wide text-platinum/70">{v.model}</div>
                    {v.plate && <div dir="ltr" className="mt-3 font-display text-[0.72rem] tracking-[0.16em] text-platinum/55">{v.plate}</div>}
                  </motion.button>
                );
              })}

              <button
                data-cursor="hover" onClick={() => { onChange({ brandId: '', model: '', colorKey: '', plate: '' }); setMode('new'); }}
                className="group grid min-h-[132px] place-items-center rounded-[20px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]"
              >
                <span className="flex flex-col items-center gap-2.5 text-platinum/55 transition-colors group-hover:text-platinum">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.03]"><Plus className="h-4 w-4" strokeWidth={1.8} /></span>
                  <span className="text-[0.6rem] uppercase tracking-[0.16em]">{t('step1.garageNew')}</span>
                </span>
              </button>
            </div>

            <div className="mt-10">
              <button onClick={onNext} disabled={!complete} data-cursor="hover" className={complete ? '' : 'pointer-events-none opacity-40 transition-opacity'}>
                <PrimaryPill>{t('step1.continue')}</PrimaryPill>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <Heading index="01" label={t('steps.vehicle')} title={t('step1.heading')} sub={t('step1.subheading')} />

            {garage.length > 0 && (
              <button data-cursor="hover" onClick={() => setMode('pick')}
                className="mt-5 inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-platinum/70 transition-colors hover:text-ivory">
                <Car className="reversible-icon h-3.5 w-3.5" strokeWidth={1.7} />{t('step1.garageBack')}
              </button>
            )}

            <div className="mt-7 space-y-7">
              <Field label={t('step1.brand')}>
                <Select value={data.brandId} placeholder={t('step1.brandPlaceholder')}
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  onChange={(v) => onChange({ brandId: v, model: '' })} />
              </Field>

              <Field label={t('step1.model')}>
                <Select value={data.model} placeholder={t('step1.modelPlaceholder')} disabled={!brand}
                  options={(brand?.models ?? []).map((m) => ({ value: m, label: m }))}
                  onChange={(v) => onChange({ model: v })} />
              </Field>

              <Field label={t('step1.color')}>
                <div className="flex flex-wrap gap-2.5">
                  {COLORS.map((c) => {
                    const on = data.colorKey === c.key;
                    return (
                      <button key={c.key} data-cursor="hover" onClick={() => onChange({ colorKey: c.key })} title={t(`colors.${c.key}`)}
                        className={['group relative grid h-11 w-11 place-items-center rounded-full transition-all duration-300', on ? 'ring-2 ring-ivory ring-offset-2 ring-offset-[#0a0b0c]' : 'ring-1 ring-white/15 hover:ring-white/40'].join(' ')}>
                        <span className="h-9 w-9 rounded-full" style={{ background: c.hex, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)' }} />
                        <AnimatePresence>
                          {on && (
                            <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 grid place-items-center">
                              <Check className="h-4 w-4 drop-shadow" strokeWidth={2.8} style={{ color: ['white', 'silver', 'beige', 'gold'].includes(c.key) ? '#000' : '#fff' }} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>
                {color && <span className="mt-3 block text-[0.62rem] uppercase tracking-[0.2em] text-platinum/70">{t(`colors.${color.key}`)}</span>}
              </Field>

              {/* اللوحة — جزئين: أرقام + حروف */}
              <Field label={t('step1.plate')} hint={t('step1.plateHint')}>
                <div dir="ltr" className="grid grid-cols-[1.1fr_1.4fr] gap-3">
                  <div>
                    <span className="mb-1.5 block text-[0.5rem] uppercase tracking-[0.2em] text-steel">{isAr ? 'أرقام' : 'Numbers'}</span>
                    <input value={digits} inputMode="numeric"
                      onChange={(e) => onChange({ plate: joinPlate(onlyDigits(e.target.value), letters) })}
                      placeholder="1234" dir="ltr"
                      className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-center font-display text-lg tracking-[0.25em] text-ivory placeholder:text-steel/50 placeholder:tracking-normal placeholder:font-sans outline-none transition-colors duration-300 focus:border-platinum/50 focus:bg-white/[0.05]" />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[0.5rem] uppercase tracking-[0.2em] text-steel">{isAr ? 'حروف' : 'Letters'}</span>
                    <input value={letters}
                      onChange={(e) => onChange({ plate: joinPlate(digits, onlyLetters(e.target.value)) })}
                      placeholder={isAr ? 'أ ب ج' : 'ABC'} dir={isAr ? 'rtl' : 'ltr'}
                      className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-center font-display text-lg tracking-[0.25em] text-ivory placeholder:text-steel/50 placeholder:tracking-normal placeholder:font-sans outline-none transition-colors duration-300 focus:border-platinum/50 focus:bg-white/[0.05]" />
                  </div>
                </div>
              </Field>
            </div>

            <div className="mt-10">
              <button onClick={onNext} disabled={!complete} data-cursor="hover" className={complete ? '' : 'pointer-events-none opacity-40 transition-opacity'}>
                <PrimaryPill>{t('step1.continue')}</PrimaryPill>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right — stage ── */}
      <div className="relative">
        <div className="sticky top-28">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-white/[0.08] bg-obsidian">
            <Image src={bookingImage} alt="" fill sizes="(max-width:1024px) 100vw, 45vw"
              className="object-cover brightness-[0.6] grayscale transition-all duration-1000" style={{ transform: 'scale(1.06)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />
            <Cross />

            <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-platinum/60">{t('step1.summaryTitle')}</div>
              {brand || data.model ? (
                <motion.h3 key={`${data.brandId}-${data.model}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 font-display text-2xl uppercase leading-tight text-ivory md:text-3xl">
                  {brand?.name} {data.model && <span className="text-platinum">{data.model}</span>}
                </motion.h3>
              ) : (
                <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-platinum/50">{t('step1.summaryEmpty')}</p>
              )}

              <AnimatePresence>
                {data.plate.trim() && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.4, ease: EASE }} className="mt-5 inline-flex">
                    <LicensePlate text={data.plate} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LicensePlate({ text }: { text: string }) {
  return (
    <div dir="ltr" className="flex items-stretch overflow-hidden rounded-md border border-white/30 bg-gradient-to-b from-[#f6f6f4] to-[#dcdcd8] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col items-center justify-center bg-[#0a0b0c] px-2 py-1.5">
        <span className="text-[0.42rem] font-bold leading-none tracking-wider text-ivory">KSA</span>
        <span className="mt-0.5 text-[0.5rem] leading-none text-platinum">★</span>
      </div>
      <div className="flex items-center px-4 py-1.5">
        <span className="font-display text-xl font-semibold tracking-[0.22em] text-obsidian">{text || '—'}</span>
      </div>
    </div>
  );
}

function Cross() {
  const arm = 'absolute bg-ivory/40';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-4 z-10">
      <span className={`${arm} left-0 top-0 h-px w-4`} />
      <span className={`${arm} left-0 top-0 h-4 w-px`} />
      <span className={`${arm} right-0 top-0 h-px w-4`} />
      <span className={`${arm} right-0 top-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 left-0 h-px w-4`} />
      <span className={`${arm} bottom-0 left-0 h-4 w-px`} />
      <span className={`${arm} bottom-0 right-0 h-px w-4`} />
      <span className={`${arm} bottom-0 right-0 h-4 w-px`} />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[0.62rem] uppercase tracking-[0.26em] text-platinum/80">{label}</span>
        {hint && <span className="text-[0.55rem] text-steel">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Select({
  value, placeholder, options, onChange, disabled,
}: {
  value: string; placeholder: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button type="button" data-cursor="hover" disabled={disabled} onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={['flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-start text-sm transition-colors duration-300',
          disabled ? 'cursor-not-allowed border-white/8 bg-white/[0.02] text-steel/50' : open ? 'border-platinum/50 bg-white/[0.05] text-ivory' : 'border-white/12 bg-white/[0.03] text-ivory hover:border-white/25'].join(' ')}>
        <span className={selected ? 'text-ivory' : 'text-steel/70'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>
      <AnimatePresence>
        {open && !disabled && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[#0c0d0e]/95 p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
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

export function Heading({ index, label, title, sub }: { index: string; label: string; title: string; sub: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3.5">
        <span className="font-display text-base text-platinum tabular-nums">{index}</span>
        <span className="h-px w-8 bg-platinum/40" />
        <span className="text-[0.55rem] uppercase tracking-[0.3em] text-steel">{label}</span>
      </div>
      <h2 className="font-display text-3xl font-light uppercase leading-tight tracking-tight text-ivory md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-platinum/60">{sub}</p>
    </div>
  );
}