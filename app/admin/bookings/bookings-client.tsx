"use client";
/**
 * app/admin/bookings/bookings-client.tsx — لوحة الحجوزات (CLIENT) · v5
 *
 * • فلتر «بانتظار الدفع» و«قيد المتابعة» مضافين للتابات.
 * • نظام ألوان احترافي موحّد: مدفوع=أخضر، بانتظار الدفع=كهرماني فاقع، مُسترَد=رمادي.
 * • تصدير فاتورة PDF فاخرة بهوية ABH AUTO (شعار + ألوان الشركة) لكل حجز.
 * • عرضان: Grid (كروت سينمائية) + List (صفوف كثيفة) + بحث/فرز/CSV + مودال تفاصيل.
 *
 * (v5)
 *  • بروجرس بار المراحل في التفاصيل بقى للعرض فقط — يتحدّث أوتوماتيك حسب نسبة
 *    إنجاز مهام أمر العمل، ومفيش أي تحكّم يدوي فيه من هنا (زرار «تقدّم» اتشال).
 *  • نظام متابعة كامل لكل حجز (Timeline + قرار نهائي إجباري عند الإقفال).
 *  • تأكيد الدفع بقى بيفتح مودال بيسمح بإضافة خصم يدوي (نسبة/مبلغ ثابت) لحظة الدفع.
 *  • الإلغاء + إعادة الجدولة يختفوا لما يتم الدفع ويبدأ العمل معًا (paid && active).
 */
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { card, Ghost, Pill, Ic, EGP, Modal, Textarea, useToast, PageHeader, carImg } from "@/components/admin/ui";
import { printBookingInvoice } from "@/lib/admin/invoice-print";
import { printBookingWarranty } from "@/lib/admin/warranty-print";
import { printBookingsFullReport } from "@/lib/admin/bookings-full-export-print";
import { brandImg } from "@/lib/brand-image";

/* ───────── هوك media query (للتفرقة بين اللمس واللاب) ───────── */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return matches;
}

/* ───────── خرائط الحالة/الدفع (ثنائية اللغة) ───────── */
const STATUS: Record<string, { ar: string; en: string; color: string; soft: string; glow: string }> = {
  upcoming:  { ar: "قادم",        en: "Upcoming",    color: "#8a9099", soft: "rgba(138,144,153,.5)", glow: "rgba(138,144,153,.32)" },
  active:    { ar: "قيد التنفيذ", en: "In progress", color: "#f5993d", soft: "rgba(245,153,61,.5)",  glow: "rgba(245,153,61,.45)" },
  completed: { ar: "مكتمل",       en: "Completed",   color: "#3ecd8e", soft: "rgba(62,205,142,.5)",  glow: "rgba(62,205,142,.40)" },
  cancelled: { ar: "ملغي",        en: "Cancelled",   color: "#ef5a4d", soft: "rgba(239,90,77,.5)",   glow: "rgba(239,90,77,.40)" },
};
/* ألوان الدفع — موحّدة واحترافية. الكهرماني الفاقع #ffb723 لِما بانتظار الدفع. */
const PAY: Record<string, { ar: string; en: string; paid: boolean; color: string; soft: string }> = {
  paid:          { ar: "مدفوع",         en: "Paid",             paid: true,  color: "#3ecd8e", soft: "rgba(62,205,142,.5)" },
   partial:       { ar: "مدفوع جزئيًا",    en: "Partially paid",  paid: false, color: "#6ba8f5", soft: "rgba(107,168,245,.5)" },
  pay_at_branch: { ar: "دفع بالفرع",    en: "Pay at branch",    paid: false, color: "#ffb723", soft: "rgba(255,183,35,.55)" },
  pending:       { ar: "بانتظار الدفع", en: "Awaiting payment", paid: false, color: "#ffb723", soft: "rgba(255,183,35,.55)" },
  refunded:      { ar: "مُسترَد",        en: "Refunded",         paid: false, color: "#9aa0a6", soft: "rgba(154,160,166,.5)" },
};
const PAY_FALLBACK = { color: "#ffb723", soft: "rgba(255,183,35,.55)" };
const STAGES = [
  { ar: "تم الاستلام",   en: "Received" },
  { ar: "قيد العمل",     en: "In service" },
  { ar: "فحص الجودة",    en: "Quality check" },
  { ar: "جاهزة للتسليم", en: "Ready" },
];
/* مراحل أمر العمل (work_stage) — أدقّ من status، تعكس مكان السيارة في الورشة. */
const WORK_STAGE: Record<string, { ar: string; en: string; color: string }> = {
  received:      { ar: "مُستلمة",        en: "Received",      color: "#cbcdcd" },
  in_service:    { ar: "قيد التشغيل",    en: "In service",    color: "#f5993d" },
  quality_check: { ar: "فحص الجودة",     en: "Quality check", color: "#6ba8f5" },
  ready:         { ar: "جاهزة للتسليم",  en: "Ready",         color: "#3ecd8e" },
};
const PAY_METHOD: Record<string, { ar: string; en: string }> = {
  cash: { ar: "نقدًا بالفرع", en: "Cash at branch" },
  applePay: { ar: "Apple Pay", en: "Apple Pay" },
  tabby: { ar: "Tabby", en: "Tabby" },
  tamara: { ar: "Tamara", en: "Tamara" },
};

/* ───────── أيقونات صغيرة محلية ───────── */
const mini = (d: string | string[], s = 14, sw = 1.7) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const I = {
  phone: (s = 14) => mini("M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z", s),
  mail: (s = 14) => mini(["M4 4h16v16H4z", "M22 6l-10 7L2 6"], s),
   link: (s = 14) => mini(["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"], s),
  wallet: (s = 14) => mini(["M21 12V7H5a2 2 0 0 1 0-4h14v4", "M3 5v14a2 2 0 0 0 2 2h16v-5", "M18 12a2 2 0 0 0 0 4h4v-4z"], s),
  user: (s = 14) => mini(["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"], s),
  whats: (s = 14) => mini(["M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2z", "M8.5 8.5c0 4 3 7 7 7 .6 0 1-.6 1-1l-.2-1.6a.6.6 0 0 0-.8-.4l-1.4.5a5.6 5.6 0 0 1-2.6-2.6l.5-1.4a.6.6 0 0 0-.4-.8L9.5 7.5c-.4 0-1 .4-1 1z"], s),
  city: (s = 14) => mini(["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 9h.01", "M9 13h.01", "M9 17h.01", "M15 9h.01", "M15 13h.01", "M15 17h.01"], s),
  car: (s = 14) => mini(["M5 17a2 2 0 1 0 0-.01", "M19 17a2 2 0 1 0 0-.01", "M5 17H3v-5l2-4h11l3 4h1a1 1 0 0 1 1 1v4h-2", "M7 17h10"], s),
  tag: (s = 14) => mini(["M20.6 13.4 12 22l-9-9V3h10l8 8a2 2 0 0 1-.4 2.4z", "M7 7h.01"], s),
  gift: (s = 14) => mini(["M20 12v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z", "M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"], s),
  pdf: (s = 14) => mini(["M14 3v4a1 1 0 0 0 1 1h4", "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z", "M9 13h6", "M9 17h4"], s),
  print: (s = 14) => mini(["M6 9V3h12v6", "M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2", "M6 14h12v8H6z"], s),
  receipt: (s = 14) => mini(["M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z", "M8 7h8", "M8 11h8", "M8 15h5"], s),
  shield: (s = 14) => mini("M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z", s),
  chevL: (s = 16) => mini("M15 18l-6-6 6-6", s),
  chevR: (s = 16) => mini("M9 18l6-6-6-6", s),
  back: (s = 15) => mini(["M19 12H5", "M12 19l-7-7 7-7"], s),
  calClock: (s = 14) => mini(["M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6", "M16 2v4", "M8 2v4", "M3 10h18", "M17.5 14v2l1.5 1", "M17.5 21a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"], s),
  grid: (s = 14) => mini(["M3 3h8v8H3z", "M13 3h8v8h-8z", "M13 13h8v8h-8z", "M3 13h8v8H3z"], s),
  rows: (s = 14) => mini(["M3 5h18", "M3 12h18", "M3 19h18"], s),
  sort: (s = 14) => mini(["M3 6h12", "M3 12h9", "M3 18h6", "M17 6v12", "M14 15l3 3 3-3"], s),
  download: (s = 14) => mini(["M12 3v12", "M7 11l5 5 5-5", "M5 21h14"], s),
  play: (s = 14) => mini(["M6 4l14 8-14 8z"], s),
  bubble: (s = 14) => mini("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", s),
  pencil: (s = 14) => mini(["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"], s),
};

/* ═════════════════ بروجرس بار المراحل — عرض فقط ═════════════════ */
/* المراحل تتحدّث أوتوماتيك حسب نسبة إنجاز مهام أمر العمل (booking_tasks)،
   ولذلك لا يوجد أي تحكّم يدوي هنا — هذا المكوّن للاطّلاع فقط. */
function StagePipeline({ stage, isAr }: any) {
  const pct = (Math.max(0, Math.min(3, stage)) / (STAGES.length - 1)) * 100;
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.32)", padding: "18px 18px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{isAr ? "مراحل العمل" : "Work stages"}</span>
        <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{Math.min(stage + 1, 4)} / {STAGES.length}</span>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
        <span style={{ position: "absolute", insetInline: 12, top: 13, height: 2, borderRadius: 2, background: "rgba(255,255,255,.1)" }} />
        <span style={{ position: "absolute", insetInlineStart: 12, top: 13, height: 2, borderRadius: 2, width: `calc((100% - 24px) * ${pct / 100})`, background: "linear-gradient(90deg,rgba(245,153,61,.6),#3ecd8e)", transition: "width .6s var(--abh-ease)" }} />
        {STAGES.map((s, i) => {
          const done = i < stage, act = i === stage;
          return (
            <div key={i} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, flex: 1 }}>
              <span style={{
                display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 999,
                border: `1.5px solid ${act ? "#f5993d" : done ? "rgba(62,205,142,.6)" : "rgba(255,255,255,.14)"}`,
                background: act ? "linear-gradient(135deg,#f7ad5b,#f5993d)" : done ? "rgba(62,205,142,.14)" : "rgba(255,255,255,.03)",
                color: act ? "#1a0f02" : done ? "#3ecd8e" : "var(--abh-steel)",
                boxShadow: act ? "0 0 0 4px rgba(245,153,61,.16)" : "none", transition: "all .35s var(--abh-ease)",
              }}>{done ? <Ic.check s={13} sw={2.6} /> : <Ic.dot s={13} />}</span>
              <span style={{ fontSize: 9.5, textAlign: "center", maxWidth: 62, lineHeight: 1.3, color: act ? "var(--abh-ivory)" : done ? "var(--abh-platinum)" : "var(--abh-steel)" }}>{isAr ? s.ar : s.en}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ═════════════════ تقويم مصغّر ═════════════════ */
function MiniCalendar({ value, onPick, isAr }: any) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const init = value ? new Date(value) : today;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const { y, m } = view;
  const loc = isAr ? "ar-EG" : "en-US";
  const startDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(y, m, 1));
  const dow = useMemo(() => {
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: "narrow" }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
  }, [loc]);
  const nav = (dir: number) => {
    let nm = m + dir, ny = y;
    if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; }
    if (ny < today.getFullYear() || (ny === today.getFullYear() && nm < today.getMonth())) return;
    setView({ y: ny, m: nm });
  };
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDow; i++) cells.push(<span key={`e${i}`} />);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const past = date < today; const sel = value === iso; const isToday = date.getTime() === today.getTime();
    cells.push(
      <button key={iso} type="button" disabled={past} onClick={past ? undefined : () => onPick(iso)}
        style={{ aspectRatio: "1", display: "grid", placeItems: "center", borderRadius: 10, fontSize: 13.5, border: isToday && !sel ? "1px solid rgba(203,205,205,.3)" : "1px solid transparent", background: sel ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: past ? "rgba(102,106,110,.4)" : sel ? "#000" : "var(--abh-ivory)", textDecoration: past ? "line-through" : "none", cursor: past ? "not-allowed" : "pointer", transition: "all .2s var(--abh-ease)" }}>{d}</button>
    );
  }
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" disabled={prevDisabled} onClick={() => nav(-1)} style={{ display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-platinum)", opacity: prevDisabled ? .3 : 1, cursor: prevDisabled ? "not-allowed" : "pointer" }}>{isAr ? I.chevR(14) : I.chevL(14)}</button>
        <span style={{ fontSize: 14.5, color: "var(--abh-ivory)" }}>{monthLabel}</span>
        <button type="button" onClick={() => nav(1)} style={{ display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-platinum)", cursor: "pointer" }}>{isAr ? I.chevL(14) : I.chevR(14)}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>{dow.map((d, i) => <span key={i} style={{ textAlign: "center", fontSize: 9.5, color: "var(--abh-steel)" }}>{d}</span>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>{cells}</div>
    </div>
  );
}

