'use client';

/**
 * StepVehicle — act 01 of the booking flow.
 * لوحة السيارة الآن جزئين: أرقام + حروف (تُخزَّن مدمجة في data.plate).
 * الألوان تأتي من القاعدة (جدول colors) عبر prop `colors` بدل الاعتماد على الترجمة.
 *
 * الماركة والموديل صاروا combobox بسيرش (SearchSelect): تكتب حرف فيتفلتر القائمة.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Check, ChevronDown, Plus, Car, Search } from 'lucide-react';

import { COLORS, type Brand, type VehicleSize } from '@/lib/booking-data';
import type { DbColor } from '@/lib/booking-data-db';
import type { Vehicle } from '@/components/shared/auth-provider';
import type { BookingState } from './booking-flow';
import { PrimaryPill } from './booking-flow';

const EASE = [0.16, 1, 0.3, 1] as const;

const SIZE_LABEL_MAP: Record<VehicleSize, { ar: string; en: string }> = {
  small: { ar: 'صغيرة', en: 'Small' },
  medium: { ar: 'متوسطة', en: 'Medium' },
  large: { ar: 'كبيرة', en: 'Large' },
};

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

// fallback آمن لو ما وصلتش ألوان من القاعدة لأي سبب
const FALLBACK_COLORS: DbColor[] = COLORS.map((c) => ({ key: c.key, hex: c.hex, light: c.light, name: c.key }));

export function StepVehicle({
  t, isAr, data, onChange, bookingImage, onNext, garage = [], brands, colors, onAddCustomModel,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  onChange: (patch: Partial<BookingState>) => void;
  bookingImage: string;
  onNext: () => void;
  garage?: Vehicle[];
  brands: Brand[];
  colors?: DbColor[];
  onAddCustomModel: (brandId: string, model: string, size: VehicleSize) => void;
}) {
  const palette = colors && colors.length > 0 ? colors : FALLBACK_COLORS;
  const brand = brands.find((b) => b.id === data.brandId);
  const color = palette.find((c) => c.key === data.colorKey);
  // مكتمل = ماركة + موديل + لون + على الأقل رقم واحد في اللوحة
  const complete = !!(data.brandId && data.model && data.colorKey && DIGITS_RE.test(data.plate || ''));

  const { digits, letters } = splitPlate(data.plate);
  const [mode, setMode] = useState<'pick' | 'new'>(garage.length > 0 ? 'pick' : 'new');

  // (جديد) نموذج إضافة موديل يدوي لو مش موجود بالقائمة
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSize, setCustomSize] = useState<VehicleSize>('large');
  const [customSaving, setCustomSaving] = useState(false);

  const submitCustomModel = async (brandId: string) => {
    const name = customName.trim();
    if (!name) return;
    setCustomSaving(true);
    try {
      const res = await fetch('/api/brand-models', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, name, size: customSize }),
      });
      const j = await res.json().catch(() => null);
      const finalName = j?.ok && j.model?.name ? j.model.name : name;
      const finalSize: VehicleSize = j?.ok && ['small', 'medium', 'large'].includes(j.model?.size) ? j.model.size : customSize;
      onAddCustomModel(brandId, finalName, finalSize);
    } catch (e) {
      console.error('add custom model failed:', e);
      onAddCustomModel(brandId, name, customSize); // نكمل محليًا حتى لو فشل الحفظ في القاعدة
    } finally {
      setCustomSaving(false);
      setCustomOpen(false);
    }
  };

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
                const c = palette.find((x) => x.key === v.colorKey);
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
                        {c && <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0b0c]" style={{ background: c.hex }} />}
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
                <SearchSelect value={data.brandId} placeholder={t('step1.brandPlaceholder')}
                  searchPlaceholder={isAr ? 'ابحث عن ماركة…' : 'Search brand…'}
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  onChange={(v) => onChange({ brandId: v, model: '' })} />
              </Field>

              <Field label={t('step1.model')}>
                <SearchSelect value={data.model} placeholder={t('step1.modelPlaceholder')} disabled={!brand}
                  searchPlaceholder={isAr ? 'ابحث عن موديل…' : 'Search model…'}
                  options={(brand?.models ?? []).map((m) => ({ value: m, label: m }))}
                  onChange={(v) => { onChange({ model: v }); setCustomOpen(false); }} />

                {brand && !customOpen && (
                  <button type="button" data-cursor="hover"
                    onClick={() => { setCustomOpen(true); setCustomName(''); setCustomSize('large'); }}
                    className="mt-2.5 text-[0.62rem] uppercase tracking-[0.16em] text-platinum/60 underline decoration-dotted underline-offset-4 transition-colors hover:text-ivory">
                    {isAr ? 'الموديل مش موجود؟ أضفه يدويًا' : 'Model not listed? Add it manually'}
                  </button>
                )}

                {brand && customOpen && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-white/12 bg-white/[0.03] p-4">
                    <div>
                      <span className="mb-1.5 block text-[0.55rem] uppercase tracking-[0.2em] text-steel">
                        {isAr ? 'اسم الموديل' : 'Model name'}
                      </span>
                      <input value={customName} onChange={(e) => setCustomName(e.target.value)}
                        placeholder={isAr ? 'اكتب اسم الموديل' : 'Type the model name'}
                        className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-ivory placeholder:text-steel/50 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[0.55rem] uppercase tracking-[0.2em] text-steel">
                        {isAr ? 'حجم السيارة' : 'Vehicle size'}
                      </span>
                      <div className="flex gap-2">
                        {(['small', 'medium', 'large'] as VehicleSize[]).map((sz) => (
                          <button key={sz} type="button" data-cursor="hover" onClick={() => setCustomSize(sz)}
                            className={['flex-1 rounded-xl border px-3 py-2.5 text-[0.68rem] uppercase tracking-wide transition-colors duration-200',
                              customSize === sz ? 'border-platinum/50 bg-platinum/10 text-ivory' : 'border-white/12 text-platinum/70 hover:border-white/25'].join(' ')}>
                            {SIZE_LABEL_MAP[sz][isAr ? 'ar' : 'en']}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button type="button" data-cursor="hover" disabled={!customName.trim() || customSaving}
                        onClick={() => submitCustomModel(brand.id)}
                        className={['rounded-full px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-200',
                          !customName.trim() || customSaving ? 'cursor-not-allowed bg-white/[0.05] text-steel' : 'bg-gradient-to-br from-white to-platinum text-obsidian'].join(' ')}>
                        {customSaving ? (isAr ? 'جارٍ الإضافة…' : 'Adding…') : (isAr ? 'إضافة واستخدام' : 'Add & use')}
                      </button>
                      <button type="button" data-cursor="hover" onClick={() => setCustomOpen(false)}
                        className="text-[0.6rem] uppercase tracking-[0.16em] text-steel transition-colors hover:text-platinum">
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </Field>

              <Field label={t('step1.color')}>
                <div className="flex flex-wrap gap-2.5">
                  {palette.map((c) => {
                    const on = data.colorKey === c.key;
                    return (
                      <button key={c.key} data-cursor="hover" onClick={() => onChange({ colorKey: c.key })} title={c.name}
                        className={['group relative grid h-11 w-11 place-items-center rounded-full transition-all duration-300', on ? 'ring-2 ring-ivory ring-offset-2 ring-offset-[#0a0b0c]' : 'ring-1 ring-white/15 hover:ring-white/40'].join(' ')}>
                        <span className="h-9 w-9 rounded-full" style={{ background: c.hex, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)' }} />
                        <AnimatePresence>
                          {on && (
                            <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 grid place-items-center">
                              <Check className="h-4 w-4 drop-shadow" strokeWidth={2.8} style={{ color: c.light ? '#000' : '#fff' }} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>
                {color && <span className="mt-3 block text-[0.62rem] uppercase tracking-[0.2em] text-platinum/70">{color.name}</span>}
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

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
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

/* ════════════════════════════════════════════════════════════════════
   SearchSelect — combobox بسيرش: تكتب حرف فيتفلتر، مع دعم لوحة المفاتيح.
   (مستقل عن Select القديم عشان لا نكسر بقية الاستيرادات)
   ════════════════════════════════════════════════════════════════════ */
