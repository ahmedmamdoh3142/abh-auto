"use client";
/**
 * components/analytics/cookie-consent.tsx — بانر موافقة الكوكيز (عربي/RTL، بهوية ABH).
 *
 * إصلاح الأداء: البانر كان يظهر فورًا فوق الطية عند أول زيارة (DOM + SVG +
 * backdrop-blur وقت الـhydration) فيزاحم الـLCP/TBT على الموبايل. أجّلناه:
 *   • القراءة من localStorage تفضل فورية (عشان نطبّق consent المحفوظ بسرعة).
 *   • لكن إظهار البانر نفسه يتأخّر لِما المتصفح يخمل + 1.8s، فلا يلمس أول رسم.
 */
import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function updateGoogleConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const gtag: (...args: any[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    (window.dataLayer as any[]).push(arguments);
  };
  const value = granted ? "granted" : "denied";
  gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

export default function CookieConsent({ locale }: { locale?: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CONSENT_KEY);
    } catch { /* */ }

    // لو وافق قبل كده: طبّق الـconsent فورًا (مهم لـGA) — بدون إظهار بانر.
    if (saved === "granted") {
      updateGoogleConsent(true);
      return;
    }
    if (saved) return; // رفض قبل كده — مفيش بانر

    // زائر جديد: أجّل ظهور البانر حتى بعد أول رسم + خمول، عشان ما يزاحمش LCP/TBT.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    let t = 0;
    const reveal = () => { t = window.setTimeout(() => setShow(true), 1800); };
    let idle = 0;
    if (typeof w.requestIdleCallback === "function") {
      idle = w.requestIdleCallback(reveal);
    } else {
      t = window.setTimeout(() => setShow(true), 1800);
    }
    return () => {
      if (t) clearTimeout(t);
      const wc = window as unknown as { cancelIdleCallback?: (id: number) => void };
      if (idle && wc.cancelIdleCallback) wc.cancelIdleCallback(idle);
    };
  }, []);

  const decide = (granted: boolean) => {
    try { localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied"); } catch { /* */ }
    updateGoogleConsent(granted);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{
        position: "fixed", insetInlineStart: 16, insetInlineEnd: 16, bottom: 16, zIndex: 9999,
        maxWidth: 560, marginInline: "auto",
        borderRadius: 18, border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(12,13,14,.96)", backdropFilter: "blur(14px)",
        boxShadow: "0 30px 80px -30px rgba(0,0,0,.85)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ display: "grid", placeItems: "center", height: 38, width: 38, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.08)", color: "#cbcdcd" }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z" /><circle cx="9.5" cy="9.5" r="1" fill="currentColor" /><circle cx="14" cy="14" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 5 }}>
            {T("نحترم خصوصيتك", "We value your privacy")}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "rgba(203,205,205,.8)" }}>
            {T(
              "بنستخدم الكوكيز لتحليل أداء الموقع وتحسين تجربتك. تقدر توافق أو ترفض، واختيارك بيتحفظ.",
              "We use cookies to analyze site performance and improve your experience. You can accept or decline."
            )}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => decide(true)}
              style={{ borderRadius: 999, border: "none", padding: "10px 22px", fontSize: 12.5, fontWeight: 600, letterSpacing: ".04em", cursor: "pointer", color: "#0c0d0e", background: "linear-gradient(135deg,#fff,#cbcdcd)" }}
            >
              {T("موافق", "Accept")}
            </button>
            <button
              onClick={() => decide(false)}
              style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", padding: "10px 22px", fontSize: 12.5, cursor: "pointer", color: "var(--abh-platinum, #cbcdcd)", background: "transparent" }}
            >
              {T("رفض", "Decline")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}