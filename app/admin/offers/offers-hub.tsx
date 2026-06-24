"use client";
/**
 * app/admin/offers/offers-hub.tsx — هب التحكّم في العروض والولاء (تصميم جريد بروفشنال).
 * تبويبات بأيقونات · الأكواد ككروت تذاكر · الولاء كروت جريد. هوية سلفر بالكامل.
 */
import { useEffect, useState } from "react";
import { Pill, Toggle, Field, Input, Chip, useToast, Ic, PageHeader } from "@/components/admin/ui";
import BundlesPanel from "./bundles-panel";
import WheelPanel from "./wheel-panel";

export type AdminSvc = { id: number; name: { ar?: string; en?: string }; onRequest: boolean };
type Tab = "auto" | "bundles" | "wheel" | "loyalty";

export default function OffersHub({ services, locale }: { services: AdminSvc[]; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const [tab, setTab] = useState<Tab>("auto");

  const tabs: { id: Tab; label: string; hint: string; icon: any }[] = [
    { id: "auto", label: T("الكود التلقائي", "Auto code"), hint: T("تذكرة الحجز", "Booking ticket"), icon: Ic.sparkle },
    { id: "bundles", label: T("البندلات", "Bundles"), hint: T("خدمة + هدية", "Service + gift"), icon: Ic.sliders },
    { id: "wheel", label: T("عجلة الحظ", "Lucky wheel"), hint: T("الجوائز والاحتمالات", "Prizes & odds"), icon: Ic.trending },
    { id: "loyalty", label: T("الولاء", "Loyalty"), hint: T("مستويات العضوية", "Membership tiers"), icon: Ic.users },
  ];

  return (
    <div className="abh-col" style={{ gap: 24 }}>
      <PageHeader
        title={T("العروض والولاء", "Offers & loyalty")}
        subtitle={T("تحكّم كامل: الكود التلقائي، بندلات الهدايا، عجلة الحظ، ومستويات العضوية.", "Full control: auto code, gift bundles, lucky wheel, and membership tiers.")}
      />

      {/* شريط التبويبات — كروت بأيقونات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        {tabs.map((tb) => {
          const on = tab === tb.id;
          const Icon = tb.icon;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                position: "relative", textAlign: "start", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16,
                border: on ? "1px solid rgba(203,205,205,.45)" : "1px solid rgba(255,255,255,.08)",
                background: on
                  ? "linear-gradient(135deg, rgba(203,205,205,.14), rgba(255,255,255,.03))"
                  : "rgba(255,255,255,.02)",
                boxShadow: on ? "0 18px 50px -28px rgba(203,205,205,.6)" : "none",
                transition: "all .35s cubic-bezier(.16,1,.3,1)",
              }}>
              {on && <span aria-hidden style={{ position: "absolute", insetInlineStart: 14, top: 0, height: 2, width: 26, borderRadius: 999, background: "linear-gradient(90deg,#fff,#cbcdcd)" }} />}
              <span style={{
                display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 11, flex: "none",
                border: "1px solid rgba(255,255,255,.12)",
                background: on ? "linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.02))" : "rgba(255,255,255,.03)",
                color: on ? "#f5f5f0" : "rgba(203,205,205,.7)",
              }}>
                {Icon ? <Icon s={18} sw={on ? 1.9 : 1.7} /> : null}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, color: on ? "#f5f5f0" : "rgba(203,205,205,.85)" }}>{tb.label}</span>
                <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "rgba(102,106,110,1)" }}>{tb.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="abh-fade-up">
        {tab === "auto" && <AutoCodePanel T={T} />}
        {tab === "bundles" && <BundlesPanel services={services} locale={locale} />}
        {tab === "wheel" && <WheelPanel services={services} locale={locale} />}
        {tab === "loyalty" && <LoyaltyPanel T={T} isAr={isAr} />}
      </div>
    </div>
  );
}

/* ════════════ تاب: الكود التلقائي (كروت تذاكر) ════════════ */
type AutoCode = {
  id: string; code: string; label: string | null; kind: string;
  discountPercent: number; fixedAmount: number | null; isActive: boolean; autoShow: boolean; surface: string;
};

function AutoCodePanel({ T }: { T: (a: string, e: string) => string }) {
  const toast = useToast();
  const [codes, setCodes] = useState<AutoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const j = await fetch("/api/admin/auto-code").then((r) => r.json());
      if (j?.ok) setCodes(j.codes);
    } catch { toast(T("فشل التحميل", "Failed to load"), "bad"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setAuto = async (code: string, autoShow: boolean) => {
    setBusy(code);
    try {
      const j = await fetch("/api/admin/auto-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, autoShow, surface: "booking" }),
      }).then((r) => r.json());
      if (j?.ok) { toast(T("اتحفظ", "Saved")); await load(); }
      else toast(T("فشل الحفظ", "Save failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
    finally { setBusy(null); }
  };

  const valueOf = (c: AutoCode) =>
    c.kind === "percentage" ? `${c.discountPercent}%` : c.fixedAmount != null ? `${c.fixedAmount}` : "—";

  if (loading) return <Loading />;

  return (
    <div className="abh-col" style={{ gap: 16 }}>
      <p style={{ color: "rgba(203,205,205,.65)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
        {T("الكود المفعّل بيظهر كتذكرة قابلة للنسخ في الحجز وصفحة العروض. تذكرة واحدة بس فعّالة في المرة.",
           "The enabled code shows as a copyable ticket on booking & offers. Only one is active at a time.")}
      </p>
      {codes.length === 0 && <Empty text={T("لا توجد أكواد عامة. أنشئ كودًا من صفحة البرومو الأول.", "No general codes. Create one in Promos first.")} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {codes.map((c) => {
          const on = c.autoShow;
          return (
            <div key={c.id} style={{
              position: "relative", overflow: "hidden", borderRadius: 18, padding: 18,
              border: on ? "1px solid rgba(203,205,205,.5)" : "1px solid rgba(255,255,255,.08)",
              background: on ? "linear-gradient(135deg,rgba(203,205,205,.1),rgba(255,255,255,.01))" : "rgba(255,255,255,.02)",
              boxShadow: on ? "0 22px 60px -34px rgba(203,205,205,.7)" : "none",
            }}>
              {/* خط علوي + نتوءات تذكرة */}
              <span aria-hidden style={{ position: "absolute", insetInline: 28, top: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.55),transparent)" }} />
              <span aria-hidden style={{ position: "absolute", insetInlineStart: -8, top: "50%", height: 16, width: 16, borderRadius: 999, transform: "translateY(-50%)", background: "#000" }} />
              <span aria-hidden style={{ position: "absolute", insetInlineEnd: -8, top: "50%", height: 16, width: 16, borderRadius: 999, transform: "translateY(-50%)", background: "#000" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Chip tone="platinum">{valueOf(c)}</Chip>
                {!c.isActive && <Chip tone="danger">{T("موقوف", "Inactive")}</Chip>}
              </div>

              <div style={{ marginTop: 12, fontFamily: "var(--font-display, inherit)", letterSpacing: ".18em", fontSize: 24, color: "#f5f5f0" }}>
                {c.code}
              </div>
              {c.label && (
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(203,205,205,.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
              )}

              <div style={{ margin: "14px 0", height: 1, background: "rgba(255,255,255,.07)" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: on ? "#f5f5f0" : "rgba(203,205,205,.55)" }}>
                  {on ? T("تذكرة فعّالة", "Active ticket") : T("إظهار كتذكرة", "Show as ticket")}
                </span>
                <Toggle on={on} onChange={(v: boolean) => busy !== c.code && setAuto(c.code, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════ تاب: مستويات الولاء ════════════ */
type Tier = {
  code: string; name: { ar?: string; en?: string }; threshold: number; discountPercent: number;
  perks: { ar?: string[]; en?: string[] }; hex: string; icon: string; isActive: boolean;
};

function LoyaltyPanel({ T, isAr }: { T: (a: string, e: string) => string; isAr: boolean }) {
  const toast = useToast();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/loyalty").then((r) => r.json()); if (j?.ok) setTiers(j.tiers); }
    catch { toast(T("فشل التحميل", "Failed to load"), "bad"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (code: string, p: Partial<Tier>) => setTiers((ts) => ts.map((t) => (t.code === code ? { ...t, ...p } : t)));

  const save = async (t: Tier) => {
    setSaving(t.code);
    try {
      const j = await fetch("/api/admin/loyalty", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: t.code, threshold: t.threshold, discountPercent: t.discountPercent, isActive: t.isActive }),
      }).then((r) => r.json());
      if (j?.ok) toast(T("اتحفظ", "Saved")); else toast(T("فشل الحفظ", "Save failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
    finally { setSaving(null); }
  };

  if (loading) return <Loading />;

  return (
    <div className="abh-col" style={{ gap: 16 }}>
      <p style={{ color: "rgba(203,205,205,.65)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
        {T("العتبة = إجمالي إنفاق العميل للوصول للمستوى. الخصم = نسبة دائمة تتطبّق تلقائيًا على كل حجز (لو مفيش كود).",
           "Threshold = lifetime spend to reach the tier. Discount = standing % applied automatically (when no promo code).")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {tiers.map((t) => (
          <div key={t.code} style={{
            position: "relative", overflow: "hidden", borderRadius: 20, padding: 18,
            border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.02)",
          }}>
            <span aria-hidden style={{ position: "absolute", insetInline: 0, top: 0, height: 3, background: `linear-gradient(90deg,transparent,${t.hex},transparent)` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ height: 34, width: 34, borderRadius: 999, background: `linear-gradient(135deg,#fff,${t.hex} 60%,rgba(0,0,0,.4))`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.3)" }} />
              <span style={{ fontFamily: "var(--font-display, inherit)", textTransform: "uppercase", fontSize: 19, color: "#f5f5f0" }}>
                {(isAr ? t.name?.ar : t.name?.en) || t.code}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label={T("العتبة", "Threshold")}>
                <Input type="number" value={t.threshold} dir="ltr" onChange={(e: any) => patch(t.code, { threshold: Math.max(0, +e.target.value) })} />
              </Field>
              <Field label={T("الخصم %", "Discount %")}>
                <Input type="number" value={t.discountPercent} dir="ltr" onChange={(e: any) => patch(t.code, { discountPercent: Math.max(0, Math.min(100, +e.target.value)) })} />
              </Field>
            </div>
            {(t.perks?.[isAr ? "ar" : "en"]?.length ?? 0) > 0 && (
              <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
                {(t.perks[isAr ? "ar" : "en"] ?? []).map((p, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(203,205,205,.72)" }}>
                    <span style={{ color: t.hex }}>✦</span>{p}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(203,205,205,.7)" }}>
                <Toggle on={t.isActive} onChange={(v: boolean) => patch(t.code, { isActive: v })} />{T("مفعّل", "Active")}
              </label>
              <Pill icon={Ic.check} onClick={() => save(t)}>{saving === t.code ? T("...", "...") : T("حفظ", "Save")}</Pill>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════ مشترَك ════════════ */
export function Loading() {
  return <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
    <div style={{ height: 34, width: 34, borderRadius: 999, border: "2px solid rgba(255,255,255,.15)", borderTopColor: "#cbcdcd", animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}
export function Empty({ text }: { text: string }) {
  return <div style={{ padding: 28, textAlign: "center", color: "rgba(102,106,110,1)", border: "1px dashed rgba(255,255,255,.12)", borderRadius: 18 }}>{text}</div>;
}