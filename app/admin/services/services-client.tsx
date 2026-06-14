"use client";
/**
 * app/admin/services/services-client.tsx — الخدمات والأسعار (CLIENT) · v2
 *
 * • ثنائي اللغة (ar/en) لكل النصوص الثابتة عبر prop locale + T(ar,en).
 * • التسعير لكل حجم (صغير/وسط/كبير) بسعر جديد + قديم — يُحفظ في service_prices.
 *   (اتشالت فكرة نسبة الخصم؛ النِسبة تتحسب تلقائيًا للعرض فقط.)
 * • عناصر الخدمة (المشمولات) عربي/إنجليزي — تتحفظ في service_includes.
 * • الضمان = رقم سنوات فقط، والمدة = رقم أيام فقط؛ الجمل الثنائية تتبني في الكود.
 * • اتشال «السطر التعريفي» و«المعرّف»؛ بدالهم «شرح الخدمة» عربي/إنجليزي (description).
 */
import React, { useMemo, useState } from "react";
import { Pill, Ghost, IconBtn, Toggle, Field, Input, LocaleField, Selectbox, Chip, Modal, Confirm, useToast, Ic, EGP, PageHeader, ImageCard } from "@/components/admin/ui";
import { emptyLoc, type Loc } from "@/lib/admin/i18n-json";
import ImageUpload from "@/components/admin/image-upload";

type SizeKey = "small" | "medium" | "large";
type SizePrice = { price: number; old: number };
type Svc = {
  id?: number; slug?: string; categoryId: number | null;
  name: Loc; description: Loc;
  prices: Record<SizeKey, SizePrice>;
  includes: Loc[];
  warrantyYears: number; durationDays: number;
  image: string; badge: string;
  onRequest: boolean; featured: boolean; active: boolean; sort: number;
};

const SIZE_ORDER: SizeKey[] = ["small", "medium", "large"];
const emptyPrices = (): Record<SizeKey, SizePrice> => ({ small: { price: 0, old: 0 }, medium: { price: 0, old: 0 }, large: { price: 0, old: 0 } });
const startPrice = (s: Svc) => { const ps = SIZE_ORDER.map((k) => s.prices[k]?.price || 0).filter((n) => n > 0); return ps.length ? Math.min(...ps) : 0; };
const startOld = (s: Svc) => { for (const k of SIZE_ORDER) { const p = s.prices[k]; if (p?.price > 0) return p.old > p.price ? p.old : 0; } return 0; };

