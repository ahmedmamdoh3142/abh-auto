"use client";
/**
 * app/admin/bookings/new/new-booking-client.tsx — حجز سريع من الداشبورد (CLIENT).
 *
 * تصميم احترافي بعرض الصفحة الكامل:
 *   • عمود رئيسي: العميل → السيارة → الخدمات → الموعد والدفع.
 *   • عمود جانبي ثابت (sticky): ملخّص الحجز الحيّ + زر الإنشاء.
 *
 * موبايل: كل الجريدات الداخلية تنهار لعمود واحد، وبادينج الكروت يصغر —
 *   عشان مفيش حاجة تطلع بره إطارها ولا سكروول أفقي.
 */
import React, { useMemo, useState, useEffect } from "react";
import { card, Pill, Ic, EGP, useToast, PageHeader, Field } from "@/components/admin/ui";
import { PhoneInput, isValidPhone } from "@/components/admin/phone-input";

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
type Service = { id: number; slug: string; name: string; category: string; categorySlug: string; onRequest: boolean; prices: Record<SizeCode, number>; oldPrices: Record<SizeCode, number> };
type Opt = { code: string; label: string };
type ColorOpt = { key: string; hex: string; light: boolean; name: string };
type TowOpt = { code: string; label: string; cost: number };
type UserLite = { id: string; name: string; email: string; phone?: string; city?: string };

const SIZE_LABEL: Record<SizeCode, { ar: string; en: string }> = {
  small: { ar: "صغيرة", en: "Small" },
  medium: { ar: "متوسطة", en: "Medium" },
  large: { ar: "كبيرة", en: "Large" },
};

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

  const [towMode, setTowMode] = useState<string>("");
  const [towAddress, setTowAddress] = useState("");

  const [branch, setBranch] = useState(branches[0]?.code ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState(payments.find((p) => p.code === "cash")?.code ?? payments[0]?.code ?? "");
  const [promo, setPromo] = useState("");
  const [waOptIn, setWaOptIn] = useState(true); // موافقة الواتساب (افتراضيًا مفعّلة في الداشبورد)

  const [busy, setBusy] = useState(false);

  const chosenServices = useMemo(
    () => Array.from(chosen).map((slug) => services.find((x) => x.slug === slug)).filter(Boolean) as Service[],
    [chosen, services]
  );
  const total = useMemo(() => {
    let svc = 0; let onReq = false;
    for (const s of chosenServices) {
      if (s.onRequest) { onReq = true; continue; }
      svc += s.prices[size] ?? s.prices.large ?? 0;
    }
    const tow = towMode ? (towing.find((t) => t.code === towMode)?.cost ?? 0) : 0;
    return { svc, tow, grand: svc + tow, onReq };
  }, [chosenServices, size, towMode, towing]);

  const phoneOk = !phone.trim() || isValidPhone(phone);
  const customerOk = mode === "registered" ? !!userId : (!!name.trim() && !!phone.trim() && phoneOk);
  const canSubmit = customerOk && !!brandId && !!model && chosen.size > 0
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
          promoCode: promo.trim() || null,
          whatsappOptIn: waOptIn,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "fail");
      toast(T(`تم إنشاء الحجز ${j.reference}`, `Booking ${j.reference} created`));
      setChosen(new Set()); setModel(""); setBrandId(""); setColorKey(""); setPlate("");
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
              <div style={{ marginBottom: 18 }}>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
                  <input value={q} onChange={(e) => { setQ(e.target.value); setUserId(""); }} placeholder={T("ابحث بالاسم أو الإيميل…", "Search name or email…")} style={{ ...inp, paddingInlineStart: 36 }} />
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)" }}>
                  {searching ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("جارٍ البحث…", "Searching…")}</div>
                    : users.length === 0 ? <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--abh-steel)" }}>{T("لا نتائج", "No results")}</div>
                    : users.map((u) => {
                      const on = userId === u.id;
                      return (
                        <button key={u.id} onClick={() => pickUser(u)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid rgba(255,255,255,.04)", background: on ? "rgba(203,205,205,.1)" : "transparent", cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, color: "var(--abh-ivory)" }}>{u.name}</span>
                            <span dir="ltr" style={{ display: "block", fontSize: 10.5, color: "var(--abh-steel)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                          </span>
                          {on && <Ic.check s={15} />}
                        </button>
                      );
                    })}
                </div>
              </div>
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
                  <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setModel(""); }} style={{ ...inp, cursor: "pointer" }}>
                    <option value="" style={{ background: "#0c0d0e" }}>{T("اختر الماركة", "Select brand")}</option>
                    {brands.map((b) => <option key={b.id} value={b.id} style={{ background: "#0c0d0e" }}>{b.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ minWidth: 0 }}>
                <Field label={T("الموديل", "Model")}>
                  <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand} style={{ ...inp, cursor: brand ? "pointer" : "not-allowed", opacity: brand ? 1 : .5 }}>
                    <option value="" style={{ background: "#0c0d0e" }}>{T("اختر الموديل", "Select model")}</option>
                    {(brand?.models ?? []).map((m) => <option key={m.name} value={m.name} style={{ background: "#0c0d0e" }}>{m.name}</option>)}
                  </select>
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
                      return (
                        <button key={s.slug} onClick={() => toggleSvc(s.slug)} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, borderRadius: 14, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.07)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: "14px 15px", cursor: "pointer", textAlign: isAr ? "right" : "left", transition: "all .2s", minHeight: 92, minWidth: 0 }}>
                          {/* الصف العلوي: مربّع الاختيار */}
                          <span style={{ display: "flex", justifyContent: isAr ? "flex-start" : "flex-end" }}>
                            <span style={{ display: "grid", placeItems: "center", height: 22, width: 22, flexShrink: 0, borderRadius: 7, border: on ? "none" : "1px solid rgba(255,255,255,.2)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: "#000" }}>{on && <Ic.check s={13} />}</span>
                          </span>
                          {/* اسم الخدمة — أكبر وعلى سطرين كاملين */}
                          <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.35, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.name}</span>
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
            {touched && chosen.size === 0 && <Err>{T("اختر خدمة واحدة على الأقل", "Select at least one service")}</Err>}

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
              <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 10 }}>{T("الخدمات", "Services")} ({chosen.size})</div>
              {chosenServices.length === 0 ? (
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

      <style>{NB_CSS}</style>
    </div>
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