function TimeGrid({ value, onPick, isAr }: any) {
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let t = 10 * 60; t <= 21 * 60; t += 60) out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    return out;
  }, []);
  const fmt = (v: string) => { const [H, M] = v.split(":").map(Number); const mer = isAr ? (H >= 12 ? "م" : "ص") : (H >= 12 ? "PM" : "AM"); let h = H % 12; if (h === 0) h = 12; return `${h}:${String(M).padStart(2, "0")} ${mer}`; };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
      {slots.map((s) => {
        const on = value === s;
        return (
          <button key={s} type="button" dir="ltr" onClick={() => onPick(s)}
            style={{ borderRadius: 12, padding: "10px 6px", textAlign: "center", fontSize: 13, border: `1px solid ${on ? "transparent" : "rgba(255,255,255,.12)"}`, background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.02)", color: on ? "#000" : "var(--abh-ivory)", cursor: "pointer", transition: "all .2s var(--abh-ease)" }}>{fmt(s)}</button>
        );
      })}
    </div>
  );
}
const qBtn = (primary?: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 14px", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", cursor: "pointer", border: primary ? "none" : "1px solid rgba(255,255,255,.2)", color: primary ? "#000" : "var(--abh-ivory)", background: primary ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.06)", backdropFilter: "blur(8px)" });
const qIcon = (color?: string): React.CSSProperties => ({ display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 999, cursor: "pointer", border: `1px solid ${color ? color : "rgba(255,255,255,.2)"}`, color: color || "var(--abh-ivory)", background: "rgba(255,255,255,.06)", backdropFilter: "blur(8px)" });

/* شارة «هدية» صغيرة */
const GIFT_GOLD = "#e8d6a8";
function giftChipStyle(): React.CSSProperties {
  return { borderRadius: 999, padding: "3px 9px", fontSize: 9.5, color: GIFT_GOLD, background: "rgba(217,178,95,.12)", border: "1px solid rgba(217,178,95,.45)", display: "inline-flex", alignItems: "center", gap: 4 };
}

/* حساب صاحب الحجز — عميل مسجّل / موظف / مدير / شريك / فني — أو زائر بدون حساب */
const ACCOUNT_ROLE: Record<string, { ar: string; en: string; color: string }> = {
  member:     { ar: "عميل مسجّل", en: "Registered member", color: "#6ba8f5" },
  staff:      { ar: "موظف",       en: "Staff",             color: "#cbcdcd" },
  admin:      { ar: "مدير",       en: "Admin",             color: "#f5993d" },
  partner:    { ar: "حساب شريك",  en: "Partner account",   color: "#9fd4b0" },
  technician: { ar: "فني",        en: "Technician",        color: "#e8d6a8" },
};
function sourceBadgeStyle(color: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "7px 13px", fontSize: 11.5, color, background: `${color}1a`, border: `1px solid ${color}55` };
}

/* ───────── نظام المتابعة (Follow-up) ───────── */
const FOLLOWUP_STATUS: Record<string, { ar: string; en: string; color: string }> = {
  none:   { ar: "بدون متابعة",  en: "No follow-up",  color: "#66696e" },
  open:   { ar: "قيد المتابعة", en: "Following up",  color: "#6ba8f5" },
  closed: { ar: "مقفولة",       en: "Closed",         color: "#8a9099" },
};
const FOLLOWUP_OUTCOME: Record<string, { ar: string; en: string; color: string }> = {
  confirmed:   { ar: "أكّد الحضور",       en: "Confirmed coming",   color: "#3ecd8e" },
  not_coming:  { ar: "لن يأتي / اعتذر",   en: "Not coming",         color: "#ef5a4d" },
  rescheduled: { ar: "طلب تأجيل",         en: "Requested reschedule", color: "#f5993d" },
  no_response: { ar: "لا يوجد رد",        en: "No response",        color: "#9aa0a6" },
  other:       { ar: "أخرى",               en: "Other",              color: "#cbcdcd" },
};
const FOLLOWUP_CHANNEL: Record<string, { ar: string; en: string; icon: (s?: number) => React.ReactNode }> = {
  call:      { ar: "مكالمة",       en: "Call",      icon: I.phone },
  whatsapp:  { ar: "واتساب",       en: "WhatsApp",  icon: I.whats },
  sms:       { ar: "رسالة نصية",   en: "SMS",       icon: I.bubble },
  in_person: { ar: "شخصيًا",       en: "In person", icon: I.user },
  note:      { ar: "ملاحظة",       en: "Note",      icon: I.pencil },
};
function followupColorOf(b: any): string {
  const status = b.followupStatus || "none";
  if (status === "closed" && b.followupOutcome && FOLLOWUP_OUTCOME[b.followupOutcome]) return FOLLOWUP_OUTCOME[b.followupOutcome].color;
  return FOLLOWUP_STATUS[status].color;
}

/* ═════════════════ كرت الحجز (Grid) — «تذكرة الفاليه» ═════════════════
 * فلسفة جديدة: كل المعلومات والأزرار المهمة ظاهرة طول الوقت (مش خلف hover)،
 * الـ hover بقى بس لرفعة الكارت + تكبير الصورة، ده أسرع للاستخدام اليومي.
 * الريبون في زاوية الصورة = التوقيع البصري الموحّد بين الكارت والمودال.
 */
function BookingCard({ b, i, busy, isAr, ccy, fmtDate, onOpen, onReceive, onWorkOrder, onReport, onConfirmPay, onCall, onWhats, onPrint, onPrintWarranty, onFollowUp, onGenLink, linkBusy, onDiscount }: any) {
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false, ...PAY_FALLBACK };
  const isActive = b.status === "active";
  const isCancelled = b.status === "cancelled";
  const isCompleted = b.status === "completed";
  const needsWorkOrder = !b.workOrderNo && !isCancelled && !isCompleted;
  const ws = b.workStage && !isCancelled && !isCompleted ? WORK_STAGE[b.workStage] : null;
  const accent = ws ? ws.color : st.color;
  const [hover, setHover] = useState(false);
  const touch = useMediaQuery("(hover: none)");
  const stop = (e: any, fn: () => void) => { e.stopPropagation(); fn(); };
  const followupStatus = b.followupStatus || "none";
  const followupColor = followupColorOf(b);
  const createdLabel = b.createdAt
    ? new Date(b.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(b.id)}
      style={{
        position: "relative", display: "flex", flexDirection: "column", borderRadius: 22, overflow: "hidden", cursor: "pointer",
        border: needsWorkOrder ? "1.5px dashed rgba(232,207,154,.55)" : "1px solid rgba(255,255,255,.08)",
        background: "#0b0c0e",
        boxShadow: hover ? `0 26px 60px -26px ${accent}55, 0 0 0 1px ${accent}40` : "0 10px 28px -18px rgba(0,0,0,.65)",
        transform: hover && !touch ? "translateY(-4px)" : "none",
        transition: "transform .45s var(--abh-ease), box-shadow .45s var(--abh-ease)",
        animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both`,
      }}
    >
      {/* شريط الصورة */}
      <div style={{ position: "relative", height: 134, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${brandImg(b.brandId, b.plate || b.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: `brightness(${isCancelled ? .48 : .74}) contrast(1.05) ${isCancelled ? "grayscale(.5)" : ""}`, transform: hover && !touch ? "scale(1.07)" : "scale(1)", transition: "transform 1s var(--abh-ease)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0b0c0e 4%, rgba(11,12,14,.1) 55%, rgba(11,12,14,.42) 100%)" }} />

        {/* ريبون الحالة — التوقيع البصري */}
        <span style={{
          position: "absolute", top: 15, [isAr ? "right" : "left"]: -38, width: 150, padding: "4px 0", textAlign: "center",
          transform: `rotate(${isAr ? 45 : -45}deg)`, background: accent, color: "#0b0c0e",
          fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase",
          boxShadow: "0 3px 10px rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          {(ws?.color === "#f5993d" || (!ws && isActive)) && (
            <span style={{ position: "relative", display: "flex", height: 6, width: 6 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#0b0c0e", opacity: .5, animation: "abh-ping 1.4s var(--abh-ease) infinite" }} />
              <span style={{ position: "relative", height: 6, width: 6, borderRadius: 999, background: "#0b0c0e" }} />
            </span>
          )}
          {ws ? (isAr ? ws.ar : ws.en) : (isAr ? st.ar : st.en)}
        </span>

        {/* رقم الحجز */}
        <span dir="ltr" style={{ position: "absolute", top: 14, [isAr ? "left" : "right"]: 14, fontSize: 10.5, letterSpacing: ".08em", color: "rgba(255,255,255,.88)", background: "rgba(0,0,0,.5)", borderRadius: 999, padding: "5px 11px", backdropFilter: "blur(6px)" }}>{b.reference}</span>

        {/* متابعة نشطة */}
        {followupStatus === "open" && (
          <span title={isAr ? "قيد المتابعة" : "Follow-up in progress"} style={{ position: "absolute", bottom: 12, [isAr ? "right" : "left"]: 14, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 10px", fontSize: 9.5, color: followupColor, background: "rgba(0,0,0,.55)", border: `1px solid ${followupColor}`, backdropFilter: "blur(6px)" }}>
            <span style={{ position: "relative", display: "flex", height: 6, width: 6 }}><span style={{ position: "absolute", inset: 0, borderRadius: 999, background: followupColor, opacity: .7, animation: "abh-ping 1.4s var(--abh-ease) infinite" }} /><span style={{ position: "relative", height: 6, width: 6, borderRadius: 999, background: followupColor }} /></span>
            {I.bubble(10)}
          </span>
        )}
        {/* تاريخ الإنشاء */}
        {createdLabel && (
          <span dir="ltr" style={{ position: "absolute", bottom: 12, [isAr ? "left" : "right"]: 14, fontSize: 9.5, color: "rgba(255,255,255,.65)", background: "rgba(0,0,0,.4)", borderRadius: 999, padding: "4px 9px", backdropFilter: "blur(6px)" }}>{createdLabel}</span>
        )}
      </div>

      {/* خط تآكل التذكرة */}
      <div style={{ position: "relative", height: 13, background: "#0b0c0e" }}>
        <span style={{ position: "absolute", insetInline: 16, top: 6, height: 1, backgroundImage: "radial-gradient(circle, rgba(255,255,255,.24) 1.3px, transparent 1.3px)", backgroundSize: "8px 1px", backgroundRepeat: "repeat-x" }} />
      </div>

      {/* جسم البطاقة */}
      <div style={{ padding: "2px 18px 14px", flex: 1 }}>
        <h3 className="abh-display" style={{ margin: 0, fontSize: 21, lineHeight: 1.15, color: "#fff", textTransform: "uppercase" }}>{b.vehicle}</h3>
        {(b.plate || b.size) && <div dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 3 }}>{[b.plate, b.size].filter(Boolean).join(" · ")}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", marginTop: 12, fontSize: 12, color: "rgba(230,230,230,.9)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>{I.user(12)}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customer}</span></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Ic.clock s={12} />{fmtDate(b.date)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, gridColumn: "1 / -1" }}><Ic.pin s={12} />{b.branch} · {b.time}</span>
        </div>

                {b.services?.some((s: any) => s.isGift) && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {b.services.filter((s: any) => s.isGift).slice(0, 2).map((s: any, j: number) => (
              <span key={j} style={giftChipStyle()}>
                {I.gift(10)}{s.name}
                {/* (جديد) لو الهدية دي طالعة من كود خصم، نبيّن الكود جنبها */}
                {s.giftFromPromo && b.promoCode ? <span dir="ltr" style={{ opacity: .75 }}>· {b.promoCode}</span> : null}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 8.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{isAr ? "الإجمالي" : "Total"}</div>
            <div className="abh-num" dir="ltr" style={{ fontSize: 21, color: "#fff", marginTop: 2 }}>{EGP(b.total)} <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{ccy}</span></div>
            {b.payment === "partial" && (
  <div style={{ marginTop: 6, fontSize: 10.5, color: "#6ba8f5" }}>
    {isAr ? `متبقي ${EGP(b.remaining)} ${ccy}` : `${EGP(b.remaining)} ${ccy} remaining`}
  </div>
)}
          </div>
          {!isCancelled && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 11px", fontSize: 10, color: pay.color, background: `${pay.color}14`, border: `1px solid ${pay.soft}` }}>{I.wallet(11)}{isAr ? pay.ar : pay.en}</span>
          )}
        </div>
        {isCancelled && b.cancelReason && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#f0b3ac", display: "flex", gap: 6 }}>{I.tag(11)}<span>{b.cancelReason}</span></div>
        )}
      </div>

      {/* كعب التذكرة — إجراءات ظاهرة دايمًا */}
      <div style={{ position: "relative", borderTop: "1.5px dashed rgba(255,255,255,.16)", padding: "12px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <button onClick={(e) => stop(e, () => onOpen(b.id))} style={qIcon()} title={isAr ? "تفاصيل" : "Details"}>{Ic.eye({ s: 14 })}</button>

        {needsWorkOrder && (
          <button onClick={(e) => stop(e, () => onReceive(b.id))} style={qBtn(true)}>{I.play(13)}{isAr ? "استلام" : "Receive"}</button>
        )}
        {b.workOrderNo && b.workStage === "received" && !isCancelled && !isCompleted && (
          <button onClick={(e) => stop(e, () => onWorkOrder(b.id))} style={qBtn(true)}>{Ic.sliders({ s: 13 })}{isAr ? "أمر العمل" : "Work order"}</button>
        )}
        {["in_service", "quality_check", "ready"].includes(b.workStage) && !isCancelled && (
          <button onClick={(e) => stop(e, () => onWorkOrder(b.id))} style={qBtn(b.workStage === "quality_check")}>
            {Ic.sliders({ s: 13 })}
            {b.workStage === "quality_check" ? (isAr ? "فحص الجودة" : "Quality check") : b.workStage === "ready" ? (isAr ? "التسليم" : "Deliver") : (isAr ? "متابعة" : "Track")}
          </button>
        )}
        {isCompleted && b.workOrderNo && (
          <button onClick={(e) => stop(e, () => onReport(b.id))} style={qBtn(true)}>{I.pdf(13)}{isAr ? "التقرير" : "Report"}</button>
        )}

        <span style={{ flex: 1 }} />

        {!isCancelled && !pay.paid && (
          <button onClick={(e) => !busy && stop(e, () => onConfirmPay(b))} style={qIcon("#ffb723")} title={isAr ? "تأكيد الدفع" : "Confirm payment"}>{I.wallet(14)}</button>
        )}
        {!isCancelled && !pay.paid && (
          <button onClick={(e) => !linkBusy && stop(e, () => onGenLink(b.id))} style={qIcon("#6ba8f5")} title={isAr ? "لينك الدفع" : "Payment link"}>{I.link(14)}</button>
        )}
        {!isCancelled && !pay.paid && (
          <button onClick={(e) => stop(e, () => onDiscount(b.id))} style={qIcon("#ffb723")} title={isAr ? "خصم" : "Discount"}>{I.tag(14)}</button>
        )}
        <button onClick={(e) => stop(e, () => onPrint(b, "a4"))} style={qIcon("#caa24f")} title={isAr ? "طباعة" : "Print"}>{I.print(14)}</button>
        {pay.paid && (
          <button onClick={(e) => stop(e, () => onPrintWarranty(b))} style={qIcon("#3ecd8e")} title={isAr ? "الضمان" : "Warranty"}>{I.shield(14)}</button>
        )}
        <span style={{ position: "relative", display: "inline-flex" }}>
          <button onClick={(e) => stop(e, () => onFollowUp(b.id))} style={qIcon(followupColor)} title={isAr ? "المتابعة" : "Follow-up"}>{I.bubble(14)}</button>
          {b.followups && b.followups.length > 0 && (
            <span style={{ position: "absolute", top: -3, insetInlineEnd: -3, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: followupColor, color: "#0b0c0e", fontSize: 8.5, fontWeight: 700, display: "grid", placeItems: "center", border: "1.5px solid #0b0c0e" }}>{b.followups.length}</span>
          )}
        </span>
      </div>
    </div>
  );
}

/* ═════════════════ صف القائمة (List view) ═════════════════ */
function BookingRow({ b, i, isAr, ccy, fmtDate, onOpen }: any) {
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false, ...PAY_FALLBACK };
  return (
    <div onClick={() => onOpen(b.id)} className="abh-lift abh-row" style={{ display: "grid", gridTemplateColumns: "auto 1.4fr 1.2fr 1fr auto auto", alignItems: "center", gap: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", borderInlineStart: `3px solid ${st.color}`, background: "rgba(255,255,255,.02)", padding: "12px 16px", cursor: "pointer", animation: `abh-fadeUp .45s var(--abh-ease) ${i * 0.03}s both` }}>
      <span style={{ height: 46, width: 64, borderRadius: 10, flexShrink: 0, backgroundImage: `url('${brandImg(b.brandId, b.plate || b.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.7)" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.vehicle}</div>
        <div dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {b.reference}{b.plate ? ` · ${b.plate}` : ""}
          {b.followupStatus === "open" && <span title={isAr ? "قيد المتابعة" : "Follow-up in progress"} style={{ height: 6, width: 6, borderRadius: 999, background: "#6ba8f5", display: "inline-block" }} />}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--abh-platinum)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.customer}</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--abh-platinum)" }}>{fmtDate(b.date)}<div style={{ fontSize: 11, color: "var(--abh-steel)" }}>{b.time} · {b.branch}</div></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: st.color }}><span style={{ height: 7, width: 7, borderRadius: 999, background: st.color }} />{isAr ? st.ar : st.en}</span>
        <span style={{ fontSize: 9.5, color: pay.color }}>{isAr ? pay.ar : pay.en}</span>
      </div>
      <div className="abh-num" dir="ltr" style={{ fontSize: 17, color: "var(--abh-ivory)", textAlign: "end", minWidth: 90 }}>{EGP(b.total)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
    </div>
  );
}

