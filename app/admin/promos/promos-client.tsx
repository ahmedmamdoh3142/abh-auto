"use client";
/**
 * app/admin/promos/promos-client.tsx — أكواد الخصم (CLIENT) · v1
 *
 * 5 أنواع كوبونات:
 *   percentage      — نسبة % على إجمالي الطلب
 *   fixed           — مبلغ ثابت على إجمالي الطلب
 *   service_percent — خدمات محددة، نسبة موحّدة
 *   service_each    — خدمات محددة، لكل خدمة قيمتها (% أو مبلغ)
 * ضوابط: حد أدنى للطلب، حد كلّي، حد لكل عميل، تاريخ بداية/نهاية، تفعيل/إيقاف.
 * إحصائيات لكل كود: استخدام/متبقّي، إيرادات/خصومات، رسم زمني، سجل المستخدمين.
 *
 * الاسم (code) يكتبه الأدمن بنفسه. تصميم مونوكروم فاخر (بلاتيني/أبيض).
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Pill, Ghost, IconBtn, Toggle, Field, Input, Selectbox, Chip, Modal, Confirm, useToast, Ic, EGP, PageHeader } from "@/components/admin/ui";
import { CampaignsSection } from "./campaigns";

/* ───────────── الأنواع ───────────── */
type PromoKind = "percentage" | "fixed" | "service_percent" | "service_each";
type SvcRule = { serviceId: number; amountMode: "percent" | "fixed"; value: number };
type Promo = {
  id: string; code: string; kind: PromoKind; label: string | null; description: string | null;
  discountPercent: number; fixedAmount: number; minOrder: number;
  maxUses: number | null; usedCount: number; perUserLimit: number | null;
  isActive: boolean; startsAt: string | null; expiresAt: string | null; createdAt: string;
  redemptions: number; totalDiscount: number; totalRevenue: number; lastUsedAt: string | null;
  services: SvcRule[];
};
type ServiceLite = { id: number; name: string; category: string; onRequest: boolean };

const KIND_META: Record<PromoKind, { ar: string; en: string; icon: keyof typeof Ic; desc: [string, string] }> = {
  percentage:      { ar: "نسبة على الإجمالي", en: "Percentage", icon: "trending", desc: ["خصم % على الطلب كله", "% off whole order"] },
  fixed:           { ar: "مبلغ ثابت", en: "Fixed amount", icon: "plus", desc: ["مبلغ يُخصم من الإجمالي", "Flat amount off order"] },
  service_percent: { ar: "خدمات — نسبة موحّدة", en: "Services — flat %", icon: "sliders", desc: ["% على خدمات محددة", "% on selected services"] },
  service_each:    { ar: "خدمات — لكل خدمة قيمتها", en: "Services — per item", icon: "sparkle", desc: ["قيمة مستقلة لكل خدمة", "Per-service value"] },
};

