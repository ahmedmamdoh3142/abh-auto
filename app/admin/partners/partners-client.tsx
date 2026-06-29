"use client";
/**
 * app/admin/partners/partners-client.tsx — تقارير الشركاء (CLIENT) · v5
 *
 * تحسينات هذه النسخة (ديزاين بريميوم متوازن):
 *   • كونتينر تفاصيل الحجز: عناوين أعمدة واضحة على الصف الرئيسي،
 *     وجدول بنود داخلي بعناوين (الخدمة / الحجم / السعر / العمولة) — لا أرقام مجهولة.
 *   • هيدر معلومات الحجز (اللوحة/الفرع/الوقت/الدفع) بشكل بطاقات صغيرة مرتّبة.
 *   • تبويب «الخدمات الأكثر طلبًا» بأشرطة نسبة بصرية + ترتيب واضح.
 *   • بقية اللوحة كما في v4 (KPIs + تسوية + جدول + كروت موبايل).
 *
 * مفهوم: العمولة من حقّ الشركة. صافيك = المبيعات − عمولة الشركة.
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { card, SubHead, EGP, PageHeader, Chip, Modal, Pill, Ghost, useToast, Field } from "@/components/admin/ui";

/* ───────────── أيقونات SVG محلية ───────────── */
const Svg = (p: { d: string; s?: number }) => (
  <svg width={p.s ?? 16} height={p.s ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p.d.split("|").map((dd, i) => <path key={i} d={dd} />)}</svg>
);
const I = {
  building: (p: any) => <Svg {...p} d="M3 21h18|M5 21V7l8-4v18|M19 21V11l-6-4|M9 9v.01|M9 12v.01|M9 15v.01|M9 18v.01" />,
  trending: (p: any) => <Svg {...p} d="M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6" />,
  gift: (p: any) => <Svg {...p} d="M20 12v10H4V12|M2 7h20v5H2z|M12 22V7|M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z|M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />,
  wallet: (p: any) => <Svg {...p} d="M21 12V7H5a2 2 0 0 1 0-4h14v4|M3 5v14a2 2 0 0 0 2 2h16v-5|M18 12a2 2 0 0 0 0 4h4v-4z" />,
  search: (p: any) => <Svg {...p} d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.35-4.35" />,
  plus: (p: any) => <Svg {...p} d="M12 5v14|M5 12h14" />,
  check: (p: any) => <Svg {...p} d="M20 6L9 17l-5-5" />,
  trash: (p: any) => <Svg {...p} d="M3 6h18|M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  chevron: (p: any) => <Svg {...p} d="M9 18l6-6-6-6" />,
  clock: (p: any) => <Svg {...p} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2" />,
  alert: (p: any) => <Svg {...p} d="M12 9v4|M12 17h.01|M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />,
  arrow: (p: any) => <Svg {...p} d="M5 12h14|M12 5l7 7-7 7" />,
  car: (p: any) => <Svg {...p} d="M5 17H3v-5l2-5h14l2 5v5h-2|M5 17a2 2 0 1 0 4 0|M15 17a2 2 0 1 0 4 0|M7 12h10" />,
  pin: (p: any) => <Svg {...p} d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z|M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  card: (p: any) => <Svg {...p} d="M2 5h20v14H2z|M2 10h20" />,
  hash: (p: any) => <Svg {...p} d="M4 9h16|M4 15h16|M10 3L8 21|M16 3l-2 18" />,
};

/* ───────────── الأنواع ───────────── */
type Partner = {
  partnerId: string; companyName: string; isActive: boolean;
  accountName: string; accountEmail: string; accountPhone: string;
  partnerSince: string | null;
  bookingsCount: number; revenueTotal: number; commissionTotal: number;
  netTotal: number; paidTotal: number; outstanding: number;
  lastBookingAt: string | null; lastPayoutAt: string | null;
};
type Totals = { partners: number; active: number; bookings: number; revenue: number; commission: number; net: number; paid: number; outstanding: number; };
type SortKey = "outstanding" | "revenue" | "commission" | "bookings" | "name";

