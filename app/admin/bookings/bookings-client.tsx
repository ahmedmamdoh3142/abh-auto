"use client";
/**
 * app/admin/bookings/bookings-client.tsx — لوحة الحجوزات (CLIENT) · v2
 *
 * • ثنائية اللغة (ar/en) عبر prop `locale` — زيّ باقي صفحات الأدمن.
 * • عرضان: Grid (كروت سينمائية صورة السيارة خلفية الكرت) + List (صفوف كثيفة).
 * • هوفر على الكرت يكشف "دوسيه" تفاصيل كامل فوق الكرت بانسيابية (بيانات العميل،
 *   الخدمات، المراحل، وأكشنز سريعة) — مستوحى من لوحات Fortress/Bloomberg-terminal.
 *   وعلى الموبايل (لمس) الدوسيه يظهر أصلاً بدون hover: صورة-هيدر فوق + جسم واضح تحت.
 * • بوردر بلون الحالة (رمادي=قادم، برتقالي=قيد التنفيذ، أخضر=مكتمل، أحمر=ملغي).
 * • فرز + بحث + تصدير CSV + اتصال/واتساب سريع.
 * • مودال تفاصيل: بيانات العميل كاملة، خدمات بالأسعار، بايبلاين مراحل متزامن مع
 *   حساب العميل، إعادة جدولة (تقويم+مواعيد)، إلغاء بسبب اجباري، تأكيد دفع.
 */
import React, { useMemo, useState } from "react";
import { card, Ghost, Pill, Ic, EGP, Modal, Textarea, useToast, PageHeader, carImg } from "@/components/admin/ui";

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
const PAY: Record<string, { ar: string; en: string; paid: boolean }> = {
  paid:          { ar: "مدفوع",         en: "Paid",             paid: true },
  pay_at_branch: { ar: "دفع بالفرع",    en: "Pay at branch",    paid: false },
  pending:       { ar: "بانتظار الدفع", en: "Awaiting payment", paid: false },
  refunded:      { ar: "مُسترَد",        en: "Refunded",         paid: false },
};
const STAGES = [
  { ar: "تم الاستلام",   en: "Received" },
  { ar: "قيد العمل",     en: "In service" },
  { ar: "فحص الجودة",    en: "Quality check" },
  { ar: "جاهزة للتسليم", en: "Ready" },
];
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
  wallet: (s = 14) => mini(["M21 12V7H5a2 2 0 0 1 0-4h14v4", "M3 5v14a2 2 0 0 0 2 2h16v-5", "M18 12a2 2 0 0 0 0 4h4v-4z"], s),
  user: (s = 14) => mini(["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"], s),
  whats: (s = 14) => mini(["M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2z", "M8.5 8.5c0 4 3 7 7 7 .6 0 1-.6 1-1l-.2-1.6a.6.6 0 0 0-.8-.4l-1.4.5a5.6 5.6 0 0 1-2.6-2.6l.5-1.4a.6.6 0 0 0-.4-.8L9.5 7.5c-.4 0-1 .4-1 1z"], s),
  city: (s = 14) => mini(["M3 21h18", "M5 21V7l7-4 7 4v14", "M9 9h.01", "M9 13h.01", "M9 17h.01", "M15 9h.01", "M15 13h.01", "M15 17h.01"], s),
  car: (s = 14) => mini(["M5 17a2 2 0 1 0 0-.01", "M19 17a2 2 0 1 0 0-.01", "M5 17H3v-5l2-4h11l3 4h1a1 1 0 0 1 1 1v4h-2", "M7 17h10"], s),
  tag: (s = 14) => mini(["M20.6 13.4 12 22l-9-9V3h10l8 8a2 2 0 0 1-.4 2.4z", "M7 7h.01"], s),
  chevL: (s = 16) => mini("M15 18l-6-6 6-6", s),
  chevR: (s = 16) => mini("M9 18l6-6-6-6", s),
  back: (s = 15) => mini(["M19 12H5", "M12 19l-7-7 7-7"], s),
  calClock: (s = 14) => mini(["M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6", "M16 2v4", "M8 2v4", "M3 10h18", "M17.5 14v2l1.5 1", "M17.5 21a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"], s),
  grid: (s = 14) => mini(["M3 3h8v8H3z", "M13 3h8v8h-8z", "M13 13h8v8h-8z", "M3 13h8v8H3z"], s),
  rows: (s = 14) => mini(["M3 5h18", "M3 12h18", "M3 19h18"], s),
  sort: (s = 14) => mini(["M3 6h12", "M3 12h9", "M3 18h6", "M17 6v12", "M14 15l3 3 3-3"], s),
  download: (s = 14) => mini(["M12 3v12", "M7 11l5 5 5-5", "M5 21h14"], s),
};