export default function PromosClient({ services, locale }: { services: ServiceLite[]; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = isAr ? "ريال" : "SAR";
  const loc = isAr ? "ar-EG" : "en-US";
  const toast = useToast();
  const fmtDate = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); };

  const [list, setList] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "expired">("all");
  const [editing, setEditing] = useState<Promo | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Promo | null>(null);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [view, setView] = useState<"codes" | "campaigns">("codes");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const j = await fetch("/api/admin/promos").then((r) => r.json());
      if (j?.ok) setList(j.promos);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isExpired = (p: Promo) => !!p.expiresAt && new Date(p.expiresAt).getTime() < Date.now();

  const totals = useMemo(() => ({
    count: list.length,
    active: list.filter((p) => p.isActive && !isExpired(p)).length,
    redemptions: list.reduce((a, p) => a + p.redemptions, 0),
    discount: list.reduce((a, p) => a + p.totalDiscount, 0),
    revenue: list.reduce((a, p) => a + p.totalRevenue, 0),
  }), [list]);

  const shown = useMemo(() => {
    let l = list.filter((p) => !q
      || p.code.toLowerCase().includes(q.toLowerCase())
      || (p.label ?? "").toLowerCase().includes(q.toLowerCase()));
    if (filter === "active") l = l.filter((p) => p.isActive && !isExpired(p));
    else if (filter === "paused") l = l.filter((p) => !p.isActive);
    else if (filter === "expired") l = l.filter((p) => isExpired(p));
    return l;
  }, [list, q, filter]);

  async function toggleActive(p: Promo, v: boolean) {
    setList((ls) => ls.map((x) => x.id === p.id ? { ...x, isActive: v } : x));
    await fetch("/api/admin/promos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, toggleActive: v }) }).catch(() => {});
  }
  async function remove(p: Promo) {
    try {
      const r = await fetch(`/api/admin/promos?id=${p.id}`, { method: "DELETE" }).then((r) => r.json());
      if (!r.ok) throw new Error();
      setList((ls) => ls.filter((x) => x.id !== p.id));
      toast(T("تم حذف الكود", "Code deleted"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }
  async function save(payload: any, id?: string) {
    const method = id ? "PATCH" : "POST";
    const body = id ? { ...payload, id } : payload;
    try {
      const r = await fetch("/api/admin/promos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
      if (!r.ok) { toast(r.error === "duplicate" ? T("الكود مستخدم بالفعل", "Code already exists") : T("فشل الحفظ", "Save failed"), "bad"); return false; }
      toast(id ? T("تم تحديث الكود", "Code updated") : T("تم إنشاء الكود", "Code created"));
      await load();
      return true;
    } catch { toast(T("فشل الحفظ", "Save failed"), "bad"); return false; }
  }

  const filters: { id: typeof filter; label: string; n: number }[] = [
    { id: "all", label: T("الكل", "All"), n: list.length },
    { id: "active", label: T("نشطة", "Active"), n: list.filter((p) => p.isActive && !isExpired(p)).length },
    { id: "paused", label: T("موقوفة", "Paused"), n: list.filter((p) => !p.isActive).length },
    { id: "expired", label: T("منتهية", "Expired"), n: list.filter((p) => isExpired(p)).length },
  ];

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("أكواد الخصم", "Promo codes")}
        subtitle={T("أنشئ أكوادًا بأنواع مختلفة، اربطها بخدمات، وتابع أداءها بالتفصيل.", "Create codes of different types, attach them to services, and track performance in detail.")}
        seed="promos-hero"
        action={view === "codes" ? <Pill icon={Ic.plus} onClick={() => setAdding(true)}>{T("كود جديد", "New code")}</Pill> : undefined} />

      {/* تبويبات القسم */}
      <div style={{ display: "inline-flex", padding: 4, gap: 2, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", marginBottom: 22 }}>
        {([["codes", T("الأكواد", "Codes")], ["campaigns", T("الحملات الموجّهة", "Campaigns")]] as const).map(([id, lbl]) => {
          const on = view === id;
          return (
            <button key={id} onClick={() => setView(id as any)} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", border: "none", whiteSpace: "nowrap", transition: "all .2s", color: on ? "#0c0d0e" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400 }}>
              {id === "campaigns" ? <Ic.users s={14} /> : <Ic.plus s={14} />}{lbl}
            </button>
          );
        })}
      </div>

      {view === "campaigns" ? (
        <CampaignsSection T={T} ccy={ccy} isAr={isAr} loc={loc} />
      ) : (
      <div className="abh-col" style={{ gap: 24 }}>
        {/* ═══ KPIs ═══ */}
        <div className="abh-promo-kpis">
          <KpiCard label={T("إجمالي الأكواد", "Total codes")} value={String(totals.count)} sub={T(`${totals.active} نشطة`, `${totals.active} active`)} icon={Ic.plus} isAr={isAr} />
          <KpiCard label={T("مرات الاستخدام", "Redemptions")} value={String(totals.redemptions)} icon={Ic.check} isAr={isAr} />
          <KpiCard label={T("إجمالي الخصومات", "Total discounts")} value={EGP(totals.discount)} unit={ccy} icon={Ic.trending} tone="#cbcdcd" isAr={isAr} />
          <KpiCard label={T("إيرادات بالأكواد", "Revenue via codes")} value={EGP(totals.revenue)} unit={ccy} icon={Ic.sparkle} tone="#9fd4b0" hi isAr={isAr} />
        </div>

        {/* ═══ شريط الأدوات ═══ */}
        <div className="abh-promo-toolbar" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div className="abh-promo-filters" style={{ display: "inline-flex", flexWrap: "wrap", padding: 4, gap: 2, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
            {filters.map((f) => {
              const on = filter === f.id;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "7px 13px", fontSize: 12, cursor: "pointer", border: "none", whiteSpace: "nowrap", transition: "all .2s", color: on ? "#0c0d0e" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400 }}>
                  {f.label}<span style={{ fontSize: 10, opacity: .7, borderRadius: 999, padding: "1px 6px", background: on ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.06)" }}>{f.n}</span>
                </button>
              );
            })}
          </div>
          <div className="abh-promo-search" style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)", pointerEvents: "none", display: "inline-flex" }}><Ic.search s={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث بالكود أو الاسم…", "Search code or label…")}
              style={{ width: "100%", borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: "11px 14px", paddingInlineStart: 38, fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
        </div>

        {/* ═══ الشبكة ═══ */}
        {loading ? (
          <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
        ) : shown.length === 0 ? (
          <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
            {list.length === 0 ? T("لا توجد أكواد بعد — اضغط «كود جديد».", "No codes yet — click “New code”.") : T("لا توجد نتائج مطابقة.", "No matching results.")}
          </div>
        ) : (
          <div className="abh-promo-grid">
            {shown.map((p, i) => (
              <PromoCard key={p.id} p={p} i={i} T={T} ccy={ccy} isAr={isAr} fmtDate={fmtDate} expired={isExpired(p)}
                onToggle={(v) => toggleActive(p, v)} onEdit={() => setEditing(p)} onDelete={() => setConfirm(p)} onStats={() => setStatsId(p.id)} />
            ))}
          </div>
        )}
      </div>
      )}

      {(adding || editing) && (
        <PromoModal promo={editing} services={services} T={T} ccy={ccy} isAr={isAr}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSave={async (payload) => { const ok = await save(payload, editing?.id); if (ok) { setAdding(false); setEditing(null); } }} />
      )}
      {confirm && (
        <Confirm title={T("حذف كود", "Delete code")}
          body={T(`متأكد من حذف «${confirm.code}»؟ سيُحذف سجل استخدامه أيضًا.`, `Delete “${confirm.code}”? Its redemption history will be removed too.`)}
          onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />
      )}
      {statsId && <StatsModal promoId={statsId} T={T} ccy={ccy} isAr={isAr} loc={loc} fmtDate={fmtDate} onClose={() => setStatsId(null)} />}

      <style>{PROMO_CSS}</style>
    </div>
  );
}

/* ═══════════ عناصر مساعدة ═══════════ */
function KpiCard({ label, value, unit, sub, icon: Icon, hi, tone, isAr }: any) {
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", padding: 20, background: hi ? "linear-gradient(155deg,rgba(159,212,176,.1),rgba(255,255,255,.015))" : "rgba(255,255,255,.02)" }}>
      <span style={{ position: "absolute", insetInline: 20, top: 0, height: 1, opacity: hi ? 1 : .4, background: `linear-gradient(90deg,transparent,${tone || "rgba(203,205,205,.6)"},transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: tone || "var(--abh-platinum)" }}><Icon s={15} /></span>
      </div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 12, fontSize: 26, lineHeight: 1, color: tone || "var(--abh-ivory)", textAlign: isAr ? "right" : "left", display: "flex", alignItems: "baseline", gap: 6, justifyContent: isAr ? "flex-end" : "flex-start" }}>
        {value}{unit && <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--abh-steel)", textAlign: isAr ? "right" : "left" }}>{sub}</div>}
    </div>
  );
}

const PROMO_CSS = `
.abh-promo-kpis{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.abh-promo-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:18px; }
@media (max-width:1100px){ .abh-promo-kpis{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:860px){
  .abh-promo-toolbar{ flex-direction:column; align-items:stretch; }
  /* في الوضع العمودي flex-basis بيأثّر على الارتفاع — نلغّيه عشان الأيقونة تفضل جوّه الإنبوت */
  .abh-promo-search{ flex:0 0 auto !important; max-width:none !important; width:100%; }
}
@media (max-width:560px){ .abh-promo-kpis{ grid-template-columns:1fr; } .abh-promo-grid{ grid-template-columns:1fr; } }
`;

/* ═══════════ كارت الكود ═══════════ */
function PromoCard({ p, i, T, ccy, isAr, fmtDate, expired, onToggle, onEdit, onDelete, onStats }: {
  p: Promo; i: number; T: (a: string, e: string) => string; ccy: string; isAr: boolean;
  fmtDate: (s: string | null) => string; expired: boolean;
  onToggle: (v: boolean) => void; onEdit: () => void; onDelete: () => void; onStats: () => void;
}) {
  const meta = KIND_META[p.kind];
  const KindIcon = Ic[meta.icon];
  const align = isAr ? "right" : "left";
  const usagePct = p.maxUses ? Math.min(100, Math.round((p.usedCount / p.maxUses) * 100)) : 0;

  // عرض قيمة الخصم حسب النوع
  const valueLabel = p.kind === "fixed"
    ? `${EGP(p.fixedAmount)} ${ccy}`
    : p.kind === "service_each"
      ? T(`${p.services.length} خدمة`, `${p.services.length} svc`)
      : `${p.discountPercent}%`;

  return (
    <div className="abh-lift" style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: `1px solid ${expired ? "rgba(231,180,180,.25)" : p.isActive ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.06)"}`, background: "rgba(255,255,255,.02)", padding: 20, opacity: p.isActive && !expired ? 1 : 0.72, animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
      {/* زخرفة الزاوية */}
      <span aria-hidden style={{ position: "absolute", insetInlineEnd: -30, top: -30, height: 90, width: 90, borderRadius: 999, background: "radial-gradient(circle,rgba(203,205,205,.1),transparent 70%)", pointerEvents: "none" }} />

      {/* الرأس: النوع + الحالة */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "5px 11px", fontSize: 10, letterSpacing: ".08em", color: "var(--abh-platinum)" }}>
          <KindIcon s={13} />{isAr ? meta.ar : meta.en}
        </span>
        {expired ? <Chip tone="bad" dot>{T("منتهٍ", "Expired")}</Chip>
          : p.isActive ? <Chip tone="ok" dot>{T("نشط", "Active")}</Chip>
          : <Chip tone="bad">{T("موقوف", "Paused")}</Chip>}
      </div>

      {/* الكود + القيمة */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="abh-display" dir="ltr" style={{ fontSize: 28, letterSpacing: ".06em", color: "var(--abh-ivory)", textAlign: align, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.code}</div>
          {p.label && <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 2, textAlign: align, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</div>}
        </div>
        <div style={{ flexShrink: 0, textAlign: isAr ? "left" : "right" }}>
          <div className="abh-num" dir="ltr" style={{ fontSize: 24, lineHeight: 1, color: "var(--abh-ivory)" }}>{valueLabel}</div>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", marginTop: 3 }}>{T("الخصم", "Discount")}</div>
        </div>
      </div>

      {/* شريط الاستخدام */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--abh-steel)", marginBottom: 6 }}>
          <span>{T("الاستخدام", "Usage")}</span>
          <span className="abh-num" dir="ltr">{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ` · ${T("بلا حد", "∞")}`}</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: p.maxUses ? `${usagePct}%` : (p.usedCount > 0 ? "100%" : "0%"), borderRadius: 999, background: "linear-gradient(90deg,#8a8d90,#fff)" }} />
        </div>
      </div>

      {/* إحصائيات مصغّرة */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("إجمالي الخصم", "Discounted")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "#cbcdcd", marginTop: 3, textAlign: align }}>{EGP(p.totalDiscount)} <span style={{ fontSize: 9, color: "var(--abh-steel)" }}>{ccy}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("إيرادات", "Revenue")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "#9fd4b0", marginTop: 3, textAlign: align }}>{EGP(p.totalRevenue)} <span style={{ fontSize: 9, color: "var(--abh-steel)" }}>{ccy}</span></div>
        </div>
      </div>

      {/* معلومات إضافية */}
      {(p.minOrder > 0 || p.expiresAt || p.perUserLimit) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {p.minOrder > 0 && <Mini icon={Ic.trending} text={T(`حد أدنى ${EGP(p.minOrder)}`, `Min ${EGP(p.minOrder)}`)} />}
          {p.perUserLimit && <Mini icon={Ic.users} text={T(`${p.perUserLimit}/عميل`, `${p.perUserLimit}/user`)} />}
          {p.expiresAt && <Mini icon={Ic.clock} text={fmtDate(p.expiresAt)} />}
        </div>
      )}

      {/* الأزرار */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <Toggle on={p.isActive} onChange={onToggle} />
          <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{p.isActive ? T("مفعّل", "On") : T("موقوف", "Off")}</span>
        </label>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={onStats} title={T("إحصائيات", "Stats")} style={btnStyle}><Ic.trending s={15} /></button>
          <button onClick={onEdit} title={T("تعديل", "Edit")} style={btnStyle}><Ic.pencil s={15} /></button>
          <button onClick={onDelete} title={T("حذف", "Delete")} style={{ ...btnStyle, color: "#e7b4b4" }}><Ic.trash s={15} /></button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer", transition: "all .2s" };

function Mini({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 8, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "4px 9px", fontSize: 10, color: "var(--abh-steel)" }}>
      <Icon s={11} />{text}
    </span>
  );
}

/* ═══════════ مودال إنشاء/تعديل الكود ═══════════ */
function PromoModal({ promo, services, T, ccy, isAr, onClose, onSave }: {
  promo: Promo | null; services: ServiceLite[]; T: (a: string, e: string) => string; ccy: string; isAr: boolean;
  onClose: () => void; onSave: (payload: any) => void;
}) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [kind, setKind] = useState<PromoKind>(promo?.kind ?? "percentage");
  const [label, setLabel] = useState(promo?.label ?? "");
  const [description, setDescription] = useState(promo?.description ?? "");
  const [discountPercent, setDiscountPercent] = useState(promo?.discountPercent ?? 10);
  const [fixedAmount, setFixedAmount] = useState(promo?.fixedAmount ?? 0);
  const [minOrder, setMinOrder] = useState(promo?.minOrder ?? 0);
  const [maxUses, setMaxUses] = useState<string>(promo?.maxUses != null ? String(promo.maxUses) : "");
  const [perUserLimit, setPerUserLimit] = useState<string>(promo?.perUserLimit != null ? String(promo.perUserLimit) : "");
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(promo?.startsAt ? promo.startsAt.slice(0, 10) : "");
  const [expiresAt, setExpiresAt] = useState(promo?.expiresAt ? promo.expiresAt.slice(0, 10) : "");

  // خدمات مختارة: serviceId → { amountMode, value }
  const initSvc: Record<number, SvcRule> = {};
  (promo?.services ?? []).forEach((s) => { initSvc[s.serviceId] = s; });
  const [svcMap, setSvcMap] = useState<Record<number, SvcRule>>(initSvc);

  const isService = kind === "service_percent" || kind === "service_each";
  const valid = code.trim().length > 0
    && (kind === "percentage" || kind === "service_percent" ? discountPercent > 0
      : kind === "fixed" ? fixedAmount > 0
      : Object.keys(svcMap).length > 0);

  const toggleSvc = (id: number) => {
    setSvcMap((m) => {
      const next = { ...m };
      if (next[id]) delete next[id];
      else next[id] = { serviceId: id, amountMode: kind === "service_each" ? "percent" : "percent", value: kind === "service_percent" ? discountPercent : 10 };
      return next;
    });
  };
  const setSvcCell = (id: number, field: "amountMode" | "value", val: any) => {
    setSvcMap((m) => ({ ...m, [id]: { ...m[id], [field]: val } }));
  };

  const submit = () => {
    if (!valid) return;
    const services_payload = isService ? Object.values(svcMap).map((s) => ({
      serviceId: s.serviceId,
      amountMode: kind === "service_each" ? s.amountMode : "percent",
      value: kind === "service_percent" ? discountPercent : s.value,
    })) : [];
    onSave({
      code: code.trim().toUpperCase(), kind, label: label.trim() || null, description: description.trim() || null,
      discountPercent, fixedAmount, minOrder,
      maxUses: maxUses === "" ? null : Number(maxUses),
      perUserLimit: perUserLimit === "" ? null : Number(perUserLimit),
      isActive, startsAt: startsAt || null, expiresAt: expiresAt || null,
      services: services_payload,
    });
  };

  // تجميع الخدمات حسب التصنيف
  const grouped = useMemo(() => {
    const g = new Map<string, ServiceLite[]>();
    for (const s of services) { if (s.onRequest) continue; const a = g.get(s.category) ?? []; a.push(s); g.set(s.category, a); }
    return Array.from(g.entries());
  }, [services]);

  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  return (
    <Modal title={promo ? T("تعديل كود", "Edit code") : T("كود جديد", "New code")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        {/* النوع — اختيار بصري */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("نوع الكود", "Code type")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
            {(Object.keys(KIND_META) as PromoKind[]).map((k) => {
              const m = KIND_META[k]; const KI = Ic[m.icon]; const on = kind === k;
              return (
                <button key={k} onClick={() => setKind(k)} style={{ textAlign: "start", borderRadius: 14, border: `1px solid ${on ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.08)"}`, background: on ? "rgba(203,205,205,.08)" : "rgba(255,255,255,.02)", padding: 13, cursor: "pointer", transition: "all .2s" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)" }}>
                    <KI s={16} /><span style={{ fontSize: 12.5, fontWeight: on ? 600 : 400 }}>{isAr ? m.ar : m.en}</span>
                  </span>
                  <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 5, lineHeight: 1.5 }}>{isAr ? m.desc[0] : m.desc[1]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* الكود + الاسم */}
        <div className="abh-promo-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
          <Field label={T("الكود (يكتبه الأدمن)", "Code (you name it)")} hint={T("حروف وأرقام، بدون مسافات", "Letters & numbers, no spaces")}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))} dir="ltr"
              placeholder="SUMMER25" style={{ ...inp, fontFamily: "var(--abh-display, serif)", letterSpacing: ".08em", textAlign: "left" }} />
          </Field>
          <Field label={T("اسم وصفي (اختياري)", "Label (optional)")} hint={T("للتمييز داخليًا فقط", "Internal reference only")}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={T("عرض الصيف", "Summer offer")} style={inp} />
          </Field>
        </div>

        {/* قيمة الخصم حسب النوع */}
        {(kind === "percentage" || kind === "service_percent") && (
          <Field label={T("نسبة الخصم %", "Discount %")} hint={kind === "service_percent" ? T("تُطبّق على الخدمات المختارة بالأسفل", "Applies to selected services below") : ""}>
            <input type="number" min={1} max={100} value={discountPercent || ""} onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, +e.target.value)))} dir="ltr" style={inp} />
          </Field>
        )}
        {kind === "fixed" && (
          <Field label={T("مبلغ الخصم", "Discount amount")} hint={T(`بالـ${ccy} — يُخصم من الإجمالي`, `In ${ccy} — off the total`)}>
            <input type="number" min={0} value={fixedAmount || ""} onChange={(e) => setFixedAmount(Math.max(0, +e.target.value))} dir="ltr" style={inp} />
          </Field>
        )}

        {/* اختيار الخدمات */}
        {isService && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("الخدمات المرتبطة", "Linked services")}</span>
              <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{T(`${Object.keys(svcMap).length} مختارة`, `${Object.keys(svcMap).length} selected`)}</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)", padding: 12 }}>
              {grouped.map(([catName, svcs]) => (
                <div key={catName} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 8 }}>{catName}</div>
                  <div className="abh-col" style={{ gap: 7 }}>
                    {svcs.map((s) => {
                      const on = !!svcMap[s.id]; const rule = svcMap[s.id];
                      return (
                        <div key={s.id} style={{ borderRadius: 11, border: `1px solid ${on ? "rgba(203,205,205,.35)" : "rgba(255,255,255,.07)"}`, background: on ? "rgba(203,205,205,.06)" : "rgba(255,255,255,.02)", padding: "10px 12px", transition: "all .2s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => toggleSvc(s.id)} style={{ display: "grid", placeItems: "center", height: 22, width: 22, flexShrink: 0, borderRadius: 7, border: `1px solid ${on ? "transparent" : "rgba(255,255,255,.2)"}`, background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", color: "#0c0d0e", cursor: "pointer" }}>
                              {on && <Ic.check s={13} />}
                            </button>
                            <span style={{ flex: 1, fontSize: 13, color: on ? "var(--abh-ivory)" : "var(--abh-platinum)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                            {/* للنوع service_each: حقول لكل خدمة */}
                            {on && kind === "service_each" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <select value={rule.amountMode} onChange={(e) => setSvcCell(s.id, "amountMode", e.target.value)}
                                  style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "5px 8px", fontSize: 11, color: "var(--abh-ivory)", outline: "none", cursor: "pointer" }}>
                                  <option value="percent" style={{ background: "#0c0d0e" }}>%</option>
                                  <option value="fixed" style={{ background: "#0c0d0e" }}>{ccy}</option>
                                </select>
                                <input type="number" min={0} value={rule.value || ""} onChange={(e) => setSvcCell(s.id, "value", Math.max(0, +e.target.value))}
                                  dir="ltr" style={{ width: 70, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "5px 8px", fontSize: 12, color: "var(--abh-ivory)", outline: "none", textAlign: "center" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {kind === "service_each" && <p style={{ margin: "8px 2px 0", fontSize: 10.5, color: "var(--abh-steel)", lineHeight: 1.6 }}>{T("لكل خدمة: اختر % أو مبلغ ثابت بالريال، وحدّد القيمة.", "Per service: choose % or a flat amount, then set the value.")}</p>}
          </div>
        )}

        {/* الضوابط */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("الضوابط (اختيارية)", "Rules (optional)")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
            <Field label={T("حد أدنى للطلب", "Min order")} hint={T(`بالـ${ccy}`, ccy)}>
              <input type="number" min={0} value={minOrder || ""} onChange={(e) => setMinOrder(Math.max(0, +e.target.value))} dir="ltr" placeholder="0" style={inp} />
            </Field>
            <Field label={T("حد الاستخدام الكلّي", "Total uses")} hint={T("فارغ = بلا حد", "Empty = ∞")}>
              <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} dir="ltr" placeholder="∞" style={inp} />
            </Field>
            <Field label={T("حد لكل عميل", "Per customer")} hint={T("فارغ = بلا حد", "Empty = ∞")}>
              <input type="number" min={1} value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} dir="ltr" placeholder="∞" style={inp} />
            </Field>
          </div>
          <div className="abh-promo-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginTop: 14 }}>
            <Field label={T("تاريخ البداية", "Starts at")} hint={T("فارغ = فوري", "Empty = now")}>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} dir="ltr" style={inp} />
            </Field>
            <Field label={T("تاريخ الانتهاء", "Expires at")} hint={T("فارغ = بلا انتهاء", "Empty = never")}>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} dir="ltr" style={inp} />
            </Field>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <Toggle on={isActive} onChange={setIsActive} />
          <span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>{T("الكود مفعّل", "Code active")}</span>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={submit}>{promo ? T("حفظ التعديلات", "Save changes") : T("إنشاء الكود", "Create code")}</Pill>
        </div>
      </div>

      <style>{`@media (max-width:560px){ .abh-promo-2col{ grid-template-columns:1fr !important; } }`}</style>
    </Modal>
  );
}

/* ═══════════ مودال الإحصائيات ═══════════ */
function StatsModal({ promoId, T, ccy, isAr, loc, fmtDate, onClose }: {
  promoId: string; T: (a: string, e: string) => string; ccy: string; isAr: boolean; loc: string;
  fmtDate: (s: string | null) => string; onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true; setLoading(true);
    (async () => {
      try { const j = await fetch(`/api/admin/promos/${promoId}?locale=${isAr ? "ar" : "en"}`).then((r) => r.json()); if (alive && j?.ok) setData(j); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [promoId, isAr]);

  // حماية: حوّل أي قيمة (نص أو object {ar,en}) إلى نص آمن للعرض.
  const txt = (v: any): string => (!v ? "" : typeof v === "string" ? v : (v[isAr ? "ar" : "en"] ?? v.ar ?? v.en ?? ""));

  const align = isAr ? "right" : "left";
  const fmtDT = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };

  const title = data?.promo ? data.promo.code : T("إحصائيات", "Stats");

  return (
    <Modal title={title} onClose={onClose} wide>
      {loading ? (
        <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ تحميل الإحصائيات…", "Loading stats…")}</div>
      ) : !data ? (
        <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("تعذّر التحميل.", "Could not load.")}</div>
      ) : (
        <div className="abh-col" style={{ gap: 20 }}>
          {/* 1) الاستخدام + المتبقّي */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
            <StatBox label={T("مرات الاستخدام", "Redemptions")} value={String(data.summary.redemptions)} isAr={isAr} />
            <StatBox label={T("المتبقّي", "Remaining")} value={data.summary.remaining != null ? String(data.summary.remaining) : T("بلا حد", "∞")} isAr={isAr} />
            <StatBox label={T("عملاء فريدون", "Unique users")} value={String(data.summary.uniqueUsers)} isAr={isAr} />
            <StatBox label={T("متوسط الطلب", "Avg order")} value={EGP(data.summary.avgOrder)} ccy={ccy} isAr={isAr} />
          </div>

          {/* 2) الإيرادات + الخصومات */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <div style={{ borderRadius: 16, border: "1px solid rgba(159,212,176,.2)", background: "rgba(159,212,176,.05)", padding: 18 }}>
              <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("إجمالي الإيرادات", "Total revenue")}</div>
              <div className="abh-num" dir="ltr" style={{ fontSize: 26, color: "#9fd4b0", marginTop: 6, textAlign: align }}>{EGP(data.summary.totalRevenue)} <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>{ccy}</span></div>
            </div>
            <div style={{ borderRadius: 16, border: "1px solid rgba(203,205,205,.2)", background: "rgba(203,205,205,.05)", padding: 18 }}>
              <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("إجمالي الخصومات", "Total discounts")}</div>
              <div className="abh-num" dir="ltr" style={{ fontSize: 26, color: "#cbcdcd", marginTop: 6, textAlign: align }}>{EGP(data.summary.totalDiscount)} <span style={{ fontSize: 12, color: "var(--abh-steel)" }}>{ccy}</span></div>
            </div>
          </div>

          {/* 3) رسم بياني عبر الوقت */}
          {data.series.length > 0 && <UsageChart series={data.series} T={T} ccy={ccy} />}

          {/* الخدمات المرتبطة (لو وُجدت) */}
          {data.services.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("الخدمات المرتبطة", "Linked services")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.services.map((s: any) => (
                  <span key={s.serviceId} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "7px 12px", fontSize: 12, color: "var(--abh-ivory)" }}>
                    {txt(s.name)}
                    <span className="abh-num" dir="ltr" style={{ color: "#cbcdcd" }}>{s.amountMode === "fixed" ? `${EGP(s.value)} ${ccy}` : `${s.value}%`}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4) سجل المستخدمين */}
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("سجلّ الاستخدام", "Redemption log")}</div>
            {data.redemptions.length === 0 ? (
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 30, textAlign: "center", color: "var(--abh-steel)", fontSize: 13 }}>{T("لم يُستخدم الكود بعد.", "Not used yet.")}</div>
            ) : (
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[T("العميل", "Customer"), T("المرجع", "Ref"), T("الطلب", "Order"), T("الخصم", "Discount"), T("التاريخ", "Date")].map((h, idx) => (
                          <th key={idx} style={{ textAlign: idx >= 2 && idx <= 3 ? (isAr ? "left" : "right") : align, padding: "10px 13px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", fontWeight: 400, background: "rgba(255,255,255,.02)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.redemptions.map((r: any) => (
                        <tr key={r.id}>
                          <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 12.5, color: "var(--abh-ivory)", textAlign: align }}>
                            {r.customerName || T("—", "—")}
                            {r.customerEmail && <div dir="ltr" style={{ fontSize: 10, color: "var(--abh-steel)", textAlign: align }}>{r.customerEmail}</div>}
                          </td>
                          <td dir="ltr" style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 11, color: "var(--abh-steel)", textAlign: align }}>{r.reference || "—"}</td>
                          <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: isAr ? "left" : "right" }}><span className="abh-num" dir="ltr" style={{ fontSize: 12.5, color: "var(--abh-ivory)" }}>{EGP(r.orderTotal)}</span></td>
                          <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: isAr ? "left" : "right" }}><span className="abh-num" dir="ltr" style={{ fontSize: 12.5, color: "#cbcdcd" }}>−{EGP(r.discountAmount)}</span></td>
                          <td style={{ padding: "11px 13px", borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 11, color: "var(--abh-steel)", textAlign: align, whiteSpace: "nowrap" }}>{fmtDT(r.redeemedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatBox({ label, value, ccy, isAr }: { label: string; value: string; ccy?: string; isAr?: boolean }) {
  const align = isAr ? "right" : "left";
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "14px 16px" }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{label}</div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 6, fontSize: 20, color: "var(--abh-ivory)", textAlign: align }}>{value}{ccy && <span style={{ fontSize: 11, color: "var(--abh-steel)" }}> {ccy}</span>}</div>
    </div>
  );
}

function UsageChart({ series, T, ccy }: { series: any[]; T: (a: string, e: string) => string; ccy: string }) {
  const max = Math.max(1, ...series.map((s) => s.uses));
  return (
    <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 16 }}>{T("الاستخدام آخر 30 يوم", "Usage — last 30 days")}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
        {series.map((s, i) => {
          const h = Math.max(3, (s.uses / max) * 100);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
              <div title={`${s.day}: ${s.uses}`} style={{ width: "100%", maxWidth: 22, height: h, borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg,#cbcdcd,#8a8d90)" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "var(--abh-steel)" }}>
        <span>{series[0]?.day?.slice(5)}</span>
        <span>{series[series.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}