export default function PartnersClient({ partners: initial, totals: initTotals, locale }: {
  partners: Partner[]; totals: Totals; locale: string;
}) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = isAr ? "ريال" : "SAR";
  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDate = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); };

  const [partners, setPartners] = useState<Partner[]>(initial);
  const [totals, setTotals] = useState<Totals>(initTotals);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("outstanding");
  const [filter, setFilter] = useState<"all" | "due" | "active" | "paused">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const recomputeTotals = useCallback((list: Partner[]) => {
    setTotals(list.reduce((a, r) => ({
      partners: a.partners + 1, active: a.active + (r.isActive ? 1 : 0),
      bookings: a.bookings + r.bookingsCount, revenue: a.revenue + r.revenueTotal,
      commission: a.commission + r.commissionTotal, net: a.net + r.netTotal,
      paid: a.paid + r.paidTotal, outstanding: a.outstanding + r.outstanding,
    }), { partners: 0, active: 0, bookings: 0, revenue: 0, commission: 0, net: 0, paid: 0, outstanding: 0 }));
  }, []);

  const applyPayout = useCallback((partnerId: string, newPaid: number, newOutstanding: number) => {
    setPartners((ls) => {
      const next = ls.map((p) => p.partnerId === partnerId ? { ...p, paidTotal: newPaid, outstanding: newOutstanding, lastPayoutAt: new Date().toISOString() } : p);
      recomputeTotals(next);
      return next;
    });
  }, [recomputeTotals]);

  const shown = useMemo(() => {
    let list = partners.filter((p) => !q || p.companyName.toLowerCase().includes(q.toLowerCase()) || p.accountEmail.toLowerCase().includes(q.toLowerCase()));
    if (filter === "due") list = list.filter((p) => p.outstanding > 0);
    else if (filter === "active") list = list.filter((p) => p.isActive);
    else if (filter === "paused") list = list.filter((p) => !p.isActive);
    const by: Record<SortKey, (a: Partner, b: Partner) => number> = {
      outstanding: (a, b) => b.outstanding - a.outstanding,
      revenue: (a, b) => b.revenueTotal - a.revenueTotal,
      commission: (a, b) => b.commissionTotal - a.commissionTotal,
      bookings: (a, b) => b.bookingsCount - a.bookingsCount,
      name: (a, b) => a.companyName.localeCompare(b.companyName, isAr ? "ar" : "en"),
    };
    return [...list].sort(by[sort]);
  }, [partners, q, filter, sort, isAr]);

  const filters: { id: typeof filter; label: string; count: number }[] = [
    { id: "all", label: T("الكل", "All"), count: partners.length },
    { id: "due", label: T("عليا مستحقّات", "Has dues"), count: partners.filter((p) => p.outstanding > 0).length },
    { id: "active", label: T("نشطة", "Active"), count: partners.filter((p) => p.isActive).length },
    { id: "paused", label: T("موقوفة", "Paused"), count: partners.filter((p) => !p.isActive).length },
  ];
  const sorts: { id: SortKey; label: string }[] = [
    { id: "outstanding", label: T("المتبقّي", "Outstanding") },
    { id: "revenue", label: T("المبيعات", "Sales") },
    { id: "commission", label: T("العمولة", "Commission") },
    { id: "bookings", label: T("الحجوزات", "Bookings") },
    { id: "name", label: T("الاسم", "Name") },
  ];

  const paidPct = totals.commission > 0 ? Math.round((totals.paid / totals.commission) * 100) : 0;

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("الشركاء", "Partners")}
        subtitle={T("تقارير مالية كاملة لكل شركة — مبيعاتها، عمولتها المستحقّة، صافيك، وسداد العمولات.", "Full financial reports per company — their sales, owed commission, your net, and payouts.")}
        seed="partners-hero" />

      <div className="abh-col" style={{ gap: 26 }}>
        {/* ═══════ KPIs ═══════ */}
        <div className="abh-prt-kpis">
          <Kpi label={T("الشركات", "Companies")} value={String(totals.partners)} sub={T(`${totals.active} نشطة`, `${totals.active} active`)} icon={I.building} isAr={isAr} />
          <Kpi label={T("إجمالي المبيعات", "Total sales")} value={EGP(totals.revenue)} unit={ccy} icon={I.trending} isAr={isAr} />
          <Kpi label={T("عمولة الشركاء", "Partners' commission")} value={EGP(totals.commission)} unit={ccy} icon={I.gift} tone="#cbcdcd" isAr={isAr} />
          <Kpi label={T("صافي دخلك", "Your net")} value={EGP(totals.net)} unit={ccy} icon={I.wallet} tone="#9fd4b0" hi isAr={isAr} />
        </div>

        {/* ═══════ بطاقة تسوية العمولات ═══════ */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 18 }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("تسوية عمولات الشركاء", "Commission settlement")}</div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="abh-num" dir="ltr" style={{ fontSize: 32, lineHeight: 1, color: "#9fd4b0" }}>{EGP(totals.paid)}</span>
                <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{T("مسدّد من", "paid of")} <span className="abh-num" dir="ltr">{EGP(totals.commission)} {ccy}</span></span>
              </div>
            </div>
            {totals.outstanding > 0 ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, borderRadius: 999, border: "1px solid rgba(203,205,205,.3)", background: "rgba(203,205,205,.08)", padding: "10px 17px", color: "#cbcdcd" }}>
                <I.alert s={15} /><span style={{ fontSize: 12.5 }}>{T("متبقّي", "Outstanding")} <b className="abh-num" dir="ltr">{EGP(totals.outstanding)} {ccy}</b></span>
              </div>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, borderRadius: 999, border: "1px solid rgba(159,212,176,.3)", background: "rgba(159,212,176,.08)", padding: "10px 17px", color: "#9fd4b0" }}>
                <I.check s={15} /><span style={{ fontSize: 12.5 }}>{T("كل العمولات مسدّدة", "All settled")}</span>
              </div>
            )}
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,.05)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: `${paidPct}%`, background: "linear-gradient(90deg,#46b98a,#9fd4b0)", transition: "width .7s var(--abh-ease)" }} />
          </div>
        </div>

        {/* ═══════ شريط الأدوات ═══════ */}
        <div className="abh-prt-toolbar" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div className="abh-prt-filters" style={{ display: "inline-flex", flexWrap: "wrap", padding: 4, gap: 2, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
            {filters.map((f) => {
              const on = filter === f.id;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "7px 12px", fontSize: 12, cursor: "pointer", border: "none", transition: "all .2s", whiteSpace: "nowrap", color: on ? "var(--abh-obsidian,#0c0d0e)" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400 }}>
                  {f.label}
                  <span style={{ fontSize: 10, opacity: .7, borderRadius: 999, padding: "1px 6px", background: on ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.06)" }}>{f.count}</span>
                </button>
              );
            })}
          </div>
          <div className="abh-prt-search" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
              <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><I.search s={15} /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث عن شركة…", "Search company…")}
                style={{ width: "100%", borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: "11px 14px", paddingInlineStart: 38, fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: "11px 14px", fontSize: 12.5, color: "var(--abh-ivory)", outline: "none", cursor: "pointer", maxWidth: "100%" }}>
              {sorts.map((s) => <option key={s.id} value={s.id} style={{ background: "#0c0d0e" }}>{T("ترتيب: ", "Sort: ")}{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ═══════ الجدول (ديسكتوب) ═══════ */}
        <div className="abh-prt-tablewrap" style={{ ...card, padding: 0, overflow: "hidden" }}>
          <table className="abh-prt-table">
            <thead>
              <tr>
                <th style={{ textAlign: isAr ? "right" : "left" }}>{T("الشركة", "Company")}</th>
                <th style={{ textAlign: "center" }}>{T("الحجوزات", "Bookings")}</th>
                <th style={{ textAlign: isAr ? "left" : "right" }}>{T("المبيعات", "Sales")}</th>
                <th style={{ textAlign: isAr ? "left" : "right" }}>{T("عمولتها", "Commission")}</th>
                <th style={{ textAlign: isAr ? "left" : "right" }}>{T("صافيك", "Your net")}</th>
                <th style={{ textAlign: isAr ? "left" : "right" }}>{T("المتبقّي لها", "Outstanding")}</th>
                <th style={{ width: 56 }}></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.partnerId} onClick={() => setOpenId(p.partnerId)} className="abh-prt-tr">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                      <Avatar name={p.companyName} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{p.companyName}</span>
                          {!p.isActive && <Chip tone="bad">{T("موقوفة", "Paused")}</Chip>}
                          {p.outstanding > 0 && <Chip tone="warn" dot>{T("مستحقّ", "Due")}</Chip>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--abh-steel)", direction: "ltr", textAlign: isAr ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210, marginTop: 2 }}>{p.accountEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}><span style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{p.bookingsCount}</span></td>
                  <td style={{ textAlign: isAr ? "left" : "right" }}><Money v={p.revenueTotal} /></td>
                  <td style={{ textAlign: isAr ? "left" : "right" }}><Money v={p.commissionTotal} tone="#cbcdcd" /></td>
                  <td style={{ textAlign: isAr ? "left" : "right" }}><Money v={p.netTotal} tone="#9fd4b0" /></td>
                  <td style={{ textAlign: isAr ? "left" : "right" }}><Money v={p.outstanding} tone={p.outstanding > 0 ? "#e7b4b4" : "var(--abh-steel)"} /></td>
                  <td style={{ textAlign: "center", color: "var(--abh-steel)" }}><span className="abh-prt-go"><I.arrow s={15} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>
              {T("لا توجد شركات مطابقة. أنشئها من صفحة الحسابات ثم سعّر خدماتها.", "No matching partners. Create them in Accounts, then price their services.")}
            </div>
          )}
        </div>

        {/* ═══════ كروت (موبايل) ═══════ */}
        <div className="abh-prt-cards">
          {shown.map((p) => {
            const maxC = Math.max(1, ...partners.map((x) => x.commissionTotal));
            return (
              <button key={p.partnerId} onClick={() => setOpenId(p.partnerId)} className="abh-lift" style={{ ...card, textAlign: "start", padding: 18, cursor: "pointer", display: "block", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <Avatar name={p.companyName} size={38} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.companyName}</div>
                      <div style={{ fontSize: 10.5, color: "var(--abh-steel)", direction: "ltr" }}>{p.bookingsCount} {T("حجز", "bookings")}</div>
                    </div>
                  </div>
                  {p.outstanding > 0 ? <Chip tone="warn" dot>{T("مستحقّ", "Due")}</Chip> : (p.isActive ? <Chip tone="ok" dot>{T("نشطة", "Active")}</Chip> : <Chip tone="bad">{T("موقوفة", "Paused")}</Chip>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginTop: 16 }}>
                  <MobMetric label={T("المبيعات", "Sales")} value={`${EGP(p.revenueTotal)} ${ccy}`} />
                  <MobMetric label={T("عمولتها", "Commission")} value={`${EGP(p.commissionTotal)} ${ccy}`} tone="#cbcdcd" />
                  <MobMetric label={T("صافيك", "Your net")} value={`${EGP(p.netTotal)} ${ccy}`} tone="#9fd4b0" />
                  <MobMetric label={T("المتبقّي لها", "Outstanding")} value={`${EGP(p.outstanding)} ${ccy}`} tone={p.outstanding > 0 ? "#e7b4b4" : undefined} />
                </div>
                <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden", marginTop: 15 }}>
                  <span style={{ display: "block", height: "100%", width: `${(p.commissionTotal / maxC) * 100}%`, borderRadius: 999, background: "linear-gradient(90deg,#8a8d90,#fff)" }} />
                </div>
              </button>
            );
          })}
          {shown.length === 0 && <div style={{ ...card, padding: 40, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد شركات مطابقة.", "No matching partners.")}</div>}
        </div>
      </div>

      {openId && (
        <PartnerReport partnerId={openId} fallback={partners.find((p) => p.partnerId === openId)!}
          onClose={() => setOpenId(null)} onPayout={applyPayout}
          T={T} ccy={ccy} isAr={isAr} loc={loc} fmtDate={fmtDate} />
      )}

      <style>{REPORT_CSS}</style>
    </div>
  );
}

/* ───────────── عناصر مساعدة ───────────── */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span style={{ display: "grid", placeItems: "center", height: size, width: size, borderRadius: size * 0.3, flexShrink: 0, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.02))" }}>
      <span className="abh-display" style={{ fontSize: size * 0.38, color: "var(--abh-platinum)" }}>{(name || "?")[0]?.toUpperCase()}</span>
    </span>
  );
}