/* ═════════════════ مودال تأكيد الدفع — بس تأكيد إن الفلوس استُلمت فعلًا ═════════════════
   الخصم بقى منفصل تمامًا (مودال الخصم تحت) — تقدر تطبّق خصم وتاخد لينك دفع
   من غير ما تدوس "تأكيد الدفع" خالص. */
function RecordPaymentModal({ b, busy, isAr, ccy, onClose, onConfirm }: any) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const remaining = Number(b.remaining ?? b.total) || 0;
  const amountPaid = Number(b.amountPaid) || 0;

  const [mode, setMode] = useState<"full" | "custom">("full");
  const [value, setValue] = useState(String(remaining));
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [note, setNote] = useState("");

  const METHODS: [string, string][] = [
    ["cash", T("كاش", "Cash")],
    ["card", T("شبكة", "Card")],
    ["transfer", T("تحويل بنكي", "Bank transfer")],
    ["other", T("أخرى", "Other")],
  ];

  const requested = mode === "full" ? remaining : Math.max(0, Math.min(remaining, Number(value) || 0));
  const willBePartial = requested < remaining - 0.01;

  return (
    <Modal title={T("تسجيل دفعة", "Record payment")} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>{b.customer} · {b.vehicle}</div>
        <div dir="ltr" className="abh-num" style={{ fontSize: 15, color: "var(--abh-ivory)", marginTop: 3 }}>{b.reference}</div>
      </div>

      <div style={{ borderRadius: 16, border: "1px solid rgba(203,205,205,.2)", background: "rgba(255,255,255,.02)", padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: amountPaid > 0 ? 6 : 0 }}>
          <span style={{ color: "var(--abh-steel)" }}>{T("إجمالي الحجز", "Booking total")}</span>
          <span dir="ltr" className="abh-num" style={{ color: "var(--abh-platinum)" }}>{EGP(b.total)} {ccy}</span>
        </div>
        {amountPaid > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
            <span style={{ color: "var(--abh-steel)" }}>{T("مدفوع سابقًا", "Already paid")}</span>
            <span dir="ltr" className="abh-num" style={{ color: "#3ecd8e" }}>{EGP(amountPaid)} {ccy}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
          <span style={{ color: "var(--abh-platinum)" }}>{T("المتبقي المستحق", "Remaining due")}</span>
          <span dir="ltr" className="abh-num" style={{ color: "var(--abh-ivory)", fontWeight: 600 }}>{EGP(remaining)} {ccy}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => { setMode("full"); setValue(String(remaining)); }}
          style={{ flex: 1, borderRadius: 12, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${mode === "full" ? "rgba(62,205,142,.5)" : "rgba(255,255,255,.1)"}`, background: mode === "full" ? "rgba(62,205,142,.1)" : "transparent", color: mode === "full" ? "#3ecd8e" : "var(--abh-platinum)", cursor: "pointer" }}>
          {T("سداد كامل المتبقي", "Pay full remaining")}
        </button>
        <button type="button" onClick={() => setMode("custom")}
          style={{ flex: 1, borderRadius: 12, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${mode === "custom" ? "rgba(107,168,245,.5)" : "rgba(255,255,255,.1)"}`, background: mode === "custom" ? "rgba(107,168,245,.1)" : "transparent", color: mode === "custom" ? "#6ba8f5" : "var(--abh-platinum)", cursor: "pointer" }}>
          {T("دفعة جزئية", "Partial amount")}
        </button>
      </div>

      {mode === "custom" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" dir="ltr"
            placeholder="0"
            style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: "center" }} />
          <span style={{ display: "grid", placeItems: "center", fontSize: 13, color: "var(--abh-steel)", minWidth: 44 }}>{ccy}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {METHODS.map(([k, l]) => {
          const on = method === k;
          return (
            <button key={k} type="button" onClick={() => setMethod(k as any)}
              style={{ borderRadius: 999, padding: "8px 14px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: on ? "rgba(203,205,205,.1)" : "transparent", color: on ? "var(--abh-ivory)" : "var(--abh-steel)", cursor: "pointer" }}>
              {l}
            </button>
          );
        })}
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("ملاحظة (اختياري)", "Note (optional)")}
        style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 13, color: "var(--abh-ivory)", outline: "none", marginBottom: 14 }} />

      {willBePartial && requested > 0 && (
        <p style={{ fontSize: 11.5, color: "#f5993d", marginBottom: 6 }}>
          {T(`هيفضل متبقي ${EGP(remaining - requested)} ${ccy} بعد الدفعة دي — تقدر تولّد لينك دفع تاني عليه لاحقًا.`, `${EGP(remaining - requested)} ${ccy} will remain after this — you can generate another payment link for it later.`)}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
        <button disabled={busy || !(requested > 0)} onClick={() => onConfirm(b.id, { amount: requested, method, note: note.trim() || undefined })}
          style={{ opacity: busy || !(requested > 0) ? .4 : 1, pointerEvents: busy || !(requested > 0) ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
          {I.wallet(15)} {willBePartial ? T("تسجيل الدفعة", "Record payment") : T("تأكيد السداد الكامل", "Confirm full payment")}
        </button>
      </div>
    </Modal>
  );
}

/* ═════════════════ مودال الخصم — يدوي أو بنك العميل (BIN) — بدون تأكيد دفع ═════════════════
   بيطبّق فورًا على الحجز ويحدّث الإجمالي، وتقدر بعدها تاخد لينك دفع أو تسيبه
   للعميل يدفع في الفرع، من غير ما تكون مضطر تدوس "تأكيد الدفع". */
function DiscountModal({ b, busy, isAr, ccy, onClose, onApply }: any) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const [mode, setMode] = useState<"manual" | "bank">(b.bankCode ? "bank" : "manual");

  const [kind, setKind] = useState<"percent" | "fixed">((b.manualDiscountKind as any) || "percent");
  const [value, setValue] = useState(b.manualDiscountValue ? String(b.manualDiscountValue) : "");
  const [reason, setReason] = useState(b.manualDiscountReason || "");

  const [bankDigits, setBankDigits] = useState("");
  const [bankChecking, setBankChecking] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankPreview, setBankPreview] = useState<{ percent: number; label: string } | null>(null);

  const beforePromo = Math.max(0, (Number(b.subtotal) || 0) + (Number(b.towing) || 0) - (Number(b.promoDiscount) || 0));
  const rawVal = Math.max(0, Number(value) || 0);
  const manualAmount = kind === "percent" ? Math.round((beforePromo * Math.min(100, rawVal)) / 100) : Math.min(rawVal, beforePromo);

  const checkBank = async () => {
    const d = bankDigits.replace(/\D/g, "").slice(0, 8);
    if (d.length < 6) { setBankError(T("أدخل 6 أرقام على الأقل", "Enter at least 6 digits")); return; }
    setBankChecking(true); setBankError(null);
    try {
      const res = await fetch("/api/bank-discount/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardDigits: d }),
      });
      const j = await res.json();
      if (j?.ok) {
        setBankPreview({ percent: j.percent, label: (isAr ? j.bankLabel?.ar : j.bankLabel?.en) || "" });
      } else {
        setBankPreview(null);
        setBankError(T("الكارت ده مش من البنك الأهلي السعودي", "This card is not from Saudi National Bank"));
      }
    } catch {
      setBankError(T("تعذّر التحقق، حاول تاني", "Could not verify, try again"));
    } finally { setBankChecking(false); }
  };

  const submitManual = () => {
    if (!rawVal) return;
    onApply(b.id, { discount: { kind, value: rawVal, reason: reason.trim() || undefined } });
  };
  const submitBank = () => {
    const d = bankDigits.replace(/\D/g, "").slice(0, 8);
    if (d.length < 6 || !bankPreview) return;
    onApply(b.id, { bankCardDigits: d });
  };
  const clearAll = () => onApply(b.id, { clear: true });

  const hasExistingDiscount = Number(b.manualDiscountAmount) > 0 || Number(b.bankDiscountAmount) > 0;

  return (
    <Modal title={T("خصم الحجز", "Booking discount")} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>{b.customer} · {b.vehicle}</div>
        <div dir="ltr" className="abh-num" style={{ fontSize: 15, color: "var(--abh-ivory)", marginTop: 3 }}>{b.reference}</div>
      </div>

      {hasExistingDiscount && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, borderRadius: 12, border: "1px solid rgba(62,205,142,.35)", background: "rgba(62,205,142,.07)", padding: "10px 14px" }}>
          <span style={{ fontSize: 12, color: "#3ecd8e" }}>
            {b.bankCode
              ? T(`خصم عملاء البنك الأهلي مطبَّق (${b.bankCode})`, `Bank customer discount applied (${b.bankCode})`)
              : T(`خصم يدوي مطبَّق (${b.manualDiscountKind === "percent" ? `${b.manualDiscountValue}%` : `${EGP(b.manualDiscountValue)} ${ccy}`})`, "Manual discount applied")}
          </span>
          <button disabled={busy} onClick={clearAll} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "var(--abh-platinum)", padding: "6px 12px", fontSize: 11, cursor: busy ? "default" : "pointer" }}>
            {T("إزالة", "Remove")}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setMode("manual")}
          style={{ flex: 1, borderRadius: 12, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${mode === "manual" ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: mode === "manual" ? "rgba(203,205,205,.1)" : "transparent", color: mode === "manual" ? "var(--abh-ivory)" : "var(--abh-platinum)", cursor: "pointer" }}>
          {T("خصم يدوي", "Manual discount")}
        </button>
        <button type="button" onClick={() => setMode("bank")}
          style={{ flex: 1, borderRadius: 12, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${mode === "bank" ? "rgba(159,212,176,.5)" : "rgba(255,255,255,.1)"}`, background: mode === "bank" ? "rgba(159,212,176,.1)" : "transparent", color: mode === "bank" ? "#9fd4b0" : "var(--abh-platinum)", cursor: "pointer" }}>
          {T("خصم بنك العميل", "Bank customer")}
        </button>
      </div>

      {mode === "manual" ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["percent", "fixed"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                style={{ flex: 1, borderRadius: 12, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${kind === k ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: kind === k ? "rgba(203,205,205,.1)" : "transparent", color: kind === k ? "var(--abh-ivory)" : "var(--abh-platinum)", cursor: "pointer" }}>
                {k === "percent" ? T("نسبة %", "Percentage") : T("مبلغ ثابت", "Fixed amount")}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" dir="ltr"
              placeholder={kind === "percent" ? "10" : "100"}
              style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: "center" }} />
            <span style={{ display: "grid", placeItems: "center", fontSize: 13, color: "var(--abh-steel)", minWidth: 44 }}>{kind === "percent" ? "%" : ccy}</span>
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={T("سبب الخصم (اختياري)", "Discount reason (optional)")}
            style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          {rawVal > 0 && (
            <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--abh-platinum)" }}>
              {T("قيمة الخصم", "Discount amount")}: <span style={{ color: "#3ecd8e" }}>−{EGP(manualAmount)} {ccy}</span>
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button disabled={busy || !rawVal} onClick={submitManual}
              style={{ opacity: busy || !rawVal ? .4 : 1, pointerEvents: busy || !rawVal ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
              {T("تطبيق الخصم", "Apply discount")}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11.5, color: "var(--abh-steel)", marginBottom: 10 }}>
            {T("أول 6-8 أرقام من كارت العميل — خصم تلقائي 20% لعملاء البنك الأهلي السعودي.", "First 6-8 digits of the customer's card — automatic discount for Saudi National Bank customers.")}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={bankDigits} onChange={(e) => { setBankDigits(e.target.value.replace(/\D/g, "").slice(0, 8)); setBankError(null); setBankPreview(null); }}
              dir="ltr" inputMode="numeric" maxLength={8}
              placeholder={T("مثال: 4567 1234", "e.g. 4567 1234")}
              style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: "center", letterSpacing: ".1em" }} />
            <button type="button" onClick={checkBank} disabled={bankChecking || bankDigits.length < 6}
              style={{ borderRadius: 12, border: "1px solid rgba(159,212,176,.4)", background: bankChecking || bankDigits.length < 6 ? "rgba(255,255,255,.02)" : "rgba(159,212,176,.1)", color: bankChecking || bankDigits.length < 6 ? "var(--abh-steel)" : "var(--abh-ivory)", padding: "11px 18px", fontSize: 12.5, fontWeight: 600, cursor: bankChecking || bankDigits.length < 6 ? "not-allowed" : "pointer" }}>
              {bankChecking ? T("جارٍ التحقق…", "Checking…") : T("تحقّق", "Verify")}
            </button>
          </div>
          {bankError && <p style={{ marginTop: 8, fontSize: 11.5, color: "#e7b4b4" }}>{bankError}</p>}
          {bankPreview && (
            <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid rgba(159,212,176,.4)", background: "rgba(159,212,176,.08)", padding: "12px 14px", fontSize: 12.5, color: "var(--abh-ivory)" }}>
              {T(`تم التحقق — ${bankPreview.label || "البنك الأهلي"} — خصم ${bankPreview.percent}%`, `Verified — ${bankPreview.label || "SNB"} — ${bankPreview.percent}% off`)}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button disabled={busy || !bankPreview} onClick={submitBank}
              style={{ opacity: busy || !bankPreview ? .4 : 1, pointerEvents: busy || !bankPreview ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#0c0d0e", background: "linear-gradient(135deg,#c3ecd1,#9fd4b0)", border: "none", cursor: "pointer" }}>
              {T("تطبيق الخصم", "Apply discount")}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Ghost onClick={onClose}>{T("إغلاق", "Close")}</Ghost>
      </div>
    </Modal>
  );
}

/* ═════════════════ مودال التفاصيل — «دوسيه مبوّب» ═════════════════
 * بدل الاسكرول الطويل: هيدر موحّد بنفس ريبون الكارت، ٤ تابات (نظرة عامة/
 * العميل/السيارة والخدمة/الفوترة)، وشريط إجراءات ثابت تحت التابات دايمًا ظاهر.
 */
function DetailModal({ b, busy, isAr, ccy, fmtDate, onClose, onMutate, onCall, onWhats, onPrint, onPrintWarranty, onConfirmPay, onGenLink, linkBusy, onDiscount, isSuperAdmin, onOpenDanger }: any) {
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [tab, setTab] = useState<"overview" | "customer" | "service" | "billing">("overview");
  const mobile = useMediaQuery("(max-width: 640px)");
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false, ...PAY_FALLBACK };
  const ws = b.workStage && b.status !== "cancelled" && b.status !== "completed" ? WORK_STAGE[b.workStage] : null;
  const accent = ws ? ws.color : st.color;
  const live = b.status === "upcoming" || b.status === "active";
  const workStarted = b.status === "active";
  const isPaid = b.payment === "paid";
  const locked = isPaid && workStarted;
  const canModify = live && !locked;
  const [rDate, setRDate] = useState(b.date);
  const [rTime, setRTime] = useState(b.time);
  const [reason, setReason] = useState("");
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const servicesTotal = b.services.reduce((s: number, x: any) => s + (Number(x.price) || 0), 0);
  const payMethod = PAY_METHOD[b.paymentMethod] ? (isAr ? PAY_METHOD[b.paymentMethod].ar : PAY_METHOD[b.paymentMethod].en) : (b.paymentMethod || "—");
  const promoDiscount = Number(b.promoDiscount) || 0;
  const isGiftCode = b.promoKind === "gift_service";
  const manualDiscountAmount = Number(b.manualDiscountAmount) || 0;

  const TABS: [string, string, any][] = [
    ["overview", T("نظرة عامة", "Overview"), I.tag],
    ["customer", T("العميل", "Customer"), I.user],
    ["service", T("السيارة والخدمة", "Vehicle & service"), I.car],
    ["billing", T("الفوترة", "Billing"), I.wallet],
  ];

  return (
    <Modal title={T("تفاصيل الحجز", "Booking details")} onClose={onClose} wide>
      {/* هيدر الدوسيه */}
      <div style={{ position: "relative", height: mobile ? 128 : 158, borderRadius: 18, overflow: "hidden", marginBottom: 18, border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${brandImg(b.brandId, b.plate || b.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.62) contrast(1.05)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,9,11,.95), rgba(8,9,11,.2))" }} />
        <span style={{ position: "absolute", top: 15, [isAr ? "right" : "left"]: -38, width: 150, padding: "4px 0", textAlign: "center", transform: `rotate(${isAr ? 45 : -45}deg)`, background: accent, color: "#0b0c0e", fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", boxShadow: "0 3px 10px rgba(0,0,0,.4)" }}>
          {ws ? (isAr ? ws.ar : ws.en) : (isAr ? st.ar : st.en)}
        </span>
        <span dir="ltr" className="abh-num" style={{ position: "absolute", top: 14, [isAr ? "left" : "right"]: 16, fontSize: 13, color: "var(--abh-platinum)", background: "rgba(0,0,0,.45)", borderRadius: 999, padding: "6px 12px" }}>{b.reference}</span>
        <div style={{ position: "absolute", insetInlineStart: 18, insetInlineEnd: 18, bottom: 14 }}>
          <div className="abh-display" style={{ fontSize: mobile ? 20 : 28, color: "#fff", textTransform: "uppercase", lineHeight: 1 }}>{b.vehicle}</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 11px", fontSize: 10, color: pay.color, background: "rgba(0,0,0,.5)", border: `1px solid ${pay.soft}`, marginTop: 8 }}>{I.wallet(12)}{isAr ? pay.ar : pay.en}</span>
        </div>
      </div>

      {mode === "view" && (
        <div className="abh-scale-in">
          {/* شريط التابات */}
          <div style={{ display: "flex", gap: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 4, marginBottom: 20, overflowX: "auto" }}>
            {TABS.map(([k, l, ic]) => {
              const on = tab === k;
              return (
                <button key={k} onClick={() => setTab(k as any)} style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: mobile ? "none" : 1, justifyContent: "center", whiteSpace: "nowrap", borderRadius: 999, padding: "9px 14px", fontSize: 11.5, color: on ? "#000" : "rgba(203,205,205,.75)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer", transition: "all .25s var(--abh-ease)" }}>
                  {ic(13)}{l}
                </button>
              );
            })}
          </div>

          {tab === "overview" && (
            <div>
              <SectionLabel>{I.user(13)} {T("جهة الحجز", "Booking source")}</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                {b.isGuest ? (
                  <span style={sourceBadgeStyle("#8a9099")}>{I.user(13)}{T("زائر — بدون حساب مسجّل", "Guest — no registered account")}</span>
                ) : (
                  <span style={sourceBadgeStyle((ACCOUNT_ROLE[b.accountRole] || ACCOUNT_ROLE.member).color)}>{I.user(13)}{T("حساب مسجّل", "Registered account")} · {isAr ? (ACCOUNT_ROLE[b.accountRole] || ACCOUNT_ROLE.member).ar : (ACCOUNT_ROLE[b.accountRole] || ACCOUNT_ROLE.member).en}</span>
                )}
                {b.viaPartner && <span style={sourceBadgeStyle("#9fd4b0")}>{I.tag(13)}{T("عن طريق شريك", "Booked via partner")} · {b.viaPartner}</span>}
              </div>

              {b.status !== "cancelled" ? (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel>{Ic.sliders({ s: 13 })} {T("مراحل العمل", "Work stages")}</SectionLabel>
                  <StagePipeline stage={b.stage || 0} isAr={isAr} />
                  <p style={{ margin: "8px 2px 0", fontSize: 11, color: "var(--abh-steel)" }}>{T("يتحدّث تلقائيًا حسب نسبة إنجاز مهام أمر العمل.", "Updates automatically from work-order task completion.")}</p>
                </div>
              ) : b.cancelReason && (
                <div style={{ marginBottom: 20, borderRadius: 14, border: "1px solid rgba(239,90,77,.3)", background: "rgba(239,90,77,.1)", padding: "12px 15px", fontSize: 13.5, color: "#f0b3ac" }}>
                  <strong style={{ fontWeight: 600 }}>{T("سبب الإلغاء", "Cancellation reason")}:</strong> {b.cancelReason}
                </div>
              )}

              <SectionLabel>{Ic.clock({ s: 13 })} {T("بيانات سريعة", "Quick facts")}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <InfoTile isAr={isAr} icon={<Ic.clock s={14} />} label={T("أُنشئ في", "Created")} value={b.createdAt ? new Date(b.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
                {b.deliveredAt && <InfoTile isAr={isAr} icon={I.shield(14)} label={T("تاريخ التسليم", "Delivered")} value={new Date(b.deliveredAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })} />}
                {b.invoiceNumber != null && <InfoTile isAr={isAr} icon={I.receipt(14)} label={T("رقم الفاتورة", "Invoice #")} value={String(b.invoiceNumber)} ltr />}
                <InfoTile isAr={isAr} icon={I.wallet(14)} label={T("حالة الدفع", "Payment status")} value={isAr ? pay.ar : pay.en} />
              </div>
            </div>
          )}

          {tab === "customer" && (
            <div>
              <SectionLabel>{I.user(13)} {T("بيانات العميل", "Customer")}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 16 }}>
                <InfoTile isAr={isAr} icon={I.user(14)} label={T("الاسم", "Name")} value={b.customer} />
                <InfoTile isAr={isAr} icon={I.mail(14)} label={T("الإيميل", "Email")} value={b.email || "—"} ltr href={b.email ? `mailto:${b.email}` : undefined} />
                <InfoTile isAr={isAr} icon={I.city(14)} label={T("المدينة", "City")} value={b.city || "—"} />
              </div>
            </div>
          )}

          {tab === "service" && (
            <div>
              <SectionLabel>{I.car(13)} {T("السيارة والموعد", "Vehicle & schedule")}</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
                <InfoTile isAr={isAr} icon={I.car(14)} label={T("اللوحة", "Plate")} value={b.plate || "—"} ltr />
                <InfoTile isAr={isAr} label={T("المقاس", "Size")} value={b.size || "—"} />
                <InfoTile isAr={isAr} icon={<Ic.pin s={14} />} label={T("الفرع", "Branch")} value={b.branch} />
                <InfoTile isAr={isAr} icon={<Ic.clock s={14} />} label={T("الموعد", "Date & time")} value={`${fmtDate(b.date)} · ${b.time}`} />
              </div>
              {b.services.length > 0 && (
                <>
                  <SectionLabel>{Ic.sparkle({ s: 13 })} {T("الخدمات", "Services")}</SectionLabel>
                                    <div className="abh-col" style={{ gap: 8 }}>
                    {b.services.map((s: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 14, border: `1px solid ${s.isGift ? "rgba(217,178,95,.35)" : "rgba(255,255,255,.07)"}`, background: s.isGift ? "rgba(217,178,95,.06)" : "rgba(255,255,255,.02)", padding: "12px 15px" }}>
                        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--abh-ivory)" }}>
                            {s.isGift ? <span style={{ color: GIFT_GOLD, display: "inline-flex" }}>{I.gift(14)}</span> : Ic.sparkle({ s: 14 })}
                            {s.name}
                            {s.isGift && <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 9.5, color: GIFT_GOLD, background: "rgba(217,178,95,.12)", border: "1px solid rgba(217,178,95,.4)", letterSpacing: ".04em" }}>{T("هدية", "Gift")}</span>}
                          </span>
                          {/* (جديد) لو الهدية دي جاية من كود خصم، نوريه صراحةً هنا */}
                          {s.isGift && s.giftFromPromo && b.promoCode && (
                            <span dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>
                              {T("بالكود", "via code")}: <span className="abh-num" style={{ color: GIFT_GOLD }}>{b.promoCode}</span>
                            </span>
                          )}
                        </span>
                        <span dir="ltr" className="abh-num" style={{ fontSize: 14, color: s.isGift ? GIFT_GOLD : "var(--abh-platinum)" }}>
                          {s.isGift && s.price === 0 ? T("مجانية", "Free") : (s.price > 0 ? `${EGP(s.price)} ${ccy}` : T("حسب الطلب", "On request"))}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "billing" && (
            <div>
              <SectionLabel>{I.wallet(13)} {T("تفاصيل الفوترة", "Billing breakdown")}</SectionLabel>
              <div style={{ borderRadius: 16, border: "1px solid rgba(203,205,205,.2)", background: "linear-gradient(180deg,rgba(203,205,205,.06),rgba(255,255,255,.01))", padding: "14px 16px" }}>
                <Line k={T("إجمالي الخدمات", "Services subtotal")} v={`${EGP(servicesTotal || b.subtotal)} ${ccy}`} />
                {b.towing > 0 && <Line k={T("السطحة / النقل", "Towing")} v={`${EGP(b.towing)} ${ccy}`} />}
                {promoDiscount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: 13.5 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--abh-platinum)" }}>{I.tag(13)}{T("خصم الكود", "Promo")}{b.promoCode ? ` (${b.promoCode})` : ""}</span>
                    <span dir="ltr" className="abh-num" style={{ color: "#3ecd8e" }}>−{EGP(promoDiscount)} {ccy}</span>
                  </div>
                )}
                {manualDiscountAmount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: 13.5 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--abh-platinum)" }}>{I.tag(13)}{T("خصم يدوي", "Manual discount")}{b.manualDiscountKind ? ` (${b.manualDiscountKind === "percent" ? `${b.manualDiscountValue}%` : `${EGP(b.manualDiscountValue)} ${ccy}`})` : ""}</span>
                    <span dir="ltr" className="abh-num" style={{ color: "#3ecd8e" }}>−{EGP(manualDiscountAmount)} {ccy}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "10px 0" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("الإجمالي", "Total")}</span>
                  {b.payments?.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <SectionLabel>{I.wallet(13)} {T("سجل الدفعات", "Payment history")}</SectionLabel>
                      <div className="abh-col" style={{ gap: 8 }}>
                        {b.payments.map((p: any) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "9px 13px" }}>
                            <div>
                              <div style={{ fontSize: 12.5, color: "var(--abh-ivory)" }}>
                                {p.method === "cash" ? T("كاش","Cash") : p.method === "card" ? T("شبكة","Card") : p.method === "transfer" ? T("تحويل","Transfer") : p.method === "gateway" ? T("دفع إلكتروني","Online") : T("أخرى","Other")}
                              </div>
                              <div style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{new Date(p.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{p.note ? ` · ${p.note}` : ""}</div>
                            </div>
                            <span dir="ltr" className="abh-num" style={{ color: "#3ecd8e", fontSize: 13.5 }}>+{EGP(p.amount)} {ccy}</span>
                          </div>
                        ))}
                      </div>
                      {b.remaining > 0 && (
                        <div style={{ marginTop: 8, textAlign: isAr ? "right" : "left", fontSize: 12.5, color: "#6ba8f5" }}>
                          {T(`متبقي: ${EGP(b.remaining)} ${ccy}`, `Remaining: ${EGP(b.remaining)} ${ccy}`)}
                        </div>
                      )}
                    </div>
                  )}
                  <span dir="ltr" className="abh-num" style={{ fontSize: mobile ? 22 : 26, color: "var(--abh-ivory)" }}>{EGP(b.total)} <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{ccy}</span></span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--abh-steel)" }}>
                  {T("طريقة الدفع", "Payment")}: {payMethod} · {T("الحالة", "Status")}: {isAr ? pay.ar : pay.en}
                  {b.promoCode ? ` · ${T("كود", "Code")}: ${b.promoCode}${isGiftCode ? ` (${T("هدية", "Gift")})` : ""}` : ""}
                  {manualDiscountAmount > 0 && b.manualDiscountReason ? ` · ${T("سبب الخصم", "Discount reason")}: ${b.manualDiscountReason}` : ""}
                  {manualDiscountAmount > 0 && b.manualDiscountBy ? ` · ${T("بواسطة", "By")}: ${b.manualDiscountBy}` : ""}
                </div>
              </div>
            </div>
          )}

          {/* شريط إجراءات ثابت */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12, marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <Ghost icon={() => I.print(15)} onClick={() => onPrint(b, "a4")}>{T("طباعة A4", "Print A4")}</Ghost>
            <Ghost icon={() => I.receipt(15)} onClick={() => onPrint(b, "receipt")}>{T("إيصال 80mm", "Receipt 80mm")}</Ghost>
            {pay.paid && <Ghost icon={() => I.shield(15)} onClick={() => onPrintWarranty(b)}>{T("بطاقة الضمان", "Warranty card")}</Ghost>}
            {!pay.paid && b.status !== "cancelled" && <Pill icon={() => I.wallet(15)} onClick={() => onConfirmPay(b)}>{T("تأكيد الدفع", "Confirm payment")}</Pill>}
            {!pay.paid && b.status !== "cancelled" && (
              <Ghost icon={() => I.link(15)} onClick={() => onGenLink(b.id)}>{linkBusy ? T("جارٍ التوليد…", "Generating…") : T("لينك الدفع", "Payment link")}</Ghost>
            )}
            {!pay.paid && b.status !== "cancelled" && (
              <Ghost icon={() => I.tag(15)} onClick={onDiscount}>{T("تعديل الخصم", "Edit discount")}</Ghost>
            )}
            {canModify && <Ghost icon={() => I.calClock(15)} onClick={() => setMode("reschedule")}>{T("إعادة جدولة", "Reschedule")}</Ghost>}
            {canModify && <Ghost danger icon={Ic.trash} onClick={() => setMode("cancel")}>{T("إلغاء الحجز", "Cancel booking")}</Ghost>}
            {isSuperAdmin && <Ghost danger icon={() => I.tag(15)} onClick={onOpenDanger}>{T("إدارة متقدّمة (سوبر أدمن)", "Advanced (super admin)")}</Ghost>}
          </div>
          {locked && (
            <p style={{ margin: "12px 2px 0", fontSize: 11.5, color: "var(--abh-steel)", textAlign: isAr ? "right" : "left", display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ color: "#3ecd8e", display: "inline-flex" }}>{Ic.check({ s: 13 })}</span>
              {T("بدأ التنفيذ والدفع تم — لا يمكن الإلغاء أو إعادة الجدولة.", "Work started and payment received — cancel/reschedule are locked.")}
            </p>
          )}
        </div>
      )}

      {mode === "reschedule" && (
        <div className="abh-scale-in">
          <PanelHead title={T("إعادة جدولة الموعد", "Reschedule")} sub={T("اختر تاريخ ووقت جديد للحجز.", "Pick a new date and time.")} onBack={() => setMode("view")} isAr={isAr} />
          <div className="abh-resched-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
            <MiniCalendar value={rDate} onPick={setRDate} isAr={isAr} />
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("اختر الوقت", "Pick a time")}</div>
              <TimeGrid value={rTime} onPick={setRTime} isAr={isAr} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
            <Ghost onClick={() => setMode("view")}>{T("رجوع", "Back")}</Ghost>
            <button disabled={!rDate || !rTime || busy} onClick={async () => { await onMutate(b.id, { action: "reschedule", date: rDate, time: rTime }); setMode("view"); }}
              style={{ opacity: !rDate || !rTime || busy ? .4 : 1, pointerEvents: !rDate || !rTime || busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
              {I.calClock(15)} {T("حفظ الموعد", "Save")}
            </button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="abh-scale-in">
          <PanelHead title={T("إلغاء الحجز", "Cancel booking")} sub={T("اكتب سبب الإلغاء — إجباري ويتسجّل في النظام.", "Enter a cancellation reason — required and logged in the system.")} onBack={() => setMode("view")} isAr={isAr} />
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(203,205,205,.8)", marginBottom: 9 }}>{T("سبب الإلغاء *", "Reason *")}</div>
            <Textarea rows={4} value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder={T("مثال: العميل طلب الإلغاء / عدم توفّر الموعد / تكرار الحجز…", "e.g. Customer requested / slot unavailable / duplicate booking…")} />
            {!reason.trim() && <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: "#c98a8a" }}>{T("لازم تكتب السبب قبل تأكيد الإلغاء.", "Please enter a reason before confirming.")}</p>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
            <Ghost onClick={() => setMode("view")}>{T("تراجع", "Back")}</Ghost>
            <button disabled={!reason.trim() || busy} onClick={async () => { await onMutate(b.id, { action: "cancel", reason: reason.trim() }); onClose(); }}
              style={{ opacity: !reason.trim() || busy ? .4 : 1, pointerEvents: !reason.trim() || busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "12px 24px", fontSize: 12, fontWeight: 600, letterSpacing: ".14em", color: "#f0c9c9", background: "rgba(42,20,20,.6)", border: "1px solid rgba(239,90,77,.5)", cursor: "pointer" }}>
              {Ic.trash({ s: 15 })} {T("تأكيد الإلغاء", "Confirm cancel")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═════════════════ مودال المتابعة (Follow-up timeline) ═════════════════ */
function FollowUpModal({ b, busy, isAr, onClose, onAddNote, onCloseFollowup, onReopenFollowup }: any) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const [channel, setChannel] = useState<string>("call");
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState<string>("confirmed");
  const [closeNote, setCloseNote] = useState("");

  const status = b.followupStatus || "none";
  const followups: any[] = b.followups || [];
  const outcomeInfo = b.followupOutcome ? FOLLOWUP_OUTCOME[b.followupOutcome] : null;
  const badgeColor = status === "closed" && outcomeInfo ? outcomeInfo.color : FOLLOWUP_STATUS[status].color;

  const fmtTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(+d)) return iso;
    return d.toLocaleString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  };

  const submitNote = async () => {
    const n = note.trim();
    if (!n) return;
    await onAddNote(b.id, channel, n);
    setNote("");
  };
  const submitClose = async () => {
    await onCloseFollowup(b.id, outcome, closeNote.trim() || undefined);
    setClosing(false);
    setCloseNote("");
  };

  return (
    <Modal title={T("متابعة الحجز", "Booking follow-up")} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, color: "var(--abh-ivory)" }}>{b.customer}</div>
          <div dir="ltr" style={{ fontSize: 11, color: "var(--abh-steel)" }}>{b.reference} · {b.vehicle}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 12px", fontSize: 10.5, fontWeight: 600, color: badgeColor, background: "rgba(255,255,255,.04)", border: `1px solid ${badgeColor}` }}>
          <span style={{ height: 7, width: 7, borderRadius: 999, background: badgeColor }} />
          {status === "closed" && outcomeInfo ? (isAr ? outcomeInfo.ar : outcomeInfo.en) : (isAr ? FOLLOWUP_STATUS[status].ar : FOLLOWUP_STATUS[status].en)}
        </span>
      </div>

      {status === "closed" && (
        <div style={{ marginBottom: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "12px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>
            {T("أُقفلت المتابعة", "Follow-up closed")}{b.followupClosedAt ? ` · ${fmtTime(b.followupClosedAt)}` : ""}
          </span>
          <Ghost sm onClick={() => onReopenFollowup(b.id)}>{T("إعادة فتح", "Reopen")}</Ghost>
        </div>
      )}

      <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>
        {T("سجل المتابعة", "Timeline")}
      </div>
      <div className="abh-col" style={{ gap: 10, marginBottom: 18, maxHeight: 320, overflowY: "auto", paddingInlineEnd: 4 }}>
        {followups.length === 0 ? (
          <div style={{ borderRadius: 14, border: "1px dashed rgba(255,255,255,.12)", padding: "22px 16px", textAlign: "center", fontSize: 12.5, color: "var(--abh-steel)" }}>
            {T("لا توجد متابعات بعد — أضف أول ملاحظة تحت.", "No follow-up entries yet — add the first note below.")}
          </div>
        ) : (
          followups.map((f: any) => {
            const ch = FOLLOWUP_CHANNEL[f.channel] || FOLLOWUP_CHANNEL.note;
            return (
              <div key={f.id} style={{ display: "flex", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", height: 30, width: 30, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}>{ch.icon(14)}</span>
                <div style={{ flex: 1, minWidth: 0, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "10px 13px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: "var(--abh-ivory)" }}>{isAr ? ch.ar : ch.en}{f.author ? ` · ${f.author}` : ""}</span>
                    <span style={{ fontSize: 10, color: "var(--abh-steel)", flexShrink: 0 }}>{fmtTime(f.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--abh-platinum)", whiteSpace: "pre-wrap" }}>{f.note}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!closing && status !== "closed" && (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.entries(FOLLOWUP_CHANNEL).map(([k, v]) => {
              const on = channel === k;
              return (
                <button key={k} type="button" onClick={() => setChannel(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 12px", fontSize: 11, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`, background: on ? "rgba(203,205,205,.1)" : "transparent", color: on ? "var(--abh-ivory)" : "var(--abh-steel)", cursor: "pointer" }}>
                  {v.icon(12)}{isAr ? v.ar : v.en}
                </button>
              );
            })}
          </div>
          <Textarea rows={3} value={note} onChange={(e: any) => setNote(e.target.value)} placeholder={T("مثال: كلمت العميل، أكّد إنه هييجي يوم السبت الساعة ٤…", "e.g. Called the customer, confirmed they’ll come Saturday at 4…")} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <Ghost sm onClick={() => setClosing(true)}>{T("إنهاء المتابعة", "End follow-up")}</Ghost>
            <button disabled={!note.trim() || busy} onClick={submitNote} style={{ opacity: !note.trim() || busy ? .4 : 1, pointerEvents: !note.trim() || busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
              {I.bubble(14)}{T("إضافة", "Add")}
            </button>
          </div>
        </div>
      )}

      {closing && (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: 14 }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>
            {T("القرار النهائي", "Final decision")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
            {Object.entries(FOLLOWUP_OUTCOME).map(([k, v]) => {
              const on = outcome === k;
              return (
                <button key={k} type="button" onClick={() => setOutcome(k)} style={{ borderRadius: 12, padding: "10px 12px", fontSize: 12, textAlign: isAr ? "right" : "left", border: `1px solid ${on ? v.color : "rgba(255,255,255,.1)"}`, background: on ? `${v.color}1a` : "transparent", color: on ? v.color : "var(--abh-platinum)", cursor: "pointer" }}>
                  {isAr ? v.ar : v.en}
                </button>
              );
            })}
          </div>
          <Textarea rows={2} value={closeNote} onChange={(e: any) => setCloseNote(e.target.value)} placeholder={T("ملاحظة أخيرة (اختياري)…", "Final note (optional)…")} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <Ghost onClick={() => setClosing(false)}>{T("رجوع", "Back")}</Ghost>
            <button disabled={busy} onClick={submitClose} style={{ opacity: busy ? .4 : 1, pointerEvents: busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
              {Ic.check({ s: 14 })}{T("تأكيد الإقفال", "Confirm close")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═════════════════ مودال الإدارة المتقدّمة (سوبر أدمن فقط) ═════════════════
   تغيير الحالة يدويًا (كل التوابع تتظبط تلقائيًا في السيرفر) + حذف نهائي كامل. */
function DangerZoneModal({ b, busy, isAr, onClose, onForceStatus, onDelete }: any) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const [reason, setReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");

  const STATUSES: [string, string, string][] = [
    ["upcoming", T("قادم", "Upcoming"), "#8a9099"],
    ["active", T("قيد التنفيذ", "In progress"), "#f5993d"],
    ["completed", T("مكتمل", "Completed"), "#3ecd8e"],
    ["cancelled", T("ملغي", "Cancelled"), "#ef5a4d"],
  ];

  async function confirmForce() {
    if (!pendingStatus) return;
    if (pendingStatus === "cancelled" && !reason.trim()) return;
    const ok = await onForceStatus(b.id, pendingStatus, reason.trim() || undefined);
    if (ok) { setPendingStatus(null); setReason(""); }
  }

  return (
    <Modal title={T("إدارة متقدّمة — سوبر أدمن", "Advanced — super admin")} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--abh-steel)" }}>{b.customer} · {b.vehicle}</div>
        <div dir="ltr" className="abh-num" style={{ fontSize: 15, color: "var(--abh-ivory)", marginTop: 3 }}>{b.reference}</div>
      </div>

      {/* تغيير الحالة يدويًا */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 12 }}>
          {T("تغيير الحالة يدويًا", "Force status change")}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--abh-steel)", marginBottom: 12, lineHeight: 1.6 }}>
          {T("كل ما يترتب على الحالة (المرحلة، مرحلة العمل، تاريخ التسليم، رد المبلغ لو مدفوع) هيتظبط تلقائيًا.", "Everything derived from status (stage, work stage, delivery date, refund if paid) is adjusted automatically.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: pendingStatus ? 12 : 0 }}>
          {STATUSES.map(([k, l, c]) => {
            const on = pendingStatus === k;
            const current = b.status === k;
            return (
              <button key={k} type="button" disabled={current} onClick={() => setPendingStatus(k)}
                style={{ borderRadius: 12, padding: "10px 12px", fontSize: 12, border: `1px solid ${on ? c : "rgba(255,255,255,.1)"}`, background: on ? `${c}1a` : current ? "rgba(255,255,255,.03)" : "transparent", color: current ? "var(--abh-steel)" : on ? c : "var(--abh-platinum)", cursor: current ? "not-allowed" : "pointer", opacity: current ? .5 : 1 }}>
                {l}{current ? ` (${T("الحالية", "current")})` : ""}
              </button>
            );
          })}
        </div>
        {pendingStatus && (
          <>
            {pendingStatus === "cancelled" && (
              <Textarea rows={2} value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder={T("سبب الإلغاء (إجباري)…", "Cancellation reason (required)…")} style={{ marginBottom: 10 }} />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Ghost sm onClick={() => { setPendingStatus(null); setReason(""); }}>{T("تراجع", "Back")}</Ghost>
              <button disabled={busy || (pendingStatus === "cancelled" && !reason.trim())} onClick={confirmForce}
                style={{ opacity: busy || (pendingStatus === "cancelled" && !reason.trim()) ? .4 : 1, pointerEvents: busy ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: "pointer" }}>
                {Ic.check({ s: 14 })}{T("تأكيد التغيير", "Confirm change")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* حذف نهائي */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(239,90,77,.35)", background: "rgba(239,90,77,.06)", padding: 16 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#ef5a4d", marginBottom: 12 }}>
          {T("حذف الحجز نهائيًا", "Permanently delete booking")}
        </div>
        <p style={{ fontSize: 11.5, color: "#f0b3ac", marginBottom: 12, lineHeight: 1.6 }}>
          {T("هيمسح الحجز وكل ما يخصه بدون رجعة: الخدمات، المهام، الفنيين المخصصين، الخامات المصروفة، الصور، التوقيعات، سجل الحالة، المتابعات، استخدام أكواد الخصم. لا يمكن التراجع.", "Deletes the booking and everything tied to it, irreversibly: services, tasks, assigned technicians, issued materials, photos, signatures, status history, follow-ups, promo redemption. Cannot be undone.")}
        </p>
        {!confirmDelete ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Ghost danger icon={Ic.trash} onClick={() => setConfirmDelete(true)}>{T("حذف نهائي…", "Delete forever…")}</Ghost>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11.5, color: "#f0b3ac", marginBottom: 8 }}>
              {T(`اكتب رقم الحجز للتأكيد: `, `Type the booking reference to confirm: `)}<span dir="ltr" style={{ fontWeight: 700 }}>{b.reference}</span>
            </p>
            <input value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} dir="ltr"
              style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(239,90,77,.4)", background: "rgba(0,0,0,.2)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: "center", marginBottom: 12 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Ghost sm onClick={() => { setConfirmDelete(false); setDeleteTyped(""); }}>{T("تراجع", "Cancel")}</Ghost>
              <button disabled={busy || deleteTyped.trim() !== b.reference} onClick={() => onDelete(b.id)}
                style={{ opacity: busy || deleteTyped.trim() !== b.reference ? .4 : 1, pointerEvents: busy || deleteTyped.trim() !== b.reference ? "none" : "auto", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: "#f0c9c9", background: "rgba(42,20,20,.7)", border: "1px solid rgba(239,90,77,.5)", cursor: "pointer" }}>
                {Ic.trash({ s: 14 })}{T("حذف نهائي", "Delete forever")}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Ghost onClick={onClose}>{T("إغلاق", "Close")}</Ghost>
      </div>
    </Modal>
  );
}

function SectionLabel({ children }: any) {
  return <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-platinum)" }}><span style={{ display: "inline-flex" }}>{children}</span></div>;
}
function InfoTile({ icon, label, value, ltr, href, isAr }: any) {
  const inner = (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "11px 14px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{icon}{label}</div>
      {/* الاتجاه (ltr) بيفضل للأرقام/الإيميل عشان ترتيبها يفضل صح،
          لكن المحاذاة دايمًا بتتبع لغة الصفحة — يمين في العربي، شمال في الإنجليزي —
          عشان القيمة تفضل تحت الليبل بالظبط زي باقي الكروت. */}
      <div dir={ltr ? "ltr" : undefined} style={{ marginTop: 5, fontSize: 14, color: href ? "#bfe3cf" : "var(--abh-ivory)", wordBreak: "break-word", textAlign: isAr ? "right" : "left" }}>{value}</div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none" }}>{inner}</a> : inner;
}
function Line({ k, v }: any) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: 13.5 }}><span style={{ color: "var(--abh-steel)" }}>{k}</span><span dir="ltr" className="abh-num" style={{ color: "var(--abh-ivory)" }}>{v}</span></div>;
}
function PanelHead({ title, sub, onBack, isAr }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <button onClick={onBack} style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-platinum)", cursor: "pointer", flexShrink: 0, transform: isAr ? "none" : "scaleX(-1)" }}>{I.back(15)}</button>
      <div>
        <h3 className="abh-display" style={{ margin: 0, fontSize: 22, fontWeight: 300, color: "var(--abh-ivory)", textTransform: "uppercase" }}>{title}</h3>
        <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--abh-steel)" }}>{sub}</p>
      </div>
    </div>
  );
}

