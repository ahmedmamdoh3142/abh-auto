"use client";
/**
 * components/admin/phone-input.tsx
 * حقل هاتف بكود الدولة لِلوحة الأدمن — بنفس فاليديشن وقائمة دول الموقع بالظبط
 * (طلب 8: نفس الفاليديشن المستخدم في حجز الموقع، لتطابق السلوك في كل مكان).
 *
 * القيمة value تُخزَّن كنص دولي كامل مثل "+966 5XXXXXXXX".
 * يُصدّر isValidPhone للتحقق في أماكن أخرى — ومنطقه مطابق لـ phone-field بالموقع.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";

export type Country = { code: string; dial: string; ar: string; en: string; flag: string; min: number; max: number };

/* نفس قائمة الموقع (components/shared/phone-field.tsx) — مصدر واحد للسلوك. */
export const COUNTRIES: Country[] = [
  { code: "SA", dial: "+966", ar: "السعودية", en: "Saudi Arabia", flag: "🇸🇦", min: 9, max: 9 },
  { code: "AE", dial: "+971", ar: "الإمارات", en: "United Arab Emirates", flag: "🇦🇪", min: 9, max: 9 },
  { code: "KW", dial: "+965", ar: "الكويت", en: "Kuwait", flag: "🇰🇼", min: 8, max: 8 },
  { code: "QA", dial: "+974", ar: "قطر", en: "Qatar", flag: "🇶🇦", min: 8, max: 8 },
  { code: "BH", dial: "+973", ar: "البحرين", en: "Bahrain", flag: "🇧🇭", min: 8, max: 8 },
  { code: "OM", dial: "+968", ar: "عُمان", en: "Oman", flag: "🇴🇲", min: 8, max: 8 },
  { code: "EG", dial: "+20", ar: "مصر", en: "Egypt", flag: "🇪🇬", min: 10, max: 10 },
  { code: "JO", dial: "+962", ar: "الأردن", en: "Jordan", flag: "🇯🇴", min: 9, max: 9 },
  { code: "LB", dial: "+961", ar: "لبنان", en: "Lebanon", flag: "🇱🇧", min: 7, max: 8 },
  { code: "IQ", dial: "+964", ar: "العراق", en: "Iraq", flag: "🇮🇶", min: 10, max: 10 },
  { code: "YE", dial: "+967", ar: "اليمن", en: "Yemen", flag: "🇾🇪", min: 9, max: 9 },
  { code: "SY", dial: "+963", ar: "سوريا", en: "Syria", flag: "🇸🇾", min: 9, max: 9 },
  { code: "SD", dial: "+249", ar: "السودان", en: "Sudan", flag: "🇸🇩", min: 9, max: 9 },
  { code: "MA", dial: "+212", ar: "المغرب", en: "Morocco", flag: "🇲🇦", min: 9, max: 9 },
  { code: "DZ", dial: "+213", ar: "الجزائر", en: "Algeria", flag: "🇩🇿", min: 9, max: 9 },
  { code: "TN", dial: "+216", ar: "تونس", en: "Tunisia", flag: "🇹🇳", min: 8, max: 8 },
  { code: "TR", dial: "+90", ar: "تركيا", en: "Turkey", flag: "🇹🇷", min: 10, max: 10 },
  { code: "GB", dial: "+44", ar: "بريطانيا", en: "United Kingdom", flag: "🇬🇧", min: 10, max: 10 },
  { code: "US", dial: "+1", ar: "أمريكا", en: "United States", flag: "🇺🇸", min: 10, max: 10 },
];

const DEFAULT = COUNTRIES[0];

/** يفصل نصًا دوليًا كاملاً إلى (الدولة، باقي الرقم) — مطابق لـ phone-field. */
export function splitPhone(full: string): { country: Country; number: string } {
  const raw = (full || "").trim();
  if (raw) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const compact = raw.replace(/[\s-]/g, "");
    for (const c of sorted) {
      if (compact.startsWith(c.dial)) return { country: c, number: compact.slice(c.dial.length) };
    }
  }
  return { country: DEFAULT, number: raw.replace(/[^\d]/g, "") };
}