function Money({ v, tone }: { v: number; tone?: string }) {
  return <span className="abh-num" dir="ltr" style={{ fontSize: 14, color: tone || "var(--abh-ivory)" }}>{EGP(v)}</span>;
}

function Kpi({ label, value, unit, sub, icon: Icon, hi, tone, isAr }: any) {
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", padding: 22, background: hi ? "linear-gradient(155deg,rgba(159,212,176,.1),rgba(255,255,255,.015))" : "rgba(255,255,255,.02)" }}>
      <span style={{ position: "absolute", insetInline: 22, top: 0, height: 1, opacity: hi ? 1 : .4, background: `linear-gradient(90deg,transparent,${tone || "rgba(203,205,205,.6)"},transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: tone || "var(--abh-platinum)" }}><Icon s={16} /></span>
      </div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 14, fontSize: 28, lineHeight: 1, color: tone || "var(--abh-ivory)", display: "flex", alignItems: "baseline", gap: 6, justifyContent: isAr ? "flex-end" : "flex-start" }}>
        {value}{unit && <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 7, fontSize: 11, color: "var(--abh-steel)" }}>{sub}</div>}
    </div>
  );
}

function MobMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 3, fontSize: 14, color: tone || "var(--abh-ivory)" }}>{value}</div>
    </div>
  );
}

/* ═══════════════ تقرير الشركة (Drawer) ═══════════════ */
type ReportData = { profile: any; summary: any; monthly: any[]; services: any[]; bookings: any[]; };

function PartnerReport({ partnerId, fallback, onClose, onPayout, T, ccy, isAr, loc, fmtDate }: {
  partnerId: string; fallback: Partner; onClose: () => void;
  onPayout: (id: string, paid: number, outstanding: number) => void;
  T: (ar: string, en: string) => string; ccy: string; isAr: boolean; loc: string; fmtDate: (s: string | null) => string;
}) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "bookings" | "services" | "commission">("overview");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [paySummary, setPaySummary] = useState<{ earned: number; paid: number; outstanding: number } | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const fmtMoney = (n: number) => EGP(n);
  const fmtDT = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); };

  useEffect(() => {
    let alive = true; setLoading(true);
    (async () => {
      try {
        const [rep, pay] = await Promise.all([
          fetch(`/api/admin/partners/${partnerId}`).then((r) => r.json()),
          fetch(`/api/admin/partners/${partnerId}/payouts`).then((r) => r.json()),
        ]);
        if (!alive) return;
        if (rep?.ok) setData({ profile: rep.profile, summary: rep.summary, monthly: rep.monthly, services: rep.services, bookings: rep.bookings });
        if (pay?.ok) { setPayouts(pay.payouts); setPaySummary(pay.summary); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [partnerId]);

  const onPaid = (summary: { earned: number; paid: number; outstanding: number }, list: any[]) => {
    setPaySummary(summary); setPayouts(list);
    onPayout(partnerId, summary.paid, summary.outstanding);
    if (data) setData({ ...data, summary: { ...data.summary, paidTotal: summary.paid, outstanding: summary.outstanding } });
  };

  const title = data?.profile?.companyName ?? fallback.companyName;
  const sum = data?.summary;
  const tabs = [
    ["overview", T("الملخّص", "Overview")],
    ["bookings", T(`الحجوزات (${data?.bookings.length ?? 0})`, `Bookings (${data?.bookings.length ?? 0})`)],
    ["services", T("الخدمات", "Services")],
    ["commission", T("العمولات", "Commission")],
  ] as const;

  return (
    <Modal title={title} onClose={onClose} wide>
      {loading ? (
        <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ تحميل التقرير…", "Loading report…")}</div>
      ) : !data ? (
        <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("تعذّر تحميل التقرير.", "Could not load report.")}</div>
      ) : (
        <div className="abh-col" style={{ gap: 22 }}>
          {/* هيدر ملوّن */}
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.01))", padding: 20 }}>
            <span style={{ position: "absolute", insetInlineStart: 20, top: 0, height: 2, width: 60, background: "linear-gradient(90deg,#cbcdcd,transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <Avatar name={title} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--abh-steel)", direction: "ltr", textAlign: isAr ? "right" : "left" }}>
                    {data.profile.accountEmail}{data.profile.accountPhone ? ` · ${data.profile.accountPhone}` : ""}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {data.profile.isActive ? <Chip tone="ok" dot>{T("نشطة", "Active")}</Chip> : <Chip tone="bad" dot>{T("موقوفة", "Paused")}</Chip>}
                    <Chip tone="platinum">{T("شريك منذ", "Since")} {fmtDT(data.profile.partnerSince)}</Chip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* تبويبات */}
          <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", flexWrap: "wrap" }}>
            {tabs.map(([id, label]) => {
              const on = tab === id;
              return (
                <button key={id} onClick={() => setTab(id as any)} style={{ flex: "1 1 auto", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, cursor: "pointer", border: "none", transition: "all .2s", color: on ? "var(--abh-obsidian,#0c0d0e)" : "var(--abh-steel)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400, whiteSpace: "nowrap" }}>{label}</button>
              );
            })}
          </div>

          {/* تبويب الملخّص */}
          {tab === "overview" && sum && (
            <div className="abh-col" style={{ gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                <MiniStat label={T("المبيعات", "Sales")} value={fmtMoney(sum.revenueTotal)} ccy={ccy} isAr={isAr} />
                <MiniStat label={T("عمولة الشركة", "Their commission")} value={fmtMoney(sum.commissionTotal)} ccy={ccy} tone="#cbcdcd" isAr={isAr} />
                <MiniStat label={T("صافي دخلك", "Your net")} value={fmtMoney(sum.netTotal)} ccy={ccy} tone="#9fd4b0" isAr={isAr} />
                <MiniStat label={T("الحجوزات", "Bookings")} value={String(sum.bookingsCount)} isAr={isAr} />
              </div>
              {data.monthly.length > 0 && <MonthlyChart data={data.monthly} T={T} ccy={ccy} />}
              {/* أبرز الخدمات — كروت بميداليات */}
              {data.services.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <SubHead>{T("أبرز الخدمات", "Top services")}</SubHead>
                    {data.services.length > 6 && (
                      <button onClick={() => setTab("services")} style={{ fontSize: 11, color: "var(--abh-platinum)", background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {T("عرض الكل", "View all")} <I.arrow s={12} />
                      </button>
                    )}
                  </div>
                  <ServiceMedalGrid services={data.services.slice(0, 6)} T={T} ccy={ccy} isAr={isAr} fmtMoney={fmtMoney} />
                </div>
              )}
            </div>
          )}

          {/* تبويب الحجوزات */}
          {tab === "bookings" && (
            <div className="abh-col" style={{ gap: 10 }}>
              {data.bookings.length === 0 ? <Empty T={T} /> : (
                <>
                  <div style={{ fontSize: 11, color: "var(--abh-steel)", marginBottom: 2 }}>{T("اضغط على أي حجز لعرض بنوده بالتفصيل.", "Tap any booking to expand its line items.")}</div>
                  {data.bookings.map((b) => (
                    <BookingRow key={b.id} b={b} T={T} ccy={ccy} isAr={isAr} fmtMoney={fmtMoney} fmtDT={fmtDT} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* تبويب الخدمات الأكثر طلبًا */}
          {tab === "services" && (
            <div className="abh-col" style={{ gap: 14 }}>
              {data.services.length === 0 ? <Empty T={T} /> : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                    <MiniStat label={T("عدد الخدمات", "Services")} value={String(data.services.length)} isAr={isAr} />
                    <MiniStat label={T("إجمالي الطلبات", "Total orders")} value={String(data.services.reduce((a: number, s: any) => a + (s.timesBooked || 0), 0))} isAr={isAr} />
                    <MiniStat label={T("عمولة الخدمات", "Services commission")} value={fmtMoney(data.services.reduce((a: number, s: any) => a + (s.commission || 0), 0))} ccy={ccy} tone="#cbcdcd" isAr={isAr} />
                  </div>
                  <ServiceRanking services={data.services} T={T} ccy={ccy} isAr={isAr} fmtMoney={fmtMoney} />
                </>
              )}
            </div>
          )}

          {/* تبويب العمولات */}
          {tab === "commission" && paySummary && (
            <div className="abh-col" style={{ gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                <MiniStat label={T("إجمالي عمولتها", "Earned")} value={fmtMoney(paySummary.earned)} ccy={ccy} tone="#cbcdcd" isAr={isAr} />
                <MiniStat label={T("المسدّد", "Paid")} value={fmtMoney(paySummary.paid)} ccy={ccy} tone="#9fd4b0" isAr={isAr} />
                <MiniStat label={T("المتبقّي", "Outstanding")} value={fmtMoney(paySummary.outstanding)} ccy={ccy} tone={paySummary.outstanding > 0 ? "#e7b4b4" : undefined} isAr={isAr} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <SubHead>{T("سجلّ الدفعات", "Payout history")}</SubHead>
                {paySummary.outstanding > 0 && <Pill icon={I.plus} onClick={() => setPayOpen(true)}>{T("تسجيل دفعة", "Record payout")}</Pill>}
              </div>
              {payouts.length === 0 ? (
                <div style={{ ...rowBox, justifyContent: "center", color: "var(--abh-steel)", fontSize: 13 }}>{T("لا توجد دفعات بعد.", "No payouts yet.")}</div>
              ) : (
                <div className="abh-col" style={{ gap: 8 }}>
                  {payouts.map((p) => (
                    <div key={p.id} style={rowBox}>
                      <span style={{ display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 9, flexShrink: 0, border: "1px solid rgba(159,212,176,.3)", background: "rgba(159,212,176,.08)", color: "#9fd4b0" }}><I.check s={15} /></span>
                      <span className="abh-num" dir="ltr" style={{ fontSize: 15, color: "#9fd4b0", minWidth: 80 }}>{fmtMoney(p.amount)} {ccy}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--abh-platinum)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.method || T("دفعة", "Payout")}{p.reference ? ` · ${p.reference}` : ""}</span>
                      {p.proofImage && (
                        <a href={p.proofImage} target="_blank" rel="noreferrer" title={T("عرض الإثبات", "View proof")}
                           style={{ display: "block", height: 34, width: 34, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0 }}>
                          <img src={p.proofImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </a>
                      )}
                      <span style={{ fontSize: 11.5, color: "var(--abh-steel)", whiteSpace: "nowrap" }}>{fmtDT(p.paidAt)}</span>
                      <button onClick={async () => {
                        const res = await fetch(`/api/admin/partners/${partnerId}/payouts?payoutId=${p.id}`, { method: "DELETE" }).then((r) => r.json());
                        if (res?.ok) onPaid(res.summary, payouts.filter((x) => x.id !== p.id));
                      }} title={T("حذف", "Delete")} style={{ display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "var(--abh-steel)", cursor: "pointer", flexShrink: 0 }}><I.trash s={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {payOpen && paySummary && (
        <PayoutModal partnerId={partnerId} outstanding={paySummary.outstanding} onClose={() => setPayOpen(false)}
          onDone={(summary) => { onPaid(summary, payouts); setPayOpen(false);
            fetch(`/api/admin/partners/${partnerId}/payouts`).then((r) => r.json()).then((j) => { if (j?.ok) { setPayouts(j.payouts); setPaySummary(j.summary); } }); }}
          T={T} ccy={ccy} isAr={isAr} />
      )}
    </Modal>
  );
}

const rowBox: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "10px 14px" };

function MiniStat({ label, value, ccy, tone, isAr }: { label: string; value: string; ccy?: string; tone?: string; isAr?: boolean }) {
  const align = isAr ? "right" : "left";
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "14px 16px" }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{label}</div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 6, fontSize: 20, color: tone || "var(--abh-ivory)", textAlign: align }}>{value}{ccy && <span style={{ fontSize: 11, color: "var(--abh-steel)" }}> {ccy}</span>}</div>
    </div>
  );
}

function Empty({ T }: { T: (ar: string, en: string) => string }) {
  return <div style={{ ...rowBox, justifyContent: "center", color: "var(--abh-steel)", fontSize: 13 }}>{T("لا توجد بيانات.", "No data.")}</div>;
}

/* جريد كروت الخدمات بميداليات (للملخّص) — متطابق مع لوحة الشريك */
const MEDALS: Record<number, { ring: string; bg: string; label: [string, string] }> = {
  0: { ring: "rgba(255,255,255,0.55)", bg: "linear-gradient(135deg,#ffffff,#cbcdcd)", label: ["الأول", "1st"] },
  1: { ring: "rgba(192,197,201,0.5)", bg: "linear-gradient(135deg,#c7ccd0,#9aa0a5)", label: ["الثاني", "2nd"] },
  2: { ring: "rgba(176,141,107,0.5)", bg: "linear-gradient(135deg,#b08d6b,#8a6a4d)", label: ["الثالث", "3rd"] },
};

function ServiceMedalGrid({ services, T, ccy, isAr, fmtMoney }: { services: any[]; T: (ar: string, en: string) => string; ccy: string; isAr: boolean; fmtMoney: (n: number) => string }) {
  const align = isAr ? "right" : "left";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
      {services.map((s, i) => {
        const medal = MEDALS[i];
        return (
          <div key={i} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 15 }}>
            {medal && <span aria-hidden style={{ position: "absolute", insetInlineEnd: -24, top: -24, height: 64, width: 64, borderRadius: 999, opacity: .07, background: medal.bg, pointerEvents: "none" }} />}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="abh-num" style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 11, fontSize: 14, fontWeight: 700,
                ...(medal ? { background: medal.bg, color: "#0c0d0e", boxShadow: `0 0 0 1px ${medal.ring}, 0 4px 14px -4px ${medal.ring}` } : { background: "rgba(255,255,255,.04)", color: "rgba(203,205,205,.7)", border: "1px solid rgba(255,255,255,.1)" }) }}>{i + 1}</span>
              {medal && <span style={{ borderRadius: 999, border: `1px solid ${medal.ring}`, background: "rgba(255,255,255,.03)", padding: "2px 9px", fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(245,245,240,.85)" }}>{isAr ? medal.label[0] : medal.label[1]}</span>}
            </div>
            <div style={{ position: "relative", marginBottom: 12, minHeight: "2.4em", fontSize: 13.5, lineHeight: 1.3, color: "var(--abh-ivory)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.name}</div>
            <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12 }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("مرّات", "Booked")}</div>
                <div className="abh-num" style={{ marginTop: 4, fontSize: 15, color: "var(--abh-ivory)", textAlign: align }}>{s.timesBooked}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("مبيعات", "Sales")}</div>
                <div className="abh-num" dir="ltr" style={{ marginTop: 4, fontSize: 15, color: "var(--abh-ivory)", textAlign: align }}>{fmtMoney(s.revenue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("عمولة", "Comm.")}</div>
                <div className="abh-num" dir="ltr" style={{ marginTop: 4, fontSize: 15, color: "var(--abh-platinum)", textAlign: align }}>{fmtMoney(s.commission)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ترتيب الخدمات الأكثر طلبًا بأشرطة نسبة بصرية */
function ServiceRanking({ services, T, ccy, isAr, fmtMoney }: { services: any[]; T: (ar: string, en: string) => string; ccy: string; isAr: boolean; fmtMoney: (n: number) => string }) {
  const maxQty = Math.max(1, ...services.map((s) => s.timesBooked || 0));
  return (
    <div className="abh-col" style={{ gap: 9 }}>
      {services.map((s, i) => {
        const pct = ((s.timesBooked || 0) / maxQty) * 100;
        return (
          <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "13px 15px" }}>
            {/* شريط النسبة في الخلفية */}
            <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: `${pct}%`, background: "linear-gradient(90deg,rgba(203,205,205,.08),transparent)", pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "grid", placeItems: "center", height: 26, width: 26, borderRadius: 8, flexShrink: 0, fontSize: 12, border: "1px solid rgba(255,255,255,.1)", background: i === 0 ? "linear-gradient(135deg,#cbcdcd,#a9abab)" : "rgba(255,255,255,.03)", color: i === 0 ? "#0c0d0e" : "var(--abh-steel)", fontWeight: 600 }} className="abh-num">{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 2 }}>{T("طُلبت", "Booked")} <span className="abh-num">{s.timesBooked}</span> {T("مرّة", "×")}</div>
              </div>
              <div style={{ textAlign: isAr ? "left" : "right", flexShrink: 0 }}>
                <div className="abh-num" dir="ltr" style={{ fontSize: 13.5, color: "var(--abh-ivory)" }}>{fmtMoney(s.revenue)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
                <div className="abh-num" dir="ltr" style={{ fontSize: 11.5, color: "#cbcdcd", marginTop: 2 }}>+{fmtMoney(s.commission)} {T("عمولة", "comm.")}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* صف حجز — بعناوين أعمدة واضحة + جدول بنود داخلي */
function BookingRow({ b, T, ccy, isAr, fmtMoney, fmtDT }: any) {
  const [open, setOpen] = useState(false);
  const statusTone: Record<string, string> = { upcoming: "#cbcdcd", active: "#cbcdcd", completed: "#9fd4b0", cancelled: "#e7b4b4" };
  const statusBg: Record<string, string> = { upcoming: "rgba(203,205,205,.1)", active: "rgba(203,205,205,.1)", completed: "rgba(159,212,176,.1)", cancelled: "rgba(231,180,180,.1)" };
  const statusLabel: Record<string, [string, string]> = { upcoming: ["قادم", "Upcoming"], active: ["جارٍ", "Active"], completed: ["مكتمل", "Done"], cancelled: ["ملغي", "Cancelled"] };
  const sl = statusLabel[b.status] || ["", ""];
  const tone = statusTone[b.status] || "var(--abh-steel)";

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${open ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)"}`, background: "rgba(255,255,255,.02)", overflow: "hidden", transition: "border-color .2s" }}>
      {/* الصف الرئيسي */}
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 15px", background: "transparent", border: "none", cursor: "pointer", textAlign: isAr ? "right" : "left" }}>
        {/* أيقونة السيارة */}
        <span style={{ display: "grid", placeItems: "center", height: 38, width: 38, borderRadius: 11, flexShrink: 0, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}><I.car s={18} /></span>
        {/* السيارة + المرجع */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.vehicle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)", display: "inline-flex", alignItems: "center", gap: 3 }}><I.hash s={10} />{b.reference}</span>
            <span className="abh-prt-deskcell" style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>· {fmtDT(b.date || b.createdAt)}</span>
          </div>
        </div>
        {/* شارة الحالة */}
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: tone, background: statusBg[b.status], border: `1px solid ${tone}40`, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>{isAr ? sl[0] : sl[1]}</span>
        {/* الإجمالي + العمولة (بعناوين صغيرة) */}
        <div className="abh-prt-deskcell" style={{ flexShrink: 0, width: 96 }}>
          <div style={{ fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: isAr ? "left" : "right" }}>{T("الإجمالي", "Total")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 13.5, color: "var(--abh-ivory)", marginTop: 2, textAlign: isAr ? "left" : "right" }}>{fmtMoney(b.total)} {ccy}</div>
        </div>
        <div className="abh-prt-deskcell" style={{ flexShrink: 0, width: 82 }}>
          <div style={{ fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: isAr ? "left" : "right" }}>{T("عمولتها", "Comm.")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 13, color: "#cbcdcd", marginTop: 2, textAlign: isAr ? "left" : "right" }}>+{fmtMoney(b.commission)}</div>
        </div>
        <span style={{ color: "var(--abh-steel)", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", display: "inline-flex", flexShrink: 0 }}><I.chevron s={14} /></span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.18)" }}>
          {/* بطاقات معلومات الحجز */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, padding: "14px 16px" }}>
            {b.plate && <InfoCell icon={I.hash} label={T("اللوحة", "Plate")} value={b.plate} ltr isAr={isAr} />}
            {b.branch && <InfoCell icon={I.pin} label={T("الفرع", "Branch")} value={b.branch} isAr={isAr} />}
            {b.time && <InfoCell icon={I.clock} label={T("الوقت", "Time")} value={b.time} ltr isAr={isAr} />}
            <InfoCell icon={I.card} label={T("الدفع", "Payment")} value={b.paymentStatus} isAr={isAr} />
          </div>

          {/* جدول البنود بعناوين واضحة */}
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: 380, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: isAr ? "right" : "left", padding: "9px 13px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", fontWeight: 400, background: "rgba(255,255,255,.02)", whiteSpace: "nowrap" }}>{T("الخدمة", "Service")}</th>
                    <th style={{ textAlign: "center", padding: "9px 13px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", fontWeight: 400, background: "rgba(255,255,255,.02)", whiteSpace: "nowrap", width: 80 }}>{T("الحجم", "Size")}</th>
                    <th style={{ textAlign: isAr ? "left" : "right", padding: "9px 13px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", fontWeight: 400, background: "rgba(255,255,255,.02)", whiteSpace: "nowrap", width: 105 }}>{T("السعر", "Price")}</th>
                    <th style={{ textAlign: isAr ? "left" : "right", padding: "9px 13px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", fontWeight: 400, background: "rgba(255,255,255,.02)", whiteSpace: "nowrap", width: 95 }}>{T("عمولتها", "Comm.")}</th>
                  </tr>
                </thead>
                <tbody>
                  {b.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 13, color: "var(--abh-ivory)" }}>{it.name}</td>
                      <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: "center", fontSize: 11.5, color: "var(--abh-steel)" }}>{it.size || "—"}</td>
                      <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: isAr ? "left" : "right" }}><span className="abh-num" dir="ltr" style={{ fontSize: 13, color: "var(--abh-platinum)" }}>{fmtMoney(it.unit)} {ccy}</span></td>
                      <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: isAr ? "left" : "right" }}><span className="abh-num" dir="ltr" style={{ fontSize: 13, color: "#cbcdcd" }}>+{fmtMoney(it.commission)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* إجماليات الحجز */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "0 16px 16px" }}>
            <TotalPill label={T("إجمالي الحجز", "Booking total")} value={`${fmtMoney(b.total)} ${ccy}`} tone="var(--abh-ivory)" isAr={isAr} />
            <TotalPill label={T("عمولة الشركة", "Their commission")} value={`${fmtMoney(b.commission)} ${ccy}`} tone="#cbcdcd" isAr={isAr} />
            <TotalPill label={T("صافي دخلك", "Your net")} value={`${fmtMoney(b.net)} ${ccy}`} tone="#9fd4b0" isAr={isAr} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, ltr, isAr }: { icon: any; label: string; value: string; ltr?: boolean; isAr?: boolean }) {
  const align = isAr ? "right" : "left";
  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)", padding: "9px 11px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", justifyContent: "flex-start" }}><Icon s={11} />{label}</div>
      <div dir={ltr ? "ltr" : undefined} style={{ marginTop: 5, fontSize: 12.5, color: "var(--abh-ivory)", textAlign: align, unicodeBidi: ltr ? "plaintext" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

function TotalPill({ label, value, tone, isAr }: { label: string; value: string; tone: string; isAr?: boolean }) {
  const align = isAr ? "right" : "left";
  return (
    <div style={{ flex: "1 1 130px", borderRadius: 12, border: `1px solid ${tone === "var(--abh-ivory)" ? "rgba(255,255,255,.1)" : tone + "33"}`, background: tone === "var(--abh-ivory)" ? "rgba(255,255,255,.03)" : tone + "12", padding: "11px 14px" }}>
      <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{label}</div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 4, fontSize: 15, color: tone, textAlign: align }}>{value}</div>
    </div>
  );
}

