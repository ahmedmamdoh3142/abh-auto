"use client";
/**
 * components/admin/inspection-photos.tsx — رفع صور فحص متعددة، كل صورة بكومنت اختياري.
 * كل صورة تُرفع فورًا عبر /api/admin/upload (folder=inspections) وتُضغط WebP على السيرفر.
 * القيمة المُدارة: مصفوفة { url, comment }. السحب/الإفلات المتعدد مدعوم.
 *
 * <InspectionPhotos value={photos} onChange={setPhotos} isAr={isAr} />
 */
import React, { useRef, useState } from "react";
import { Ic, useToast } from "@/components/admin/ui";

export type InspPhoto = { url: string; comment: string };

export default function InspectionPhotos({
  value, onChange, isAr = true, max = 30,
}: {
  value: InspPhoto[]; onChange: (photos: InspPhoto[]) => void; isAr?: boolean; max?: number;
}) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(0); // عدّاد الصور قيد الرفع

  async function uploadOne(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) { toast(T("الملف لازم يكون صورة", "File must be an image"), "bad"); return null; }
    if (file.size > 8 * 1024 * 1024) { toast(T("أقصى حجم 8 ميجا للصورة", "Max 8MB per image"), "bad"); return null; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "inspections");
    fd.append("name", "insp");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.ok || !data.path) { toast(T("فشل رفع صورة", "Failed to upload an image"), "bad"); return null; }
    return data.path as string;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const room = max - value.length;
    if (room <= 0) { toast(T(`الحد الأقصى ${max} صورة`, `Max ${max} photos`), "bad"); return; }
    const take = arr.slice(0, room);
    setUploading((n) => n + take.length);
    await Promise.all(take.map(async (file) => {
      const url = await uploadOne(file);
      if (url) pushPhoto({ url, comment: "" });
      setUploading((n) => Math.max(0, n - 1));
    }));
  }

  // مرجع لأحدث قيمة لتفادي تسابق عند الرفع المتوازي
  const pendingRef = useRef<InspPhoto[]>(value);
  pendingRef.current = value;
  function pushPhoto(p: InspPhoto) {
    const next = [...pendingRef.current, p];
    pendingRef.current = next;
    onChange(next);
  }

  function setComment(i: number, comment: string) {
    const next = value.map((p, idx) => (idx === i ? { ...p, comment } : p));
    onChange(next);
  }

  function remove(i: number) {
    const p = value[i];
    if (p?.url && p.url.startsWith("/inspections/")) {
      fetch(`/api/admin/upload?path=${encodeURIComponent(p.url)}`, { method: "DELETE" }).catch(() => {});
    }
    const next = value.filter((_, idx) => idx !== i);
    pendingRef.current = next;
    onChange(next);
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }} />

      {/* شبكة الصور المرفوعة */}
      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
          {value.map((p, i) => (
            <div key={p.url + i} style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0b0c0e" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#0b0c0e" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => remove(i)} title={T("حذف", "Remove")}
                  style={{ position: "absolute", top: 8, insetInlineEnd: 8, display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: 999, cursor: "pointer", border: "1px solid rgba(231,180,180,.5)", color: "#e7b4b4", background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}>
                  {Ic.trash({ s: 14 })}
                </button>
                <span style={{ position: "absolute", bottom: 8, insetInlineStart: 8, height: 22, minWidth: 22, padding: "0 7px", display: "grid", placeItems: "center", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)" }}>{i + 1}</span>
              </div>
              <input
                value={p.comment}
                onChange={(e) => setComment(i, e.target.value)}
                placeholder={T("ملاحظة (اختياري)…", "Comment (optional)…")}
                dir={isAr ? "rtl" : "ltr"}
                style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "10px 12px", fontSize: 12.5, color: "var(--abh-ivory)", outline: "none" }}
              />
            </div>
          ))}
          {/* بطاقات التحميل الجارية */}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={"up" + i} style={{ borderRadius: 16, border: "1px dashed rgba(255,255,255,.16)", background: "rgba(255,255,255,.02)", aspectRatio: "4 / 3", display: "grid", placeItems: "center" }}>
              <span style={{ height: 26, width: 26, borderRadius: 999, border: "2px solid rgba(255,255,255,.22)", borderTopColor: "#fff", animation: "abh-spin .8s linear infinite" }} />
            </div>
          ))}
        </div>
      )}

      {/* منطقة الإضافة */}
      {value.length < max && (
        <button type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
          style={{
            width: "100%", padding: "22px 16px", borderRadius: 16, cursor: "pointer",
            border: `1.5px dashed ${drag ? "rgba(203,205,205,.6)" : "rgba(255,255,255,.16)"}`,
            background: drag ? "rgba(203,205,205,.06)" : "rgba(255,255,255,.02)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all .25s var(--abh-ease)",
          }}>
          <span style={{ display: "grid", placeItems: "center", height: 44, width: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}>{Ic.image({ s: 20 })}</span>
          <span style={{ fontSize: 13, color: "var(--abh-platinum)" }}>{T("اسحب صور الفحص هنا أو اضغط للاختيار", "Drag inspection photos here or click to choose")}</span>
          <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{T(`تقدر ترفع أكتر من صورة · ${value.length}/${max}`, `Multiple allowed · ${value.length}/${max}`)}</span>
        </button>
      )}

      <style>{`@keyframes abh-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}