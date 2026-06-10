"use client";
import React, { useState } from "react";
import { Pill, Ghost, IconBtn, Toggle, Field, Input, LocaleField, Selectbox, Chip, Modal, Confirm, useToast, Ic, EGP, PageHeader, ImageCard } from "@/components/admin/ui";
import { emptyLoc, type Loc } from "@/lib/admin/i18n-json";

type Svc = {
  id?: number; categoryId: number | null; slug: string;
  name: Loc; tagline: Loc; duration: Loc; warranty: Loc;
  image: string; badge: string; pricingModel: string;
  basePrice: number; discount: number; onRequest: boolean; featured: boolean; active: boolean; sort: number;
};
const priceFor = (s: Svc, mult: number) => { const p = s.basePrice * mult; return s.discount > 0 ? p * (1 - s.discount / 100) : p; };

export default function ServicesClient({ initial, categories, sizes, locale }: { initial: Svc[]; categories: { id: number; label: string }[]; sizes: { code: string; label: string; mult: number }[]; locale: string }) {
  const toast = useToast();
  const [list, setList] = useState<Svc[]>(initial);
  const [editing, setEditing] = useState<Svc | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Svc | null>(null);
  const [cat, setCat] = useState<number>(0);
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.label || "";
  const txt = (l: Loc) => (locale === "ar" ? l.ar || l.en : l.en || l.ar);
  const largeMult = sizes.find((s) => s.code === "large")?.mult ?? 1.7;
  const shown = list.filter((s) => cat === 0 || s.categoryId === cat);

  async function save(s: Svc) {
    const method = s.id ? "PATCH" : "POST";
    try {
      const res = await fetch("/api/admin/services", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const data = await res.json();
      if (!data.ok) throw new Error();
      if (s.id) setList((ls) => ls.map((x) => (x.id === s.id ? { ...s } : x)));
      else setList((ls) => [...ls, { ...s, id: data.id }]);
      toast(s.id ? "تم تحديث الخدمة" : "تم إضافة الخدمة");
    } catch { toast("فشل الحفظ", "bad"); }
    setEditing(null); setAdding(false);
  }
  async function toggleActive(s: Svc, v: boolean) {
    setList((ls) => ls.map((x) => (x.id === s.id ? { ...x, active: v } : x)));
    await fetch("/api/admin/services", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, active: v }) }).catch(() => {});
  }
  async function remove(s: Svc) {
    try {
      const res = await fetch(`/api/admin/services?id=${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setList((ls) => ls.filter((x) => x.id !== s.id));
      toast("تم حذف الخدمة");
    } catch { toast("فشل الحذف", "bad"); }
    setConfirm(null);
  }
  const cats = [{ id: 0, label: "الكل" }, ...categories];

  return (
    <div className="abh-fade-up">
      <PageHeader title="الخدمات والأسعار" subtitle="أضف وعدّل خدمات الكتالوج بالعربي والإنجليزي، مع تسعير تلقائي لكل حجم سيارة." seed="services-hero"
        action={<Pill icon={Ic.plus} onClick={() => setAdding(true)}>خدمة جديدة</Pill>} />

      <div className="abh-col" style={{ gap: 24 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cats.map((c) => {
            const on = cat === c.id;
            return <button key={c.id} onClick={() => setCat(c.id)} style={{ borderRadius: 999, padding: "8px 16px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.4)" : "rgba(255,255,255,.1)"}`, color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.65)", background: on ? "rgba(203,205,205,.08)" : "transparent", cursor: "pointer" }}>{c.label}</button>;
          })}
        </div>

        <div className="abh-grid-cards">
          {shown.map((s, i) => (
            <div key={s.id} style={{ opacity: s.active ? 1 : 0.55, animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
              <ImageCard image={s.image} seed={s.slug || txt(s.name)} height={270}
                badge={s.featured ? "مميّزة" : undefined}
                topRight={<Chip tone="platinum">{catName(s.categoryId)}</Chip>}
                actions={<>
                  <IconBtn icon={Ic.pencil} label="تعديل" solid onClick={() => setEditing(s)} />
                  <IconBtn icon={Ic.trash} label="حذف" solid danger onClick={() => setConfirm(s)} />
                </>}>
                <h3 className="abh-display" style={{ margin: 0, fontSize: 26, color: "var(--abh-ivory)" }}>{txt(s.name) || s.slug}</h3>
                {txt(s.tagline) && <div style={{ fontSize: 12.5, color: "rgba(203,205,205,.85)", marginTop: 4 }}>{txt(s.tagline)}</div>}
                <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "rgba(203,205,205,.8)", flexWrap: "wrap" }}>
                  {txt(s.duration) && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.clock s={12} />{txt(s.duration)}</span>}
                  {txt(s.warranty) && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.sparkle s={12} />ضمان {txt(s.warranty)}</span>}
                </div>
                <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                  {s.onRequest ? <span style={{ fontSize: 14, color: "var(--abh-platinum)" }}>السعر عند الطلب</span> : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span className="abh-num" style={{ fontSize: 25, color: "var(--abh-ivory)" }}>{EGP(priceFor(s, largeMult))}</span>
                      <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>ج.م · كبير</span>
                      {s.discount > 0 && <Chip tone="ok">-{s.discount}%</Chip>}
                    </div>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flexShrink: 0 }}><Toggle on={s.active} onChange={(v) => toggleActive(s, v)} /></label>
                </div>
              </ImageCard>
            </div>
          ))}
          {shown.length === 0 && <div style={{ gridColumn: "1/-1", borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>لا توجد خدمات في هذا التصنيف — أضف أول خدمة.</div>}
        </div>
      </div>

      {(adding || editing) && <ServiceModal svc={editing} categories={categories} sizes={sizes} onClose={() => { setAdding(false); setEditing(null); }} onSave={save} />}
      {confirm && <Confirm title="حذف خدمة" body={`متأكد من حذف «${txt(confirm.name) || confirm.slug}»؟ هتختفي من الموقع وصفحة الحجز.`} onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />}
    </div>
  );
}

