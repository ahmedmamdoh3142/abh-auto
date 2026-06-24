"use client";
/**
 * app/admin/offers/bundles-panel.tsx — إدارة بندلات «خدمة + هدية».
 */
import { useEffect, useState } from "react";
import { Pill, Ghost, IconBtn, Toggle, Field, Input, LocaleField, Selectbox, Chip, Modal, Confirm, useToast, Ic } from "@/components/admin/ui";
import { emptyLoc, type Loc } from "@/lib/admin/i18n-json";
import type { AdminSvc } from "./offers-hub";
import { Loading, Empty } from "./offers-hub";

type Bundle = {
  id: string; label: string; title: Loc | null; giftMode: "free" | "percent"; giftPercent: number;
  minTriggerCount: number; maxGifts: number; stackable: boolean; isActive: boolean; sort: number;
  used: number; triggerIds: number[]; giftIds: number[];
};
type Draft = Omit<Bundle, "id" | "used"> & { id?: string };

const emptyDraft = (): Draft => ({
  label: "", title: emptyLoc(), giftMode: "free", giftPercent: 100,
  minTriggerCount: 1, maxGifts: 1, stackable: false, isActive: true, sort: 0,
  triggerIds: [], giftIds: [],
});

export default function BundlesPanel({ services, locale }: { services: AdminSvc[]; locale: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const nm = (s: AdminSvc) => (isAr ? s.name?.ar : s.name?.en) || s.name?.ar || s.name?.en || `#${s.id}`;
  const svcName = (id: number) => { const s = services.find((x) => x.id === id); return s ? nm(s) : `#${id}`; };

  const [list, setList] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<Bundle | null>(null);

  const load = async () => {
    setLoading(true);
    try { const j = await fetch("/api/admin/offer-bundles").then((r) => r.json()); if (j?.ok) setList(j.bundles); }
    catch { toast(T("فشل التحميل", "Failed to load"), "bad"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (d: Draft) => {
    if (!d.label.trim()) return toast(T("اكتب اسمًا داخليًا", "Enter an internal label"), "bad");
    if (d.triggerIds.length === 0 || d.giftIds.length === 0)
      return toast(T("اختر خدمات مؤهِّلة وهدايا", "Pick triggers and gifts"), "bad");
    try {
      const j = await fetch("/api/admin/offer-bundles", {
        method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      }).then((r) => r.json());
      if (j?.ok) { toast(T("اتحفظ", "Saved")); setEditing(null); await load(); }
      else toast(T("فشل الحفظ", "Save failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
  };

  const remove = async (b: Bundle) => {
    try {
      const j = await fetch(`/api/admin/offer-bundles?id=${b.id}`, { method: "DELETE" }).then((r) => r.json());
      if (j?.ok) { toast(T("اتحذف", "Deleted")); setConfirm(null); await load(); }
      else toast(T("فشل الحذف", "Delete failed"), "bad");
    } catch { toast(T("خطأ بالشبكة", "Network error"), "bad"); }
  };

  const toggleActive = async (b: Bundle, v: boolean) => {
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, isActive: v } : x)));
    try { await fetch("/api/admin/offer-bundles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, toggleActive: v }) }); }
    catch { toast(T("فشل التحديث", "Update failed"), "bad"); }
  };

  if (loading) return <Loading />;

  return (
    <div className="abh-col" style={{ gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "rgba(203,205,205,.65)", fontSize: 13, margin: 0 }}>
          {T("لو العميل اختار خدمة «مؤهِّلة»، يفتحله اختيار هدية من القائمة.", "Picking a qualifying service unlocks a gift choice.")}
        </p>
        <Pill icon={Ic.plus} onClick={() => setEditing(emptyDraft())}>{T("بندل جديد", "New bundle")}</Pill>
      </div>

      {list.length === 0 && <Empty text={T("مفيش بندلات لسه. اعمل واحد.", "No bundles yet. Create one.")} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {list.map((b) => (
          <div key={b.id} style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.02)", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display, inherit)", textTransform: "uppercase", fontSize: 17, color: "#f5f5f0" }}>{b.label}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Chip tone="platinum">{b.giftMode === "free" ? T("هدية مجانية", "Free gift") : T(`خصم ${b.giftPercent}%`, `${b.giftPercent}% off`)}</Chip>
                  <Chip tone="platinum">{T(`اختر ${b.minTriggerCount}`, `Pick ${b.minTriggerCount}`)}</Chip>
                  {b.used > 0 && <Chip tone="platinum">{T(`اتطلبت ${b.used}`, `${b.used} claimed`)}</Chip>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <IconBtn icon={Ic.pencil} label={T("تعديل", "Edit")} solid onClick={() => setEditing({ ...b })} />
                <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} solid danger onClick={() => setConfirm(b)} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(203,205,205,.6)" }}>
              <b style={{ color: "rgba(203,205,205,.8)" }}>{T("مؤهِّلة:", "Triggers:")}</b> {b.triggerIds.map(svcName).join("، ") || "—"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(203,205,205,.6)" }}>
              <b style={{ color: "#e8d6a8" }}>{T("هدايا:", "Gifts:")}</b> {b.giftIds.map(svcName).join("، ") || "—"}
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Toggle on={b.isActive} onChange={(v: boolean) => toggleActive(b, v)} />
              <span style={{ fontSize: 12, color: "rgba(203,205,205,.7)" }}>{b.isActive ? T("ظاهر", "Live") : T("مخفي", "Hidden")}</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BundleModal draft={editing} services={services} isAr={isAr} T={T} nm={nm}
          onClose={() => setEditing(null)} onSave={save} />
      )}
      {confirm && (
        <Confirm title={T("حذف بندل", "Delete bundle")}
          body={T(`متأكد من حذف «${confirm.label}»؟`, `Delete “${confirm.label}”?`)}
          onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />
      )}
    </div>
  );
}

function BundleModal({ draft, services, isAr, T, nm, onClose, onSave }: {
  draft: Draft; services: AdminSvc[]; isAr: boolean; T: (a: string, e: string) => string;
  nm: (s: AdminSvc) => string; onClose: () => void; onSave: (d: Draft) => void;
}) {
  const [f, setF] = useState<Draft>(draft);
  const set = (p: Partial<Draft>) => setF((d) => ({ ...d, ...p }));
  const toggleId = (key: "triggerIds" | "giftIds", id: number) =>
    set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] } as any);

  return (
    <Modal title={f.id ? T("تعديل بندل", "Edit bundle") : T("بندل جديد", "New bundle")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        <Field label={T("اسم داخلي (للأدمن)", "Internal label")}>
          <Input value={f.label} onChange={(e: any) => set({ label: e.target.value })} placeholder={T("باقة + هدية", "Package + gift")} />
        </Field>
        <LocaleField label={T("عنوان يظهر للعميل (اختياري)", "Public title (optional)")} value={f.title ?? emptyLoc()} onChange={(v: Loc) => set({ title: v })} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label={T("نوع الهدية", "Gift type")}>
            <Selectbox value={f.giftMode} onChange={(v: string) => set({ giftMode: v as any, giftPercent: v === "free" ? 100 : f.giftPercent })}
              options={[{ value: "free", label: T("مجانية", "Free") }, { value: "percent", label: T("خصم %", "% off") }]} />
          </Field>
          {f.giftMode === "percent" && (
            <Field label={T("نسبة الخصم %", "Discount %")}>
              <Input type="number" value={f.giftPercent} dir="ltr" onChange={(e: any) => set({ giftPercent: Math.max(0, Math.min(100, +e.target.value)) })} />
            </Field>
          )}
          <Field label={T("اختَر كام خدمة", "Min triggers")}>
            <Input type="number" value={f.minTriggerCount} dir="ltr" onChange={(e: any) => set({ minTriggerCount: Math.max(1, +e.target.value) })} />
          </Field>
          <Field label={T("أقصى هدايا", "Max gifts")}>
            <Input type="number" value={f.maxGifts} dir="ltr" onChange={(e: any) => set({ maxGifts: Math.max(1, +e.target.value) })} />
          </Field>
        </div>

        <ServicePicker title={T("الخدمات المؤهِّلة (triggers)", "Qualifying services")} services={services} nm={nm}
          selected={f.triggerIds} onToggle={(id) => toggleId("triggerIds", id)} />
        <ServicePicker title={T("الخدمات المتاحة كهدية (gifts)", "Gift services")} services={services} nm={nm}
          selected={f.giftIds} onToggle={(id) => toggleId("giftIds", id)} gold />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(203,205,205,.75)" }}>
            <Toggle on={f.isActive} onChange={(v: boolean) => set({ isActive: v })} />{T("مفعّل", "Active")}
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
            <Pill icon={Ic.check} onClick={() => onSave(f)}>{T("حفظ", "Save")}</Pill>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ServicePicker({ title, services, selected, onToggle, nm, gold }: {
  title: string; services: AdminSvc[]; selected: number[]; onToggle: (id: number) => void;
  nm: (s: AdminSvc) => string; gold?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(203,205,205,.7)", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {services.map((s) => {
          const on = selected.includes(s.id);
          const accent = gold ? "217,178,95" : "203,205,205";
          return (
            <button key={s.id} onClick={() => onToggle(s.id)}
              style={{
                padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5,
                border: on ? `1px solid rgba(${accent},.55)` : "1px solid rgba(255,255,255,.1)",
                background: on ? `rgba(${accent},.12)` : "transparent",
                color: on ? (gold ? "#e8d6a8" : "#f5f5f0") : "rgba(203,205,205,.7)",
              }}>
              {nm(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}