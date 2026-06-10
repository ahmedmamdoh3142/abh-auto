"use client";
/**
 * components/admin/ui.tsx — مكوّنات لوحة التحكم (client).
 * الألوان/الخطوط من متغيّرات CSS المعرّفة في admin-shell.
 */
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import type { Loc } from "@/lib/admin/i18n-json";

/* ───────── helpers ───────── */
export const EGP = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
export const card: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" };

/* صور سينمائية احتياطية (Unsplash مسموح في next.config) لإضافة "روح" حيث لا توجد صورة مخزّنة */
const PHOTOS = ["photo-1617531653522-221bcf9b6227","photo-1503376780353-7e6692767b70","photo-1494976388531-d1058494cdd8","photo-1492144534655-ae79c964c9d7","photo-1555215695-3004980ad54e","photo-1544636331-e26879cd4d9b","photo-1605559424843-9e4c228bf1c2","photo-1600712242805-5f78671b24da","photo-1583121274602-3e2820c69888","photo-1502877338535-766e1452684a","photo-1568605117036-5fe5e7bab0b7","photo-1549399542-7e3f8b79c341"];
const hash = (s: string) => { let h = 0; const t = (s || "x") + ""; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); };
export const carImg = (seed: string, w = 900) => `https://images.unsplash.com/${PHOTOS[hash(seed) % PHOTOS.length]}?auto=format&fit=crop&w=${w}&q=80`;