/* ═════════════════ بايبلاين المراحل (تفاعلي) ═════════════════ */
function StagePipeline({ stage, onSet, busy, isAr }: any) {
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
            <button key={i} onClick={() => !busy && onSet?.(i)} disabled={busy || !onSet}
              style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, background: "none", border: "none", cursor: onSet && !busy ? "pointer" : "default", flex: 1 }}>
              <span style={{
                display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 999,
                border: `1.5px solid ${act ? "#f5993d" : done ? "rgba(62,205,142,.6)" : "rgba(255,255,255,.14)"}`,
                background: act ? "linear-gradient(135deg,#f7ad5b,#f5993d)" : done ? "rgba(62,205,142,.14)" : "rgba(255,255,255,.03)",
                color: act ? "#1a0f02" : done ? "#3ecd8e" : "var(--abh-steel)",
                boxShadow: act ? "0 0 0 4px rgba(245,153,61,.16)" : "none", transition: "all .35s var(--abh-ease)",
              }}>{done ? <Ic.check s={13} sw={2.6} /> : <Ic.dot s={13} />}</span>
              <span style={{ fontSize: 9.5, textAlign: "center", maxWidth: 62, lineHeight: 1.3, color: act ? "var(--abh-ivory)" : done ? "var(--abh-platinum)" : "var(--abh-steel)" }}>{isAr ? s.ar : s.en}</span>
            </button>
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

