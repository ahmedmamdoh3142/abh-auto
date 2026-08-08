'use client';

/**
 * StepMaintenanceConfirm — مراجعة وإرسال طلب صيانة الضمان (بديل StepConfirm
 * لما تكون data.isMaintenance = true). لا يوجد سعر ولا طريقة دفع — الصيانة مجانية
 * وتحتاج موافقة الموظف أولًا قبل ما تتحول لحجز فعلي.
 * Path: components/sections/booking/step-maintenance-confirm.tsx
 */
import { useState } from 'react';
import { Car, UserRound, MapPin, ShieldCheck, MessageSquare } from 'lucide-react';
import { BRANDS, branchLabel } from '@/lib/booking-data';
import type { BookingState } from './booking-flow';
import { PrimaryPill, GhostPill } from './booking-flow';

export function StepMaintenanceConfirm({
  isAr, data, onBack, onSubmit,
}: {
  isAr: boolean;
  data: BookingState;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [sending, setSending] = useState(false);
  const brand = BRANDS.find((b) => b.id === data.brandId);
  const w = data.maintenanceWarranty;

  const submit = () => { setSending(true); onSubmit(); };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3.5">
        <span className="font-display text-base text-platinum tabular-nums">04</span>
        <span className="h-px w-8 bg-platinum/40" />
        <span className="text-[0.55rem] uppercase tracking-[0.3em] text-steel">{isAr ? 'مراجعة الطلب' : 'Review'}</span>
      </div>
      <h2 className="font-display text-3xl font-light uppercase leading-tight tracking-tight text-ivory md:text-4xl">
        {isAr ? 'مراجعة طلب الصيانة' : 'Review your service request'}
      </h2>
      <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-platinum/60">
        {isAr ? 'هنراجع الطلب ونرد عليك — لو اتوافقنا، هيتحول لحجز صيانة مجاني بنفس الموعد.' : "We'll review this and get back to you — once approved it becomes a free maintenance booking."}
      </p>

      <div className="mt-8 space-y-5">
        <Card icon={Car} title={isAr ? 'السيارة' : 'Vehicle'}>
          <Row k={brand?.name ?? ''} v={data.model} />
          <Row k={isAr ? 'اللوحة' : 'Plate'} v={data.plate} mono />
        </Card>

        <Card icon={ShieldCheck} title={isAr ? 'الضمان' : 'Warranty'}>
          <Row k={isAr ? 'الخدمة المغطّاة' : 'Covered service'} v={w?.serviceName ?? '—'} />
        </Card>

        <Card icon={MessageSquare} title={isAr ? 'المشكلة' : 'Issue'}>
          <p className="text-sm leading-relaxed text-ivory/85">{data.problemDescription}</p>
        </Card>

        <Card icon={MapPin} title={isAr ? 'الموعد المفضّل' : 'Preferred appointment'}>
          <Row k={isAr ? 'الفرع' : 'Branch'} v={branchLabel(data.branch, isAr)} />
          <Row k={isAr ? 'التاريخ والوقت' : 'Date & time'} v={`${data.date} · ${data.time}`} mono />
        </Card>

        <Card icon={UserRound} title={isAr ? 'التواصل' : 'Contact'}>
          <Row k={isAr ? 'الاسم' : 'Name'} v={data.name} />
          <Row k={isAr ? 'التليفون' : 'Phone'} v={data.phone} mono />
        </Card>
      </div>

      <div className="mt-8 rounded-3xl border border-[#9fd4b0]/30 bg-[#9fd4b0]/[0.06] px-6 py-5 text-center">
        <div className="font-display text-2xl uppercase text-[#9fd4b0]">{isAr ? 'مجانًا بالكامل' : 'Fully free'}</div>
        <p className="mt-1.5 text-[0.72rem] text-platinum/60">{isAr ? 'مشمولة بضمان الخدمة — لا يوجد أي مبلغ مستحق.' : 'Covered by your service warranty — nothing to pay.'}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button onClick={submit} disabled={sending} data-cursor="hover" className={sending ? 'pointer-events-none opacity-60' : ''}>
          <PrimaryPill full>{sending ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : (isAr ? 'إرسال طلب الصيانة' : 'Send service request')}</PrimaryPill>
        </button>
        <button onClick={onBack} data-cursor="hover" className="self-center"><GhostPill>{isAr ? 'رجوع' : 'Back'}</GhostPill></button>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-platinum"><Icon className="h-4 w-4" strokeWidth={1.5} /></span>
        <span className="text-[0.58rem] uppercase tracking-[0.26em] text-platinum/80">{title}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-platinum/55">{k}</span>
      <span dir={mono ? 'ltr' : undefined} className={`text-end text-ivory/90 ${mono ? 'font-display tracking-wide tabular-nums' : ''}`}>{v}</span>
    </div>
  );
}