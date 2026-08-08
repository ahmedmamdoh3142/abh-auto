"use client";
/**
 * app/admin/price-files/price-files-client.tsx — نظام «ملفات الأسعار» (CLIENT)
 *
 * شاشتان:
 *  (LIST)   كروت الملفات المحفوظة: بحث + فلتر (فئة/تاريخ) + ترتيب. كرت المعتمد بحدود دهبية.
 *           أزرار كل كرت: فتح · Excel · PDF · اعتماد · حذف.
 *  (EDITOR) إنشاء/فتح ملف: تختار الفئة فتظهر كل الخدمات ككروت بنفس روح صفحة الخدمات.
 *           شكل الكرت يفرق: public = سعر + قديم ، partner/rep = سعر + عمولة.
 *           الحفظ يقترح اسمًا (شهر/سنة) قابلًا للتعديل. «حفظ كنسخة جديدة» من ملف مفتوح.
 *
 * أفكار مضافة: مقارنة ملفين (diff %)، شارة معتمد متحركة، عدّاد الخدمات المسعّرة + إجمالي
 * العمولة، حماية المعتمد من الحذف، تأكيد ذكي قبل اعتماد الشركاء، snapshot كامل immutable.
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Pill, Ghost, IconBtn, Field, Input, Selectbox, Chip, Modal, Confirm, useToast, Ic, EGP, PageHeader, ImageCard } from "@/components/admin/ui";
import { type Loc } from "@/lib/admin/i18n-json";
import { exportPriceFileExcel, exportPriceFilePDF, type ExportGroup } from "@/lib/admin/price-file-export";

type SizeKey = "small" | "medium" | "large";
type Category = "public" | "partner" | "rep";
type Svc = {
  id: number; slug: string; categoryId: number | null;
  name: Loc; image: string; cardImage: string; onRequest: boolean;
  prices: Record<SizeKey, { price: number; old: number }>;
};
type CatOpt = { id: number; label: string };
type SizeOpt = { code: string; label: string };

// خريطة القيم لكل خلية في المحرّر
type CellVals = { price: number; old: number; commission: number };
type PriceMap = Record<string, CellVals>; // "serviceId:size" → vals

type FileHead = {
  id: string; name: string; category: Category; note: string | null;
  isPrimary: boolean; createdAt: string; updatedAt: string;
  pricedCount: number; commissionTotal: number;
};

const SIZE_ORDER: SizeKey[] = ["small", "medium", "large"];
const GOLD = "#c2a04e";

const CAT_META: Record<Category, { ar: string; en: string; icon: string }> = {
  public:  { ar: "أسعار الموقع", en: "Website prices", icon: "🌐" },
  partner: { ar: "الشركاء",      en: "Partners",       icon: "🤝" },
  rep:     { ar: "المناديب",     en: "Reps",           icon: "👤" },
};

function suggestName(cat: Category, isAr: boolean) {
  const d = new Date();
  const month = d.toLocaleString(isAr ? "ar-SA" : "en-US", { month: "long" });
  const year = d.getFullYear();
  const label = isAr ? CAT_META[cat].ar : CAT_META[cat].en;
  return isAr ? `أسعار ${label} — ${month} ${year}` : `${label} — ${month} ${year}`;
}

export default function PriceFilesClient({
  services, categories, sizes, partnerCount, locale,
}: {
  services: Svc[]; categories: CatOpt[]; sizes: SizeOpt[]; partnerCount: number; locale: string;
}) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const ccy = isAr ? "ريال" : "SAR";
  const toast = useToast();

  const [screen, setScreen] = useState<"list" | "editor">("list");
  const [files, setFiles] = useState<FileHead[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // فلاتر القائمة
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [sortBy, setSortBy] = useState<"new" | "old" | "name">("new");

  // حالة المحرّر
  const [editorCat, setEditorCat] = useState<Category>("public");
  const [editorMap, setEditorMap] = useState<PriceMap>({});
  const [openFileId, setOpenFileId] = useState<string | null>(null); // null = ملف جديد
  const [openFileName, setOpenFileName] = useState<string>("");
  const [svcCatFilter, setSvcCatFilter] = useState<number>(0);

  // مودالات
  const [saveModal, setSaveModal] = useState<null | { asNew: boolean }>(null);
  const [confirmDel, setConfirmDel] = useState<FileHead | null>(null);
  const [confirmPrimary, setConfirmPrimary] = useState<FileHead | null>(null);
  const [compareWith, setCompareWith] = useState<FileHead | null>(null);
  const [busy, setBusy] = useState(false);

  const sizeList = sizes.length ? sizes : SIZE_ORDER.map((c) => ({ code: c, label: c }));
  const txt = (l: Loc) => (isAr ? l.ar || l.en : l.en || l.ar) || "";
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.label || "";

  /* ───────── تحميل قائمة الملفات ───────── */
  const loadFiles = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/price-files");
      const data = await res.json();
      setFiles(data?.ok ? data.files : []);
    } catch {
      toast(T("فشل تحميل الملفات", "Failed to load files"), "bad");
    } finally {
      setLoadingList(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadFiles(); }, [loadFiles]);

  /* ───────── فتح/إنشاء ملف في المحرّر ───────── */
  function startNew(cat: Category) {
    // نقطة البداية = الأسعار العامة الحالية لكل الخدمات
    const map: PriceMap = {};
    for (const s of services) {
      if (s.onRequest) continue;
      for (const code of SIZE_ORDER) {
        const p = s.prices[code];
        map[`${s.id}:${code}`] = { price: p?.price || 0, old: p?.old || 0, commission: 0 };
      }
    }
    setEditorCat(cat);
    setEditorMap(map);
    setOpenFileId(null);
    setOpenFileName(suggestName(cat, isAr));
    setSvcCatFilter(0);
    setScreen("editor");
  }

  async function openFile(f: FileHead) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/price-files?id=${encodeURIComponent(f.id)}`);
      const data = await res.json();
      if (!data?.ok) throw new Error();
      const map: PriceMap = {};
      for (const [k, v] of Object.entries<any>(data.file.prices)) {
        map[k] = { price: v.price || 0, old: v.old || 0, commission: v.commission || 0 };
      }
      setEditorCat(f.category);
      setEditorMap(map);
      setOpenFileId(f.id);
      setOpenFileName(f.name);
      setSvcCatFilter(0);
      setScreen("editor");
    } catch {
      toast(T("فشل فتح الملف", "Failed to open file"), "bad");
    } finally {
      setBusy(false);
    }
  }

  const setCell = useCallback((sid: number, size: SizeKey, field: keyof CellVals, val: number) => {
    setEditorMap((m) => {
      const k = `${sid}:${size}`;
      const cur = m[k] ?? { price: 0, old: 0, commission: 0 };
      return { ...m, [k]: { ...cur, [field]: val } };
    });
  }, []);

  /* ───────── بناء payload الـitems من المحرّر ───────── */
  function buildItems() {
    const items: any[] = [];
    for (const s of services) {
      if (s.onRequest) continue;
      for (const code of SIZE_ORDER) {
        const c = editorMap[`${s.id}:${code}`];
        if (!c) continue;
        items.push({
          serviceId: s.id, sizeCode: code,
          price: c.price || 0,
          old: editorCat === "public" ? (c.old || 0) : 0,
          commission: editorCat === "public" ? 0 : (c.commission || 0),
          name: { ar: s.name.ar, en: s.name.en },
        });
      }
    }
    return items;
  }

  /* ───────── حفظ (جديد / نسخة جديدة / تحديث رأس) ───────── */
  async function doSave(name: string, asNew: boolean) {
    const finalName = name.trim();
    if (!finalName) { toast(T("اكتب اسمًا للملف", "Enter a file name"), "bad"); return; }
    setBusy(true);
    try {
      const items = buildItems();
      let res: Response;
      if (openFileId && !asNew) {
        // تحديث الاسم فقط (السطور immutable — التعديلات تُحفظ كنسخة جديدة)
        res = await fetch("/api/admin/price-files", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: openFileId, name: finalName }),
        });
      } else if (openFileId && asNew) {
        res = await fetch("/api/admin/price-files?action=duplicate", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: openFileId, name: finalName, category: editorCat, items }),
        });
      } else {
        res = await fetch("/api/admin/price-files", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: finalName, category: editorCat, items }),
        });
      }
      const data = await res.json();
      if (!data?.ok) throw new Error();
      toast(T("تم حفظ الملف", "File saved"));
      setSaveModal(null);
      await loadFiles();
      setScreen("list");
    } catch {
      toast(T("فشل الحفظ", "Save failed"), "bad");
    } finally {
      setBusy(false);
    }
  }

  /* ───────── اعتماد ملف ───────── */
  async function doApprove(f: FileHead) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/price-files?action=primary", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: f.id }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error();
      if (f.category === "partner" && data.applied) {
        toast(T(`تم الاعتماد وتطبيقه على ${data.applied.partners} شريك`, `Approved & applied to ${data.applied.partners} partners`));
      } else {
        toast(T("تم اعتماد الملف", "File approved"));
      }
      setConfirmPrimary(null);
      await loadFiles();
    } catch {
      toast(T("فشل الاعتماد", "Approve failed"), "bad");
    } finally {
      setBusy(false);
    }
  }

  /* ───────── حذف ───────── */
  async function doDelete(f: FileHead) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/price-files?id=${encodeURIComponent(f.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) {
        if (data?.error === "primary_protected") {
          toast(T("ماينفعش تمسح الملف المعتمد — اعتمد ملفًا آخر أولاً.", "Can't delete the approved file — approve another first."), "bad");
        } else throw new Error();
        return;
      }
      toast(T("تم حذف الملف", "File deleted"));
      setConfirmDel(null);
      await loadFiles();
    } catch {
      toast(T("فشل الحذف", "Delete failed"), "bad");
    } finally {
      setBusy(false);
    }
  }

  /* ───────── تصدير (Excel / PDF) — يحمّل سطور الملف ثم يبني المجموعات ───────── */
  async function doExport(f: FileHead, kind: "excel" | "pdf") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/price-files?id=${encodeURIComponent(f.id)}`);
      const data = await res.json();
      if (!data?.ok) throw new Error();
      const map: PriceMap = {};
      for (const [k, v] of Object.entries<any>(data.file.prices)) map[k] = { price: v.price || 0, old: v.old || 0, commission: v.commission || 0 };

      const groups = buildExportGroups(map);
      const opts = {
        fileName: f.name,
        fileDate: new Date(f.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" }),
        categoryLabel: isAr ? CAT_META[f.category].ar : CAT_META[f.category].en,
        mode: f.category, sizes: sizeList, groups, isAr, ccy, approved: f.isPrimary,
        logoUrl: `${window.location.origin}/images/logo3.webp`,
      };
      if (kind === "excel") exportPriceFileExcel(opts);
      else exportPriceFilePDF(opts);
    } catch {
      toast(T("فشل التصدير", "Export failed"), "bad");
    } finally {
      setBusy(false);
    }
  }

  // يبني مجموعات التصدير من خريطة أسعار + الخدمات الحالية
  function buildExportGroups(map: PriceMap): ExportGroup[] {
    return categories.map((c) => {
      const rows = services.filter((s) => s.categoryId === c.id).map((s) => {
        const cells: Record<string, { price: number; old?: number; commission?: number }> = {};
        for (const sz of sizeList) {
          const cell = map[`${s.id}:${sz.code}`];
          cells[sz.code] = { price: cell?.price || 0, old: cell?.old || 0, commission: cell?.commission || 0 };
        }
        return { name: txt(s.name) || s.slug, onRequest: s.onRequest, cells };
      });
      return { category: c.label, rows };
    }).filter((g) => g.rows.length > 0);
  }

  /* ───────── القائمة المفلترة ───────── */
  const filtered = useMemo(() => {
    let list = files.slice();
    if (filterCat !== "all") list = list.filter((f) => f.category === filterCat);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(needle));
    }
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, isAr ? "ar" : "en");
      const ta = new Date(a.createdAt).getTime(), tb = new Date(b.createdAt).getTime();
      return sortBy === "new" ? tb - ta : ta - tb;
    });
    return list;
  }, [files, filterCat, q, sortBy, isAr]);

  const primaryByCat = useMemo(() => {
    const m: Partial<Record<Category, FileHead>> = {};
    for (const f of files) if (f.isPrimary) m[f.category] = f;
    return m;
  }, [files]);

  /* ════════════════════════ RENDER ════════════════════════ */
  if (screen === "editor") {
    return (
      <PriceFileEditor
        isAr={isAr} T={T} ccy={ccy} services={services} categories={categories} sizes={sizeList}
        editorCat={editorCat} editorMap={editorMap} setCell={setCell}
        openFileId={openFileId} openFileName={openFileName} setOpenFileName={setOpenFileName}
        svcCatFilter={svcCatFilter} setSvcCatFilter={setSvcCatFilter}
        txt={txt} catName={catName} busy={busy}
        onBack={() => setScreen("list")}
        onSave={() => setSaveModal({ asNew: false })}
        onSaveAsNew={() => setSaveModal({ asNew: true })}
        saveModal={saveModal} setSaveModal={setSaveModal}
        doSave={doSave} suggestName={() => suggestName(editorCat, isAr)}
      />
    );
  }

  return (
    <div className="abh-fade-up">
      <style>{`@keyframes abh-goldpulse{0%,100%{box-shadow:0 0 0 0 ${GOLD}55;opacity:.92}50%{box-shadow:0 0 14px 1px ${GOLD}66;opacity:1}}`}</style>
      <PageHeader
        title={T("ملفات الأسعار", "Price files")}
        subtitle={T("احفظ نسخًا موثّقة من الأسعار (موقع / شركاء / مناديب)، اعتمد النسخة الشغّالة، وصدّر Excel وPDF.", "Save documented price snapshots (website / partners / reps), approve the active one, and export Excel & PDF.")}
        seed="price-files-hero"
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["public", "partner", "rep"] as Category[]).map((c) => (
              <Pill key={c} icon={Ic.plus} onClick={() => startNew(c)}>
                {T(`ملف ${CAT_META[c].ar}`, `New ${CAT_META[c].en}`)}
              </Pill>
            ))}
          </div>
        } />

      {/* شريط: المعتمد الحالي لكل فئة */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {(["public", "partner", "rep"] as Category[]).map((c) => {
          const p = primaryByCat[c];
          return (
            <div key={c} style={{ flex: "1 1 220px", minWidth: 200, padding: "14px 16px", borderRadius: 16, border: `1px solid ${p ? GOLD + "66" : "rgba(255,255,255,.08)"}`, background: p ? `linear-gradient(180deg, ${GOLD}14, transparent)` : "rgba(255,255,255,.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: p ? GOLD : "var(--abh-steel)" }}>
                <span>{CAT_META[c].icon}</span>{T(CAT_META[c].ar, CAT_META[c].en)}
                {p && <span style={{ marginInlineStart: "auto", fontSize: 9 }}>★ {T("معتمد", "Approved")}</span>}
              </div>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--abh-ivory)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p ? p.name : T("لا يوجد ملف معتمد", "No approved file")}
              </div>
            </div>
          );
        })}
      </div>

      {/* فلاتر */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}>
        <div style={{ flex: "1 1 240px", minWidth: 200 }}>
          <Field label={T("بحث بالاسم", "Search by name")}>
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder={T("اكتب اسم الملف…", "Type a file name…")} />
          </Field>
        </div>
        <Field label={T("الفئة", "Category")}>
          <Selectbox value={filterCat} onChange={(v: any) => setFilterCat(v)} options={[
            { value: "all", label: T("الكل", "All") },
            { value: "public", label: T(CAT_META.public.ar, CAT_META.public.en) },
            { value: "partner", label: T(CAT_META.partner.ar, CAT_META.partner.en) },
            { value: "rep", label: T(CAT_META.rep.ar, CAT_META.rep.en) },
          ]} />
        </Field>
        <Field label={T("ترتيب", "Sort")}>
          <Selectbox value={sortBy} onChange={(v: any) => setSortBy(v)} options={[
            { value: "new", label: T("الأحدث أولًا", "Newest first") },
            { value: "old", label: T("الأقدم أولًا", "Oldest first") },
            { value: "name", label: T("الاسم", "Name") },
          ]} />
        </Field>
      </div>

      {loadingList ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
          {T("لا توجد ملفات بعد — أنشئ ملفًا جديدًا من الأزرار بالأعلى.", "No files yet — create one from the buttons above.")}
        </div>
      ) : (
        <div className="abh-grid-cards">
          {filtered.map((f, i) => (
            <FileCard
              key={f.id} f={f} i={i} isAr={isAr} T={T} ccy={ccy} GOLD={GOLD}
              catMeta={CAT_META[f.category]}
              onOpen={() => openFile(f)}
              onExcel={() => doExport(f, "excel")}
              onPdf={() => doExport(f, "pdf")}
              onApprove={() => setConfirmPrimary(f)}
              onDelete={() => setConfirmDel(f)}
              onCompare={() => setCompareWith(f)}
            />
          ))}
        </div>
      )}

      {/* تأكيد حذف */}
      {confirmDel && (
        <Confirm
          title={T("حذف ملف", "Delete file")}
          body={T(`متأكد من حذف «${confirmDel.name}»؟ لا يمكن التراجع.`, `Delete “${confirmDel.name}”? This cannot be undone.`)}
          onCancel={() => setConfirmDel(null)} onConfirm={() => doDelete(confirmDel)} />
      )}

      {/* تأكيد الاعتماد — تراجع / تأكيد */}
      {confirmPrimary && (
        <Modal title={T("اعتماد الملف", "Approve file")} onClose={() => setConfirmPrimary(null)}>
          <div className="abh-col" style={{ gap: 18 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--abh-platinum)", lineHeight: 1.8 }}>
              {confirmPrimary.category === "partner"
                ? T(`ده هيغيّر أسعار وعمولات كل الشركاء (${partnerCount} شريك) فورًا لقيم هذا الملف. متأكد؟`, `This will instantly change prices & commissions for ALL partners (${partnerCount}) to this file's values. Sure?`)
                : T(`هيتم اعتماد «${confirmPrimary.name}» كملف الأسعار المعتمد لهذه الفئة. متأكد؟`, `“${confirmPrimary.name}” will become the approved price file for this category. Sure?`)}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Ghost onClick={() => setConfirmPrimary(null)}>{T("تراجع", "Cancel")}</Ghost>
              <Pill icon={Ic.check} onClick={() => doApprove(confirmPrimary)}>{busy ? T("…", "…") : T("تأكيد الاعتماد", "Confirm approval")}</Pill>
            </div>
          </div>
        </Modal>
      )}

      {/* مقارنة ملفين */}
      {compareWith && (
        <CompareModal
          base={compareWith} files={files.filter((x) => x.category === compareWith.category && x.id !== compareWith.id)}
          services={services} sizeList={sizeList} editorCatOf={compareWith.category}
          isAr={isAr} T={T} ccy={ccy} txt={txt} onClose={() => setCompareWith(null)} />
      )}
    </div>
  );
}

