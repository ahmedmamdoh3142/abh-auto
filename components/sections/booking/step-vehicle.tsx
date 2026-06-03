'use client';

/**
 * StepVehicle — act 01 of the booking flow.
 * Brand → Model → Colour → Plate, beside a cinematic car plate that
 * re-tints to the chosen paint and a live Saudi-style licence plate that
 * mirrors what the owner types.
 */
import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';

import { BRANDS, COLORS } from '@/lib/booking-data';
import type { BookingState } from './booking-flow';
import { PrimaryPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

export function StepVehicle({
  t, isAr, data, onChange, bookingImage, onNext,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  onChange: (patch: Partial<BookingState>) => void;
  bookingImage: string;
  onNext: () => void;
}) {
  const brand = BRANDS.find((b) => b.id === data.brandId);
  const color = COLORS.find((c) => c.key === data.colorKey);
  const complete = data.brandId && data.model && data.colorKey && data.plate.trim().length >= 2;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* ── Left — form ─────────────────────────────────────────── */}
      <div>
        <Heading index="01" label={t('steps.vehicle')} title={t('step1.heading')} sub={t('step1.subheading')} />

        <div className="mt-9 space-y-7">
          {/* Brand */}
          <Field label={t('step1.brand')}>
            <Select
              value={data.brandId}
              placeholder={t('step1.brandPlaceholder')}
              options={BRANDS.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) => onChange({ brandId: v, model: '' })}
            />
          </Field>

          {/* Model */}
          <Field label={t('step1.model')}>
            <Select
              value={data.model}
              placeholder={t('step1.modelPlaceholder')}
              disabled={!brand}
              options={(brand?.models ?? []).map((m) => ({ value: m, label: m }))}
              onChange={(v) => onChange({ model: v })}
            />
          </Field>

          {/* Colour — swatch grid */}
          <Field label={t('step1.color')}>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((c) => {
                const on = data.colorKey === c.key;
                return (
                  <button
                    key={c.key}
                    data-cursor="hover"
                    onClick={() => onChange({ colorKey: c.key })}
                    title={t(`colors.${c.key}`)}
                    className={[
                      'group relative grid h-11 w-11 place-items-center rounded-full transition-all duration-300',
                      on ? 'ring-2 ring-ivory ring-offset-2 ring-offset-[#0a0b0c]' : 'ring-1 ring-white/15 hover:ring-white/40',
                    ].join(' ')}
                  >
                    <span className="h-9 w-9 rounded-full" style={{ background: c.hex, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)' }} />
                    <AnimatePresence>
                      {on && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 grid place-items-center"
                        >
                          <Check className="h-4 w-4 drop-shadow" strokeWidth={2.8}
                            style={{ color: ['white', 'silver', 'beige', 'yellow', 'gold'].includes(c.key) ? '#000' : '#fff' }} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
            {color && (
              <span className="mt-3 block text-[0.62rem] uppercase tracking-[0.2em] text-platinum/70">
                {t(`colors.${color.key}`)}
              </span>
            )}
          </Field>

          {/* Plate */}
          <Field label={t('step1.plate')} hint={t('step1.plateHint')}>
            <input
              value={data.plate}
              onChange={(e) => onChange({ plate: e.target.value.toUpperCase().slice(0, 10) })}
              placeholder={t('step1.platePlaceholder')}
              dir="ltr"
              className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 font-display text-lg tracking-[0.25em] text-ivory placeholder:text-steel/60 placeholder:tracking-normal placeholder:font-sans outline-none transition-colors duration-300 focus:border-platinum/50 focus:bg-white/[0.05]"
            />
          </Field>
        </div>

        <div className="mt-10">
          <button onClick={onNext} disabled={!complete} data-cursor="hover"
            className={complete ? '' : 'pointer-events-none opacity-40 transition-opacity'}>
            <PrimaryPill>{t('step1.continue')}</PrimaryPill>
          </button>
        </div>
      </div>

      {/* ── Right — stage ───────────────────────────────────────── */}
      <div className="relative">
        <div className="sticky top-28">
          {/* Car plate */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-white/[0.08] bg-obsidian">
            <Image src={bookingImage} alt="" fill sizes="(max-width:1024px) 100vw, 45vw"
              className="object-cover brightness-[0.6] grayscale transition-all duration-1000"
              style={{ transform: 'scale(1.06)' }} />

            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />

            {/* corner crosshairs */}
            <Cross />

            {/* live summary overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-platinum/60">
                {t('step1.summaryTitle')}
              </div>
              {brand || data.model ? (
                <motion.h3
                  key={`${data.brandId}-${data.model}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 font-display text-2xl uppercase leading-tight text-ivory md:text-3xl"
                >
                  {brand?.name} {data.model && <span className="text-platinum">{data.model}</span>}
                </motion.h3>
              ) : (
                <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-platinum/50">
                  {t('step1.summaryEmpty')}
                </p>
              )}

              {/* live licence plate */}
              <AnimatePresence>
                {data.plate.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="mt-5 inline-flex"
                  >
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

/* ── Live licence plate ── */
function LicensePlate({ text }: { text: string }) {
  return (
    <div dir="ltr" className="flex items-stretch overflow-hidden rounded-md border border-white/30 bg-gradient-to-b from-[#f6f6f4] to-[#dcdcd8] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col items-center justify-center bg-[#0a0b0c] px-2 py-1.5">
        <span className="text-[0.42rem] font-bold leading-none tracking-wider text-ivory">KSA</span>
        <span className="mt-0.5 text-[0.5rem] leading-none text-platinum">★</span>
      </div>
      <div className="flex items-center px-4 py-1.5">
        <span className="font-display text-xl font-semibold tracking-[0.22em] text-obsidian">
          {text || '—'}
        </span>
      </div>
    </div>
  );
}

/* ── Decorative corner crosshairs ── */
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

/* ── Reusable field shell ── */
export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
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

/* ── Custom select (keeps the monochrome aesthetic; native is ugly) ── */
export function Select({
  value, placeholder, options, onChange, disabled,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        data-cursor="hover"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={[
          'flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-start text-sm transition-colors duration-300',
          disabled
            ? 'cursor-not-allowed border-white/8 bg-white/[0.02] text-steel/50'
            : open
              ? 'border-platinum/50 bg-white/[0.05] text-ivory'
              : 'border-white/12 bg-white/[0.03] text-ivory hover:border-white/25',
        ].join(' ')}
      >
        <span className={selected ? 'text-ivory' : 'text-steel/70'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/12 bg-[#0c0d0e]/95 p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {options.map((o) => {
              const on = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  data-cursor="hover"
                  onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
                  className={[
                    'flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-start text-sm transition-colors duration-200',
                    on ? 'bg-white/[0.08] text-ivory' : 'text-platinum/80 hover:bg-white/[0.05] hover:text-ivory',
                  ].join(' ')}
                >
                  {o.label}
                  {on && <Check className="h-3.5 w-3.5 text-platinum" strokeWidth={2.4} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Step heading ── */
export function Heading({
  index, label, title, sub,
}: { index: string; label: string; title: string; sub: string }) {
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