"use client";
/**
 * components/admin/image-upload.tsx
 * رفع صورة احترافي: اختيار من الجهاز أو سحب وإفلات، معاينة فورية قبل اكتمال الرفع،
 * رفع تلقائي إلى /api/admin/upload (يحفظ في public/services-img ويرجّع المسار)،
 * مع زر مسح/استبدال. القيمة المُدارة هي مسار الصورة (string) عبر value/onChange.
 *
 * <ImageUpload value={f.image} onChange={(p) => set({ image: p })} nameHint={txt(f.name)} isAr={isAr} />
 */
import React, { useRef, useState } from "react";
import { Ic, useToast } from "@/components/admin/ui";

export default function ImageUpload({
  value, onChange, nameHint = "", isAr = true, folder = "services-img",
}: {
  value: string; onChange: (path: string) => void; nameHint?: string; isAr?: boolean; folder?: string;
}) {
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null); // objectURL مؤقت أثناء الرفع
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const shown = preview || value || "";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast(T("الملف لازم يكون صورة", "File must be an image"), "bad"); return; }
    if (file.size > 8 * 1024 * 1024) { toast(T("أقصى حجم 8 ميجا", "Max size 8MB"), "bad"); return; }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      if (nameHint) fd.append("name", nameHint);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok || !data.path) throw new Error(data.error || "fail");
      // لو فيه صورة قديمة مرفوعة عندنا، نمسحها من السيرفر
      if (value && value.startsWith(`/${folder}/`) && value !== data.path) {
        fetch(`/api/admin/upload?path=${encodeURIComponent(value)}`, { method: "DELETE" }).catch(() => {});
      }
      onChange(data.path);
      toast(T("تم رفع الصورة", "Image uploaded"));
    } catch {
      toast(T("فشل رفع الصورة", "Upload failed"), "bad");
      setPreview(null);
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
      setPreview(null); // بعد النجاح بنعرض value (المسار النهائي)
    }
  }

  function remove() {
    if (value && value.startsWith(`/${folder}/`)) {
      fetch(`/api/admin/upload?path=${encodeURIComponent(value)}`, { method: "DELETE" }).catch(() => {});
    }
    onChange("");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {shown ? (
        /* معاينة الصورة الموجودة/المرفوعة */
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", aspectRatio: "16 / 10", background: "#0b0c0e" }}>
          <img src={shown} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: busy ? 0.5 : 1, transition: "opacity .3s" }} />
          {busy && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)" }}>
              <span style={{ height: 30, width: 30, borderRadius: 999, border: "2px solid rgba(255,255,255,.25)", borderTopColor: "#fff", animation: "abh-spin .8s linear infinite" }} />
            </div>
          )}
          {!busy && (
            <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, display: "flex", gap: 8 }}>
              <button type="button" onClick={() => inputRef.current?.click()} title={T("استبدال", "Replace")}
                style={btn()}>{Ic.pencil({ s: 15 })}</button>
              <button type="button" onClick={remove} title={T("مسح", "Remove")}
                style={btn(true)}>{Ic.trash({ s: 15 })}</button>
            </div>
          )}
          <div style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "10px 12px", background: "linear-gradient(to top, rgba(0,0,0,.7), transparent)", fontSize: 10.5, color: "rgba(255,255,255,.85)", direction: "ltr", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || T("جاري الرفع…", "Uploading…")}</div>
        </div>
      ) : (
        /* منطقة السحب/الاختيار */
        <button type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          style={{
            width: "100%", aspectRatio: "16 / 10", borderRadius: 18, cursor: "pointer",
            border: `1.5px dashed ${drag ? "rgba(203,205,205,.6)" : "rgba(255,255,255,.16)"}`,
            background: drag ? "rgba(203,205,205,.06)" : "rgba(255,255,255,.02)",
            display: "grid", placeItems: "center", gap: 0, transition: "all .25s var(--abh-ease)", color: "var(--abh-steel)",
          }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ display: "grid", placeItems: "center", height: 46, width: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}>{Ic.image ? Ic.image({ s: 20 }) : Ic.plus({ s: 20 })}</span>
            <span style={{ fontSize: 13, color: "var(--abh-platinum)" }}>{T("اسحب صورة هنا أو اضغط للاختيار", "Drag an image here or click to choose")}</span>
            <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{T("WebP / JPG / PNG · حتى 8 ميجا", "WebP / JPG / PNG · up to 8MB")}</span>
          </div>
        </button>
      )}

      <style>{`@keyframes abh-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const btn = (danger?: boolean): React.CSSProperties => ({
  display: "grid", placeItems: "center", height: 34, width: 34, borderRadius: 999, cursor: "pointer",
  border: `1px solid ${danger ? "rgba(231,180,180,.5)" : "rgba(255,255,255,.2)"}`,
  color: danger ? "#e7b4b4" : "var(--abh-ivory)",
  background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)",
});