export default function ServicesClient({ initial, categories, sizes, locale }: {
  initial: Svc[]; categories: { id: number; label: string }[]; sizes: { code: string; label: string }[]; locale: string;
}) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = isAr ? "ريال" : "SAR";
  const toast = useToast();
  const [list, setList] = useState<Svc[]>(initial);
  const [editing, setEditing] = useState<Svc | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<Svc | null>(null);
  const [cat, setCat] = useState<number>(0);

  const catName = (id: number | null) => categories.find((c) => c.id === id)?.label || "";
  const txt = (l: Loc) => (isAr ? l.ar || l.en : l.en || l.ar) || "";
  const sizeLabel = (code: string) => sizes.find((s) => s.code === code)?.label || code;
  const shown = list.filter((s) => cat === 0 || s.categoryId === cat);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((s) => s.active).length,
    featured: list.filter((s) => s.featured).length,
  }), [list]);

  async function save(s: Svc) {
    const method = s.id ? "PATCH" : "POST";
    try {
      const res = await fetch("/api/admin/services", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const data = await res.json();
      if (!data.ok) throw new Error();
      if (s.id) setList((ls) => ls.map((x) => (x.id === s.id ? { ...s } : x)));
      else setList((ls) => [...ls, { ...s, id: data.id, slug: data.slug }]);
      toast(s.id ? T("تم تحديث الخدمة", "Service updated") : T("تم إضافة الخدمة", "Service added"));
    } catch { toast(T("فشل الحفظ", "Save failed"), "bad"); }
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
      toast(T("تم حذف الخدمة", "Service deleted"));
    } catch { toast(T("فشل الحذف", "Delete failed"), "bad"); }
    setConfirm(null);
  }
  const cats = [{ id: 0, label: T("الكل", "All") }, ...categories];

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("الخدمات والأسعار", "Services & pricing")} subtitle={T("أضف وعدّل خدمات الكتالوج بالعربي والإنجليزي، مع سعر لكل حجم سيارة وقائمة مشمولات.", "Create and edit catalogue services in Arabic & English, with a price per vehicle size and an includes list.")} seed="services-hero"
        action={<Pill icon={Ic.plus} onClick={() => setAdding(true)}>{T("خدمة جديدة", "New service")}</Pill>} />

      <div className="abh-col" style={{ gap: 22 }}>
        {/* إحصائيات سريعة */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[[T("إجمالي الخدمات", "Total"), stats.total], [T("ظاهرة", "Active"), stats.active], [T("مميّزة", "Featured"), stats.featured]].map(([l, v], i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
              <span className="abh-num" style={{ fontSize: 22, color: "var(--abh-ivory)" }}>{v as number}</span>
              <span style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{l as string}</span>
            </div>
          ))}
        </div>

        {/* فلاتر التصنيف */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cats.map((c) => {
            const on = cat === c.id;
            return <button key={c.id} onClick={() => setCat(c.id)} style={{ borderRadius: 999, padding: "8px 16px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.4)" : "rgba(255,255,255,.1)"}`, color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.65)", background: on ? "rgba(203,205,205,.08)" : "transparent", cursor: "pointer", transition: "all .25s var(--abh-ease)" }}>{c.label}</button>;
          })}
        </div>

        <div className="abh-grid-cards">
          {shown.map((s, i) => {
            const sp = startPrice(s); const so = startOld(s);
            const disc = so > sp && sp > 0 ? Math.round((1 - sp / so) * 100) : 0;
            return (
              <div key={s.id} style={{ opacity: s.active ? 1 : 0.55, animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
                <ImageCard image={s.image} seed={s.slug || txt(s.name)} height={278}
                  badge={s.featured ? T("مميّزة", "Featured") : undefined}
                  topRight={<Chip tone="platinum">{catName(s.categoryId)}</Chip>}
                  actions={<>
                    <IconBtn icon={Ic.pencil} label={T("تعديل", "Edit")} solid onClick={() => setEditing(s)} />
                    <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} solid danger onClick={() => setConfirm(s)} />
                  </>}>
                  <h3 className="abh-display" style={{ margin: 0, fontSize: 25, color: "var(--abh-ivory)" }}>{txt(s.name) || "—"}</h3>
                  {txt(s.description) && <div style={{ fontSize: 12.5, color: "rgba(203,205,205,.8)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{txt(s.description)}</div>}
                  <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "rgba(203,205,205,.8)", flexWrap: "wrap" }}>
                    {s.durationDays > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.clock s={12} />{s.durationDays} {T("يوم", "days")}</span>}
                    {s.warrantyYears > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.sparkle s={12} />{T(`ضمان ${s.warrantyYears} سنوات`, `${s.warrantyYears}-yr warranty`)}</span>}
                    {s.includes.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.check s={12} />{s.includes.length} {T("عنصر", "items")}</span>}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                    {s.onRequest ? <span style={{ fontSize: 14, color: "var(--abh-platinum)" }}>{T("السعر عند الطلب", "Price on request")}</span> : (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", width: "100%" }}>{T("يبدأ من", "From")}</span>
                        <span className="abh-num" dir="ltr" style={{ fontSize: 24, color: "var(--abh-ivory)" }}>{EGP(sp)}</span>
                        <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{ccy}</span>
                        {so > 0 && <span className="abh-num" dir="ltr" style={{ fontSize: 12, color: "var(--abh-steel)", textDecoration: "line-through" }}>{EGP(so)}</span>}
                        {disc > 0 && <Chip tone="ok">-{disc}%</Chip>}
                      </div>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flexShrink: 0 }}><Toggle on={s.active} onChange={(v) => toggleActive(s, v)} /></label>
                  </div>
                </ImageCard>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ gridColumn: "1/-1", borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد خدمات في هذا التصنيف — أضف أول خدمة.", "No services in this category — add your first one.")}</div>}
        </div>
      </div>

      {(adding || editing) && <ServiceModal svc={editing} categories={categories} sizes={sizes} isAr={isAr} T={T} ccy={ccy} sizeLabel={sizeLabel} onClose={() => { setAdding(false); setEditing(null); }} onSave={save} />}
      {confirm && <Confirm title={T("حذف خدمة", "Delete service")} body={T(`متأكد من حذف «${txt(confirm.name)}»؟ هتختفي من الموقع وصفحة الحجز.`, `Delete “${txt(confirm.name)}”? It will disappear from the site and booking page.`)} onCancel={() => setConfirm(null)} onConfirm={() => remove(confirm)} />}
    </div>
  );
}

/* ═════════════════ مودال الخدمة (إضافة/تعديل) ═════════════════ */
function ServiceModal({ svc, categories, sizes, isAr, T, ccy, sizeLabel, onClose, onSave }: {
  svc: Svc | null; categories: { id: number; label: string }[]; sizes: { code: string; label: string }[];
  isAr: boolean; T: (ar: string, en: string) => string; ccy: string; sizeLabel: (c: string) => string;
  onClose: () => void; onSave: (s: Svc) => void;
}) {
  const [f, setF] = useState<Svc>(svc ?? {
    categoryId: categories[0]?.id ?? null, name: emptyLoc(), description: emptyLoc(),
    prices: emptyPrices(), includes: [], warrantyYears: 0, durationDays: 0,
    image: "", badge: "", onRequest: false, featured: false, active: true, sort: 0,
  });
  const set = (p: Partial<Svc>) => setF((s) => ({ ...s, ...p }));
  const setPrice = (size: SizeKey, field: "price" | "old", val: number) =>
    setF((s) => ({ ...s, prices: { ...s.prices, [size]: { ...s.prices[size], [field]: val } } }));
  const setInclude = (i: number, v: Loc) => setF((s) => ({ ...s, includes: s.includes.map((x, j) => (j === i ? v : x)) }));
  const addInclude = () => setF((s) => ({ ...s, includes: [...s.includes, emptyLoc()] }));
  const removeInclude = (i: number) => setF((s) => ({ ...s, includes: s.includes.filter((_, j) => j !== i) }));
  const valid = (f.name.ar || f.name.en) && f.categoryId != null;

  const availSizes = sizes.length ? sizes.map((s) => s.code as SizeKey) : SIZE_ORDER;

  return (
    <Modal title={svc ? T("تعديل خدمة", "Edit service") : T("خدمة جديدة", "New service")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 18 }}>
        {/* الاسم + التصنيف */}
        <LocaleField label={T("اسم الخدمة", "Service name")} value={f.name} onChange={(v) => set({ name: v })} />
        <LocaleField label={T("شرح الخدمة", "Description")} value={f.description} onChange={(v) => set({ description: v })} multiline />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Field label={T("التصنيف", "Category")}><Selectbox value={f.categoryId} onChange={(v: number) => set({ categoryId: v })} options={categories.map((c) => ({ value: c.id, label: c.label }))} placeholder={T("اختر", "Select")} /></Field>
          <Field label={T("الضمان (سنوات)", "Warranty (years)")} hint={T("رقم فقط — تتبني الجملة تلقائيًا", "number only")}><Input type="number" value={f.warrantyYears} onChange={(e: any) => set({ warrantyYears: Math.max(0, +e.target.value) })} dir="ltr" style={{ textAlign: isAr ? "right" : "left" }} /></Field>
          <Field label={T("المدة (أيام)", "Duration (days)")} hint={T("رقم فقط", "number only")}><Input type="number" value={f.durationDays} onChange={(e: any) => set({ durationDays: Math.max(0, +e.target.value) })} dir="ltr" style={{ textAlign: isAr ? "right" : "left" }} /></Field>
        </div>

        {/* السعر عند الطلب */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.onRequest} onChange={(v) => set({ onRequest: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>{T("السعر عند الطلب (بدون أسعار محددة)", "Price on request (no fixed prices)")}</span></label>

        {/* الأسعار لكل حجم — جديد + قديم */}
        {!f.onRequest && (
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("الأسعار حسب الحجم", "Prices by size")}</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${availSizes.length}, 1fr)`, gap: 12 }}>
              {availSizes.map((size) => {
                const p = f.prices[size] || { price: 0, old: 0 };
                const disc = p.old > p.price && p.price > 0 ? Math.round((1 - p.price / p.old) * 100) : 0;
                return (
                  <div key={size} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-ivory)" }}>{sizeLabel(size)}</span>
                      {disc > 0 && <Chip tone="ok">-{disc}%</Chip>}
                    </div>
                    <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 5 }}>{T("السعر الجديد", "New price")}</div>
                    <Input type="number" value={p.price} onChange={(e: any) => setPrice(size, "price", Math.max(0, +e.target.value))} dir="ltr" style={{ textAlign: isAr ? "right" : "left", marginBottom: 10 }} />
                    <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 5 }}>{T("السعر القديم (اختياري)", "Old price (optional)")}</div>
                    <Input type="number" value={p.old} onChange={(e: any) => setPrice(size, "old", Math.max(0, +e.target.value))} dir="ltr" style={{ textAlign: isAr ? "right" : "left" }} />
                  </div>
                );
              })}
            </div>
            <p style={{ margin: "8px 2px 0", fontSize: 11, color: "var(--abh-steel)" }}>{T(`القيم بالـ${ccy}. اترك السعر القديم صفر لو مفيش خصم.`, `Values in ${ccy}. Leave old price 0 if not on sale.`)}</p>
          </div>
        )}

        {/* عناصر الخدمة (المشمولات) ar/en */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>{T("عناصر الخدمة (المشمولات)", "Service includes")}</span>
            <Ghost sm icon={Ic.plus} onClick={addInclude}>{T("إضافة عنصر", "Add item")}</Ghost>
          </div>
          {f.includes.length === 0 && <div style={{ fontSize: 12, color: "var(--abh-steel)", padding: "6px 2px" }}>{T("مفيش عناصر بعد — اضغط «إضافة عنصر».", "No items yet — click “Add item”.")}</div>}
          <div className="abh-col" style={{ gap: 10 }}>
            {f.includes.map((inc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}><LocaleField label={`${T("عنصر", "Item")} ${i + 1}`} value={inc} onChange={(v) => setInclude(i, v)} /></div>
                <IconBtn icon={Ic.x} label={T("حذف", "Remove")} onClick={() => removeInclude(i)} />
              </div>
            ))}
          </div>
        </div>

        {/* الصورة — رفع من الجهاز */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-platinum)", marginBottom: 10 }}>{T("صورة الخدمة", "Service image")}</div>
          <ImageUpload value={f.image} onChange={(p) => set({ image: p })} nameHint={f.name.en || f.name.ar || "service"} isAr={isAr} />
        </div>

        {/* تبديلات */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.featured} onChange={(v) => set({ featured: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>{T("مميّزة", "Featured")}</span></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}><Toggle on={f.active} onChange={(v) => set({ active: v })} /><span style={{ fontSize: 13, color: "rgba(203,205,205,.8)" }}>{T("ظاهرة", "Active")}</span></label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill onClick={() => valid && onSave(f)}>{T("حفظ", "Save")}</Pill>
        </div>
      </div>
    </Modal>
  );
}