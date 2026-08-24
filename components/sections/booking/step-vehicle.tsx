'use client';

/**
 * StepVehicle — act 01 of the booking flow.
 * (تحديث) أُلغيت بيانات اللون واللوحة بالكامل من هذه الخطوة، وأُدمجت بيانات
 * التواصل الأساسية (الاسم، الهاتف، الموعد، موافقة الواتساب) هنا بدل خطوة
 * منفصلة. الفرع أصبح تلقائيًا (فرع واحد فقط) ولم يعد يُختار من الواجهة.
 *
 * الماركة والموديل صاروا combobox بسيرش (SearchSelect): تكتب حرف فيتفلتر القائمة.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { useTranslations } from 'next-intl';
import { Check, ChevronDown, Plus, Car, Search, User, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import type { Brand, VehicleSize } from '@/lib/booking-data';
import type { Vehicle } from '@/components/shared/auth-provider';
import type { BookingState, WarrantyCoverage } from './booking-flow';
import { PrimaryPill } from './booking-flow';
import { PhoneField, isValidPhone } from '@/components/shared/phone-field';

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── أدوات اللوحة (مُبقاة للتوافق مع أي كود تاني بيستوردها؛ غير مُستخدمة هنا) ── */
const DIGITS_RE = /[0-9\u0660-\u0669]/g;
export function splitPlate(plate: string): { digits: string; letters: string } {
  const p = plate || '';
  const digits = (p.match(DIGITS_RE) || []).join('');
  const letters = p.replace(DIGITS_RE, '').replace(/\s+/g, ' ').trim();
  return { digits, letters };
}
export function joinPlate(digits: string, letters: string): string {
  return [digits.trim(), letters.trim()].filter(Boolean).join(' ');
}

const OPEN_MIN = 10 * 60;   // 10:00 AM
const CLOSE_MIN = 21 * 60;  // 09:00 PM
const SLOT_STEP = 60;       // كل ساعة
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function StepVehicle({
  t, isAr, data, onChange, set, bookingImage, onNext, garage = [], brands, onAddCustomModel,
}: {
  t: ReturnType<typeof useTranslations>;
  isAr: boolean;
  data: BookingState;
  onChange: (patch: Partial<BookingState>) => void;
  /** (جديد) لتحديث بيانات التواصل والموعد المدمجة في هذه الخطوة. */
  set: (patch: Partial<BookingState>) => void;
  bookingImage: string;
  onNext: () => void;
  garage?: Vehicle[];
  brands: Brand[];
  onAddCustomModel: (brandId: string, model: string, size: VehicleSize) => void;
  /** غير مُستخدمة فعليًا بعد إلغاء حقل اللوحة — أُبقيت في التوقيع للتوافق مع استدعاء BookingFlow. */
  maintenanceCovered?: WarrantyCoverage[];
  onStartMaintenance?: (w: WarrantyCoverage) => void;
  maintenanceIntent?: boolean;
  loggedIn?: boolean;
}) {
  const brand = brands.find((b) => b.id === data.brandId);
  const vehicleOk = !!(data.brandId && data.model);
  const [mode, setMode] = useState<'pick' | 'new'>(garage.length > 0 ? 'pick' : 'new');

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
      onAddCustomModel(brandId, name, customSize);
    } finally {
      setCustomSaving(false);
      setCustomOpen(false);
    }
  };

  const pickVehicle = (v: Vehicle) => onChange({ brandId: v.brandId, model: v.model });

  /* ── بيانات التواصل والموعد ── */
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (data.whatsappOptIn === undefined) set({ whatsappOptIn: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors: Record<string, string | null> = {
    name: data.name.trim() ? null : t('step3.validation.nameRequired'),
    phone: !data.phone.trim()
      ? t('step3.validation.phoneRequired')
      : isValidPhone(data.phone) ? null : t('step3.validation.phoneInvalid'),
    date: data.date ? null : t('step3.validation.dateRequired'),
    time: data.time ? null : t('step3.validation.timeRequired'),
  };
  const complete = vehicleOk && Object.values(errors).every((e) => e === null);
  const handleNext = () => { if (complete) onNext(); else setTouched(true); };

  const dateNice = data.date
    ? new Date(data.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        <Heading index="01" label={t('steps.vehicle')} title={t('step1.heading')} sub={t('step1.subheading')} />

        {mode === 'pick' && garage.length > 0 ? (
          <div className="mt-7">
            <div className="mb-5">
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-platinum/60">{t('step1.garageHint')}</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {garage.map((v, i) => {
                const b = brands.find((x) => x.id === v.brandId);
                const on = data.brandId === v.brandId && data.model === v.model;
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
                  </motion.button>
                );
              })}

              <button
                data-cursor="hover" onClick={() => { onChange({ brandId: '', model: '' }); setMode('new'); }}
                className="group grid min-h-[132px] place-items-center rounded-[20px] border border-dashed border-white/15 transition-all duration-300 hover:border-platinum/40 hover:bg-white/[0.02]"
              >
                <span className="flex flex-col items-center gap-2.5 text-platinum/55 transition-colors group-hover:text-platinum">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.03]"><Plus className="h-4 w-4" strokeWidth={1.8} /></span>
                  <span className="text-[0.6rem] uppercase tracking-[0.16em]">{t('step1.garageNew')}</span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-7 space-y-7">
            {garage.length > 0 && (
              <button data-cursor="hover" onClick={() => setMode('pick')}
                className="inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.16em] text-platinum/70 transition-colors hover:text-ivory">
                <Car className="reversible-icon h-3.5 w-3.5" strokeWidth={1.7} />{t('step1.garageBack')}
              </button>
            )}

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
                          {sz === 'small' ? (isAr ? 'صغيرة' : 'Small') : sz === 'medium' ? (isAr ? 'متوسطة' : 'Medium') : (isAr ? 'كبيرة' : 'Large')}
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
          </div>
        )}

        {/* ── بيانات التواصل والموعد ── */}
        <div className="mt-10 space-y-7 border-t border-white/10 pt-8">
          <div className="flex items-center gap-3">
            <span className="text-[0.58rem] uppercase tracking-[0.28em] text-platinum/80">
              {isAr ? 'بيانات التواصل والموعد' : 'Contact & appointment'}
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('step3.fullName')}>
              <IconInput icon={User} value={data.name} onChange={(v) => set({ name: v })}
                placeholder={t('step3.fullNamePlaceholder')} error={touched ? errors.name : null} />
            </Field>

            <Field label={t('step3.phone')}>
              <PhoneField isAr={isAr} value={data.phone} onChange={(p) => set({ phone: p })}
                placeholder={t('step3.phonePlaceholder')} error={touched ? errors.phone : null} />
            </Field>

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

          <WhatsAppConsent isAr={isAr} checked={data.whatsappOptIn ?? false} onChange={(v) => set({ whatsappOptIn: v })} />
        </div>

        <div className="mt-10">
          <button onClick={handleNext} disabled={!complete} data-cursor="hover"
            className={complete ? '' : 'pointer-events-none opacity-40 transition-opacity'}>
            <PrimaryPill>{t('step1.continue')}</PrimaryPill>
          </button>
        </div>
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
            </div>
          </div>
        </div>
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