/* ═════════════════ المكوّن الرئيسي ═════════════════ */
export default function BookingsClient({ initial, locale, isSuperAdmin }: { initial: any[]; locale?: string; isSuperAdmin?: boolean }) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const [list, setList] = useState(initial);
  const router = useRouter();
  const goReceive = (id: string) => router.push(`/admin/bookings/${id}`);
  const goWorkOrder = (id: string) => router.push(`/admin/bookings/${id}/work-order`);
  const goReport = (id: string) => router.push(`/admin/bookings/${id}/report`);
  // أول ما الصفحة تفتح: هات أحدث الحجوزات من السيرفر (يتخطّى كاش الراوتر)
  useEffect(() => { router.refresh(); }, [router]);
  // زامن القائمة مع بيانات السيرفر كل ما توصل نسخة جديدة
  useEffect(() => { setList(initial); }, [initial]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
const [view, setView] = useState<"grid" | "list">("grid");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const [followupId, setFollowupId] = useState<string | null>(null);
  const [discountId, setDiscountId] = useState<string | null>(null);
  const [dangerZoneId, setDangerZoneId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);
  const mobile = useMediaQuery("(max-width: 640px)");

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso); if (isNaN(+d)) return iso;
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "long" });
  };
  const tabs: [string, string][] = [["all", T("الكل", "All")], ["needs_intake", T("بانتظار الاستلام", "Needs intake")], ["needs_assign", T("بانتظار التخصيص", "Needs assign")], ["in_service", T("قيد التشغيل", "In service")], ["unpaid", T("بانتظار الدفع", "Awaiting payment")],["partial", T("مدفوع جزئيًا", "Partially paid")], ["paid", T("مدفوع", "Paid")], ["followup", T("قيد المتابعة", "Following up")], ["completed", T("مكتملة", "Completed")], ["cancelled", T("ملغية", "Cancelled")]];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    c.unpaid = list.filter((b) => b.payment !== "paid" && b.payment !== "partial" && b.status !== "cancelled").length;
    c.paid = list.filter((b) => b.payment === "paid" && b.status !== "cancelled").length;
    c.partial = list.filter((b) => b.payment === "partial" && b.status !== "cancelled").length;
    // بانتظار الاستلام = لسه ملوش رقم أمر عمل (ما اتستلمش)
    c.needs_intake = list.filter((b) => !b.workOrderNo && b.status !== "cancelled" && b.status !== "completed").length;
    // بانتظار التخصيص = اتستلم (عنده WO) بس لسه ما بدأش التشغيل
    c.needs_assign = list.filter((b) => b.workOrderNo && b.workStage === "received" && b.status !== "cancelled" && b.status !== "completed").length;
    // قيد التشغيل = بدأ الشغل
    c.in_service = list.filter((b) => ["in_service", "quality_check", "ready"].includes(b.workStage) && b.status !== "cancelled" && b.status !== "completed").length;
    c.followup = list.filter((b) => b.followupStatus === "open").length;
    c.completed = list.filter((b) => b.status === "completed").length;
    c.cancelled = list.filter((b) => b.status === "cancelled").length;
    return c;
  }, [list]);

  const revenue = useMemo(() => list.filter((b) => b.payment === "paid").reduce((s, b) => s + (Number(b.total) || 0), 0), [list]);
  const unpaidCount = useMemo(() => list.filter((b) => b.payment !== "paid" && b.status !== "cancelled").length, [list]);

  const filtered = useMemo(() => {
  let r = list.filter((b) => {
    const matchTab = tab === "all" ? true
      : tab === "unpaid" ? (b.payment !== "paid" && b.payment !== "partial" && b.status !== "cancelled")
      : tab === "partial" ? (b.payment === "partial")
      : tab === "paid" ? (b.payment === "paid" && b.status !== "cancelled")
      : tab === "needs_intake" ? (!b.workOrderNo && b.status !== "cancelled" && b.status !== "completed")
      : tab === "needs_assign" ? (b.workOrderNo && b.workStage === "received" && b.status !== "cancelled" && b.status !== "completed")
      : tab === "in_service" ? (["in_service", "quality_check", "ready"].includes(b.workStage) && b.status !== "cancelled" && b.status !== "completed")
      : tab === "followup" ? (b.followupStatus === "open")
      : b.status === tab;
    const matchQ = q === "" || `${b.customer} ${b.vehicle} ${b.reference} ${b.plate} ${b.phone}`.toLowerCase().includes(q.toLowerCase());
    // (جديد) فلتر الفترة الزمنية — على تاريخ الموعد (scheduled_date)
    const matchDate = (!dateFrom || (b.date || "") >= dateFrom) && (!dateTo || (b.date || "") <= dateTo);
    return matchTab && matchQ && matchDate;
  });
  if (sort === "soonest") {
    const todayIso = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD بتوقيت الجهاز
    r = r.filter((b) => (b.date || "") >= todayIso);
    r = [...r].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  }
  else if (sort === "highest") r = [...r].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
  return r;
}, [list, tab, q, sort, dateFrom, dateTo]);

  const detail = detailId ? list.find((b) => b.id === detailId) : null;
  const confirmPayBooking = confirmPayId ? list.find((b) => b.id === confirmPayId) : null;
  const followup = followupId ? list.find((b) => b.id === followupId) : null;
  const discountBooking = discountId ? list.find((b) => b.id === discountId) : null;
  const dangerZoneBooking = dangerZoneId ? list.find((b) => b.id === dangerZoneId) : null;

  async function mutate(id: string, body: any) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "fail");
      setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
      toast(
        body.action === "cancel" ? T("تم إلغاء الحجز", "Booking cancelled") :
        body.action === "reschedule" ? T("تم تغيير الموعد", "Rescheduled") :
        body.action === "confirm_pay"
        ? (data.booking?.payment === "partial" ? T("تم تسجيل دفعة جزئية", "Partial payment recorded") : T("تم تأكيد الدفع", "Payment confirmed"))
        :
        body.action === "set_discount" ? (body.clear ? T("تمت إزالة الخصم", "Discount removed") : T("تم تطبيق الخصم", "Discount applied")) :
        body.action === "followup_close" ? T("تم إقفال المتابعة", "Follow-up closed") :
        body.action === "followup_reopen" ? T("تم إعادة فتح المتابعة", "Follow-up reopened") :
        body.action === "followup_add" ? T("تمت إضافة المتابعة", "Follow-up added") :
        T("تم تحديث المرحلة", "Stage updated")
      );
    } catch { toast(T("فشل التنفيذ", "Action failed"), "bad"); }
    finally { setBusy(false); }
  }

  const openConfirmPay = (b: any) => setConfirmPayId(b.id);