/* ════════════════ كرت ملف واحد ════════════════ */
function FileCard({ f, i, isAr, T, ccy, GOLD, catMeta, onOpen, onExcel, onPdf, onApprove, onDelete, onCompare }: any) {
  const date = new Date(f.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const showComm = f.category !== "public";
  return (
    <div style={{ animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both`, borderRadius: 22, overflow: "hidden", border: `1px solid ${f.isPrimary ? GOLD : "rgba(255,255,255,.1)"}`, background: f.isPrimary ? `linear-gradient(180deg, ${GOLD}12, rgba(255,255,255,.02))` : "rgba(255,255,255,.02)", boxShadow: f.isPrimary ? `0 0 0 1px ${GOLD}55, 0 20px 50px -25px ${GOLD}55` : "none", position: "relative" }}>
      {f.isPrimary && (
        <div style={{ position: "absolute", insetInlineEnd: 14, top: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999, border: `1px solid ${GOLD}`, background: "rgba(0,0,0,.4)", color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", animation: "abh-goldpulse 2.4s ease-in-out infinite" }}>
          ★ {T("معتمد", "APPROVED")}
        </div>
      )}
      <div style={{ padding: "22px 20px 18px" }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: f.isPrimary ? GOLD : "var(--abh-steel)", display: "flex", alignItems: "center", gap: 7 }}>
          <span>{catMeta.icon}</span>{T(catMeta.ar, catMeta.en)}
        </div>
        <h3 className="abh-display" style={{ margin: "8px 0 0", fontSize: 23, color: "var(--abh-ivory)", lineHeight: 1.2 }}>{f.name}</h3>
        <div style={{ marginTop: 5, fontSize: 11.5, color: "var(--abh-steel)", display: "flex", alignItems: "center", gap: 6 }}>
          <Ic.calendar s={12} />{date}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="abh-num" style={{ fontSize: 20, color: "var(--abh-ivory)" }}>{f.pricedCount}</span>
            <span style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("خدمة مسعّرة", "Priced")}</span>
          </div>
          {showComm && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="abh-num" dir="ltr" style={{ fontSize: 20, color: "var(--abh-ivory)" }}>{EGP(f.commissionTotal)}</span>
              <span style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("إجمالي العمولة", "Total comm.")}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "0 16px 16px" }}>
        <Ghost sm icon={Ic.pencil} onClick={onOpen}>{T("فتح", "Open")}</Ghost>
        <Ghost sm icon={Ic.grid} onClick={onExcel}>Excel</Ghost>
        <Ghost sm icon={Ic.sparkle} onClick={onPdf}>PDF</Ghost>
        <Ghost sm icon={Ic.trending} onClick={onCompare}>{T("قارن", "Compare")}</Ghost>
        {!f.isPrimary && <Ghost sm icon={Ic.check} onClick={onApprove}>{T("اعتمد", "Approve")}</Ghost>}
        <span style={{ marginInlineStart: "auto" }} />
        <IconBtn icon={Ic.trash} label={T("حذف", "Delete")} danger onClick={onDelete} />
      </div>
    </div>
  );
}

/* ════════════════ المحرّر (إنشاء/فتح ملف) ════════════════ */
function PriceFileEditor({
  isAr, T, ccy, services, categories, sizes, editorCat, editorMap, setCell,
  openFileId, openFileName, setOpenFileName, svcCatFilter, setSvcCatFilter,
  txt, catName, busy, onBack, onSave, onSaveAsNew, saveModal, setSaveModal, doSave, suggestName,
}: any) {
  const isPublic = editorCat === "public";
  const cats = [{ id: 0, label: T("الكل", "All") }, ...categories];
  const shown = services.filter((s: Svc) => svcCatFilter === 0 || s.categoryId === svcCatFilter);

  const pricedCount = useMemo(() => {
    let n = 0;
    const seen = new Set<number>();
    for (const [k, v] of Object.entries<CellVals>(editorMap)) {
      if ((v.price || 0) > 0) { const sid = Number(k.split(":")[0]); if (!seen.has(sid)) { seen.add(sid); n++; } }
    }
    return n;
  }, [editorMap]);

  const commTotal = useMemo(() => {
    if (isPublic) return 0;
    return Object.values(editorMap as Record<string, CellVals>).reduce((s, c) => s + ((c.price || 0) > 0 ? (c.commission || 0) : 0), 0);
  }, [editorMap, isPublic]);

  const catLabel = isAr ? CAT_META[editorCat as Category].ar : CAT_META[editorCat as Category].en;

  return (
    <div className="abh-fade-up">
      <PageHeader
        title={openFileId ? T("تعديل ملف أسعار", "Edit price file") : T("ملف أسعار جديد", "New price file")}
        subtitle={T(`الفئة: ${catLabel}. ${isPublic ? "عدّل السعر والسعر القديم لكل خدمة." : "عدّل السعر والعمولة لكل خدمة."} ثم احفظ باسم موثّق.`, `Category: ${catLabel}. ${isPublic ? "Edit price & old price per service." : "Edit price & commission per service."} Then save with a documented name.`)}
        seed="price-files-editor"
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Ghost icon={Ic.x} onClick={onBack}>{T("رجوع", "Back")}</Ghost>
            {openFileId && <Ghost icon={Ic.plus} onClick={onSaveAsNew}>{T("حفظ كنسخة جديدة", "Save as new")}</Ghost>}
            <Pill icon={Ic.check} onClick={onSave}>{busy ? T("…", "…") : openFileId ? T("حفظ", "Save") : T("حفظ الملف", "Save file")}</Pill>
          </div>
        } />

      {/* شريط ملخّص */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", marginBottom: 20, padding: "14px 18px", borderRadius: 16, border: `1px solid ${GOLD}33`, background: `linear-gradient(180deg, ${GOLD}0a, rgba(255,255,255,.02))` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="abh-num" style={{ fontSize: 22, color: "var(--abh-ivory)" }}>{pricedCount}</span>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{T("خدمة مسعّرة", "Priced services")}</span>
        </div>
        {!isPublic && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="abh-num" dir="ltr" style={{ fontSize: 22, color: "var(--abh-ivory)" }}>{EGP(commTotal)}</span>
            <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{ccy} · {T("إجمالي العمولة", "Total commission")}</span>
          </div>
        )}
        <div style={{ marginInlineStart: "auto", fontSize: 11.5, color: "var(--abh-platinum)" }}>{CAT_META[editorCat as Category].icon} {catLabel}</div>
      </div>

      {/* فلتر التصنيف */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {cats.map((c: any) => {
          const on = svcCatFilter === c.id;
          return <button key={c.id} onClick={() => setSvcCatFilter(c.id)} style={{ borderRadius: 999, padding: "8px 16px", fontSize: 11.5, border: `1px solid ${on ? "rgba(203,205,205,.4)" : "rgba(255,255,255,.1)"}`, color: on ? "var(--abh-ivory)" : "rgba(203,205,205,.65)", background: on ? "rgba(203,205,205,.08)" : "transparent", cursor: "pointer" }}>{c.label}</button>;
        })}
      </div>

      <div className="abh-grid-cards">
        {shown.map((s: Svc, i: number) => (
          <div key={s.id} style={{ animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.03}s both` }}>
            <ImageCard image={s.image} seed={s.slug || txt(s.name)} height={300} topRight={<Chip tone="platinum">{catName(s.categoryId)}</Chip>}>
              <h3 className="abh-display" style={{ margin: 0, fontSize: 24, color: "var(--abh-ivory)" }}>{txt(s.name) || "—"}</h3>
              {s.onRequest ? (
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--abh-platinum)" }}>{T("هذه الخدمة «حسب الطلب» — لا تُسعَّر.", "“On request” — not priced.")}</div>
              ) : (
                <EditorRows svc={s} sizes={sizes} editorMap={editorMap} setCell={setCell} isPublic={isPublic} isAr={isAr} T={T} ccy={ccy} />
              )}
            </ImageCard>
          </div>
        ))}
        {shown.length === 0 && <div style={{ gridColumn: "1/-1", borderRadius: 24, border: "1px dashed rgba(255,255,255,.12)", padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>{T("لا توجد خدمات في هذا التصنيف.", "No services here.")}</div>}
      </div>

      {/* مودال الحفظ (اسم مقترح قابل للتعديل) */}
      {saveModal && (
        <SaveModal
          asNew={saveModal.asNew} initialName={saveModal.asNew ? suggestName() : openFileName}
          isAr={isAr} T={T} busy={busy}
          onClose={() => setSaveModal(null)}
          onConfirm={(name: string) => doSave(name, saveModal.asNew)} />
      )}
    </div>
  );
}