/* ───────── icons ───────── */
type IcP = { s?: number; sw?: number; fill?: string; extra?: string };
const Svg = ({ d, s = 18, sw = 1.7, fill = "none", extra }: IcP & { d: string | string[] }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={extra}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
export const Ic = {
  grid: (p: IcP) => <Svg {...p} d={["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"]} />,
  calendar: (p: IcP) => <Svg {...p} d={["M8 2v4", "M16 2v4", "M3 10h18", "M3 5h18v16H3z"]} />,
  sliders: (p: IcP) => <Svg {...p} d={["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"]} />,
  type: (p: IcP) => <Svg {...p} d={["M4 7V5h16v2", "M9 19h6", "M12 5v14"]} />,
  plus: (p: IcP) => <Svg {...p} d={["M12 5v14", "M5 12h14"]} sw={2} />,
  pencil: (p: IcP) => <Svg {...p} d={["M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"]} />,
  trash: (p: IcP) => <Svg {...p} d={["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"]} />,
  x: (p: IcP) => <Svg {...p} d={["M18 6 6 18", "M6 6l12 12"]} />,
  check: (p: IcP) => <Svg {...p} d="M20 6 9 17l-5-5" sw={2.4} />,
  search: (p: IcP) => <Svg {...p} d={["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16", "M21 21l-4.3-4.3"]} />,
  chevDown: (p: IcP) => <Svg {...p} d="M6 9l6 6 6-6" />,
  clock: (p: IcP) => <Svg {...p} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 7v5l3 2"]} />,
  pin: (p: IcP) => <Svg {...p} d={["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"]} />,
  eye: (p: IcP) => <Svg {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"]} />,
  sparkle: (p: IcP) => <Svg {...p} d={["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"]} />,
  dot: (p: IcP) => <Svg {...p} d="M12 12h.01" sw={3} />,
  logout: (p: IcP) => <Svg {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />,
  menu: (p: IcP) => <Svg {...p} d={["M3 6h18", "M3 12h18", "M3 18h18"]} />,
  bell: (p: IcP) => <Svg {...p} d={["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"]} />,
  image: (p: IcP) => <Svg {...p} d={["M3 3h18v18H3z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3", "M21 15l-5-5L5 21"]} />,
  users: (p: IcP) => <Svg {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"]} />,
  trending: (p: IcP) => <Svg {...p} d={["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"]} />,
  flame: (p: IcP) => <Svg {...p} d={["M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.5-2.5.5-2.5S6 11 6 13a6 6 0 0 0 12 0c0-6-6-11-6-11z"]} />,
  arrowUp: (p: IcP) => <Svg {...p} d={["M7 17 17 7", "M7 7h10v10"]} sw={2} />,
};

/* ───────── buttons ───────── */
export function Pill({ children, onClick, icon: Icon, sm, type = "button" }: any) {
  return (
    <button type={type} onClick={onClick}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: sm ? "8px 16px" : "12px 24px", fontSize: sm ? 11 : 12, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", color: "#000", background: "linear-gradient(135deg,#fff 0%,#cbcdcd 50%,#fff 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 14px 40px -16px rgba(203,205,205,.6)", transition: "transform .4s var(--abh-ease)" }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
        {Icon && <Icon s={15} sw={2.2} />}{children}
      </span>
    </button>
  );
}
export function Ghost({ children, onClick, icon: Icon, danger, sm, type = "button" }: any) {
  return (
    <button type={type} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: sm ? "8px 16px" : "12px 22px", fontSize: sm ? 11 : 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: danger ? "var(--abh-bad)" : "var(--abh-ivory)", background: "rgba(255,255,255,.04)", border: `1px solid ${danger ? "rgba(124,26,26,.4)" : "rgba(255,255,255,.15)"}`, backdropFilter: "blur(12px)", transition: "all .3s var(--abh-ease)", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "rgba(42,20,20,.5)" : "rgba(255,255,255,.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}>
      {Icon && <Icon s={14} sw={1.9} />}{children}
    </button>
  );
}
export function IconBtn({ icon: Icon, onClick, label, danger, solid, type = "button" }: any) {
  return (
    <button type={type} onClick={onClick} aria-label={label} title={label} style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: solid ? "rgba(10,11,12,.7)" : "rgba(255,255,255,.02)", color: danger ? "var(--abh-bad)" : "var(--abh-platinum)", backdropFilter: solid ? "blur(8px)" : "none", transition: "all .25s var(--abh-ease)", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = danger ? "#f0c9c9" : "var(--abh-ivory)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = danger ? "var(--abh-bad)" : "var(--abh-platinum)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; }}>
      <Icon s={15} />
    </button>
  );
}
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{ width: 42, height: 24, borderRadius: 999, padding: 3, border: "1px solid rgba(255,255,255,.14)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "rgba(255,255,255,.04)", display: "flex", justifyContent: on ? "flex-start" : "flex-end", transition: "all .3s var(--abh-ease)", cursor: "pointer" }}>
      <span style={{ width: 16, height: 16, borderRadius: 999, background: on ? "#000" : "var(--abh-steel)", transition: "all .3s var(--abh-ease)" }} />
    </button>
  );
}

/* ───────── fields ───────── */
export function Field({ label, children, hint }: any) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 9, fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(203,205,205,.8)" }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--abh-steel)" }}>{hint}</span>}
    </label>
  );
}
export function Input(props: any) {
  return (
    <input {...props} style={{ width: "100%", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "13px 18px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", transition: "all .3s var(--abh-ease)", ...(props.style || {}) }}
      onFocus={(e) => { e.target.style.borderColor = "rgba(203,205,205,.5)"; props.onFocus?.(e); }}
      onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,.12)"; props.onBlur?.(e); }} />
  );
}
export function Textarea(props: any) {
  return <textarea {...props} style={{ width: "100%", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "13px 18px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", resize: "vertical", ...(props.style || {}) }} />;
}
export function LocaleField({ label, value, onChange, multiline, hint }: { label: string; value: Loc; onChange: (v: Loc) => void; multiline?: boolean; hint?: string }) {
  const C: any = multiline ? Textarea : Input;
  return (
    <div>
      {label && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(203,205,205,.8)" }}>{label}</span>
        <span style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(255,255,255,.1),transparent)" }} />
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <span style={{ display: "block", marginBottom: 5, fontSize: 9.5, letterSpacing: ".18em", color: "var(--abh-steel)" }}>EN</span>
          <C dir="ltr" rows={multiline ? 3 : undefined} value={value.en} onChange={(e: any) => onChange({ ...value, en: e.target.value })} style={{ textAlign: "left" }} />
        </div>
        <div>
          <span style={{ display: "block", marginBottom: 5, fontSize: 9.5, letterSpacing: ".18em", color: "var(--abh-steel)" }}>عربي</span>
          <C dir="rtl" rows={multiline ? 3 : undefined} value={value.ar} onChange={(e: any) => onChange({ ...value, ar: e.target.value })} />
        </div>
      </div>
      {hint && <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--abh-steel)" }}>{hint}</span>}
    </div>
  );
}
export function Selectbox({ value, onChange, options, placeholder }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find((o: any) => o.value === value);
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 16, border: `1px solid ${open ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.12)"}`, background: "rgba(255,255,255,.03)", padding: "13px 18px", fontSize: 14, color: "var(--abh-ivory)", textAlign: "start", cursor: "pointer" }}>
        <span style={{ color: sel ? "var(--abh-ivory)" : "rgba(102,106,110,.8)" }}>{sel ? sel.label : placeholder}</span>
        <Ic.chevDown s={16} extra={open ? "abh-flip" : ""} />
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 40, marginTop: 8, width: "100%", maxHeight: 240, overflowY: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(12,13,14,.97)", backdropFilter: "blur(20px)", padding: 6, boxShadow: "0 30px 80px -30px rgba(0,0,0,.9)" }}>
          {options.map((o: any) => (
            <button key={String(o.value)} type="button" onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 11, padding: "10px 14px", fontSize: 14, textAlign: "start", color: o.value === value ? "var(--abh-ivory)" : "rgba(203,205,205,.8)", background: o.value === value ? "rgba(255,255,255,.08)" : "transparent", cursor: "pointer", border: "none" }}>
              {o.label}{o.value === value && <Ic.check s={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function SubHead({ children, action }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
      <span style={{ fontSize: 11, letterSpacing: ".26em", textTransform: "uppercase", color: "rgba(203,205,205,.8)", whiteSpace: "nowrap" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)" }} />
      {action}
    </div>
  );
}
export function Chip({ children, tone = "neutral", dot, live }: any) {
  const T: any = {
    neutral: { c: "rgba(203,205,205,.8)", b: "rgba(255,255,255,.12)", bg: "rgba(255,255,255,.03)", d: "var(--abh-steel)" },
    platinum: { c: "var(--abh-platinum)", b: "rgba(203,205,205,.3)", bg: "rgba(203,205,205,.06)", d: "var(--abh-platinum)" },
    live: { c: "var(--abh-ivory)", b: "rgba(255,255,255,.3)", bg: "rgba(255,255,255,.04)", d: "#fff" },
    ok: { c: "var(--abh-ok)", b: "rgba(159,212,176,.3)", bg: "rgba(159,212,176,.07)", d: "var(--abh-ok)" },
    warn: { c: "var(--abh-warn)", b: "rgba(232,207,154,.3)", bg: "rgba(232,207,154,.07)", d: "var(--abh-warn)" },
    bad: { c: "var(--abh-bad)", b: "rgba(124,26,26,.4)", bg: "rgba(42,20,20,.4)", d: "#c98a8a" },
  };
  const t = T[tone] || T.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, border: `1px solid ${t.b}`, background: t.bg, padding: "5px 12px", fontSize: 10.5, letterSpacing: ".13em", textTransform: "uppercase", color: t.c, backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>
      {dot && (live
        ? <span style={{ position: "relative", display: "flex", height: 6, width: 6 }}><span style={{ position: "absolute", height: "100%", width: "100%", borderRadius: 999, background: t.d, opacity: .7, animation: "abh-ping 1.4s var(--abh-ease) infinite" }} /><span style={{ position: "relative", height: 6, width: 6, borderRadius: 999, background: t.d }} /></span>
        : <span style={{ height: 6, width: 6, borderRadius: 999, background: t.d }} />)}
      {children}
    </span>
  );
}

/* ───────── page header (cinematic hero band) ───────── */
export function PageHeader({ title, subtitle, seed, action }: { title: string; subtitle?: string; seed?: string; action?: React.ReactNode }) {
  return (
    <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", marginBottom: 28 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${carImg(seed || title, 1600)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(.75) brightness(.3) contrast(1.1)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,rgba(0,0,0,.92),rgba(0,0,0,.55) 60%,rgba(0,0,0,.35))" }} />
      <span style={{ position: "absolute", insetInline: 40, top: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.5),transparent)" }} />
      <Particles />
      <div style={{ position: "relative", padding: "30px clamp(20px,3vw,34px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 10, letterSpacing: ".34em", textTransform: "uppercase", color: "rgba(203,205,205,.7)" }}>
            <span style={{ height: 1, width: 30, background: "linear-gradient(90deg,transparent,var(--abh-platinum))" }} />ABH AUTO
          </div>
          <h1 className="abh-display" style={{ margin: "12px 0 0", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 300, lineHeight: 1, color: "var(--abh-ivory)", textTransform: "uppercase" }}>{title}</h1>
          {subtitle && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--abh-steel)", maxWidth: "52ch" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
function Particles() {
  const ps = React.useMemo(() => Array.from({ length: 14 }, (_, i) => ({ l: (i * 61) % 100, t: ((i * 29) % 60) + 15, d: (i % 6) * 0.7, du: 6 + (i % 4) })), []);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>{ps.map((p, i) => <span key={i} style={{ position: "absolute", left: `${p.l}%`, top: `${p.t}%`, height: 3, width: 3, borderRadius: 999, background: "rgba(203,205,205,.5)", animation: `abh-rise ${p.du}s ease-out ${p.d}s infinite` }} />)}</div>;
}

/* ───────── image-led card ───────── */
export function ImageCard({ image, seed, height = 250, children, actions, badge, topRight, dim = 0.5 }: any) {
  const bg = image || carImg(seed);
  return (
    <div className="abh-imgcard abh-lift" style={{ position: "relative", height, borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
      <div className="abh-imgzoom" style={{ position: "absolute", inset: 0, backgroundImage: `url('${bg}')`, backgroundSize: "cover", backgroundPosition: "center", filter: `grayscale(.65) brightness(${dim}) contrast(1.05)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.92),rgba(0,0,0,.3) 55%,rgba(0,0,0,.08))" }} />
      <span style={{ position: "absolute", insetInline: 24, top: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.5),transparent)" }} />
      {badge && <span style={{ position: "absolute", top: 0, insetInlineEnd: 0, padding: "6px 14px", borderRadius: "0 0 0 14px", background: "linear-gradient(135deg,#fff,#cbcdcd)", color: "#000", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, zIndex: 2 }}>{badge}</span>}
      {topRight && <div style={{ position: "absolute", top: 14, insetInlineStart: 14, zIndex: 2 }}>{topRight}</div>}
      {actions && <div className="abh-img-actions" style={{ position: "absolute", top: 14, insetInlineEnd: 14, zIndex: 3, display: "flex", gap: 8, opacity: 0, transform: "translateY(-6px)", transition: "all .35s var(--abh-ease)" }}>{actions}</div>}
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px 22px" }}>{children}</div>
    </div>
  );
}

/* ───────── Modal (portal → body, centered, sticky header) ───────── */
export function Modal({ title, children, onClose, wide }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);
  if (!mounted) return null;
  const node = (
    <div className="abh-admin" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.82)", backdropFilter: "blur(10px)" }} />
      <div className="abh-scale-in" style={{ position: "relative", zIndex: 1, maxHeight: "88vh", width: "100%", maxWidth: wide ? 680 : 560, display: "flex", flexDirection: "column", borderRadius: 28, border: "1px solid rgba(255,255,255,.1)", background: "linear-gradient(180deg,rgba(22,23,25,.98),rgba(13,14,16,.98))", boxShadow: "0 60px 140px -50px rgba(0,0,0,.9)", overflow: "hidden" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 16px", background: "linear-gradient(180deg,rgba(22,23,25,1),rgba(22,23,25,.85))", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <h3 className="abh-display" style={{ fontSize: 24, fontWeight: 300, margin: 0, color: "var(--abh-ivory)", textTransform: "uppercase" }}>{title}</h3>
          <IconBtn icon={Ic.x} onClick={onClose} label="إغلاق" />
        </div>
        <div style={{ overflowY: "auto", padding: "22px 26px 26px" }}>{children}</div>
      </div>
    </div>
  );
  return createPortal(node, document.body);
}
export function Confirm({ title, body, confirmLabel, onCancel, onConfirm }: any) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(203,205,205,.7)", margin: 0 }}>{body}</p>
      <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Ghost onClick={onCancel}>تراجع</Ghost>
        <Ghost danger icon={Ic.trash} onClick={onConfirm}>{confirmLabel || "حذف"}</Ghost>
      </div>
    </Modal>
  );
}

/* ───────── toast ───────── */
const ToastCtx = createContext<(msg: string, tone?: "ok" | "bad") => void>(() => {});
export function ToastHost({ children }: { children: React.ReactNode }) {
  const [ts, setTs] = useState<{ id: number; msg: string; tone: string }[]>([]);
  const push = (msg: string, tone: "ok" | "bad" = "ok") => {
    const id = Math.random();
    setTs((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setTs((t) => t.filter((x) => x.id !== id)), 2800);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: "fixed", bottom: 24, insetInlineStart: 24, zIndex: 1100, display: "flex", flexDirection: "column", gap: 10 }}>
        {ts.map((t) => (
          <div key={t.id} className="abh-scale-in" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, padding: "12px 18px", minWidth: 240, border: `1px solid ${t.tone === "ok" ? "rgba(159,212,176,.3)" : "rgba(124,26,26,.4)"}`, background: "rgba(16,17,19,.96)", backdropFilter: "blur(20px)" }}>
            <span style={{ color: t.tone === "ok" ? "var(--abh-ok)" : "var(--abh-bad)" }}>{t.tone === "ok" ? <Ic.check s={16} /> : <Ic.x s={16} />}</span>
            <span style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