export function SearchSelect({
  value, placeholder, searchPlaceholder, options, onChange, disabled,
}: {
  value: string;
  placeholder: string;
  searchPlaceholder?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0); // العنصر المميّز للكيبورد
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // فلترة بسيطة وذكية: تجاهل حالة الأحرف والمسافات الزائدة
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [q, options]);

  // قفل عند الضغط خارج المكوّن
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // عند الفتح: صفّر البحث وركّز على خانة الكتابة
  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  // إبقاء العنصر المميّز ظاهرًا أثناء التنقل بالكيبورد
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (v: string) => { onChange(v); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) choose(o.value); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" data-cursor="hover" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className={['flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-start text-sm transition-colors duration-300',
          disabled ? 'cursor-not-allowed border-white/8 bg-white/[0.02] text-steel/50' : open ? 'border-platinum/50 bg-white/[0.05] text-ivory' : 'border-white/12 bg-white/[0.03] text-ivory hover:border-white/25'].join(' ')}>
        <span className={selected ? 'text-ivory' : 'text-steel/70'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-platinum transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {/* خانة البحث */}
            <div className="border-b border-white/[0.06] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-platinum/50" strokeWidth={1.8} />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setActive(0); }}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder ?? placeholder}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 ps-9 pe-3 text-sm text-ivory placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/40 focus:bg-white/[0.05]"
                />
              </div>
            </div>

            {/* القائمة المفلترة */}
            <div ref={listRef} className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-[0.72rem] text-steel">
                  {/* لا نتائج */}
                  {searchPlaceholder?.includes('ابحث') ? 'لا توجد نتائج' : 'No results'}
                </div>
              ) : (
                filtered.map((o, i) => {
                  const on = o.value === value;
                  const hot = i === active;
                  return (
                    <button key={o.value} type="button" data-cursor="hover" data-idx={i}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
                      className={['flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-start text-sm transition-colors duration-150',
                        on ? 'bg-white/[0.08] text-ivory' : hot ? 'bg-white/[0.05] text-ivory' : 'text-platinum/80'].join(' ')}>
                      {o.label}{on && <Check className="h-3.5 w-3.5 text-platinum" strokeWidth={2.4} />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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