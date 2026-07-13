"use client";
/**
 * app/admin/inventory/inventory-client.tsx — المخازن (CLIENT) · تبويب الخامات.
 * كروت خامات: اسم/وحدة/سعر/رصيد المخزنين + تنبيه نقص. إضافة/تعديل/توريد.
 * (تبويبا الطلبات والحركات يُضافان في الدفعات التالية.)
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Pill, Ghost, Field, Input, Modal, Confirm, Chip, useToast, Ic, EGP, PageHeader } from "@/components/admin/ui";

type Item = {
  id: number; sku: string; name: any; unit: string;
  purchasePrice: number; lowThreshold: number;
  mainQty: number; interQty: number; totalQty: number;
};

export default function InventoryClient({ locale }: { locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = isAr ? "ريال" : "SAR";
  const toast = useToast();
  const nm = (n: any) => (!n ? "" : typeof n === "string" ? n : (isAr ? (n.ar ?? n.en) : (n.en ?? n.ar)) ?? "");

  const [tab, setTab] = useState<"items" | "requests" | "movements">("items");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [restock, setRestock] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [reqOpen, setReqOpen] = useState(false); // مودال طلب جديد

  const load = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/inventory").then((r) => r.json()); if (j?.ok) setItems(j.items); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => items.filter((it) => !q || nm(it.name).toLowerCase().includes(q.toLowerCase()) || it.sku.toLowerCase().includes(q.toLowerCase())), [items, q, isAr]);

  const totals = useMemo(() => ({
    count: items.length,
    lowStock: items.filter((it) => it.totalQty <= it.lowThreshold && it.lowThreshold > 0).length,
    value: items.reduce((a, it) => a + it.totalQty * it.purchasePrice, 0),
    interItems: items.filter((it) => it.interQty > 0).length,
  }), [items]);

  async function remove(it: Item) {
    try {
      const r = await fetch(`/api/admin/inventory?id=${it.id}`, { method: "DELETE" }).then((r) => r.json());
      if (!r.ok) throw new Error();
      setItems((ls) => ls.filter((x) => x.id !== it.id));
      toast(T("تم حذف الخامة", "Item removed"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }

  const tabs: [typeof tab, string, keyof typeof Ic][] = [
    ["items", T("الخامات", "Items"), "grid"],
    ["requests", T("الطلبات", "Requests"), "trending"],
    ["movements", T("الحركات", "Movements"), "clock"],
  ];

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("المخازن", "Inventory")}
        subtitle={T("أدر الخامات وأسعارها وأرصدتها بين المخزن الرئيسي والوسيط، وتابع الطلبات والحركات.", "Manage materials, prices and stock across the main and intermediate warehouses.")}
        seed="inventory-hero"
        action={tab === "items" ? <Pill icon={Ic.plus} onClick={() => setAdding(true)}>{T("خامة جديدة", "New item")}</Pill>
          : tab === "requests" ? <Pill icon={Ic.plus} onClick={() => setReqOpen(true)}>{T("طلب خامات", "Request materials")}</Pill> : undefined} />

      {/* تبويبات */}
      <div style={{ display: "inline-flex", padding: 4, gap: 2, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", marginBottom: 22 }}>
        {tabs.map(([id, lbl, ic]) => {
          const on = tab === id; const IcC = Ic[ic];
          return (
            <button key={id} onClick={() => setTab(id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", border: "none", whiteSpace: "nowrap", transition: "all .2s", color: on ? "#0c0d0e" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400 }}>
              <IcC s={14} />{lbl}
            </button>
          );
        })}
      </div>

      {tab === "items" ? (
        <div className="abh-col" style={{ gap: 24 }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
            <Kpi label={T("عدد الخامات", "Items")} value={String(totals.count)} icon={Ic.grid} isAr={isAr} />
            <Kpi label={T("تحت حد التنبيه", "Low stock")} value={String(totals.lowStock)} icon={Ic.trending} tone={totals.lowStock ? "#e8cf9a" : undefined} isAr={isAr} />
            <Kpi label={T("في المخزن الوسيط", "In intermediate")} value={String(totals.interItems)} icon={Ic.sparkle} isAr={isAr} />
            <Kpi label={T("قيمة المخزون", "Stock value")} value={EGP(totals.value)} unit={ccy} icon={Ic.trending} tone="#9fd4b0" hi isAr={isAr} />
          </div>

          {/* بحث */}
          <div style={{ position: "relative", maxWidth: 340 }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث عن خامة…", "Search item…")}
              style={{ width: "100%", borderRadius: 13, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", padding: "11px 14px", paddingInlineStart: 40, fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          </div>

          {/* شبكة الخامات */}
          {loading ? (
            <div style={{ padding: 70, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
          ) : shown.length === 0 ? (
            <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
              {items.length === 0 ? T("لا خامات بعد — اضغط «خامة جديدة».", "No items yet — click “New item”.") : T("لا نتائج مطابقة.", "No matches.")}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18 }}>
              {shown.map((it, i) => (
                <ItemCard key={it.id} it={it} i={i} nm={nm} T={T} ccy={ccy} isAr={isAr}
                  onEdit={() => setEditing(it)} onRestock={() => setRestock(it)} onDelete={() => setConfirm(it)} />
              ))}
            </div>
          )}
        </div>
      ) : tab === "requests" ? (
        <RequestsTab items={items} T={T} isAr={isAr} nm={nm} reqOpen={reqOpen} setReqOpen={setReqOpen} onRefresh={load} />
      ) : (
        <MovementsTab T={T} isAr={isAr} nm={nm} ccy={ccy} />
      )}

      {(adding || editing) && <ItemModal item={editing} T={T} ccy={ccy} isAr={isAr} nm={nm}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); load(); }} />}
      {restock && <RestockModal item={restock} T={T} ccy={ccy} isAr={isAr} nm={nm}
        onClose={() => setRestock(null)} onDone={() => { setRestock(null); load(); }} />}
      {confirm && <Confirm title={T("حذف خامة", "Delete item")}
        body={T(`حذف «${nm(confirm.name)}»؟ سيُخفى من القائمة مع الاحتفاظ بسجل حركاته.`, `Remove “${nm(confirm.name)}”? It'll be hidden but movement history is kept.`)}
        onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />}
    </div>
  );
}

function Kpi({ label, value, unit, icon: Icon, hi, tone, isAr }: any) {
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(255,255,255,.08)", padding: 20, background: hi ? "linear-gradient(155deg,rgba(159,212,176,.1),rgba(255,255,255,.015))" : "rgba(255,255,255,.02)" }}>
      <span style={{ position: "absolute", insetInline: 20, top: 0, height: 1, opacity: hi ? 1 : .4, background: `linear-gradient(90deg,transparent,${tone || "rgba(203,205,205,.6)"},transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: tone || "var(--abh-platinum)" }}><Icon s={15} /></span>
      </div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 12, fontSize: 26, lineHeight: 1, color: tone || "var(--abh-ivory)", display: "flex", alignItems: "baseline", gap: 6, justifyContent: isAr ? "flex-end" : "flex-start" }}>
        {value}{unit && <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function ItemCard({ it, i, nm, T, ccy, isAr, onEdit, onRestock, onDelete }: any) {
  const align = isAr ? "right" : "left";
  const low = it.lowThreshold > 0 && it.totalQty <= it.lowThreshold;
  return (
    <div className="abh-lift" style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: `1px solid ${low ? "rgba(232,207,154,.35)" : "rgba(255,255,255,.1)"}`, background: "rgba(255,255,255,.02)", padding: 20, animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
      <span aria-hidden style={{ position: "absolute", insetInlineEnd: -28, top: -28, height: 84, width: 84, borderRadius: 999, background: "radial-gradient(circle,rgba(203,205,205,.1),transparent 70%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, color: "var(--abh-ivory)", textAlign: align, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(it.name)}</div>
          <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 3, textAlign: align }}>{it.sku ? `${it.sku} · ` : ""}{T("الوحدة", "Unit")}: {it.unit}</div>
        </div>
        {low && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, border: "1px solid rgba(232,207,154,.4)", background: "rgba(232,207,154,.08)", padding: "4px 9px", fontSize: 9.5, color: "#e8cf9a", flexShrink: 0 }}>{Ic.trending({ s: 11 })}{T("نقص", "Low")}</span>}
      </div>

      {/* الرصيد في المخزنين */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "11px 13px" }}>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("الرئيسي", "Main")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 20, color: "var(--abh-ivory)", marginTop: 3, textAlign: align }}>{it.mainQty}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "11px 13px" }}>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("الوسيط", "Interm.")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 20, color: "var(--abh-platinum)", marginTop: 3, textAlign: align }}>{it.interQty}</div>
        </div>
      </div>

      {/* السعر */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", textAlign: align }}>{T("متوسط سعر الشراء", "Avg cost")}</div>
          <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "#cbcdcd", marginTop: 3, textAlign: align }}>{EGP(it.purchasePrice)} <span style={{ fontSize: 9, color: "var(--abh-steel)" }}>{ccy}</span></div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={onRestock} title={T("توريد", "Restock")} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(159,212,176,.35)", background: "rgba(159,212,176,.08)", color: "#9fd4b0", cursor: "pointer", fontSize: 11.5 }}>{Ic.plus({ s: 13 })}{T("توريد", "Restock")}</button>
          <button onClick={onEdit} title={T("تعديل", "Edit")} style={iconBtn}><Ic.pencil s={15} /></button>
          <button onClick={onDelete} title={T("حذف", "Delete")} style={{ ...iconBtn, color: "#e7b4b4" }}><Ic.trash s={15} /></button>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer" };

/* مودال إضافة/تعديل خامة */
function ItemModal({ item, T, ccy, isAr, nm, onClose, onSaved }: any) {
  const isNew = !item;
  const toast = useToast();
  const [nameAr, setNameAr] = useState(item ? (item.name?.ar ?? nm(item.name)) : "");
  const [nameEn, setNameEn] = useState(item?.name?.en ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice ?? 0);
  const [lowThreshold, setLowThreshold] = useState(item?.lowThreshold ?? 0);
  const [initialQty, setInitialQty] = useState(0);
  const [busy, setBusy] = useState(false);

  const valid = nameAr.trim() && unit.trim() && (isNew ? purchasePrice >= 0 : true);
  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const body: any = { nameAr, nameEn, unit, sku, lowThreshold };
      if (isNew) { body.purchasePrice = purchasePrice; body.initialQty = initialQty; }
      const r = await fetch("/api/admin/inventory", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? body : { ...body, id: item.id }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error();
      toast(isNew ? T("تمت إضافة الخامة", "Item added") : T("تم تحديث الخامة", "Item updated"));
      onSaved();
    } catch { toast(T("فشل الحفظ", "Save failed"), "bad"); setBusy(false); }
  }

  return (
    <Modal title={isNew ? T("خامة جديدة", "New item") : T("تعديل خامة", "Edit item")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={T("الاسم (عربي)", "Name (AR)")}><input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={T("مثال: مادة تلميع", "e.g. Polish")} style={inp} /></Field>
          <Field label={T("الاسم (إنجليزي)", "Name (EN)")} hint={T("اختياري", "Optional")}><input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Polish compound" style={{ ...inp, textAlign: "left" }} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={T("وحدة القياس", "Unit")} hint={T("قطعة / لتر / كجم…", "pc / L / kg…")}><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={T("لتر", "Liter")} style={inp} /></Field>
          <Field label={T("كود الصنف (اختياري)", "SKU (optional)")}><input dir="ltr" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001" style={{ ...inp, textAlign: "left" }} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {isNew && <Field label={T("سعر الشراء", "Purchase price")} hint={ccy}><input type="number" min={0} value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Math.max(0, +e.target.value))} dir="ltr" style={inp} /></Field>}
          <Field label={T("حد التنبيه للنقص", "Low-stock threshold")} hint={T("تنبيه لو الرصيد وصله", "Alert at or below")}><input type="number" min={0} value={lowThreshold || ""} onChange={(e) => setLowThreshold(Math.max(0, +e.target.value))} dir="ltr" placeholder="0" style={inp} /></Field>
        </div>
        {isNew && (
          <Field label={T("كمية أولية (للمخزن الرئيسي)", "Initial quantity (main)")} hint={T("اختياري — تدخل المخزن الرئيسي بسعر الشراء أعلاه", "Optional — enters main at the price above")}>
            <input type="number" min={0} value={initialQty || ""} onChange={(e) => setInitialQty(Math.max(0, +e.target.value))} dir="ltr" placeholder="0" style={inp} />
          </Field>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ الحفظ…", "Saving…") : (isNew ? T("إضافة", "Add") : T("حفظ", "Save"))}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* مودال التوريد (بسعر جديد) */
function RestockModal({ item, T, ccy, isAr, nm, onClose, onDone }: any) {
  const toast = useToast();
  const [qty, setQty] = useState(0);
  const [unitPrice, setUnitPrice] = useState(item.purchasePrice || 0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  async function submit() {
    if (qty <= 0 || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/inventory", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "restock", qty, unitPrice, note }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error();
      toast(T("تم التوريد", "Restocked"));
      onDone();
    } catch { toast(T("فشل التوريد", "Restock failed"), "bad"); setBusy(false); }
  }

  return (
    <Modal title={T("توريد للمخزن الرئيسي", "Restock main warehouse")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "12px 14px" }}>
          <div style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{nm(item.name)}</div>
          <div style={{ fontSize: 11, color: "var(--abh-steel)", marginTop: 3 }}>{T("الرصيد الحالي بالرئيسي", "Current main")}: <span className="abh-num" dir="ltr">{item.mainQty}</span> · {T("متوسط السعر", "Avg cost")}: <span className="abh-num" dir="ltr">{EGP(item.purchasePrice)} {ccy}</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={T("الكمية الموردة", "Quantity")}><input type="number" min={0} value={qty || ""} onChange={(e) => setQty(Math.max(0, +e.target.value))} dir="ltr" style={inp} /></Field>
          <Field label={T("سعر الشراء لهذه الشحنة", "This shipment price")} hint={T(`بالـ${ccy} — قد يختلف عن السابق`, `In ${ccy} — may differ`)}><input type="number" min={0} value={unitPrice || ""} onChange={(e) => setUnitPrice(Math.max(0, +e.target.value))} dir="ltr" style={inp} /></Field>
        </div>
        <Field label={T("ملاحظة (اختياري)", "Note (optional)")}><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("رقم فاتورة المورّد…", "Supplier invoice no…")} style={inp} /></Field>
        <div style={{ borderRadius: 12, border: "1px solid rgba(203,205,205,.2)", background: "rgba(203,205,205,.05)", padding: "11px 14px", fontSize: 11.5, color: "var(--abh-platinum)", lineHeight: 1.6 }}>
          {T("سيُحدَّث متوسط سعر الشراء تلقائيًا حسب الكمية والسعر الجديدين (متوسط مرجّح).", "Average cost auto-updates by weighted average of old and new stock.")}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ التوريد…", "Restocking…") : T("توريد", "Restock")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════ تبويب الطلبات ═══════════ */
function RequestsTab({ items, T, isAr, nm, reqOpen, setReqOpen, onRefresh }: any) {
  const toast = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/inventory/requests").then((r) => r.json()); if (j?.ok) setList(j.requests); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDT = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };

  const pending = list.filter((r) => r.status === "pending");
  const others = list.filter((r) => r.status !== "pending");

  async function review(r: any, action: "approve" | "reject") {
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/inventory/requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action, items: r.items.map((it: any) => ({ itemId: it.itemId, approvedQty: it.quantity })) }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === "insufficient_stock") {
          const it = r.items.find((x: any) => x.itemId === data.itemId);
          throw new Error(T(`رصيد غير كافٍ: ${nm(it?.name)} (متاح ${data.have}, مطلوب ${data.wanted})`, `Insufficient: ${nm(it?.name)} (have ${data.have}, need ${data.wanted})`));
        }
        throw new Error(T("فشل التنفيذ", "Action failed"));
      }
      toast(action === "approve" ? T("تمت الموافقة ونقل الكميات للوسيط", "Approved & moved to intermediate") : T("تم رفض الطلب", "Request rejected"));
      await load(); onRefresh();
    } catch (e: any) { toast(e.message || T("فشل", "Failed"), "bad"); }
    finally { setBusy(null); }
  }

  return (
    <div className="abh-col" style={{ gap: 20 }}>
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : list.length === 0 ? (
        <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
          {T("لا طلبات بعد — اضغط «طلب خامات» لطلب بضاعة للمخزن الوسيط.", "No requests yet — click “Request materials”.")}
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#e8cf9a" }}>{T("بانتظار الموافقة", "Pending approval")}</span>
                <span style={{ fontSize: 10, borderRadius: 999, padding: "2px 8px", background: "rgba(232,207,154,.12)", color: "#e8cf9a" }}>{pending.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
                {pending.map((r) => <RequestCard key={r.id} r={r} T={T} isAr={isAr} nm={nm} fmtDT={fmtDT} busy={busy === r.id} onReview={review} />)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 12 }}>{T("مكتملة", "Resolved")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
                {others.map((r) => <RequestCard key={r.id} r={r} T={T} isAr={isAr} nm={nm} fmtDT={fmtDT} busy={false} onReview={review} />)}
              </div>
            </div>
          )}
        </>
      )}

      {reqOpen && <NewRequestModal items={items} T={T} isAr={isAr} nm={nm} onClose={() => setReqOpen(false)} onDone={() => { setReqOpen(false); load(); }} />}
    </div>
  );
}

function RequestCard({ r, T, isAr, nm, fmtDT, busy, onReview }: any) {
  const align = isAr ? "right" : "left";
  const st = r.status === "pending" ? { tone: "warn" as const, ar: "معلّق", en: "Pending" }
    : r.status === "fulfilled" ? { tone: "ok" as const, ar: "تمّ", en: "Fulfilled" }
    : r.status === "rejected" ? { tone: "bad" as const, ar: "مرفوض", en: "Rejected" }
    : { tone: "neutral" as const, ar: r.status, en: r.status };
  const isPending = r.status === "pending";

  return (
    <div className="abh-lift" style={{ borderRadius: 18, border: `1px solid ${isPending ? "rgba(232,207,154,.3)" : "rgba(255,255,255,.1)"}`, background: "rgba(255,255,255,.02)", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", textAlign: align }}>{T("طلب", "Request")} #{r.id}</div>
          <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 3, textAlign: align }}>{r.requestedBy} · {fmtDT(r.createdAt)}</div>
        </div>
        <Chip tone={st.tone} dot={isPending}>{isAr ? st.ar : st.en}</Chip>
      </div>

      {r.note && <div style={{ fontSize: 12, color: "var(--abh-platinum)", marginBottom: 12, textAlign: align, borderRadius: 10, background: "rgba(255,255,255,.02)", padding: "8px 11px" }}>{r.note}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {r.items.map((it: any, i: number) => {
          const short = isPending && it.mainQty < it.quantity;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)", padding: "9px 12px" }}>
              <span style={{ fontSize: 13, color: "var(--abh-ivory)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(it.name)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {short && <span title={T("رصيد غير كافٍ بالرئيسي", "Insufficient in main")} style={{ fontSize: 9, color: "#e7b4b4", border: "1px solid rgba(231,180,180,.35)", borderRadius: 999, padding: "1px 7px" }}>{T(`متاح ${it.mainQty}`, `have ${it.mainQty}`)}</span>}
                <span className="abh-num" dir="ltr" style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{it.approvedQty ?? it.quantity}</span>
                <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{it.unit}</span>
              </span>
            </div>
          );
        })}
      </div>

      {isPending ? (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => onReview(r, "approve")} disabled={busy}
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 11, padding: "11px", fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", border: "none", color: "#0b0c0e", background: "linear-gradient(135deg,#9fd4b0,#7fc49a)", opacity: busy ? 0.6 : 1 }}>
            {Ic.check({ s: 15 })}{busy ? T("جارٍ…", "…") : T("موافقة ونقل", "Approve & move")}
          </button>
          <button onClick={() => onReview(r, "reject")} disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 11, padding: "11px 16px", fontSize: 12.5, cursor: busy ? "not-allowed" : "pointer", border: "1px solid rgba(231,180,180,.35)", background: "rgba(231,180,180,.06)", color: "#e7b4b4" }}>
            {Ic.x({ s: 14 })}{T("رفض", "Reject")}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 10.5, color: "var(--abh-steel)", textAlign: align }}>
          {r.reviewedBy && <>{r.status === "fulfilled" ? T("وافق", "Approved by") : T("رفض", "Rejected by")}: {r.reviewedBy} · {fmtDT(r.reviewedAt)}</>}
        </div>
      )}
    </div>
  );
}

/* مودال طلب خامات جديد */
function NewRequestModal({ items, T, isAr, nm, onClose, onDone }: any) {
  const toast = useToast();
  const [sel, setSel] = useState<Record<number, number>>({}); // itemId → qty
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const shown = items.filter((it: any) => !q || nm(it.name).toLowerCase().includes(q.toLowerCase()));
  const chosen = Object.entries(sel).filter(([, q]) => Number(q) > 0);

  const setQty = (id: number, v: number) => setSel((s) => ({ ...s, [id]: Math.max(0, v) }));

  async function submit() {
    if (chosen.length === 0 || busy) { toast(T("اختر خامة واحدة على الأقل", "Pick at least one"), "bad"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/inventory/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, items: chosen.map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity: Number(quantity) })) }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error();
      toast(T("تم إرسال الطلب", "Request sent"));
      onDone();
    } catch { toast(T("فشل الإرسال", "Send failed"), "bad"); setBusy(false); }
  }

  const inp: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "11px 14px", fontSize: 14, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };

  return (
    <Modal title={T("طلب خامات للمخزن الوسيط", "Request materials")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={14} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("ابحث عن خامة…", "Search item…")} style={{ ...inp, paddingInlineStart: 36 }} />
        </div>

        <div style={{ maxHeight: 340, overflowY: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)", padding: 12 }}>
          <div className="abh-col" style={{ gap: 8 }}>
            {shown.map((it: any) => {
              const qty = sel[it.id] || 0;
              const on = qty > 0;
              return (
                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 11, border: `1px solid ${on ? "rgba(203,205,205,.35)" : "rgba(255,255,255,.06)"}`, background: on ? "rgba(203,205,205,.05)" : "rgba(255,255,255,.02)", padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(it.name)}</div>
                    <div style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 2 }}>{T("بالرئيسي", "Main")}: <span className="abh-num" dir="ltr">{it.mainQty}</span> {it.unit}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setQty(it.id, qty - 1)} disabled={qty <= 0} style={qtyBtn}>−</button>
                    <input value={qty || ""} onChange={(e) => setQty(it.id, Math.max(0, +e.target.value || 0))} placeholder="0" dir="ltr"
                      style={{ width: 54, textAlign: "center", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "7px 4px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
                    <button onClick={() => setQty(it.id, qty + 1)} style={qtyBtn}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Field label={T("ملاحظة (اختياري)", "Note (optional)")}>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("سبب الطلب أو تفاصيل…", "Reason or details…")} style={inp} />
        </Field>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--abh-platinum)" }}>{T(`${chosen.length} خامة مختارة`, `${chosen.length} items`)}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
            <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ الإرسال…", "Sending…") : T("إرسال الطلب", "Send request")}</Pill>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const qtyBtn: React.CSSProperties = { display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)", cursor: "pointer", fontSize: 16, lineHeight: 1 };

/* ═══════════ تبويب الحركات ═══════════ */
function MovementsTab({ T, isAr, nm, ccy }: any) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let alive = true; setLoading(true);
    const url = filter === "all" ? "/api/admin/inventory/movements" : `/api/admin/inventory/movements?type=${filter}`;
    fetch(url).then((r) => r.json()).then((j) => { if (alive && j?.ok) setList(j.movements); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filter]);

  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDT = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }); };

  const META: Record<string, { ar: string; en: string; color: string; icon: keyof typeof Ic; sign: string }> = {
    receive:  { ar: "توريد", en: "Receive", color: "#9fd4b0", icon: "plus", sign: "+" },
    transfer: { ar: "نقل للوسيط", en: "Transfer", color: "#cbcdcd", icon: "trending", sign: "→" },
    issue:    { ar: "صرف", en: "Issue", color: "#e8cf9a", icon: "sparkle", sign: "−" },
    adjust:   { ar: "تسوية", en: "Adjust", color: "#e7b4b4", icon: "sliders", sign: "±" },
  };
  const whName = (code: string | null) => !code ? "" : code === "main" ? T("الرئيسي", "Main") : code === "intermediate" ? T("الوسيط", "Interm.") : code;

  const filters: [string, string][] = [
    ["all", T("الكل", "All")], ["receive", T("توريد", "Receive")], ["transfer", T("نقل", "Transfer")], ["issue", T("صرف", "Issue")],
  ];

  return (
    <div className="abh-col" style={{ gap: 18 }}>
      {/* فلاتر النوع */}
      <div style={{ display: "inline-flex", padding: 4, gap: 2, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", width: "fit-content" }}>
        {filters.map(([id, lbl]) => {
          const on = filter === id;
          return (
            <button key={id} onClick={() => setFilter(id)} style={{ borderRadius: 9, padding: "7px 14px", fontSize: 12, cursor: "pointer", border: "none", color: on ? "#0c0d0e" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", fontWeight: on ? 600 : 400 }}>{lbl}</button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : list.length === 0 ? (
        <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
          {T("لا حركات بعد.", "No movements yet.")}
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
          {list.map((m, i) => {
            const meta = META[m.type] || META.adjust;
            const MIcon = Ic[meta.icon];
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)", background: i % 2 ? "rgba(255,255,255,.01)" : "transparent" }}>
                {/* أيقونة النوع */}
                <span style={{ display: "grid", placeItems: "center", height: 34, width: 34, flexShrink: 0, borderRadius: 10, border: `1px solid ${meta.color}44`, background: `${meta.color}14`, color: meta.color }}><MIcon s={15} /></span>

                {/* الخامة + التفاصيل */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm(m.itemName)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 2 }}>
                    {isAr ? meta.ar : meta.en}
                    {m.type === "transfer" && m.fromCode && m.toCode && <> · {whName(m.fromCode)} ← {whName(m.toCode)}</>}
                    {m.type === "receive" && m.toCode && <> · {whName(m.toCode)}</>}
                    {m.note && <> · {m.note}</>}
                  </div>
                </div>

                {/* الفاعل + الوقت */}
                <div style={{ flexShrink: 0, textAlign: isAr ? "left" : "right", display: "none" }} className="abh-mv-actor">
                  <div style={{ fontSize: 11.5, color: "var(--abh-platinum)" }}>{m.actor}</div>
                  <div style={{ fontSize: 10, color: "var(--abh-steel)" }}>{fmtDT(m.createdAt)}</div>
                </div>

                {/* الكمية */}
                <div style={{ flexShrink: 0, textAlign: isAr ? "left" : "right", minWidth: 74 }}>
                  <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: meta.color }}>{meta.sign}{m.quantity} <span style={{ fontSize: 9, color: "var(--abh-steel)" }}>{m.unit}</span></div>
                  {m.unitPrice > 0 && <div className="abh-num" dir="ltr" style={{ fontSize: 9.5, color: "var(--abh-steel)", marginTop: 1 }}>{EGP(m.unitPrice)} {ccy}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@media(min-width:720px){.abh-mv-actor{display:block!important}}`}</style>
    </div>
  );
}

