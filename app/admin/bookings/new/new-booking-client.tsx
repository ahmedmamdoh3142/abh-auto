"use client";
/**
 * app/admin/bookings/new/new-booking-client.tsx — حجز سريع من الداشبورد (CLIENT).
 *
 * تصميم احترافي بعرض الصفحة الكامل:
 *   • عمود رئيسي: العميل → السيارة → الخدمات → الموعد والدفع.
 *   • عمود جانبي ثابت (sticky): ملخّص الحجز الحيّ + زر الإنشاء.
 *
 * (بحث) الماركة والموديل بقوا combobox بسيرش (AdminSearchSelect) زي الموقع —
 *   تكتب حرف فيتفلتر، والقائمة بـ Portal عشان ما تتقصّش جوّه الكرت.
 *
 * (عروض) نفس فكرة الموقع: الخدمات المؤهِّلة لهدية تتعلّم بشارة، ولمّا تختار
 *   ما يكفي منها يظهر بانر «فتحت هدية» تفتح منه مودال اختيار الهدية. الهدية
 *   تتضاف للملخّص والإجمالي وتترسل للسيرفر اللي بيسجّلها.
 */
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { card, Pill, Ic, EGP, useToast, PageHeader, Field } from "@/components/admin/ui";
import { PhoneInput, isValidPhone } from "@/components/admin/phone-input";
import { useBundles, isTriggerService, unlockedBundles, giftChargeFor, type Bundle, type ChosenGift } from "@/components/sections/booking/gift-picker";

/* ───────── هوك media query (للتجاوب مع الموبايل) ───────── */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return matches;
}

type SizeCode = "small" | "medium" | "large";
type Model = { name: string; size: SizeCode };
type Brand = { id: string; name: string; models: Model[] };
type Service = { id: number; slug: string; name: string; category: string; categorySlug: string; onRequest: boolean; active?: boolean; prices: Record<SizeCode, number>; oldPrices: Record<SizeCode, number> };
type Opt = { code: string; label: string };
type ColorOpt = { key: string; hex: string; light: boolean; name: string };
type TowOpt = { code: string; label: string; cost: number };
type UserLite = { id: string; name: string; email: string; phone?: string; city?: string };

const SIZE_LABEL: Record<SizeCode, { ar: string; en: string }> = {
  small: { ar: "صغيرة", en: "Small" },
  medium: { ar: "متوسطة", en: "Medium" },
  large: { ar: "كبيرة", en: "Large" },
};
const GIFT_GOLD = "#e8d6a8";

/* أيقونة هدية صغيرة */
const giftIco = (s = 12) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 12v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

