"use client";
/**
 * app/admin/offers/wheel-panel.tsx — إدارة عجلة الحظ (الإعدادات + القطاعات + الاحتمالات).
 *
 * (جديد) ترتيب القطاعات بالسحب والإفلات (drag & drop) — بتسحب الكرت وتفلته مكان
 *   اللي عايزه، والترتيب بيتحفظ تلقائيًا. وفيه أزرار ▲▼ كمان للموبايل/اللمس.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Pill, Ghost, IconBtn, Toggle, Field, Input, LocaleField, Selectbox, Chip, Modal, Confirm, useToast, Ic } from "@/components/admin/ui";
import { emptyLoc, type Loc } from "@/lib/admin/i18n-json";
import type { AdminSvc } from "./offers-hub";
import { Loading, Empty } from "./offers-hub";

type Cfg = { isActive: boolean; title: Loc; subtitle: Loc; spinDay: number; cooldownH: number; requireLogin: boolean; startsAt: string | null; expiresAt: string | null };
type Seg = {
  id?: number; label: Loc; kind: "promo_percent" | "promo_fixed" | "gift_service" | "nothing";
  value: number; giftServiceId: number | null; weight: number; hex: string; couponDays: number; minOrder: number; sort: number; isActive: boolean;
};

const emptySeg = (): Seg => ({ label: emptyLoc(), kind: "promo_percent", value: 10, giftServiceId: null, weight: 10, hex: "#d9b25f", couponDays: 14, minOrder: 0, sort: 0, isActive: true });

export default function WheelPanel({ services, locale }: { services: AdminSvc[]; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const nm = (s: AdminSvc) => (isAr ? s.name?.ar : s.name?.en) || s.name?.ar || s.name?.en || `#${s.id}`;

  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [editing, setEditing] = useState<Seg | null>(null);
  const [confirm, setConfirm] = useState<Seg | null>(null);

  // سحب وإفلات
  const [dragId, setDragId] = useState<number | "new" | null>(null);
  const dragIndex = useRef<number | null>(null);
  const segsRef = useRef<Seg[]>([]);
  useEffect(() => { segsRef.current = segs; }, [segs]);

  const load = async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/wheel").then((r) => r.json()); if (j?.ok) { setCfg(j.config); setSegs(j.segments); } }
    catch { toast(T("فشل التحميل", "Failed to load"), "bad"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totalWeight = useMemo(() => segs.filter((s) => s.isActive).reduce((a, s) => a + Math.max(0, s.weight), 0), [segs]);

  const saveCfg = async () => {
    if (!cfg) return;
    setSavingCfg(true);
    try {
      const j = await fetch("/api/admin/wheel", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg }) }).then((r) => r.json());
      if (j?.ok) toast(T("اتحفظت الإعدادات", "Settings saved")); else toast(T("فشل الحفظ", "Save failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
    finally { setSavingCfg(false); }
  };

  const saveSeg = async (s: Seg) => {
    try {
      const j = await fetch("/api/admin/wheel", {
        method: s.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      }).then((r) => r.json());
      if (j?.ok) { toast(T("اتحفظ", "Saved")); setEditing(null); await load(); } else toast(T("فشل الحفظ", "Save failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
  };
  const removeSeg = async (s: Seg) => {
    try { const j = await fetch(`/api/admin/wheel?id=${s.id}`, { method: "DELETE" }).then((r) => r.json());
      if (j?.ok) { toast(T("اتحذف", "Deleted")); setConfirm(null); await load(); } else toast(T("فشل الحذف", "Delete failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
  };

  // حفظ الترتيب: نحدّث sort لكل قطاع ونرسله (PUT) — بدون إعادة تحميل عشان السلاسة.
  const persistOrder = async (list: Seg[]) => {
    try {
      await Promise.all(list.filter((s) => s.id).map((s) =>
        fetch("/api/admin/wheel", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) })
      ));
      toast(T("اتحفظ الترتيب", "Order saved"));
    } catch { toast(T("فشل حفظ الترتيب", "Failed to save order"), "bad"); }
  };

  // أزرار ▲▼
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= segs.length) return;
    const copy = [...segs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    const updated = copy.map((s, k) => ({ ...s, sort: k }));
    setSegs(updated);
    persistOrder(updated);
  };

  // سحب وإفلات
  const onDragStart = (i: number) => { dragIndex.current = i; setDragId(segs[i].id ?? "new"); };
  const onDragEnterCard = (i: number) => {
    const from = dragIndex.current;
    if (from == null || from === i) return;
    setSegs((prev) => {
      const copy = [...prev];
      const [m] = copy.splice(from, 1);
      copy.splice(i, 0, m);
      return copy;
    });
    dragIndex.current = i;
  };
  const onDragEndCard = () => {
    dragIndex.current = null; setDragId(null);
    const updated = segsRef.current.map((s, k) => ({ ...s, sort: k }));
    setSegs(updated);
    persistOrder(updated);
  };

  if (loading || !cfg) return <Loading />;
  const cset = (p: Partial<Cfg>) => setCfg({ ...cfg, ...p });
  const kindLabel = (k: Seg["kind"]) => k === "promo_percent" ? T("خصم %", "% off") : k === "promo_fixed" ? T("مبلغ", "Fixed") : k === "gift_service" ? T("هدية", "Gift") : T("لا شيء", "Nothing");

  return (
    <div className="abh-col" style={{ gap: 20 }}>
      {/* الإعدادات */}
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.02)", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#f5f5f0" }}>
            <Toggle on={cfg.isActive} onChange={(v: boolean) => cset({ isActive: v })} />
            {cfg.isActive ? T("العجلة شغّالة", "Wheel is live") : T("العجلة موقوفة", "Wheel is off")}
          </label>
          <Pill icon={Ic.check} onClick={saveCfg}>{savingCfg ? T("...", "...") : T("حفظ الإعدادات", "Save settings")}</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <LocaleField label={T("العنوان", "Title")} value={cfg.title} onChange={(v: Loc) => cset({ title: v })} />
          <LocaleField label={T("السطر الفرعي", "Subtitle")} value={cfg.subtitle} onChange={(v: Loc) => cset({ subtitle: v })} />
          <Field label={T("المهلة بين اللفّات (ساعات)", "Cooldown (hours)")} hint={T("168 = أسبوع", "168 = a week")}>
            <Input type="number" value={cfg.cooldownH} dir="ltr" onChange={(e: any) => cset({ cooldownH: Math.max(1, +e.target.value) })} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(203,205,205,.75)", alignSelf: "end", paddingBottom: 10 }}>
            <Toggle on={cfg.requireLogin} onChange={(v: boolean) => cset({ requireLogin: v })} />{T("تسجيل دخول إجباري", "Require login")}
          </label>
        </div>
      </div>

      {/* القطاعات */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "rgba(203,205,205,.65)", fontSize: 13, margin: 0 }}>
          {T("اسحب الكروت لإعادة ترتيب القطاعات على العجلة. الوزن = ثقل احتمال القطاع.", "Drag cards to reorder wheel segments. Weight = relative odds.")}
        </p>
        <Pill icon={Ic.plus} onClick={() => setEditing(emptySeg())}>{T("قطاع جديد", "New segment")}</Pill>
      </div>

      {segs.length === 0 && <Empty text={T("مفيش قطاعات. ضيف واحد.", "No segments. Add one.")} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {segs.map((s, idx) => {
          const pct = totalWeight > 0 && s.isActive ? Math.round((Math.max(0, s.weight) / totalWeight) * 100) : 0;
          const dragging = dragId != null && (s.id ?? "new") === dragId;
          return (
            <div key={s.id ?? `new-${idx}`}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnterCard(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={onDragEndCard}
              style={{
                borderRadius: 18, border: `1px solid ${dragging ? "rgba(217,178,95,.5)" : "rgba(255,255,255,.09)"}`,
                background: dragging ? "rgba(217,178,95,.06)" : "rgba(255,255,255,.02)", padding: 16,
                opacity: dragging ? 0.65 : (s.isActive ? 1 : 0.55), cursor: "grab", transition: "border-color .15s, background .15s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {/* مقبض السحب */}
                  <span title={T("اسحب لإعادة الترتيب", "Drag to reorder")} style={{ display: "grid", placeItems: "center", color: "rgba(203,205,205,.5)", flex: "none", cursor: "grab" }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
                  </span>
                  <span style={{ height: 22, width: 22, borderRadius: 6, background: s.hex, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)", flex: "none" }} />
                  <span style={{ fontSize: 15, color: "#f5f5f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(isAr ? s.label?.ar : s.label?.en) || kindLabel(s.kind)}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flex: "none" }}>
                  {/* ▲▼ للموبايل/اللمس */}
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={T("لأعلى", "Up")}
                      style={{ display: "grid", placeItems: "center", height: 17, width: 24, borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: idx === 0 ? "rgba(203,205,205,.25)" : "rgba(203,205,205,.8)", cursor: idx === 0 ? "default" : "pointer" }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === segs.length - 1} aria-label={T("لأسفل", "Down")}
                      style={{ display: "grid", placeItems: "center", height: 17, width: 24, borderRadius: 6, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: idx === segs.length - 1 ? "rgba(203,205,205,.25)" : "rgba(203,205,205,.8)", cursor: idx === segs.length - 1 ? "default" : "pointer" }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </span>
                  <IconBtn icon={Ic.pencil} label={T("تعديل", "Edit")} solid onClick={() => setEditing({ ...s })} />
                  <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} solid danger onClick={() => setConfirm(s)} />
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip tone="platinum">{kindLabel(s.kind)}{s.kind !== "nothing" ? ` · ${s.value}` : ""}</Chip>
                <Chip tone="platinum">{T(`احتمال ${pct}%`, `${pct}% odds`)}</Chip>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <SegModal seg={editing} services={services} isAr={isAr} T={T} nm={nm} kindLabel={kindLabel}
          onClose={() => setEditing(null)} onSave={saveSeg} />
      )}
      {confirm && (
        <Confirm title={T("حذف قطاع", "Delete segment")}
          body={T("متأكد من حذف القطاع؟", "Delete this segment?")}
          onCancel={() => setConfirm(null)} onConfirm={() => removeSeg(confirm)} />
      )}
    </div>
  );
}

function SegModal({ seg, services, isAr, T, nm, kindLabel, onClose, onSave }: {
  seg: Seg; services: AdminSvc[]; isAr: boolean; T: (a: string, e: string) => string;
  nm: (s: AdminSvc) => string; kindLabel: (k: Seg["kind"]) => string; onClose: () => void; onSave: (s: Seg) => void;
}) {
  const [f, setF] = useState<Seg>(seg);
  const set = (p: Partial<Seg>) => setF((d) => ({ ...d, ...p }));
  const showValue = f.kind === "promo_percent" || f.kind === "promo_fixed" || f.kind === "gift_service";

  return (
    <Modal title={f.id ? T("تعديل قطاع", "Edit segment") : T("قطاع جديد", "New segment")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <LocaleField label={T("النص الظاهر على العجلة", "Wheel label")} value={f.label} onChange={(v: Loc) => set({ label: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={T("النوع", "Type")}>
            <Selectbox value={f.kind} onChange={(v: string) => set({ kind: v as Seg["kind"] })}
              options={[
                { value: "promo_percent", label: T("خصم نسبة %", "Percent off") },
                { value: "promo_fixed", label: T("خصم مبلغ", "Fixed amount") },
                { value: "gift_service", label: T("هدية خدمة", "Gift service") },
                { value: "nothing", label: T("لا شيء (حظ أوفر)", "Nothing") },
              ]} />
          </Field>
          {showValue && (
            <Field label={f.kind === "promo_percent" ? T("النسبة %", "Percent %") : T("المبلغ", "Amount")}>
              <Input type="number" value={f.value} dir="ltr" onChange={(e: any) => set({ value: Math.max(0, +e.target.value) })} />
            </Field>
          )}
        </div>

        {f.kind === "gift_service" && (
          <Field label={T("الخدمة المُهداة", "Gift service")} hint={T("قيمة الكوبون = المبلغ بالأعلى", "Coupon value = amount above")}>
            <Selectbox value={String(f.giftServiceId ?? "")} onChange={(v: string) => set({ giftServiceId: v ? +v : null })}
              options={[{ value: "", label: T("— اختر —", "— pick —") }, ...services.map((s) => ({ value: String(s.id), label: nm(s) }))]} />
          </Field>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label={T("الوزن (الاحتمال)", "Weight (odds)")}>
            <Input type="number" value={f.weight} dir="ltr" onChange={(e: any) => set({ weight: Math.max(0, +e.target.value) })} />
          </Field>
          <Field label={T("صلاحية الكوبون (أيام)", "Coupon days")}>
            <Input type="number" value={f.couponDays} dir="ltr" onChange={(e: any) => set({ couponDays: Math.max(0, +e.target.value) })} />
          </Field>
          <Field label={T("حد أدنى للطلب", "Min order")}>
            <Input type="number" value={f.minOrder} dir="ltr" onChange={(e: any) => set({ minOrder: Math.max(0, +e.target.value) })} />
          </Field>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Field label={T("لون القطاع", "Segment color")}>
            <input type="color" value={f.hex} onChange={(e) => set({ hex: e.target.value })}
              style={{ width: 54, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "transparent", cursor: "pointer" }} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(203,205,205,.75)", alignSelf: "end", paddingBottom: 10 }}>
            <Toggle on={f.isActive} onChange={(v: boolean) => set({ isActive: v })} />{T("مفعّل", "Active")}
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={() => onSave(f)}>{T("حفظ", "Save")}</Pill>
        </div>
      </div>
    </Modal>
  );
}