/* ══════════════════ حقول التواصل والموعد ══════════════════ */

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

function WhatsAppConsent({ isAr, checked, onChange }: { isAr: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      data-cursor="hover"
      className={['flex cursor-pointer items-start gap-3.5 rounded-2xl border px-5 py-4 transition-colors duration-300',
        checked ? 'border-[#9fd4b0]/35 bg-[#9fd4b0]/[0.06]' : 'border-white/12 bg-white/[0.02] hover:border-white/25'].join(' ')}>
      <span className={['mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg border transition-all duration-300',
        checked ? 'border-transparent bg-gradient-to-br from-[#9fd4b0] to-[#7ec594] text-obsidian' : 'border-white/25'].join(' ')}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="sr-only" aria-label={isAr ? 'موافقة الواتساب' : 'WhatsApp consent'} />
      <span>
        <span className="block text-sm text-ivory">
          {isAr ? 'أوافق على التواصل معي عبر واتساب' : 'I agree to be contacted on WhatsApp'}
        </span>
        <span className="mt-1 block text-[0.72rem] leading-relaxed text-platinum/55">
          {isAr
            ? 'لإرسال تأكيد الحجز، تذكير الموعد، والعروض الخاصة. يمكنك إلغاء الاشتراك في أي وقت.'
            : 'For booking confirmation, appointment reminders, and special offers. You can opt out anytime.'}
        </span>
      </span>
    </label>
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
    const isFriday = date.getDay() === 5;
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
            className={`absolute z-40 max-md:left-0 max-md:right-auto ${place === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} w-[300px] max-w-[90vw] rounded-2xl border border-white/12 bg-[#0c0d0e]/95 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl`}>
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
            className={`absolute z-40 max-md:end-0 ${place === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} w-[300px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0d0e]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl`}>
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

/* ══════════════════ عناصر مشتركة ══════════════════ */

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
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [q, options]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

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

            <div ref={listRef} className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-[0.72rem] text-steel">
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