export default function NewBookingClient({
  locale, brands, services, branches, colors, cities, payments, towing, slots,
}: {
  locale?: string;
  brands: Brand[];
  services: Service[];
  branches: Opt[];
  colors: ColorOpt[];
  cities: Opt[];
  payments: Opt[];
  towing: TowOpt[];
  slots: string[];
}) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const mobile = useMediaQuery("(max-width: 640px)");

  // أعمدة الجريد: عمود واحد على الموبايل، عمودين بـ minmax(0,..) على الديسكتوب (يمنع التمطّط)
  const twoCol = mobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)";
  const cardPad = mobile ? 16 : 24;

  const [mode, setMode] = useState<"registered" | "guest">("guest");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (mode !== "registered") return;
    let alive = true; setSearching(true);
    const t = setTimeout(async () => {
      try {
        const j = await fetch(`/api/admin/users-lite?q=${encodeURIComponent(q)}`).then((r) => r.json());
        if (alive && j?.ok) setUsers(j.users);
      } finally { if (alive) setSearching(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, mode]);

  const pickUser = (u: UserLite) => {
    setUserId(u.id);
    setName(u.name || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
    setCity(u.city || "");
  };

  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [colorKey, setColorKey] = useState("");
  const [plate, setPlate] = useState("");

  const brand = brands.find((b) => b.id === brandId);
  const modelObj = brand?.models.find((m) => m.name === model);
  const size: SizeCode = modelObj?.size ?? "large";

  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const grouped = useMemo(() => {
    const g = new Map<string, Service[]>();
    for (const s of services) { const a = g.get(s.category) ?? []; a.push(s); g.set(s.category, a); }
    return Array.from(g.entries());
  }, [services]);
  const toggleSvc = (slug: string) => setChosen((prev) => {
    const n = new Set(prev); n.has(slug) ? n.delete(slug) : n.add(slug); return n;
  });

  // ── خدمات مؤقتة (تُكتب يدويًا، لهذا الحجز فقط — لا تُحفظ كخدمة دائمة) ──
  const [customItems, setCustomItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [cName, setCName] = useState("");
  const [cPrice, setCPrice] = useState("");
  const addCustom = () => {
    const nm = cName.trim();
    const pr = Math.max(0, Math.round(Number(cPrice) || 0));
    if (!nm) return;
    setCustomItems((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: nm, price: pr }]);
    setCName(""); setCPrice("");
  };
  const removeCustom = (id: string) => setCustomItems((prev) => prev.filter((c) => c.id !== id));

  // ── (عروض) البندلات والهدايا ──
  const bundles = useBundles();
  const [gifts, setGifts] = useState<ChosenGift[]>([]);
  const [giftBundle, setGiftBundle] = useState<Bundle | null>(null);

  const chosenServices = useMemo(
    () => Array.from(chosen).map((slug) => services.find((x) => x.slug === slug)).filter(Boolean) as Service[],
    [chosen, services]
  );
  const selectedIds = useMemo(() => chosenServices.map((s) => s.id), [chosenServices]);
  const openBundles = useMemo(() => unlockedBundles(bundles, selectedIds), [bundles, selectedIds]);

  // لو خدمة اتشالت وقفل بندلها، نشيل هداياه تلقائيًا
  useEffect(() => {
    const openIds = new Set(openBundles.map((b) => b.id));
    setGifts((gs) => gs.filter((g) => openIds.has(g.bundleId)));
  }, [openBundles]);

  const [towMode, setTowMode] = useState<string>("");
  const [towAddress, setTowAddress] = useState("");

  const [branch, setBranch] = useState(branches[0]?.code ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState(payments.find((p) => p.code === "cash")?.code ?? payments[0]?.code ?? "");
  const [promo, setPromo] = useState("");
  const [waOptIn, setWaOptIn] = useState(true); // موافقة الواتساب (افتراضيًا مفعّلة في الداشبورد)

  const [busy, setBusy] = useState(false);

  const total = useMemo(() => {
    let svc = 0; let onReq = false;
    for (const s of chosenServices) {
      if (s.onRequest) { onReq = true; continue; }
      svc += s.prices[size] ?? s.prices.large ?? 0;
    }
    const tow = towMode ? (towing.find((t) => t.code === towMode)?.cost ?? 0) : 0;
    const giftsCharge = gifts.reduce((s, g) => s + (g.unit || 0), 0);
    const customTotal = customItems.reduce((s, c) => s + (c.price || 0), 0);
    return { svc, tow, giftsCharge, customTotal, grand: svc + tow + giftsCharge + customTotal, onReq };
  }, [chosenServices, size, towMode, towing, gifts, customItems]);

  const phoneOk = !phone.trim() || isValidPhone(phone);
  const customerOk = mode === "registered" ? !!userId : (!!name.trim() && !!phone.trim() && phoneOk);
  const canSubmit = customerOk && !!brandId && !!model && (chosen.size > 0 || customItems.length > 0)
    && !!branch && !!date && !!time && !!payment
    && (!towMode || towAddress.trim().length > 2) && !busy;

  const submit = async () => {
    if (!canSubmit) { setTouched(true); return; }
    setBusy(true);
    try {
      const vehicleLabel = `${brand?.name ?? ""} ${model}`.trim();
      const res = await fetch("/api/admin/bookings/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mode === "registered" ? userId : null,
          name, phone, email: email || null, city,
          vehicleLabel, brandId, model, size, colorKey, plate,
          branch, date, time, payment,
          towingMode: towMode || null, towingAddress: towMode ? towAddress : null,
          services: Array.from(chosen),
          customItems: customItems.map((c) => ({ name: c.name, price: c.price })),
          gifts: gifts.map((g) => ({ slug: g.slug, bundleId: g.bundleId })),
          promoCode: promo.trim() || null,
          whatsappOptIn: waOptIn,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "fail");
      toast(T(`تم إنشاء الحجز ${j.reference}`, `Booking ${j.reference} created`));
      setChosen(new Set()); setGifts([]); setCustomItems([]); setModel(""); setBrandId(""); setColorKey(""); setPlate("");
      setDate(""); setTime(""); setPromo(""); setTowMode(""); setTowAddress("");
      if (mode === "guest") { setName(""); setPhone(""); setEmail(""); setCity(""); }
      setUserId(""); setTouched(false);
    } catch {
      toast(T("فشل إنشاء الحجز", "Failed to create booking"), "bad");
    } finally { setBusy(false); }
  };

  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };
  const sectionTitle = (n: string, label: string): React.ReactNode => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <span className="abh-num" style={{ display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", fontSize: 13, color: "var(--abh-platinum)" }}>{n}</span>
      <span style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(255,255,255,.12),transparent)" }} />
    </div>
  );

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("حجز جديد", "New booking")}
        subtitle={T("احجز لعميل حضر للفرع — نفس بيانات حجز الموقع. حجم السيارة يحدّد أسعار الخدمات.", "Book for a walk-in customer — same data as the website. Vehicle size drives service prices.")}
        seed="new-booking-hero" />

      <div className="abh-nb-layout">
        <div className="abh-col" style={{ gap: 20, minWidth: 0 }}>
          {/* 1) العميل */}
          <div style={{ ...card, padding: cardPad, minWidth: 0 }}>
            {sectionTitle("1", T("العميل", "Customer"))}
            <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 10, marginBottom: 18 }}>
              {([["guest", T("عميل جديد / زائر", "New / walk-in"), T("اكتب بياناته يدويًا", "Enter details manually")],
                 ["registered", T("عميل مسجّل", "Registered"), T("ابحث واختر من الحسابات", "Search existing accounts")]] as const).map(([val, ttl, desc]) => {
                const on = mode === val;
                return (
                  <button key={val} onClick={() => { setMode(val as any); setUserId(""); }} style={{ textAlign: "start", borderRadius: 14, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: 14, cursor: "pointer", transition: "all .2s" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)" }}>
                      <Ic.users s={16} /><span style={{ fontSize: 13, fontWeight: on ? 600 : 400 }}>{ttl}</span>
                    </span>
                    <div style={{ fontSize: 11, color: "var(--abh-steel)", marginTop: 5 }}>{desc}</div>
                  </button>
                );
              })}
            </div>

            {mode === "registered" && (
              userId ? (
                // عميل مختار — القائمة اتقفلت ونعرض كرت مختصر مع زر «تغيير»
                <div style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 12, border: "1px solid rgba(203,205,205,.4)", background: "rgba(203,205,205,.07)", padding: "12px 14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ display: "grid", placeItems: "center", height: 34, width: 34, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(203,205,205,.4)", background: "rgba(203,205,205,.1)", color: "var(--abh-ivory)" }}><Ic.users s={16} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5, color: "var(--abh-ivory)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "—"}</span>
                      <span dir="ltr" style={{ display: "block", fontSize: 11, color: "var(--abh-steel)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[phone, email].filter(Boolean).join("  ·  ") || "—"}</span>
                    </span>
                  </span>
                  <button onClick={() => setUserId("")} style={{ flexShrink: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "var(--abh-platinum)", padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>{T("تغيير", "Change")}</button>
                </div>
              ) : (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالاسم أو الإيميل أو التليفون…", "Search name, email or phone…")} style={{ ...inp, paddingInlineStart: 36 }} />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)" }}>
                    {searching ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("جارٍ البحث…", "Searching…")}</div>
                      : users.length === 0 ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("لا نتائج", "No results")}</div>
                      : users.map((u) => (
                        <button key={u.id} onClick={() => pickUser(u)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid rgba(255,255,255,.04)", background: "transparent", cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, color: "var(--abh-ivory)" }}>{u.name}</span>
                            <span dir="ltr" style={{ display: "block", fontSize: 10.5, color: "var(--abh-steel)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[u.phone, u.email].filter(Boolean).join("  ·  ")}</span>
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )
            )}

            <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الاسم", "Name")}>
                  <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder={T("اسم العميل", "Customer name")} />
                  {touched && mode === "guest" && !name.trim() && <Err>{T("الاسم مطلوب", "Name required")}</Err>}
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("التليفون", "Phone")}>
                  <div className="abh-phone-wrap">
                    <PhoneInput isAr={isAr} value={phone} onChange={setPhone} error={touched && phone.trim() && !phoneOk ? T("رقم غير صحيح", "Invalid number") : null} />
                  </div>
                  {touched && mode === "guest" && !phone.trim() && <Err>{T("التليفون مطلوب", "Phone required")}</Err>}
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الإيميل (اختياري)", "Email (optional)")}>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ ...inp, textAlign: "left" }} placeholder="name@email.com" />
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("المدينة (اختياري)", "City (optional)")}>
                  <select value={city} onChange={(e) => setCity(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    <option value="" style={{ background: "#0c0d0e" }}>{T("—", "—")}</option>
                    {cities.map((c) => <option key={c.code} value={c.code} style={{ background: "#0c0d0e" }}>{c.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* 2) السيارة */}
          <div style={{ ...card, padding: cardPad, minWidth: 0 }}>
            {sectionTitle("2", T("السيارة", "Vehicle"))}
            <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 14, marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الماركة", "Brand")}>
                  <AdminSearchSelect isAr={isAr} inp={inp} value={brandId}
                    placeholder={T("اختر الماركة", "Select brand")}
                    searchPlaceholder={T("ابحث عن ماركة…", "Search brand…")}
                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                    onChange={(v) => { setBrandId(v); setModel(""); }} />
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الموديل", "Model")}>
                  <AdminSearchSelect isAr={isAr} inp={inp} value={model} disabled={!brand}
                    placeholder={T("اختر الموديل", "Select model")}
                    searchPlaceholder={T("ابحث عن موديل…", "Search model…")}
                    options={(brand?.models ?? []).map((m) => ({ value: m.name, label: m.name }))}
                    onChange={(v) => setModel(v)} />
                </Field>
              </div>
            </div>

            {model && (
              <div style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 8, borderRadius: 999, border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.06)", padding: "6px 13px", marginBottom: 14, fontSize: 11.5, color: "var(--abh-platinum)" }}>
                {Ic.sparkle({ s: 13 })}{T("حجم السيارة", "Vehicle size")}: <strong style={{ color: "var(--abh-ivory)" }}>{isAr ? SIZE_LABEL[size].ar : SIZE_LABEL[size].en}</strong>
                <span style={{ color: "var(--abh-steel)" }}>· {T("يحدّد أسعار الخدمات", "drives prices")}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr 1fr", gap: 14 }}>
              <Field label={T("اللون", "Color")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {colors.map((c) => {
                    const on = colorKey === c.key;
                    return (
                      <button key={c.key} onClick={() => setColorKey(c.key)} title={c.name} style={{ display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 999, cursor: "pointer", border: on ? "2px solid var(--abh-ivory)" : "1px solid rgba(255,255,255,.15)", background: "transparent" }}>
                        <span style={{ height: 26, width: 26, borderRadius: 999, background: c.hex, boxShadow: "inset 0 1px 2px rgba(255,255,255,.25), inset 0 -2px 4px rgba(0,0,0,.4)" }} />
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label={T("اللوحة", "Plate")}>
                <input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" style={{ ...inp, textAlign: "center", letterSpacing: ".15em" }} placeholder={T("أ ب ج 1234", "ABC 1234")} />
              </Field>
            </div>
          </div>

          {/* 3) الخدمات */}
          <div style={{ ...card, padding: cardPad, minWidth: 0 }}>
            {sectionTitle("3", T("الخدمات", "Services"))}
            {!model && <div style={{ fontSize: 12, color: "var(--abh-steel)", marginBottom: 12 }}>{T("اختر سيارة أولًا لعرض الأسعار حسب الحجم.", "Pick a vehicle first to price by size.")}</div>}
            <div className="abh-col" style={{ gap: 18 }}>
              {grouped.map(([cat, svcs]) => (
                <div key={cat}>
                  <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 8 }}>{cat}</div>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(auto-fill,minmax(150px,1fr))" : "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {svcs.map((s) => {
                      const on = chosen.has(s.slug);
                      const price = s.prices[size] ?? s.prices.large ?? 0;
                      const oldP = s.oldPrices[size] ?? s.oldPrices.large ?? 0;
                      const hasDiscount = !s.onRequest && oldP > 0 && oldP !== price;
                      const isTrigger = isTriggerService(bundles, s.id);
                      return (
                        <button key={s.slug} onClick={() => toggleSvc(s.slug)} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, borderRadius: 14, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.07)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: "14px 15px", cursor: "pointer", textAlign: isAr ? "right" : "left", transition: "all .2s", minHeight: 92, minWidth: 0 }}>
                          {/* الصف العلوي: مربّع الاختيار */}
                          <span style={{ display: "flex", justifyContent: isAr ? "flex-start" : "flex-end" }}>
                            <span style={{ display: "grid", placeItems: "center", height: 22, width: 22, flexShrink: 0, borderRadius: 7, border: on ? "none" : "1px solid rgba(255,255,255,.2)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: "#000" }}>{on && <Ic.check s={13} />}</span>
                          </span>
                          {/* اسم الخدمة — أكبر وعلى سطرين كاملين */}
                          <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.35, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.name}</span>
                          {/* شارة هدية لو الخدمة مؤهِّلة */}
                          {isTrigger && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: isAr ? "flex-end" : "flex-start", width: "fit-content", borderRadius: 999, border: "1px solid rgba(217,178,95,.4)", background: "rgba(217,178,95,.1)", padding: "2px 8px", fontSize: 9.5, color: GIFT_GOLD }}>
                              {giftIco(11)}{T("خدها وخد هدية", "Get a gift")}
                            </span>
                          )}
                          {/* شارة: الخدمة مخفية من الموقع (معطّلة) لكنها متاحة بالداشبورد */}
                          {s.active === false && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: isAr ? "flex-end" : "flex-start", width: "fit-content", borderRadius: 999, border: "1px solid rgba(245,153,61,.45)", background: "rgba(245,153,61,.12)", padding: "2px 8px", fontSize: 9.5, color: "#f5993d" }}>
                              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c5 0 9 5 9 8a12 12 0 0 1-2 2.8M6.6 6.6A12.6 12.6 0 0 0 3 12c0 3 4 8 9 8a9 9 0 0 0 4.5-1.2" /><path d="M3 3l18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                              </svg>
                              {T("مخفية من الموقع", "Hidden on site")}
                            </span>
                          )}
                          {/* السعر تحت الاسم */}
                          <span dir="ltr" className="abh-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 7, justifyContent: isAr ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
                            {s.onRequest ? (
                              <span style={{ fontSize: 14, color: "var(--abh-platinum)" }}>{T("حسب الطلب", "On request")}</span>
                            ) : (
                              <>
                                {hasDiscount && <span style={{ fontSize: 12.5, color: "#e7b4b4", textDecoration: "line-through", opacity: .85 }}>{EGP(oldP)}</span>}
                                <span style={{ fontSize: 16, fontWeight: 600, color: hasDiscount ? "var(--abh-ivory)" : (on ? "var(--abh-ivory)" : "var(--abh-platinum)") }}>{EGP(price)}</span>
                                <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{ccy}</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {touched && chosen.size === 0 && customItems.length === 0 && <Err>{T("اختر خدمة واحدة على الأقل أو أضف خدمة مؤقتة", "Select at least one service or add a custom one")}</Err>}

            {/* (عروض) بانر فتح الهدية */}
            {openBundles.length > 0 && (
              <button onClick={() => setGiftBundle(openBundles[0])}
                style={{ marginTop: 16, display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 14, border: "1px solid rgba(217,178,95,.4)", background: "rgba(217,178,95,.08)", padding: "14px 16px", cursor: "pointer", textAlign: "start" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <span style={{ display: "grid", placeItems: "center", height: 36, width: 36, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(217,178,95,.4)", background: "rgba(217,178,95,.12)", color: GIFT_GOLD }}>{giftIco(16)}</span>
                  <span>
                    <span style={{ display: "block", fontSize: 13.5, color: GIFT_GOLD }}>{T("مبروك! فتحت هدية", "You unlocked a gift")}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--abh-steel)", marginTop: 2 }}>{gifts.length > 0 ? T("اضغط لتغيير الهدية", "Tap to change gift") : T("اضغط لاختيار الهدية", "Tap to choose gift")}</span>
                  </span>
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".06em", color: GIFT_GOLD }}>{gifts.length > 0 ? T("تغيير", "Change") : T("اختر", "Choose")}</span>
              </button>
            )}

            {/* خدمة مؤقتة — تُكتب يدويًا لهذا الحجز فقط (لا تُحفظ كخدمة دائمة) */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 4 }}>{T("خدمة مؤقتة (اختياري)", "Custom service (optional)")}</div>
              <div style={{ fontSize: 11, color: "var(--abh-steel)", marginBottom: 10 }}>{T("تنضاف لهذا الحجز فقط — مش هتتسجّل كخدمة دائمة.", "Added to this booking only — won’t be saved as a permanent service.")}</div>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1fr) 130px auto", gap: 8 }}>
                <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder={T("اسم الخدمة", "Service name")}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} style={inp} />
                <input value={cPrice} onChange={(e) => setCPrice(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={T("السعر", "Price")} dir="ltr"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} style={{ ...inp, textAlign: "center" }} />
                <button onClick={addCustom} disabled={!cName.trim()} style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.4)", background: cName.trim() ? "rgba(203,205,205,.1)" : "rgba(255,255,255,.02)", color: cName.trim() ? "var(--abh-ivory)" : "var(--abh-steel)", padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: cName.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {Ic.plus({ s: 15 })}{T("إضافة", "Add")}
                </button>
              </div>

              {customItems.length > 0 && (
                <div className="abh-col" style={{ gap: 8, marginTop: 12 }}>
                  {customItems.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "10px 13px" }}>
                      <span style={{ minWidth: 0, fontSize: 13.5, color: "var(--abh-ivory)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span dir="ltr" className="abh-num" style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{EGP(c.price)} <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{ccy}</span></span>
                        <button onClick={() => removeCustom(c.id)} aria-label="remove" style={{ display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-steel)", cursor: "pointer" }}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("النقل / السطحة (اختياري)", "Towing (optional)")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setTowMode("")} style={chipStyle(!towMode)}>{T("بدون", "None")}</button>
                {towing.map((tw) => <button key={tw.code} onClick={() => setTowMode(tw.code)} style={chipStyle(towMode === tw.code)}>{tw.label} · <span dir="ltr">+{EGP(tw.cost)}</span></button>)}
              </div>
              {towMode && (
                <input value={towAddress} onChange={(e) => setTowAddress(e.target.value)} placeholder={T("عنوان الاستلام", "Pickup address")} style={{ ...inp, marginTop: 10 }} />
              )}
            </div>
          </div>

          {/* 4) الموعد والدفع */}
          <div style={{ ...card, padding: cardPad, minWidth: 0 }}>
            {sectionTitle("4", T("الموعد والدفع", "Schedule & payment"))}
            <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الفرع", "Branch")}>
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    {branches.map((b) => <option key={b.code} value={b.code} style={{ background: "#0c0d0e" }}>{b.label}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("طريقة الدفع", "Payment")}>
                  <select value={payment} onChange={(e) => setPayment(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    {payments.map((p) => <option key={p.code} value={p.code} style={{ background: "#0c0d0e" }}>{p.label}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("التاريخ", "Date")}>
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} dir="ltr" style={inp} />
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الوقت", "Time")}>
                  <select value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    <option value="" style={{ background: "#0c0d0e" }}>{T("اختر الوقت", "Select time")}</option>
                    {slots.map((s) => <option key={s} value={s} style={{ background: "#0c0d0e" }}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label={T("كود خصم (اختياري)", "Promo code (optional)")}>
                <input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase().replace(/\s+/g, ""))} dir="ltr" style={{ ...inp, textAlign: "left" }} placeholder="SUMMER25" />
              </Field>
            </div>

            {/* موافقة الواتساب */}
            <label style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer", borderRadius: 12, border: `1px solid ${waOptIn ? "rgba(159,212,176,.3)" : "rgba(255,255,255,.08)"}`, background: waOptIn ? "rgba(159,212,176,.06)" : "rgba(255,255,255,.02)", padding: "13px 15px", transition: "all .2s" }}>
              <span style={{ display: "grid", placeItems: "center", height: 22, width: 22, flexShrink: 0, borderRadius: 7, marginTop: 1, border: waOptIn ? "none" : "1px solid rgba(255,255,255,.25)", background: waOptIn ? "linear-gradient(135deg,#9fd4b0,#7ec594)" : "transparent", color: "#0c0d0e" }}>{waOptIn && <Ic.check s={14} />}</span>
              <input type="checkbox" checked={waOptIn} onChange={(e) => setWaOptIn(e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
              <span>
                <span style={{ display: "block", fontSize: 13, color: "var(--abh-ivory)" }}>{T("موافقة العميل على التواصل عبر واتساب", "Customer consents to WhatsApp contact")}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--abh-steel)", marginTop: 3 }}>{T("لإرسال تأكيد الحجز وتذكير الموعد والعروض. (أكّد موافقته الشفهية)", "For booking confirmation, reminders, and offers. (Confirm verbal consent)")}</span>
              </span>
            </label>
          </div>
        </div>

        {/* العمود الجانبي — ملخّص ثابت */}
        <aside className="abh-nb-aside">
          <div style={{ ...card, padding: mobile ? 18 : 22, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 16 }}>{T("ملخّص الحجز", "Booking summary")}</div>

            <SummaryRow label={T("العميل", "Customer")} value={name.trim() || "—"} isAr={isAr} />
            <SummaryRow label={T("السيارة", "Vehicle")} value={model ? `${brand?.name ?? ""} ${model}`.trim() : "—"} isAr={isAr} />
            {model && <SummaryRow label={T("الحجم", "Size")} value={isAr ? SIZE_LABEL[size].ar : SIZE_LABEL[size].en} isAr={isAr} />}
            {(date || time) && <SummaryRow label={T("الموعد", "When")} value={`${date || "—"} ${time || ""}`.trim()} isAr={isAr} ltr />}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 10 }}>{T("الخدمات", "Services")} ({chosen.size + customItems.length})</div>
              {chosenServices.length === 0 && customItems.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("لم تُختر خدمات بعد", "No services selected")}</div>
              ) : (
                <div className="abh-col" style={{ gap: 7 }}>
                  {chosenServices.map((s) => {
                    const price = s.prices[size] ?? s.prices.large ?? 0;
                    const oldP = s.oldPrices[size] ?? s.oldPrices.large ?? 0;
                    const hasDiscount = !s.onRequest && oldP > 0 && oldP !== price;
                    return (
                      <div key={s.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: "var(--abh-platinum)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                        <span dir="ltr" className="abh-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
                          {s.onRequest ? (
                            <span style={{ color: "var(--abh-ivory)" }}>{T("حسب الطلب", "On req.")}</span>
                          ) : (
                            <>
                              {hasDiscount && <span style={{ fontSize: 10.5, color: "#e7b4b4", textDecoration: "line-through", opacity: .85 }}>{EGP(oldP)}</span>}
                              <span style={{ color: "var(--abh-ivory)" }}>{EGP(price)}</span>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {/* خدمات مؤقتة */}
                  {customItems.map((c) => (
                    <div key={`c-${c.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--abh-platinum)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                        <span style={{ flexShrink: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", padding: "1px 6px", fontSize: 9, color: "var(--abh-steel)" }}>{T("مؤقتة", "Custom")}</span>
                      </span>
                      <span dir="ltr" className="abh-num" style={{ color: "var(--abh-ivory)", flexShrink: 0 }}>{EGP(c.price)}</span>
                    </div>
                  ))}
                  {/* سطور الهدايا */}
                  {gifts.map((g) => {
                    const svc = services.find((x) => x.slug === g.slug);
                    return (
                      <div key={`gift-${g.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: GIFT_GOLD, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{giftIco(11)}{svc?.name ?? g.slug}</span>
                        <span dir="ltr" className="abh-num" style={{ color: GIFT_GOLD, flexShrink: 0 }}>{g.unit === 0 ? T("هدية", "Gift") : EGP(g.unit)}</span>
                      </div>
                    );
                  })}
                  {total.tow > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                      <span style={{ color: "var(--abh-platinum)" }}>{T("النقل", "Towing")}</span>
                      <span dir="ltr" className="abh-num" style={{ color: "var(--abh-ivory)" }}>+{EGP(total.tow)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("الإجمالي التقديري", "Estimated total")}</div>
              <div className="abh-num" dir="ltr" style={{ fontSize: 30, color: "var(--abh-ivory)", lineHeight: 1.1, marginTop: 6 }}>
                {total.onReq && total.grand === 0 ? T("حسب الطلب", "On request") : <>{EGP(total.grand)} <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{ccy}</span></>}
              </div>
              <div style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 6 }}>{T("الخصم/الكود يُحسب نهائيًا في الخادم", "Promo computed on the server")}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <button onClick={submit} disabled={busy} style={{ width: "100%", borderRadius: 999, border: "none", padding: "14px 20px", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", color: "#0c0d0e", background: "linear-gradient(135deg,#fff,#cbcdcd)", opacity: busy ? .6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Ic.check s={16} />{busy ? T("جارٍ الحفظ…", "Saving…") : T("إنشاء الحجز", "Create booking")}
              </button>
              {touched && !canSubmit && !busy && (
                <div style={{ fontSize: 11, color: "#e7b4b4", marginTop: 10, textAlign: "center" }}>{T("أكمل البيانات المطلوبة بالأعلى.", "Complete the required fields above.")}</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* مودال اختيار الهدية */}
      {giftBundle && (
        <GiftPickerAdmin bundle={giftBundle} services={services} size={size} isAr={isAr}
          chosen={gifts} onClose={() => setGiftBundle(null)}
          onConfirm={(g) => { setGifts(g); setGiftBundle(null); }} />
      )}

      <style>{NB_CSS}</style>
    </div>
  );
}

/* ─── Combobox بسيرش (Portal، ما يتقصّش جوّه الكرت) ─── */
function AdminSearchSelect({ value, options, placeholder, searchPlaceholder, onChange, disabled, isAr, inp }: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  isAr: boolean;
  inp: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? options.filter((o) => o.label.toLowerCase().includes(term)) : options;
  }, [q, options]);

  const updateRect = () => { const r = btnRef.current?.getBoundingClientRect(); if (r) setRect(r); };
  useEffect(() => {
    if (!open) return;
    setQ("");
    updateRect();
    const h = () => updateRect();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open]);

  const choose = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => !disabled && setOpen((o) => !o)}
        style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1 }}>
        <span style={{ color: selected ? "var(--abh-ivory)" : "var(--abh-steel)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label ?? placeholder}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ flexShrink: 0, color: "var(--abh-platinum)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && !disabled && rect && createPortal(
        <>
          <div onMouseDown={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <div style={{ position: "fixed", zIndex: 201, top: rect.bottom + 6, left: rect.left, width: rect.width, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "#0c0d0e", boxShadow: "0 30px 80px -30px rgba(0,0,0,.9)", overflow: "hidden" }}>
            {/* خانة البحث */}
            <div style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder ?? placeholder}
                  style={{ ...inp, padding: "9px 12px", paddingInlineStart: 34 }} />
              </div>
            </div>
            {/* القائمة */}
            <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 14, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{isAr ? "لا نتائج" : "No results"}</div>
              ) : filtered.map((o) => {
                const on = o.value === value;
                return (
                  <button key={o.value} onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", background: on ? "rgba(203,205,205,.1)" : "transparent", color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", cursor: "pointer", textAlign: isAr ? "right" : "left", fontSize: 13.5 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                    {on && <Ic.check s={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

/* ─── مودال اختيار الهدية (Portal، يتمركز في الشاشة) ─── */
function GiftPickerAdmin({ bundle, services, size, isAr, chosen, onConfirm, onClose }: {
  bundle: Bundle; services: Service[]; size: SizeCode; isAr: boolean;
  chosen: ChosenGift[]; onConfirm: (g: ChosenGift[]) => void; onClose: () => void;
}) {
  const T = (a: string, e: string) => (isAr ? a : e);
  const ccy = T("ريال", "SAR");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const gifts = bundle.giftIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s && !s.onRequest);
  const priceOf = (s: Service) => s.prices[size] ?? s.prices.large ?? 0;
  const [picked, setPicked] = useState<string[]>(() => chosen.filter((c) => c.bundleId === bundle.id).map((c) => c.slug).filter((sl) => gifts.some((g) => g.slug === sl)));

  const toggle = (slug: string) => setPicked((prev) =>
    prev.includes(slug) ? prev.filter((s) => s !== slug)
      : prev.length >= bundle.maxGifts ? [...prev.slice(1), slug] : [...prev, slug]);

  const confirm = () => {
    const out: ChosenGift[] = picked.map((slug) => {
      const svc = gifts.find((g) => g.slug === slug)!;
      return { slug, bundleId: bundle.id, unit: giftChargeFor(priceOf(svc), bundle.giftPercent) };
    });
    onConfirm(out);
  };

  const title = (isAr ? bundle.title?.ar : bundle.title?.en) || T("اختر هديتك", "Pick your gift");
  const limit = bundle.maxGifts > 1 ? T(`اختر حتى ${bundle.maxGifts} هدايا`, `Up to ${bundle.maxGifts} gifts`) : T("اختر هدية واحدة", "Choose one gift");

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(8,9,11,.8)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", borderRadius: 24, border: "1px solid rgba(255,255,255,.1)", background: "#0c0d0e", boxShadow: "0 50px 120px -40px rgba(0,0,0,.85)" }}>
        {/* الرأس */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(12,13,14,.96)", padding: "16px 20px", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 999, border: "1px solid rgba(217,178,95,.4)", background: "rgba(217,178,95,.1)", color: GIFT_GOLD }}>{giftIco(18)}</span>
            <div>
              <div style={{ fontSize: 16, color: "var(--abh-ivory)" }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--abh-steel)" }}>{limit}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "var(--abh-platinum)", cursor: "pointer" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* القائمة */}
        <div className="abh-col" style={{ gap: 10, padding: 20 }}>
          {gifts.map((g) => {
            const on = picked.includes(g.slug);
            const full = priceOf(g);
            const charge = giftChargeFor(full, bundle.giftPercent);
            return (
              <button key={g.slug} onClick={() => toggle(g.slug)} style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 16, border: `1px solid ${on ? "rgba(217,178,95,.45)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(217,178,95,.07)" : "rgba(255,255,255,.02)", padding: 14, cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
                <span style={{ display: "grid", placeItems: "center", height: 48, width: 48, flexShrink: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: GIFT_GOLD }}>{giftIco(20)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, color: "var(--abh-ivory)" }}>{g.name}</span>
                  <span dir="ltr" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                    <span className="abh-num" style={{ fontSize: 12.5, color: "var(--abh-steel)", textDecoration: "line-through" }}>{EGP(full)}</span>
                    <span className="abh-num" style={{ fontSize: 14, color: GIFT_GOLD }}>{charge === 0 ? T("مجانًا", "Free") : `${EGP(charge)} ${ccy}`}</span>
                  </span>
                </span>
                <span style={{ display: "grid", placeItems: "center", height: 24, width: 24, flexShrink: 0, borderRadius: 999, border: on ? "none" : "1px solid rgba(255,255,255,.2)", background: on ? "linear-gradient(135deg,#f0dca6,#d9b25f)" : "transparent", color: "#0c0d0e" }}>{on && <Ic.check s={14} />}</span>
              </button>
            );
          })}
          {gifts.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--abh-steel)" }}>{T("لا توجد هدايا متاحة حاليًا.", "No gifts available right now.")}</div>}
        </div>

        {/* التذييل */}
        <div style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(255,255,255,.08)", background: "rgba(12,13,14,.96)", padding: "14px 20px", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>{picked.length > 0 ? T(`${picked.length} مختارة`, `${picked.length} selected`) : T("لم تختر بعد", "Nothing selected")}</span>
          <button onClick={confirm} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: "none", padding: "11px 22px", fontSize: 12, fontWeight: 600, letterSpacing: ".06em", color: "#0c0d0e", background: "linear-gradient(135deg,#f0dca6,#d9b25f)", cursor: "pointer" }}>
            {Ic.sparkle({ s: 15 })}{picked.length > 0 ? T("أضف الهدية", "Add gift") : T("تخطّى", "Skip")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SummaryRow({ label, value, isAr, ltr }: { label: string; value: string; isAr: boolean; ltr?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "6px 0" }}>
      <span style={{ fontSize: 11, color: "var(--abh-steel)", flexShrink: 0 }}>{label}</span>
      <span dir={ltr ? "ltr" : undefined} style={{ fontSize: 13, color: "var(--abh-ivory)", textAlign: isAr ? "left" : "right", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#e7b4b4" }}>{children}</span>;
}
const chipStyle = (on: boolean): React.CSSProperties => ({
  borderRadius: 999, padding: "8px 14px", fontSize: 12, cursor: "pointer",
  border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.1)"}`,
  background: on ? "rgba(203,205,205,.1)" : "rgba(255,255,255,.02)",
  color: on ? "var(--abh-ivory)" : "var(--abh-platinum)",
});

const NB_CSS = `
.abh-nb-layout{ display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:24px; align-items:start; }
.abh-nb-aside{ position:sticky; top:96px; min-width:0; }
@media (max-width:1024px){
  .abh-nb-layout{ grid-template-columns:1fr; }
  .abh-nb-aside{ position:static; }
}
@media (max-width:640px){
  .abh-nb-layout{ gap:16px; }
}
.abh-phone-wrap{ width:100%; min-width:0; }
.abh-phone-wrap > *{ width:100% !important; min-width:0 !important; box-sizing:border-box; max-width:100%; }
.abh-phone-wrap input{ min-width:0 !important; }
`;