/* ═════════════════ كرت الحجز (Grid) — هوفر يكشف دوسيه، وعلى اللمس يظهر أصلاً ═════════════════ */
function BookingCard({ b, i, busy, isAr, ccy, fmtDate, onOpen, onAdvance, onConfirmPay, onCall, onWhats }: any) {
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false };
  const isActive = b.status === "active";
  const isCancelled = b.status === "cancelled";
  const [hover, setHover] = useState(false);
  const touch = useMediaQuery("(hover: none)");
  const reveal = hover || touch;
  const stop = (e: any, fn: () => void) => { e.stopPropagation(); fn(); };

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(b.id)}
      style={{
        position: "relative", display: "flex", flexDirection: "column", minHeight: touch ? 0 : 392, borderRadius: 24, overflow: "hidden", cursor: "pointer",
        border: `1.5px solid ${reveal ? st.color : st.soft}`,
        background: "#0b0c0e",
        boxShadow: hover ? `0 30px 70px -28px ${st.glow}, 0 0 0 1px ${st.glow}` : "0 14px 36px -22px rgba(0,0,0,.7)",
        transform: hover && !touch ? "translateY(-5px)" : "none",
        transition: "transform .5s var(--abh-ease), box-shadow .5s var(--abh-ease), border-color .4s var(--abh-ease)",
        animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both`,
      }}
    >
      {/* صورة السيارة خلفية الكرت بالكامل */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${carImg(b.plate || b.vehicle, 900)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: `brightness(${isCancelled ? .42 : .64}) contrast(1.05) ${isCancelled ? "grayscale(.5)" : ""}`, transform: hover ? "scale(1.07)" : "scale(1)", transition: "transform 1.1s var(--abh-ease), filter .5s var(--abh-ease)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,9,11,.96) 8%, rgba(8,9,11,.5) 44%, rgba(8,9,11,.1) 72%, rgba(8,9,11,.35) 100%)" }} />
      <span style={{ position: "absolute", insetInline: 0, top: 0, height: 3, background: `linear-gradient(90deg, transparent, ${st.color}, transparent)`, zIndex: 4 }} />

      {/* أعلى: شارات */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: 16, zIndex: 2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "6px 12px", fontSize: 10.5, letterSpacing: ".08em", fontWeight: 600, color: st.color, background: "rgba(0,0,0,.55)", border: `1px solid ${st.color}`, backdropFilter: "blur(8px)" }}>
          {isActive
            ? <span style={{ position: "relative", display: "flex", height: 7, width: 7 }}><span style={{ position: "absolute", inset: 0, borderRadius: 999, background: st.color, opacity: .7, animation: "abh-ping 1.4s var(--abh-ease) infinite" }} /><span style={{ position: "relative", height: 7, width: 7, borderRadius: 999, background: st.color }} /></span>
            : <span style={{ height: 7, width: 7, borderRadius: 999, background: st.color }} />}
          {isAr ? st.ar : st.en}
        </span>
        <span dir="ltr" style={{ fontSize: 10.5, letterSpacing: ".08em", color: "rgba(203,205,205,.9)", background: "rgba(0,0,0,.5)", borderRadius: 999, padding: "5px 10px", backdropFilter: "blur(8px)" }}>{b.reference}</span>
      </div>

      {/* سبيسر: على اللاب يدفع المحتوى لتحت، وعلى اللمس ارتفاع ثابت كهيدر للصورة */}
      <div style={{ flex: touch ? "none" : 1, height: touch ? 92 : undefined }} />

      {/* أسفل: المحتوى الأساسي (يبهت عند الهوفر) — مخفي على اللمس لمنع التكرار */}
      <div style={{ display: touch ? "none" : "block", position: "relative", padding: "0 16px 16px", zIndex: 2, opacity: hover ? 0 : 1, transform: hover ? "translateY(8px)" : "none", transition: "opacity .35s var(--abh-ease), transform .35s var(--abh-ease)" }}>
        <h3 className="abh-display" style={{ margin: 0, fontSize: 26, lineHeight: 1.05, color: "#fff", textTransform: "uppercase", textShadow: "0 2px 14px rgba(0,0,0,.6)" }}>{b.vehicle}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8, fontSize: 12, color: "rgba(230,230,230,.92)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{I.user(13)}{b.customer}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.clock s={12} />{fmtDate(b.date)} · {b.time}</span>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(203,205,205,.7)" }}>{isAr ? "الإجمالي" : "Total"}</div>
            <div className="abh-num" dir="ltr" style={{ fontSize: 22, color: "#fff", lineHeight: 1.1 }}>{EGP(b.total)} <span style={{ fontSize: 11, color: "rgba(203,205,205,.7)" }}>{ccy}</span></div>
          </div>
          {!isCancelled && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 11px", fontSize: 10, color: pay.paid ? "#3ecd8e" : "#f0c069", background: "rgba(0,0,0,.5)", border: `1px solid ${pay.paid ? "rgba(62,205,142,.5)" : "rgba(240,192,105,.45)"}`, backdropFilter: "blur(8px)" }}>{I.wallet(12)}{isAr ? pay.ar : pay.en}</span>
          )}
        </div>
      </div>

      {/* ═══ دوسيه الهوفر (overlay على اللاب · in-flow ثابت على اللمس) ═══ */}
      <div style={{ position: touch ? "relative" : "absolute", inset: touch ? "auto" : 0, zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 18, background: touch ? "linear-gradient(to top, rgba(6,7,9,.97) 62%, rgba(6,7,9,.78))" : "linear-gradient(to top, rgba(6,7,9,.97) 30%, rgba(6,7,9,.86) 60%, rgba(6,7,9,.55))", backdropFilter: "blur(3px)", opacity: reveal ? 1 : 0, transform: reveal ? "translateY(0)" : "translateY(14px)", pointerEvents: reveal ? "auto" : "none", transition: "opacity .4s var(--abh-ease), transform .45s var(--abh-ease)" }}>
        <h3 className="abh-display" style={{ margin: "0 0 3px", fontSize: 23, lineHeight: 1.05, color: "#fff", textTransform: "uppercase" }}>{b.vehicle}</h3>
        {b.plate && <div dir="ltr" style={{ fontSize: 11, color: "var(--abh-platinum)", marginBottom: 10 }}>{b.plate} · {b.size || "—"}</div>}

        {/* بيانات العميل */}
        <div style={{ display: "grid", gap: 5, marginBottom: 11, fontSize: 12, color: "rgba(230,230,230,.95)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{I.user(13)}{b.customer}{b.isGuest && <em style={{ fontStyle: "normal", fontSize: 9, color: "var(--abh-steel)" }}>· {isAr ? "زائر" : "guest"}</em>}</span>
          {b.phone && <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{I.phone(12)}{b.phone}</span>}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Ic.pin s={12} />{b.branch} · {fmtDate(b.date)} · {b.time}</span>
        </div>

        {/* خدمات */}
        {b.services.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 11 }}>
            {b.services.slice(0, 4).map((s: any, j: number) => (
              <span key={j} style={{ borderRadius: 999, padding: "3px 9px", fontSize: 9.5, color: "rgba(230,230,230,.95)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)" }}>{s.name}</span>
            ))}
            {b.services.length > 4 && <span style={{ borderRadius: 999, padding: "3px 9px", fontSize: 9.5, color: "var(--abh-platinum)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)" }}>+{b.services.length - 4}</span>}
          </div>
        )}

        {/* تقدّم */}
        {isActive && (
          <div style={{ marginBottom: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(230,230,230,.9)", marginBottom: 5 }}>
              <span>{isAr ? STAGES[Math.min(b.stage, 3)].ar : STAGES[Math.min(b.stage, 3)].en}</span><span>{Math.min(b.stage + 1, 4)}/{STAGES.length}</span>
            </div>
            <div style={{ position: "relative", height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.18)" }}>
              <span style={{ position: "absolute", insetInlineStart: 0, top: 0, height: "100%", width: `${((Math.min(b.stage, 3) + 1) / STAGES.length) * 100}%`, borderRadius: 999, background: "linear-gradient(90deg,#f5993d,#3ecd8e)" }} />
            </div>
          </div>
        )}
        {isCancelled && b.cancelReason && (
          <div style={{ marginBottom: 11, fontSize: 11.5, color: "#f0b3ac", display: "flex", gap: 6 }}>{I.tag(12)}<span>{isAr ? "السبب" : "Reason"}: {b.cancelReason}</span></div>
        )}

        {/* إجمالي + شارة دفع */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="abh-num" dir="ltr" style={{ fontSize: 24, color: "#fff" }}>{EGP(b.total)} <span style={{ fontSize: 11, color: "rgba(203,205,205,.7)" }}>{ccy}</span></div>
          {!isCancelled && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 11px", fontSize: 10, color: pay.paid ? "#3ecd8e" : "#f0c069", background: "rgba(0,0,0,.45)", border: `1px solid ${pay.paid ? "rgba(62,205,142,.5)" : "rgba(240,192,105,.45)"}` }}>{I.wallet(12)}{isAr ? pay.ar : pay.en}</span>}
        </div>

        {/* أكشنز سريعة */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={(e) => stop(e, () => onOpen(b.id))} style={qBtn(true)}>{Ic.eye({ s: 14 })}{isAr ? "تفاصيل" : "Details"}</button>
          {!isCancelled && !pay.paid && <button onClick={(e) => !busy && stop(e, () => onConfirmPay(b))} style={qBtn()}>{I.wallet(14)}{isAr ? "دفع" : "Pay"}</button>}
          {isActive && <button onClick={(e) => !busy && stop(e, () => onAdvance(b))} style={qBtn()}>{Ic.check({ s: 14 })}{isAr ? "تقدّم" : "Advance"}</button>}
          {b.phone && <button onClick={(e) => stop(e, () => onWhats(b.phone))} title="WhatsApp" style={qIcon("#25D366")}>{I.whats(15)}</button>}
          {b.phone && <button onClick={(e) => stop(e, () => onCall(b.phone))} title={isAr ? "اتصال" : "Call"} style={qIcon()}>{I.phone(14)}</button>}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ صف القائمة (List view) ═════════════════ */
function BookingRow({ b, i, isAr, ccy, fmtDate, onOpen }: any) {
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false };
  return (
    <div onClick={() => onOpen(b.id)} className="abh-lift abh-row" style={{ display: "grid", gridTemplateColumns: "auto 1.4fr 1.2fr 1fr auto auto", alignItems: "center", gap: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", borderInlineStart: `3px solid ${st.color}`, background: "rgba(255,255,255,.02)", padding: "12px 16px", cursor: "pointer", animation: `abh-fadeUp .45s var(--abh-ease) ${i * 0.03}s both` }}>
      <span style={{ height: 46, width: 64, borderRadius: 10, flexShrink: 0, backgroundImage: `url('${carImg(b.plate || b.vehicle, 400)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.7)" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.vehicle}</div>
        <div dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{b.reference}{b.plate ? ` · ${b.plate}` : ""}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--abh-platinum)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.customer}</div>
        {b.phone && <div dir="ltr" style={{ fontSize: 11, color: "var(--abh-steel)" }}>{b.phone}</div>}
      </div>
      <div style={{ fontSize: 12, color: "var(--abh-platinum)" }}>{fmtDate(b.date)}<div style={{ fontSize: 11, color: "var(--abh-steel)" }}>{b.time} · {b.branch}</div></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: st.color }}><span style={{ height: 7, width: 7, borderRadius: 999, background: st.color }} />{isAr ? st.ar : st.en}</span>
        <span style={{ fontSize: 9.5, color: pay.paid ? "#3ecd8e" : "#f0c069" }}>{isAr ? pay.ar : pay.en}</span>
      </div>
      <div className="abh-num" dir="ltr" style={{ fontSize: 17, color: "var(--abh-ivory)", textAlign: "end", minWidth: 90 }}>{EGP(b.total)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
    </div>
  );
}