const confirmPayment = async (id: string, payload: { amount: number; method: string; note?: string }) => {
  await mutate(id, { action: "confirm_pay", ...payload });
  setConfirmPayId(null);
};
const applyDiscount = async (id: string, payload: { discount?: { kind: string; value: number; reason?: string }; bankCardDigits?: string; clear?: boolean }) => {
  await mutate(id, { action: "set_discount", ...payload });
  setDiscountId(null);
};

// (سوبر أدمن) تغيير الحالة يدويًا مع ضبط كل التوابع تلقائيًا في السيرفر
async function forceStatus(id: string, status: string, reason?: string) {
  setBusy(true);
  try {
    const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "force_status", status, reason }) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "fail");
    setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
    toast(T("تم تغيير الحالة", "Status changed"));
    return true;
  } catch { toast(T("فشل تغيير الحالة", "Failed to change status"), "bad"); return false; }
  finally { setBusy(false); }
}

// (سوبر أدمن) حذف الحجز نهائيًا مع كل ما يخصه
async function deleteBookingForever(id: string) {
  setBusy(true);
  try {
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "fail");
    setList((ls) => ls.filter((b) => b.id !== id));
    setDetailId(null);
    toast(T("تم حذف الحجز نهائيًا", "Booking permanently deleted"));
  } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
  finally { setBusy(false); }
}

