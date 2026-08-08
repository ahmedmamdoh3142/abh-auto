'use client';

/**
 * StepMaintenance — طلب صيانة ضمان (يحل محل StepServices لما تكون السيارة
 * مغطّاة بضمان ساري ويختار العميل «صيانة الضمان» بدل خدمة جديدة).
 * Path: components/sections/booking/step-maintenance.tsx
 */
import { ShieldCheck, X } from 'lucide-react';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';
import { Heading } from './step-vehicle';

export function StepMaintenance({
  isAr, data, set, onBack, onNext, onCancelMaintenance,
}: {
  isAr: boolean;
  data: BookingState;
  set: (patch: Partial<BookingState>) => void;
  onBack: () => void; onNext: () => void;
  onCancelMaintenance: () => void;
}) {
  const w = data.maintenanceWarranty;
  const canNext = data.problemDescription.trim().length >= 8;
  const expiryLabel = w?.expiresAt
    ? new Date(w.expiresAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div>
      <Heading index="02" label={isAr ? 'صيانة الضمان' : 'Warranty service'}
        title={isAr ? 'وصف العطل' : 'Describe the issue'}
        sub={isAr ? 'صيانة هذه السيارة مغطّاة بالضمان — اشرح المشكلة وهنراجع طلبك.' : "This vehicle is under warranty — describe the issue and we'll review your request."} />

      <div className="mt-8 flex items-start justify-between gap-4 rounded-[22px] border border-[#9fd4b0]/35 bg-[#9fd4b0]/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full border border-[#9fd4b0]/40 bg-[#9fd4b0]/[0.12] text-[#9fd4b0]">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <div>
            <div className="text-[0.58rem] uppercase tracking-[0.22em] text-[#9fd4b0]">{isAr ? 'مغطّاة بالضمان' : 'Under warranty'}</div>
            <div className="mt-1.5 font-display text-lg uppercase text-ivory">{w?.serviceName ?? '—'}</div>
            {expiryLabel && (
              <div className="mt-1 text-[0.72rem] text-platinum/60">
                {isAr ? `الضمان ساري حتى ${expiryLabel}` : `Warranty valid until ${expiryLabel}`}
              </div>
            )}
          </div>
        </div>
        <button type="button" data-cursor="hover" onClick={onCancelMaintenance}
          className="inline-flex flex-none items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-platinum/70 transition-colors hover:border-white/30 hover:text-ivory">
          <X className="h-3 w-3" strokeWidth={2} />{isAr ? 'حجز عادي بدل كده' : 'Book a paid service instead'}
        </button>
      </div>

      <div className="mt-7">
        <label className="mb-2.5 block text-[0.62rem] uppercase tracking-[0.26em] text-platinum/80">
          {isAr ? 'ما هي المشكلة؟' : "What's the issue?"}
        </label>
        <textarea
          value={data.problemDescription}
          onChange={(e) => set({ problemDescription: e.target.value })}
          rows={6}
          placeholder={isAr ? 'اشرح المشكلة بالتفصيل — مثال: بدأ لمعان الطلاء يقل في السقف بعد الغسيل…' : 'Describe the issue in detail…'}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-ivory placeholder:text-steel/60 outline-none transition-colors focus:border-platinum/50 focus:bg-white/[0.05]" />
        <div className="mt-2 flex items-center justify-between text-[0.62rem] text-steel">
          <span>{isAr ? 'الصيانة مجانية بالكامل ضمن فترة الضمان.' : 'Fully free within the warranty period.'}</span>
          <span>{data.problemDescription.trim().length}/8</span>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button onClick={onBack} data-cursor="hover"><GhostPill>{isAr ? 'رجوع' : 'Back'}</GhostPill></button>
        <button onClick={onNext} disabled={!canNext} data-cursor="hover" className={canNext ? '' : 'pointer-events-none opacity-40'}>
          <PrimaryPill>{isAr ? 'متابعة' : 'Continue'}</PrimaryPill>
        </button>
      </div>
    </div>
  );
}