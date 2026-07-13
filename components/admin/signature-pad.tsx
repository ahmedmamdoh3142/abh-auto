"use client";
/**
 * components/admin/signature-pad.tsx — لوحة توقيع باللمس/الماوس (مضغوطة).
 * يوقّع العميل، نحوّل الرسم PNG، نرفعه (folder=signatures) ونرجّع المسار.
 * بعد الحفظ يُعرض التوقيع المحفوظ فورًا (لا يفرغ).
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Ic, useToast } from "@/components/admin/ui";

export default function SignaturePad({
  value, onChange, isAr = true, big = false,
}: {
  value: string; onChange: (path: string) => void; isAr?: boolean; big?: boolean;
}) {
  const H = big ? 150 : 96;
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!value); // لو مفيش توقيع، ابدأ بوضع الرسم

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b0c0e";
  }, []);

  useEffect(() => {
    if (!editing) return;
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas, editing]);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: React.PointerEvent) => { e.preventDefault(); drawing.current = true; last.current = pos(e); (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; hasInk.current = true;
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
  };

  const reSign = () => { onChange(""); setEditing(true); setTimeout(setupCanvas, 0); };

  const save = async () => {
    if (!hasInk.current) { toast(T("لازم توقيع أولًا", "Please sign first"), "bad"); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = canvas.width; out.height = canvas.height;
      const octx = out.getContext("2d")!;
      octx.fillStyle = "#ffffff"; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0);
      const blob: Blob = await new Promise((res) => out.toBlob((b) => res(b!), "image/png"));
      const file = new File([blob], "signature.png", { type: "image/png" });
      const fd = new FormData();
      fd.append("file", file); fd.append("folder", "signatures"); fd.append("name", "sig");
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!data.ok || !data.path) throw new Error(data.error || "fail");
      onChange(data.path);
      setEditing(false);         // ← يعرض التوقيع المحفوظ فورًا
      clearCanvas();
      toast(T("تم حفظ التوقيع", "Signature saved"));
    } catch {
      toast(T("فشل حفظ التوقيع", "Failed to save"), "bad");
    } finally { setBusy(false); }
  };

  // عرض التوقيع المحفوظ (مش في وضع التعديل)
  if (value && !editing) {
    return (
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(159,212,176,.35)", background: "#fff", height: H }}>
        <img src={value} alt="signature" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        <button type="button" onClick={reSign} title={T("إعادة التوقيع", "Re-sign")}
          style={{ position: "absolute", top: 6, insetInlineEnd: 6, display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 999, cursor: "pointer", border: "1px solid rgba(231,180,180,.5)", color: "#e7b4b4", background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)" }}>
          {Ic.trash({ s: 13 })}
        </button>
        <span style={{ position: "absolute", bottom: 6, insetInlineStart: 8, fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(62,205,142,.95)", background: "rgba(255,255,255,.75)", padding: "1px 7px", borderRadius: 999 }}>{T("موقّع ✓", "Signed ✓")}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.16)", background: "#f4f4f5", height: H, touchAction: "none" }}>
        <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair", touchAction: "none" }} />
        {!hasInk.current && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 12, color: "rgba(11,12,14,.4)" }}>{T("وقّع هنا", "Sign here")}</span>
          </div>
        )}
        <span style={{ position: "absolute", insetInline: "12%", bottom: "24%", height: 1, background: "rgba(11,12,14,.18)", pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={clearCanvas} disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 14px", fontSize: 11, fontWeight: 600, color: "var(--abh-platinum)", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.15)", cursor: "pointer" }}>
          {Ic.x({ s: 13 })}{T("مسح", "Clear")}
        </button>
        <button type="button" onClick={save} disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "7px 16px", fontSize: 11, fontWeight: 600, color: "#000", background: "linear-gradient(135deg,#fff,#cbcdcd)", border: "none", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}>
          {busy ? T("جارٍ الحفظ…", "Saving…") : <>{Ic.check({ s: 13 })}{T("حفظ", "Save")}</>}
        </button>
      </div>
    </div>
  );
}