/* صفوف تعديل السعر/العمولة داخل كرت الخدمة */
function EditorRows({ svc, sizes, editorMap, setCell, isPublic, isAr, T, ccy }: any) {
  const availSizes = (sizes.length ? sizes.map((s: SizeOpt) => s.code) : SIZE_ORDER) as SizeKey[];
  const sizeLabel = (code: string) => sizes.find((s: SizeOpt) => s.code === code)?.label || code;
  const cellInput: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", padding: "8px 10px", fontSize: 13, color: "var(--abh-ivory)", outline: "none", textAlign: isAr ? "right" : "left" };
  const pctInput: React.CSSProperties = { ...cellInput, borderColor: "rgba(194,160,78,.35)", background: "rgba(194,160,78,.06)" };

  const col2 = isPublic ? T("قبل الخصم", "Before") : T("السعر", "Price");
  const col3 = isPublic ? T("نسبة الخصم %", "Discount %") : T("نسبة العمولة %", "Commission %");
  const col4 = isPublic ? T("بعد الخصم", "After") : T("العمولة", "Commission");

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.12)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 8, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 6 }}>
        <span>{T("الحجم", "Size")}</span><span>{col2}</span><span style={{ color: "#c2a04e" }}>{col3}</span><span>{col4}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {availSizes.map((size) => {
          const c = editorMap[`${svc.id}:${size}`] ?? { price: 0, old: 0, commission: 0 };

          if (isPublic) {
            const old = c.old || 0;
            const price = c.price || 0;
            const pct = old > 0 ? Math.max(0, Math.round((1 - price / old) * 1000) / 10) : 0;
            const setPct = (newPct: number) => {
              const clamped = Math.max(0, Math.min(95, newPct));
              const base = old > 0 ? old : price;
              if (!(old > 0)) setCell(svc.id, size, "old", base);
              setCell(svc.id, size, "price", Math.max(0, Math.round(base * (1 - clamped / 100))));
            };
            return (
              <div key={size} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--abh-platinum)", minWidth: 52 }}>{sizeLabel(size)}</span>
                <input type="number" min={0} value={old || ""} placeholder="0" dir="ltr" style={cellInput}
                  onChange={(e) => setCell(svc.id, size, "old", Math.max(0, +e.target.value))} />
                <input type="number" min={0} max={95} value={pct || ""} placeholder="0" dir="ltr" style={pctInput}
                  onChange={(e) => setPct(+e.target.value)} />
                <input type="number" min={0} value={price || ""} placeholder="0" dir="ltr" style={cellInput}
                  onChange={(e) => setCell(svc.id, size, "price", Math.max(0, +e.target.value))} />
              </div>
            );
          }

          const price = c.price || 0;
          const commission = c.commission || 0;
          const pct = price > 0 ? Math.round((commission / price) * 1000) / 10 : 0;
          const setPct = (newPct: number) => {
            const clamped = Math.max(0, newPct);
            setCell(svc.id, size, "commission", Math.round((price * clamped) / 100));
          };
          return (
            <div key={size} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--abh-platinum)", minWidth: 52 }}>{sizeLabel(size)}</span>
              <input type="number" min={0} value={price || ""} placeholder="0" dir="ltr" style={cellInput}
                onChange={(e) => setCell(svc.id, size, "price", Math.max(0, +e.target.value))} />
              <input type="number" min={0} value={pct || ""} placeholder="0" dir="ltr" style={pctInput}
                onChange={(e) => setPct(+e.target.value)} />
              <input type="number" min={0} value={commission || ""} placeholder="0" dir="ltr" style={cellInput}
                onChange={(e) => setCell(svc.id, size, "commission", Math.max(0, +e.target.value))} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "var(--abh-steel)", lineHeight: 1.7 }}>
        {isPublic
          ? T(`القيم بالـ${ccy}. عدّل النسبة أو السعر بعد الخصم — بيتحسبوا أوتوماتيك مع بعض.`, `Values in ${ccy}. Edit the % or the after-price — they auto-calculate together.`)
          : T(`القيم بالـ${ccy}. عدّل النسبة أو رقم العمولة — بيتحسبوا أوتوماتيك مع بعض.`, `Values in ${ccy}. Edit the % or the commission amount — they auto-calculate together.`)}
      </div>
    </div>
  );
}