// (جديد) توليد لينك دفع ونسخه — عشان تبعته للعميل يدفع بيه أونلاين
async function genPaymentLink(id: string) {
  setLinkBusyId(id);
  try {
    const res = await fetch(`/api/admin/bookings/${id}/payment-link`, { method: "POST" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "fail");
    await navigator.clipboard.writeText(data.linkUrl);
    toast(T("تم نسخ لينك الدفع", "Payment link copied"));
  } catch (e: any) {
    toast(
      e?.message === "already_paid" ? T("الحجز مدفوع بالفعل", "Already paid")
        : e?.message === "zero_amount" ? T("قيمة الحجز صفر", "Booking total is zero")
        : T("فشل توليد اللينك", "Failed to generate link"),
      "bad"
    );
  } finally {
    setLinkBusyId(null);
  }
}

async function addFollowupNote(id: string, channel: string, note: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "followup_add", channel, note }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "fail");
      setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
    } catch { toast(T("فشل إضافة المتابعة", "Failed to add follow-up"), "bad"); }
    finally { setBusy(false); }
  }
  async function closeFollowup(id: string, outcome: string, note?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "followup_close", outcome, note }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "fail");
      setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
      toast(T("تم إقفال المتابعة", "Follow-up closed"));
    } catch { toast(T("فشل إقفال المتابعة", "Failed to close follow-up"), "bad"); }
    finally { setBusy(false); }
  }
  async function reopenFollowup(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "followup_reopen" }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "fail");
      setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
    } catch { toast(T("فشل إعادة الفتح", "Failed to reopen"), "bad"); }
    finally { setBusy(false); }
  }


  const printInvoice = (b: any, size: "a4" | "receipt" = "a4") => {
    try {
      printBookingInvoice(b, { isAr, ccy, size });
    } catch (e) { console.error("print failed:", e); toast(T("تعذّر فتح الطباعة", "Couldn't open print"), "bad"); }
  };

  const printWarranty = (b: any) => {
    try {
      printBookingWarranty(b, { isAr, ccy });
    } catch (e) { console.error("warranty print failed:", e); toast(T("تعذّر فتح بطاقة الضمان", "Couldn't open warranty card"), "bad"); }
  };

  const exportCsv = () => {
    const head = [
      "reference", "status", "workOrderNo", "workStage",
      "vehicle", "plate", "brand", "size", "color", "branch",
      "customerName", "phone", "email", "city", "customerType", "viaPartner",
      "date", "time", "createdAt", "deliveredAt",
      "servicesDetail", "servicesCount", "servicesTotal", "towing",
      "promoCode", "promoDiscount", "promoKind",
      "manualDiscountType", "manualDiscountValue", "manualDiscountAmount", "manualDiscountReason", "manualDiscountBy",
      "bankDiscountAmount", "bankCode",
      "subtotal", "total",
      "paymentMethod", "paymentStatus", "invoiceNumber",
      "followupStatus", "followupOutcome", "followupClosedAt", "followupsCount", "followupsDetail",
      "cancelReason", "notes",
    ];

    const rows = filtered.map((b) => {
      const servicesDetail = (b.services || [])
        .map((s: any) => `${s.name}${s.isGift ? ` [${T("هدية", "Gift")}]` : ""} = ${EGP(s.price)} ${ccy}`)
        .join(" | ");
      const servicesTotal = (b.services || []).reduce((s: number, x: any) => s + (Number(x.price) || 0), 0);
      const followupsDetail = (b.followups || [])
        .map((f: any) => {
          const ch = FOLLOWUP_CHANNEL[f.channel]?.[isAr ? "ar" : "en"] || f.channel;
          return `${ch}${f.author ? ` (${f.author})` : ""}: ${f.note}`.replace(/\n/g, " ");
        })
        .join(" || ");

      return [
        b.reference,
        isAr ? (STATUS[b.status]?.ar || b.status) : (STATUS[b.status]?.en || b.status),
        b.workOrderNo || "",
        b.workStage ? (isAr ? WORK_STAGE[b.workStage]?.ar : WORK_STAGE[b.workStage]?.en) || b.workStage : "",
        b.vehicle, b.plate, b.brandId, b.size, b.color, b.branch,
        b.customer, b.phone, b.email, b.city,
        b.isGuest ? T("زائر", "Guest") : T("عميل مسجل", "Registered"),
        b.viaPartner || "",
        b.date, b.time, b.createdAt, b.deliveredAt,
        servicesDetail, (b.services || []).length, servicesTotal, b.towing,
        b.promoCode || "", b.promoDiscount || 0, b.promoKind || "",
        b.manualDiscountKind || "", b.manualDiscountValue || 0, b.manualDiscountAmount || 0, b.manualDiscountReason || "", b.manualDiscountBy || "",
        b.bankDiscountAmount || 0, b.bankCode || "",
        b.subtotal || 0, b.total,
        b.paymentMethod ? (PAY_METHOD[b.paymentMethod]?.[isAr ? "ar" : "en"] || b.paymentMethod) : "",
        isAr ? (PAY[b.payment]?.ar || b.payment) : (PAY[b.payment]?.en || b.payment),
        b.invoiceNumber ?? "",
        b.followupStatus || "none",
        b.followupOutcome ? (isAr ? FOLLOWUP_OUTCOME[b.followupOutcome]?.ar : FOLLOWUP_OUTCOME[b.followupOutcome]?.en) || b.followupOutcome : "",
        b.followupClosedAt || "",
        (b.followups || []).length,
        followupsDetail,
        b.cancelReason || "",
        b.notes || "",
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    });

    const csv = "\uFEFF" + [head.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `abh-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // (جديد) تصدير PDF تفصيلي — كل بيانات الحجوزات المعروضة حاليًا (بعد الفلاتر) في تقرير واحد
  const exportPdf = () => {
    try {
      printBookingsFullReport(filtered, { isAr, ccy });
    } catch (e) {
      console.error("full report print failed:", e);
      toast(T("تعذّر تجهيز تقرير الـPDF", "Couldn't prepare the PDF report"), "bad");
    }
  };

  const stats = [
    { label: T("إجمالي الحجوزات", "Total bookings"), value: String(list.length) },
    { label: T("قيد التنفيذ", "In progress"), value: String(counts.active || 0), accent: "#f5993d" },
    { label: T("بانتظار الدفع", "Awaiting payment"), value: String(unpaidCount), accent: unpaidCount ? "#ffb723" : undefined },
    { label: T("إيرادات محصّلة", "Collected revenue"), value: `${EGP(revenue)} ${ccy}`, accent: "#3ecd8e" },
  ];

  const sortOpts: [string, string][] = [["recent", T("الأحدث", "Newest")], ["soonest", T("الأقرب موعدًا", "Soonest")], ["highest", T("الأعلى قيمة", "Highest value")]];

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("الحجوزات", "Bookings")} subtitle={T("تابع كل طلب من الاستلام حتى التسليم، أكّد الدفع، حدّث مراحل العمل وأعد الجدولة — لحظيًا.", "Track every order from intake to delivery — confirm payment, advance work stages, and reschedule, in real time.")} seed="bookings-hero" />

      {/* شريط إحصائيات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...card, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            {s.accent && <span style={{ position: "absolute", insetInlineStart: 0, top: 12, bottom: 12, width: 3, borderRadius: 3, background: s.accent }} />}
            <div className="abh-num" dir="ltr" style={{ fontSize: 26, color: "var(--abh-ivory)", lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ marginTop: 6, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* تابات + بحث */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 4, flexWrap: "wrap" }}>
          {tabs.map(([k, l]) => {
            const on = tab === k;
            const showAmber = k === "unpaid" && (counts.unpaid ?? 0) > 0;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "9px 16px", fontSize: 11.5, letterSpacing: ".04em", color: on ? "#000" : (showAmber ? "#ffb723" : "rgba(203,205,205,.7)"), background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer", transition: "all .25s var(--abh-ease)" }}>
                {showAmber && !on && <span style={{ height: 6, width: 6, borderRadius: 999, background: "#ffb723", display: "inline-block" }} />}
                {l}<span style={{ marginInlineStart: 6, opacity: on ? .6 : 1, color: on ? undefined : (showAmber ? "#ffb723" : "inherit") }}>{counts[k] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 360 }}>
          <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالاسم، السيارة، التليفون أو الرقم…", "Search by name, vehicle, phone or reference…")} style={{ width: "100%", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: isAr ? "11px 42px 11px 16px" : "11px 16px 11px 42px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
        </div>
      </div>

      {/* (جديد) فلتر الفترة الزمنية — على تاريخ الموعد */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--abh-steel)" }}>{I.calClock(14)}{T("الفترة", "Date range")}</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} dir="ltr"
          style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "8px 14px", fontSize: 12.5, color: "var(--abh-ivory)", outline: "none", colorScheme: "dark" }} />
        <span style={{ color: "var(--abh-steel)", fontSize: 12 }}>{T("إلى", "to")}</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} dir="ltr"
          style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "8px 14px", fontSize: 12.5, color: "var(--abh-ivory)", outline: "none", colorScheme: "dark" }} />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-platinum)", padding: "8px 13px", fontSize: 11.5, cursor: "pointer" }}>
            {T("مسح الفترة", "Clear range")}
          </button>
        )}
        {(dateFrom || dateTo) && (
          <span style={{ fontSize: 11.5, color: "var(--abh-steel)" }}>
            {T(`${filtered.length} حجز في الفترة المحددة`, `${filtered.length} bookings in range`)}
          </span>
        )}
      </div>

      {/* تول-بار: فرز + تبديل عرض + تصدير */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--abh-steel)" }}>{I.sort(15)}</span>
          <div style={{ display: "flex", gap: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 4 }}>
            {sortOpts.map(([k, l]) => { const on = sort === k; return <button key={k} onClick={() => setSort(k)} style={{ borderRadius: 999, padding: "7px 13px", fontSize: 11, color: on ? "var(--abh-ivory)" : "var(--abh-steel)", background: on ? "rgba(255,255,255,.07)" : "transparent", border: "none", cursor: "pointer" }}>{l}</button>; })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Ghost sm icon={() => I.download(14)} onClick={exportCsv}>{T("تصدير CSV", "Export CSV")}</Ghost>
          <Ghost sm icon={() => I.pdf(14)} onClick={exportPdf}>{T("تصدير PDF", "Export PDF")}</Ghost>
          <div style={{ display: "flex", gap: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 4 }}>
            <button onClick={() => setView("grid")} title="Grid" style={{ display: "grid", placeItems: "center", height: 32, width: 36, borderRadius: 999, color: view === "grid" ? "#000" : "var(--abh-steel)", background: view === "grid" ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer" }}>{I.grid(15)}</button>
            <button onClick={() => setView("list")} title="List" style={{ display: "grid", placeItems: "center", height: 32, width: 36, borderRadius: 999, color: view === "list" ? "#000" : "var(--abh-steel)", background: view === "list" ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer" }}>{I.rows(15)}</button>
          </div>
        </div>
      </div>

      {/* المحتوى */}
      {filtered.length === 0 ? (
        <div style={{ ...card, borderStyle: "dashed", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد حجوزات في هذا التصنيف", "No bookings in this category")}</div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(330px,1fr))", gap: mobile ? 14 : 18 }}>
          {filtered.map((b, i) => (
            <BookingCard key={b.id} b={b} i={i} busy={busy} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onOpen={setDetailId} onReceive={goReceive} onWorkOrder={goWorkOrder} onReport={goReport} onConfirmPay={openConfirmPay} onCall={call} onWhats={whats} onPrint={printInvoice} onPrintWarranty={printWarranty} onFollowUp={setFollowupId} onGenLink={genPaymentLink} linkBusy={linkBusyId === b.id} onDiscount={setDiscountId} />
          ))}
        </div>
      ) : (
        <div className="abh-col" style={{ gap: 10 }}>
          {filtered.map((b, i) => <BookingRow key={b.id} b={b} i={i} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onOpen={setDetailId} />)}
        </div>
      )}
      {detail && <DetailModal b={detail} busy={busy} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onClose={() => setDetailId(null)} onMutate={mutate} onCall={call} onWhats={whats} onPrint={printInvoice} onPrintWarranty={printWarranty} onConfirmPay={openConfirmPay} onGenLink={genPaymentLink} linkBusy={linkBusyId === detail.id} onDiscount={() => setDiscountId(detail.id)} isSuperAdmin={isSuperAdmin} onOpenDanger={() => setDangerZoneId(detail.id)} />}
      {confirmPayBooking && (
  <RecordPaymentModal b={confirmPayBooking} busy={busy} isAr={isAr} ccy={ccy}
    onClose={() => setConfirmPayId(null)} onConfirm={confirmPayment} />
)}
      {discountBooking && (
        <DiscountModal b={discountBooking} busy={busy} isAr={isAr} ccy={ccy}
          onClose={() => setDiscountId(null)} onApply={applyDiscount} />
      )}
      {followup && <FollowUpModal b={followup} busy={busy} isAr={isAr} onClose={() => setFollowupId(null)} onAddNote={addFollowupNote} onCloseFollowup={closeFollowup} onReopenFollowup={reopenFollowup} />}
      {dangerZoneBooking && (
        <DangerZoneModal b={dangerZoneBooking} busy={busy} isAr={isAr}
          onClose={() => setDangerZoneId(null)}
          onForceStatus={forceStatus}
          onDelete={deleteBookingForever} />
      )}
      <style>{`
        @media(min-width:680px){.abh-resched-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:620px){.abh-row{grid-template-columns:auto 1fr auto!important}.abh-row>div:nth-child(3),.abh-row>div:nth-child(4){display:none!important}}
      `}</style>
    </div>
  );
}