function MonthlyChart({ data, T, ccy }: { data: any[]; T: (ar: string, en: string) => string; ccy: string }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("المبيعات الشهرية", "Monthly sales")}</span>
        <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "var(--abh-steel)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "linear-gradient(180deg,#cbcdcd,#8a8d90)" }} />{T("مبيعات", "Sales")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#cbcdcd" }} />{T("عمولة", "Commission")}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.revenue / max) * 120);
          const ch = Math.max(2, (d.commission / max) * 120);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 34, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center" }} title={`${d.month}: ${EGP(d.revenue)} ${ccy}`}>
                <div style={{ width: "70%", height: h, borderRadius: "5px 5px 0 0", background: "linear-gradient(180deg,#cbcdcd,#8a8d90)" }} />
                <div style={{ position: "absolute", bottom: 0, insetInlineEnd: "12%", width: "26%", height: ch, borderRadius: "4px 4px 0 0", background: "#cbcdcd" }} />
              </div>
              <span style={{ fontSize: 9.5, color: "var(--abh-steel)" }}>{d.month.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PayoutModal({ partnerId, outstanding, onClose, onDone, T, ccy, isAr }: {
  partnerId: string; outstanding: number; onClose: () => void;
  onDone: (summary: { earned: number; paid: number; outstanding: number }) => void;
  T: (ar: string, en: string) => string; ccy: string; isAr: boolean;
}) {
  const [amount, setAmount] = useState<number>(outstanding);
  const [proofImage, setProofImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const valid = amount > 0 && amount <= outstanding + 0.01;

  async function submit() {
    if (!valid) { setErr(T("المبلغ غير صحيح.", "Invalid amount.")); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/payouts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: method || null, reference: reference || null, note: note || null, proofImage: proofImage || null }),
      }).then((r) => r.json());
      if (!res?.ok) { setErr(res?.error === "exceeds_outstanding" ? T("المبلغ أكبر من المتبقّي.", "Exceeds outstanding.") : T("فشل التسجيل.", "Failed.")); return; }
      toast(T("تم تسجيل الدفعة", "Payout recorded"));
      onDone(res.summary);
    } catch { setErr(T("فشل التسجيل.", "Failed.")); } finally { setSaving(false); }
  }

  async function uploadProof(file: File) {
  setUploading(true);
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "payouts-img");
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd }).then((x) => x.json());
    if (r.ok && r.path) setProofImage(r.path);
    else toast(T("فشل رفع الصورة", "Upload failed"), "bad");
  } catch { toast(T("فشل رفع الصورة", "Upload failed"), "bad"); }
  finally { setUploading(false); }
}

  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  return (
    <Modal title={T("تسجيل دفعة عمولة", "Record commission payout")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.25)", background: "rgba(203,205,205,.06)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>{T("المتبقّي للشركة", "Outstanding to partner")}</span>
          <span className="abh-num" dir="ltr" style={{ fontSize: 18, color: "#cbcdcd" }}>{EGP(outstanding)} {ccy}</span>
        </div>
        <Field label={T("المبلغ المدفوع", "Amount paid")} hint={T(`بالـ${ccy}. الأقصى = المتبقّي.`, `In ${ccy}. Max = outstanding.`)}>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" min={0} max={outstanding} value={amount || ""} onChange={(e) => setAmount(Math.max(0, +e.target.value))} dir="ltr" style={inp} />
            <button onClick={() => setAmount(outstanding)} style={{ flexShrink: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "0 16px", fontSize: 12, color: "var(--abh-platinum)", cursor: "pointer", whiteSpace: "nowrap" }}>{T("الكل", "Full")}</button>
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={T("طريقة الدفع", "Method")}>
            <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder={T("تحويل / نقدًا", "Transfer / Cash")} style={inp} />
          </Field>
          <Field label={T("رقم مرجعي (اختياري)", "Reference (optional)")}>
            <input value={reference} onChange={(e) => setReference(e.target.value)} dir="ltr" style={{ ...inp, textAlign: "left" }} />
          </Field>
        </div>
        <Field label={T("ملاحظة (اختياري)", "Note (optional)")}>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </Field>
        <Field label={T("إثبات التحويل (صورة)", "Transfer proof (image)")} hint={T("اختياري", "Optional")}>
          {proofImage ? (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)" }}>
              <img src={proofImage} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
              <button onClick={() => setProofImage("")} style={{ position: "absolute", top: 8, insetInlineEnd: 8, display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 999, border: "1px solid rgba(231,180,180,.5)", background: "rgba(0,0,0,.6)", color: "#e7b4b4", cursor: "pointer" }}><I.trash s={14} /></button>
            </div>
          ) : (
            <label style={{ display: "grid", placeItems: "center", padding: 20, borderRadius: 12, border: "1.5px dashed rgba(255,255,255,.16)", background: "rgba(255,255,255,.02)", cursor: "pointer", color: "var(--abh-steel)", fontSize: 12.5 }}>
              {uploading ? T("جارٍ الرفع…", "Uploading…") : T("اضغط لرفع صورة الإيصال", "Click to upload receipt")}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }} />
            </label>
          )}
        </Field>
        {err && <div style={{ fontSize: 12, color: "#e7b4b4" }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={I.check} onClick={() => valid && !saving && submit()}>{saving ? T("جارٍ الحفظ…", "Saving…") : T("تأكيد السداد", "Confirm payout")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

const REPORT_CSS = `
.abh-prt-kpis{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
.abh-prt-table{ width:100%; border-collapse:collapse; }
.abh-prt-table thead th{ padding:14px 18px; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--abh-steel); font-weight:400; background:rgba(255,255,255,.015); border-bottom:1px solid rgba(255,255,255,.06); white-space:nowrap; }
.abh-prt-table tbody td{ padding:15px 18px; border-top:1px solid rgba(255,255,255,.05); vertical-align:middle; }
.abh-prt-tr{ cursor:pointer; transition:background .18s; }
.abh-prt-tr:hover{ background:rgba(255,255,255,.03); }
.abh-prt-go{ display:inline-flex; opacity:.4; transition:opacity .2s, transform .2s; }
.abh-prt-tr:hover .abh-prt-go{ opacity:1; transform:translateX(2px); }
.abh-prt-cards{ display:none; flex-direction:column; gap:14px; }
@media (max-width:1100px){ .abh-prt-kpis{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:860px){
  .abh-prt-tablewrap{ display:none; }
  .abh-prt-cards{ display:flex; }
  .abh-prt-deskcell{ display:none !important; }
  .abh-prt-toolbar{ flex-direction:column; align-items:stretch !important; }
  .abh-prt-filters{ width:100%; justify-content:flex-start; }
  .abh-prt-search{ width:100%; }
}
@media (max-width:520px){
  .abh-prt-kpis{ grid-template-columns:1fr; }
  .abh-prt-filters button{ flex:1 1 auto; justify-content:center; }
}
`;