/* ═════════════════ مودال التفاصيل ═════════════════ */
function DetailModal({ b, busy, isAr, ccy, fmtDate, onClose, onMutate, onCall, onWhats }: any) {
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const mobile = useMediaQuery("(max-width: 640px)");
  const st = STATUS[b.status] || STATUS.upcoming;
  const pay = PAY[b.payment] || { ar: b.payment, en: b.payment, paid: false };
  const live = b.status === "upcoming" || b.status === "active";
  const [rDate, setRDate] = useState(b.date);
  const [rTime, setRTime] = useState(b.time);
  const [reason, setReason] = useState("");
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const servicesTotal = b.services.reduce((s: number, x: any) => s + (Number(x.price) || 0), 0);
  const payMethod = PAY_METHOD[b.paymentMethod] ? (isAr ? PAY_METHOD[b.paymentMethod].ar : PAY_METHOD[b.paymentMethod].en) : (b.paymentMethod || "—");

  return (
    <Modal title={T("تفاصيل الحجز", "Booking details")} onClose={onClose} wide>
      <div style={{ position: "relative", height: mobile ? 130 : 168, borderRadius: 20, overflow: "hidden", marginBottom: 18, border: `1px solid ${st.soft}` }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${carImg(b.plate || b.vehicle, 1400)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.6) contrast(1.05)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,9,11,.95), rgba(8,9,11,.25))" }} />
        <span style={{ position: "absolute", insetInline: 0, top: 0, height: 3, background: `linear-gradient(90deg,transparent,${st.color},transparent)` }} />
        <div style={{ position: "absolute", insetInlineStart: 18, insetInlineEnd: 18, bottom: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 11px", fontSize: 10.5, fontWeight: 600, color: st.color, background: "rgba(0,0,0,.5)", border: `1px solid ${st.color}` }}><span style={{ height: 7, width: 7, borderRadius: 999, background: st.color }} />{isAr ? st.ar : st.en}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 11px", fontSize: 10, color: pay.paid ? "#3ecd8e" : "#f0c069", background: "rgba(0,0,0,.5)", border: `1px solid ${pay.paid ? "rgba(62,205,142,.5)" : "rgba(240,192,105,.45)"}` }}>{I.wallet(12)}{isAr ? pay.ar : pay.en}</span>
              {b.isGuest && <span style={{ borderRadius: 999, padding: "5px 11px", fontSize: 10, color: "var(--abh-platinum)", background: "rgba(0,0,0,.5)", border: "1px solid rgba(203,205,205,.3)" }}>{T("زائر (بدون حساب)", "Guest (no account)")}</span>}
            </div>
            <div className="abh-display" style={{ fontSize: mobile ? 20 : 28, color: "#fff", textTransform: "uppercase", lineHeight: 1 }}>{b.vehicle}</div>
          </div>
          <span dir="ltr" className="abh-num" style={{ fontSize: 13, color: "var(--abh-platinum)", background: "rgba(0,0,0,.45)", borderRadius: 999, padding: "6px 12px" }}>{b.reference}</span>
        </div>
      </div>

      {mode === "view" && (
        <div className="abh-scale-in">
          <SectionLabel>{I.user(13)} {T("بيانات العميل", "Customer")}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
            <InfoTile icon={I.user(14)} label={T("الاسم", "Name")} value={b.customer} />
            <InfoTile icon={I.phone(14)} label={T("التليفون", "Phone")} value={b.phone || "—"} ltr href={b.phone ? `tel:${b.phone}` : undefined} />
            <InfoTile icon={I.mail(14)} label={T("الإيميل", "Email")} value={b.email || "—"} ltr href={b.email ? `mailto:${b.email}` : undefined} />
            <InfoTile icon={I.city(14)} label={T("المدينة", "City")} value={b.city || "—"} />
          </div>
          {b.phone && (
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <Ghost sm icon={() => I.whats(14)} onClick={() => onWhats(b.phone)}>WhatsApp</Ghost>
              <Ghost sm icon={() => I.phone(14)} onClick={() => onCall(b.phone)}>{T("اتصال", "Call")}</Ghost>
            </div>
          )}

          <SectionLabel>{I.car(13)} {T("السيارة والموعد", "Vehicle & schedule")}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 18 }}>
            <InfoTile icon={I.car(14)} label={T("اللوحة", "Plate")} value={b.plate || "—"} ltr />
            <InfoTile label={T("المقاس", "Size")} value={b.size || "—"} />
            <InfoTile icon={<Ic.pin s={14} />} label={T("الفرع", "Branch")} value={b.branch} />
            <InfoTile icon={<Ic.clock s={14} />} label={T("الموعد", "Date & time")} value={`${fmtDate(b.date)} · ${b.time}`} />
          </div>

          {b.services.length > 0 && (
            <>
              <SectionLabel>{Ic.sparkle({ s: 13 })} {T("الخدمات", "Services")}</SectionLabel>
              <div className="abh-col" style={{ gap: 8, marginBottom: 14 }}>
                {b.services.map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "12px 15px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--abh-ivory)" }}>{Ic.sparkle({ s: 14 })}{s.name}</span>
                    <span dir="ltr" className="abh-num" style={{ fontSize: 14, color: "var(--abh-platinum)" }}>{s.price > 0 ? `${EGP(s.price)} ${ccy}` : T("حسب الطلب", "On request")}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ borderRadius: 16, border: "1px solid rgba(203,205,205,.2)", background: "linear-gradient(180deg,rgba(203,205,205,.06),rgba(255,255,255,.01))", padding: "14px 16px", marginBottom: 18 }}>
            <Line k={T("إجمالي الخدمات", "Services subtotal")} v={`${EGP(servicesTotal || b.subtotal)} ${ccy}`} />
            {b.towing > 0 && <Line k={T("السطحة / النقل", "Towing")} v={`${EGP(b.towing)} ${ccy}`} />}
            <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "10px 0" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("الإجمالي", "Total")}</span>
              <span dir="ltr" className="abh-num" style={{ fontSize: mobile ? 22 : 26, color: "var(--abh-ivory)" }}>{EGP(b.total)} <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{ccy}</span></span>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--abh-steel)" }}>{T("طريقة الدفع", "Payment")}: {payMethod} · {T("الحالة", "Status")}: {isAr ? pay.ar : pay.en}</div>
          </div>

          {b.status !== "cancelled" && (
            <div style={{ marginBottom: 18 }}>
              <StagePipeline stage={b.stage || 0} busy={busy} isAr={isAr} onSet={(s: number) => onMutate(b.id, { stage: s })} />
              <p style={{ margin: "8px 2px 0", fontSize: 11, color: "var(--abh-steel)" }}>{T("اضغط على أي مرحلة لتحديثها — العميل يشوف نفس التقدّم في حسابه فورًا.", "Click a stage to update it — the customer sees the same progress in their account instantly.")}</p>
            </div>
          )}

          {b.status === "cancelled" && b.cancelReason && (
            <div style={{ marginBottom: 18, borderRadius: 14, border: "1px solid rgba(239,90,77,.3)", background: "rgba(239,90,77,.1)", padding: "12px 15px", fontSize: 13.5, color: "#f0b3ac" }}>
              <strong style={{ fontWeight: 600 }}>{T("سبب الإلغاء", "Cancellation reason")}:</strong> {b.cancelReason}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12 }}>
            {!pay.paid && b.status !== "cancelled" && <Pill icon={() => I.wallet(15)} onClick={() => onMutate(b.id, { action: "confirm_pay" })}>{T("تأكيد الدفع", "Confirm payment")}</Pill>}
            {live && <Ghost icon={() => I.calClock(15)} onClick={() => setMode("reschedule")}>{T("إعادة جدولة", "Reschedule")}</Ghost>}
            {live && <Ghost danger icon={Ic.trash} onClick={() => setMode("cancel")}>{T("إلغاء الحجز", "Cancel booking")}</Ghost>}
          </div>
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