function ServiceModal({ svc, categories, sizes, onClose, onSave }: { svc: Svc | null; categories: { id: number; label: string }[]; sizes: { code: string; label: string; mult: number }[]; onClose: () => void; onSave: (s: Svc) => void }) {
  const [f, setF] = useState<Svc>(svc ?? {
    categoryId: categories[0]?.id ?? null, slug: "", name: emptyLoc(), tagline: emptyLoc(), duration: emptyLoc(), warranty: emptyLoc(),
    image: "", badge: "", pricingModel: "multiplier", basePrice: 0, discount: 0, onRequest: false, featured: false, active: true, sort: 0,
  });
  const set = (p: Partial<Svc>) => setF((s) => ({ ...s, ...p }));
  const pf = (mult: number) => { const p = f.basePrice * mult; return f.discount > 0 ? p * (1 - f.discount / 100) : p; };

  return (
    <Modal title={svc ? "تعديل خدمة" : "خدمة جديدة"} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        <LocaleField label="اسم الخدمة" value={f.name} onChange={(v) => set({ name: v })} />
        <LocaleField label="السطر التعريفي" value={f.tagline} onChange={(v) => set({ tagline: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="التصنيف"><Selectbox value={f.categoryId} onChange={(v: number) => set({ categoryId: v })} options={categories.map((c) => ({ value: c.id, label: c.label }))} placeholder="اختر" /></Field>
          <Field label="المعرّف (slug)"><Input value={f.slug} onChange={(e: any) => set({ slug: e.target.value })} dir="ltr" style={{ textAlign: "right" }} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="السعر الأساس (لمعامل ١.٠)" hint="يُضرب في معامل كل حجم"><Input type="number" value={f.basePrice} onChange={(e: any) => set({ basePrice: +e.target.value })} disabled={f.onRequest} dir="ltr" style={{ textAlign: "right", opacity: f.onRequest ? 0.4 : 1 }} /></Field>
          <Field label="الخصم %"><Input type="number" value={f.discount} onChange={(e: any) => set({ discount: Math.min(90, Math.max(0, +e.target.value)) })} dir="ltr" style={{ textAlign: "right" }} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <LocaleField label="المدّة" value={f.duration} onChange={(v) => set({ duration: v })} />
          <LocaleField label="الضمان" value={f.warranty} onChange={(v) => set({ warranty: v })} />
        </div>
        {!f.onRequest && f.basePrice > 0 && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "12px 16px" }}>
            {sizes.map((z) => (
              <div key={z.code} style={{ flex: 1, minWidth: 90 }}>
                <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{z.label}</div>
                <div className="abh-num" style={{ fontSize: 17, color: "var(--abh-ivory)", marginTop: 3 }}>{EGP(pf(z.mult))}</div>
                {f.discount > 0 && <div className="abh-num" style={{ fontSize: 11, color: "var(--abh-steel)", textDecoration: "line-through" }}>{EGP(f.basePrice * z.mult)}</div>}
              </div>
            ))}
          </div>
        )}
        <Field label="رابط الصورة (اختياري)"><Input value={f.image} onChange={(e: any) => set({ image: e.target.value })} dir="ltr" placeholder="/images/... أو https://" style={{ textAlign: "right" }} /></Field>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.featured} onChange={(v) => set({ featured: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>مميّزة</span></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.onRequest} onChange={(v) => set({ onRequest: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>السعر عند الطلب</span></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.active} onChange={(v) => set({ active: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>ظاهرة</span></label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
          <Ghost onClick={onClose}>إلغاء</Ghost>
          <Pill onClick={() => (f.name.ar || f.name.en) && f.slug && onSave(f)}>حفظ</Pill>
        </div>
      </div>
    </Modal>
  );
}