export function joinPhone(country: Country, number: string): string {
  const digits = (number || "").replace(/[^\d]/g, "");
  return digits ? `${country.dial} ${digits}` : "";
}

/** فاليديشن مطابق للموقع: طول الرقم ضمن min/max لدولته. */
export function isValidPhone(full: string): boolean {
  const { country, number } = splitPhone(full);
  const len = number.replace(/[^\d]/g, "").length;
  return len >= country.min && len <= country.max;
}

/* ── دوال توافق قديمة (كانت موجودة في النسخة السابقة) ── */
export const DIAL_CODES = COUNTRIES;
export function splitDial(full: string): { dial: string; number: string } {
  const { country, number } = splitPhone(full);
  return { dial: country.dial, number };
}
export function joinDial(dial: string, number: string): string {
  const c = COUNTRIES.find((x) => x.dial === dial) ?? DEFAULT;
  return joinPhone(c, number);
}

export function PhoneInput({
  isAr, value, onChange, placeholder, error,
}: {
  isAr: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const init = useMemo(() => splitPhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(init.country);
  const [number, setNumber] = useState<string>(init.number);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // مزامنة مع القيمة الخارجية لو اتغيّرت
  useEffect(() => {
    const p = splitPhone(value);
    if (p.country.code !== country.code || p.number !== number) {
      setCountry(p.country); setNumber(p.number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const update = (c: Country, n: string) => { setCountry(c); setNumber(n); onChange(joinPhone(c, n)); };
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.ar.includes(q.trim()) || c.en.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s));
  }, [q]);

  const box: React.CSSProperties = {
    borderRadius: 12, border: `1px solid ${error ? "rgba(231,180,180,.5)" : "rgba(255,255,255,.12)"}`,
    background: "rgba(255,255,255,.03)", color: "var(--abh-ivory)", outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, direction: "ltr" }} ref={ref}>
        {/* اختيار كود الدولة */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button type="button" onClick={() => setOpen((o) => !o)}
            style={{ ...box, display: "flex", alignItems: "center", gap: 7, padding: "11px 12px", cursor: "pointer", minWidth: 104, height: "100%" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{country.flag}</span>
            <span className="abh-num" style={{ fontSize: 13.5 }}>{country.dial}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: .6, marginInlineStart: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {open && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", insetInlineStart: 0, zIndex: 60, width: 260, maxHeight: 300, overflowY: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(12,13,14,.98)", backdropFilter: "blur(20px)", boxShadow: "0 30px 80px -30px rgba(0,0,0,.9)", padding: 8 }}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? "ابحث عن دولة…" : "Search country…"}
                style={{ width: "100%", marginBottom: 6, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "8px 10px", fontSize: 12.5, color: "var(--abh-ivory)", outline: "none", direction: isAr ? "rtl" : "ltr" }} />
              {filtered.map((c) => {
                const on = c.code === country.code;
                return (
                  <button key={c.code} type="button" onClick={() => { update(c, number); setOpen(false); setQ(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", borderRadius: 10, padding: "9px 10px", cursor: "pointer", border: "none", background: on ? "rgba(255,255,255,.08)" : "transparent", color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.8)", textAlign: isAr ? "right" : "left" }}>
                    <span style={{ fontSize: 16 }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 12.5, direction: isAr ? "rtl" : "ltr" }}>{isAr ? c.ar : c.en}</span>
                    <span className="abh-num" style={{ fontSize: 12, color: "var(--abh-steel)" }}>{c.dial}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "var(--abh-steel)", textAlign: "center" }}>{isAr ? "لا نتائج" : "No results"}</div>}
            </div>
          )}
        </div>

        {/* خانة الرقم — نقصّ على max الدولة (مطابق للموقع) */}
        <input value={number} onChange={(e) => update(country, e.target.value.replace(/[^\d]/g, "").slice(0, country.max))} inputMode="numeric" dir="ltr"
          placeholder={placeholder || (isAr ? "رقم الجوال" : "Phone number")}
          style={{ ...box, flex: 1, padding: "11px 14px", fontSize: 14, textAlign: "left" }} />
      </div>
      {error && <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#e7b4b4" }}>{error}</span>}
    </div>
  );
}

export default PhoneInput;