function SectionLabel({ children }: any) {
  return <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-platinum)" }}><span style={{ display: "inline-flex" }}>{children}</span></div>;
}
function InfoTile({ icon, label, value, ltr, href }: any) {
  const inner = (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "11px 14px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{icon}{label}</div>
      <div dir={ltr ? "ltr" : undefined} style={{ marginTop: 5, fontSize: 14, color: href ? "#bfe3cf" : "var(--abh-ivory)", wordBreak: "break-word", textAlign: ltr ? "start" : undefined }}>{value}</div>
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
export default function BookingsClient({ initial, locale }: { initial: any[]; locale?: string }) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mobile = useMediaQuery("(max-width: 640px)");

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso); if (isNaN(+d)) return iso;
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "long" });
  };

  const tabs: [string, string][] = [["all", T("الكل", "All")], ["upcoming", T("قادمة", "Upcoming")], ["active", T("قيد التنفيذ", "In progress")], ["completed", T("مكتملة", "Completed")], ["cancelled", T("ملغية", "Cancelled")]];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const [k] of tabs) if (k !== "all") c[k] = list.filter((b) => b.status === k).length;
    return c;
  }, [list]);

  const revenue = useMemo(() => list.filter((b) => b.payment === "paid").reduce((s, b) => s + (Number(b.total) || 0), 0), [list]);
  const unpaidCount = useMemo(() => list.filter((b) => b.payment !== "paid" && b.status !== "cancelled").length, [list]);

  const filtered = useMemo(() => {
    let r = list.filter((b) =>
      (tab === "all" || b.status === tab) &&
      (q === "" || `${b.customer} ${b.vehicle} ${b.reference} ${b.plate} ${b.phone}`.toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "soonest") r = [...r].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    else if (sort === "highest") r = [...r].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
    return r;
  }, [list, tab, q, sort]);

  const detail = detailId ? list.find((b) => b.id === detailId) : null;

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
        body.action === "confirm_pay" ? T("تم تأكيد الدفع", "Payment confirmed") : T("تم تحديث المرحلة", "Stage updated")
      );
    } catch { toast(T("فشل التنفيذ", "Action failed"), "bad"); }
    finally { setBusy(false); }
  }
  const advance = (b: any) => mutate(b.id, { stage: Math.min(3, (b.stage || 0) + 1) });
  const confirmPay = (b: any) => mutate(b.id, { action: "confirm_pay" });
  const call = (phone: string) => { window.location.href = `tel:${phone}`; };
  const whats = (phone: string) => { const p = String(phone).replace(/[^\d]/g, ""); window.open(`https://wa.me/${p}`, "_blank"); };

  const exportCsv = () => {
    const head = ["reference", "vehicle", "plate", "customer", "phone", "email", "city", "branch", "date", "time", "status", "payment", "total"];
    const rows = filtered.map((b) => [b.reference, b.vehicle, b.plate, b.customer, b.phone, b.email, b.city, b.branch, b.date, b.time, b.status, b.payment, b.total]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [head.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "bookings.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const stats = [
    { label: T("إجمالي الحجوزات", "Total bookings"), value: String(list.length) },
    { label: T("قيد التنفيذ", "In progress"), value: String(counts.active || 0), accent: "#f5993d" },
    { label: T("بانتظار الدفع", "Awaiting payment"), value: String(unpaidCount), accent: unpaidCount ? "#f0c069" : undefined },
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
            return <button key={k} onClick={() => setTab(k)} style={{ borderRadius: 999, padding: "9px 16px", fontSize: 11.5, letterSpacing: ".04em", color: on ? "#000" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer", transition: "all .25s var(--abh-ease)" }}>{l}<span style={{ marginInlineStart: 6, opacity: .6 }}>{counts[k] ?? 0}</span></button>;
          })}
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 360 }}>
          <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالاسم، السيارة، التليفون أو الرقم…", "Search by name, vehicle, phone or reference…")} style={{ width: "100%", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: isAr ? "11px 42px 11px 16px" : "11px 16px 11px 42px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
        </div>
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
            <BookingCard key={b.id} b={b} i={i} busy={busy} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onOpen={setDetailId} onAdvance={advance} onConfirmPay={confirmPay} onCall={call} onWhats={whats} />
          ))}
        </div>
      ) : (
        <div className="abh-col" style={{ gap: 10 }}>
          {filtered.map((b, i) => <BookingRow key={b.id} b={b} i={i} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onOpen={setDetailId} />)}
        </div>
      )}

      {detail && <DetailModal b={detail} busy={busy} isAr={isAr} ccy={ccy} fmtDate={fmtDate} onClose={() => setDetailId(null)} onMutate={mutate} onCall={call} onWhats={whats} />}

      <style>{`
        @media(min-width:680px){.abh-resched-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:620px){.abh-row{grid-template-columns:auto 1fr auto!important}.abh-row>div:nth-child(3),.abh-row>div:nth-child(4){display:none!important}}
      `}</style>
    </div>
  );
}