/* مودال الحفظ بالاسم */
function SaveModal({ asNew, initialName, isAr, T, busy, onClose, onConfirm }: any) {
  const [name, setName] = useState<string>(initialName || "");
  return (
    <Modal title={asNew ? T("حفظ كنسخة جديدة", "Save as new copy") : T("حفظ الملف", "Save file")} onClose={onClose}>
      <div className="abh-col" style={{ gap: 16 }}>
        <Field label={T("اسم الملف", "File name")} hint={T("مقترح تلقائيًا — تقدر تعدّله.", "Auto-suggested — you can edit it.")}>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder={T("مثال: أسعار الموقع — يونيو 2026", "e.g. Website — June 2026")} autoFocus />
        </Field>
        {asNew && <div style={{ fontSize: 11.5, color: "var(--abh-platinum)", lineHeight: 1.7 }}>{T("هيتحفظ كملف مستقل جديد بتاريخ اليوم، والأصل يفضل زي ما هو.", "Saved as a new independent file dated today; the original stays unchanged.")}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Ghost onClick={onClose}>{T("إلغاء", "Cancel")}</Ghost>
          <Pill icon={Ic.check} onClick={() => name.trim() && onConfirm(name)}>{busy ? T("…", "…") : T("حفظ", "Save")}</Pill>
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════ مقارنة ملفين (diff %) ════════════════ */
function CompareModal({ base, files, services, sizeList, editorCatOf, isAr, T, ccy, txt, onClose }: any) {
  const [otherId, setOtherId] = useState<string>("");
  const [baseMap, setBaseMap] = useState<PriceMap | null>(null);
  const [otherMap, setOtherMap] = useState<PriceMap | null>(null);
  const [loading, setLoading] = useState(false);
  const isPublic = editorCatOf === "public";

  const load = useCallback(async (id: string, set: (m: PriceMap) => void) => {
    const res = await fetch(`/api/admin/price-files?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (data?.ok) {
      const m: PriceMap = {};
      for (const [k, v] of Object.entries<any>(data.file.prices)) m[k] = { price: v.price || 0, old: v.old || 0, commission: v.commission || 0 };
      set(m);
    }
  }, []);

  useEffect(() => { load(base.id, setBaseMap); }, [base.id, load]);
  useEffect(() => {
    if (!otherId) { setOtherMap(null); return; }
    setLoading(true);
    load(otherId, setOtherMap).finally(() => setLoading(false));
  }, [otherId, load]);

  // صفوف الفرق (السعر + العمولة)
  const diffs = useMemo(() => {
    if (!baseMap || !otherMap) return [];
    const rows: { name: string; kind: "price" | "comm"; from: number; to: number; pct: number }[] = [];
    const pushDiff = (label: string, kind: "price" | "comm", a: number, b: number) => {
      if (a === b) return;
      const pct = a > 0 ? Math.round(((b - a) / a) * 100) : 100;
      rows.push({ name: label, kind, from: a, to: b, pct });
    };
    for (const s of services as Svc[]) {
      if (s.onRequest) continue;
      for (const sz of sizeList) {
        const k = `${s.id}:${sz.code}`;
        const other = otherMap[k] || { price: 0, old: 0, commission: 0 }; // القديم (الآخر)
        const base = baseMap[k] || { price: 0, old: 0, commission: 0 };    // الأساس (المفتوح)
        const label = `${txt(s.name)} · ${sz.label}`;
        pushDiff(label, "price", other.price || 0, base.price || 0);
        // العمولة تُقارن فقط لو الفئة شركاء/مناديب
        if (!isPublic) pushDiff(label, "comm", other.commission || 0, base.commission || 0);
      }
    }
    return rows;
  }, [baseMap, otherMap, services, sizeList, txt, isPublic]);

  return (
    <Modal title={T("مقارنة ملفين", "Compare two files")} onClose={onClose} wide>
      <div className="abh-col" style={{ gap: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label={T("الملف الحالي", "Current file")}><Input value={base.name} disabled /></Field>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label={T("قارن مع", "Compare with")}>
              <Selectbox value={otherId} onChange={(v: any) => setOtherId(v)}
                options={[{ value: "", label: T("اختر ملفًا", "Select a file") }, ...files.map((f: FileHead) => ({ value: f.id, label: f.name }))]} />
            </Field>
          </div>
        </div>

        {!otherId ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--abh-steel)" }}>{T("اختر ملفًا للمقارنة.", "Pick a file to compare.")}</div>
        ) : loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--abh-steel)" }}>{T("جارٍ…", "Loading…")}</div>
        ) : diffs.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--abh-ok)" }}>{T("لا توجد فروقات في الأسعار بين الملفين.", "No price differences between the two files.")}</div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: "#111" }}>
                  <th style={{ textAlign: isAr ? "right" : "left", padding: "10px 12px", color: "var(--abh-steel)", fontWeight: 600 }}>{T("الخدمة / الحجم", "Service / Size")}</th>
                  <th style={{ padding: "10px 12px", color: "var(--abh-steel)", fontWeight: 600 }}>{T("النوع", "Type")}</th>
                  <th style={{ padding: "10px 12px", color: "var(--abh-steel)", fontWeight: 600 }} dir="ltr">{T("من", "From")}</th>
                  <th style={{ padding: "10px 12px", color: "var(--abh-steel)", fontWeight: 600 }} dir="ltr">{T("إلى", "To")}</th>
                  <th style={{ padding: "10px 12px", color: "var(--abh-steel)", fontWeight: 600 }} dir="ltr">%</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => {
                  const up = d.to > d.from;
                  const col = up ? "var(--abh-bad)" : "var(--abh-ok)";
                  const typeLabel = d.kind === "price" ? T("سعر", "Price") : T("عمولة", "Comm.");
                  const typeColor = d.kind === "price" ? "var(--abh-platinum)" : "#c2a04e";
                  return (
                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <td style={{ padding: "9px 12px", color: "var(--abh-ivory)" }}>{d.name}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>
                        <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 999, border: `1px solid ${typeColor}55`, color: typeColor }}>{typeLabel}</span>
                      </td>
                      <td className="abh-num" dir="ltr" style={{ padding: "9px 12px", color: "var(--abh-steel)", textAlign: "center" }}>{EGP(d.from)}</td>
                      <td className="abh-num" dir="ltr" style={{ padding: "9px 12px", color: "var(--abh-ivory)", textAlign: "center" }}>{EGP(d.to)}</td>
                      <td className="abh-num" dir="ltr" style={{ padding: "9px 12px", color: col, textAlign: "center", fontWeight: 700 }}>{d.pct > 0 ? "+" : ""}{d.pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Ghost onClick={onClose}>{T("إغلاق", "Close")}</Ghost>
        </div>
      </div>
    </Modal>
  );
}

export { CAT_META, suggestName };