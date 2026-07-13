"use client";
/**
 * app/admin/bookings/[id]/delivery/delivery-client.tsx — تسليم السيارة (CLIENT).
 * صور التسليم + توقيع العميل + ملاحظات نهائية → إتمام الحجز.
 */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { card, Ic, Pill, Textarea, useToast, EGP } from "@/components/admin/ui";
import { brandImg } from "@/lib/brand-image";
import SignaturePad from "@/components/admin/signature-pad";
import InspectionPhotos, { type InspPhoto } from "@/components/admin/inspection-photos";

export default function DeliveryClient({ booking, locale }: { booking: any; locale: string }) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const router = useRouter();

  const [photos, setPhotos] = useState<InspPhoto[]>([]);
  const [signature, setSignature] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const unpaid = booking.payment !== "paid";
  const done = booking.alreadyDelivered;

  async function submit() {
    if (!signature) { toast(T("توقيع العميل إجباري", "Signature required"), "bad"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/deliver`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureUrl: signature, signerName: booking.customer,
          notes: notes.trim() || null,
          photos: photos.map((p) => ({ url: p.url, comment: p.comment })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg: Record<string, string> = {
          not_ready: T("السيارة مش جاهزة للتسليم", "Vehicle not ready"),
          signature_required: T("توقيع العميل إجباري", "Signature required"),
        };
        throw new Error(msg[data.error] || T("فشل التسليم", "Delivery failed"));
      }
      toast(T("تم التسليم — أمر العمل مكتمل ✓", "Delivered — work order complete ✓"));
      router.push(`/admin/bookings/${booking.id}/report`);
      router.refresh();
    } catch (e: any) { toast(e.message, "bad"); }
    finally { setBusy(false); }
  }

  return (
    <div className="abh-fade-up" style={{ paddingBottom: 40, maxWidth: 900, margin: "0 auto" }}>
      {/* رأس */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => router.push("/admin/bookings")} style={{ display: "grid", placeItems: "center", height: 40, width: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", color: "var(--abh-platinum)", cursor: "pointer", flexShrink: 0, transform: isAr ? "none" : "scaleX(-1)" }}><Ic.chevDown s={17} extra="abh-flip" /></button>
        <div style={{ flex: 1 }}>
          <h1 className="abh-display" style={{ margin: 0, fontSize: 26, fontWeight: 300, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1 }}>{T("تسليم السيارة", "Vehicle delivery")}</h1>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 4 }} dir="ltr">{booking.workOrderNo ? `WO-${booking.workOrderNo} · ` : ""}{booking.reference}</div>
        </div>
        {done && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#3ecd8e", border: "1px solid rgba(62,205,142,.35)", background: "rgba(62,205,142,.08)", borderRadius: 999, padding: "6px 12px" }}>{Ic.check({ s: 13 })}{T("تم التسليم", "Delivered")}</span>}
      </div>

      {/* شريط السيارة */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", marginBottom: 18 }}>
        <span style={{ height: 44, width: 62, borderRadius: 10, flexShrink: 0, backgroundImage: `url('${brandImg(booking.brandId, booking.plate || booking.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.7)" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="abh-display" style={{ fontSize: 18, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1 }}>{booking.vehicle}</div>
          <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 3 }}>{booking.customer}{booking.plate && <span dir="ltr"> · {booking.plate}</span>}</div>
        </div>
        <div style={{ textAlign: isAr ? "left" : "right", flexShrink: 0 }}>
          <div className="abh-num" dir="ltr" style={{ fontSize: 18, color: "var(--abh-ivory)" }}>{EGP(booking.total)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
        </div>
      </div>

      {done ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <div style={{ color: "#3ecd8e", display: "flex", justifyContent: "center", marginBottom: 12 }}>{Ic.check({ s: 42 })}</div>
          <div style={{ fontSize: 16, color: "var(--abh-ivory)", marginBottom: 8 }}>{T("تم تسليم السيارة", "Vehicle delivered")}</div>
          <div style={{ fontSize: 12.5, color: "var(--abh-steel)", marginBottom: 22 }}>{T("أمر العمل مكتمل.", "Work order complete.")}</div>
          <Pill icon={Ic.eye} onClick={() => router.push(`/admin/bookings/${booking.id}/report`)}>{T("عرض التقرير النهائي", "View final report")}</Pill>
        </div>
      ) : (
        <>
          {/* تنبيه الدفع */}
          {unpaid && (
            <div style={{ ...card, padding: "14px 16px", marginBottom: 18, border: "1px solid rgba(255,183,35,.35)", background: "rgba(255,183,35,.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#ffb723", display: "inline-flex" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
              </span>
              <span style={{ fontSize: 12.5, color: "#ffb723" }}>{T("تنبيه: الحجز لسه غير مدفوع — اتأكد من التحصيل قبل التسليم.", "Warning: booking is unpaid — collect payment before delivery.")}</span>
            </div>
          )}

          <div className="abh-col" style={{ gap: 18 }}>
            {/* صور التسليم */}
            <Section n={1} title={T("صور التسليم", "Delivery photos")} hint={T("صوّر السيارة بعد الشغل — توثّق حالة التسليم.", "Photograph the finished vehicle.")}>
              <InspectionPhotos value={photos} onChange={setPhotos} isAr={isAr} />
            </Section>

            {/* ملاحظات نهائية */}
            <Section n={2} title={T("ملاحظات نهائية", "Final notes")} hint={T("اختياري — أي ملاحظة للعميل أو للسجل.", "Optional — for the customer or record.")}>
              <Textarea rows={3} value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={T("مثال: تم تسليم السيارة بحالة ممتازة…", "e.g. Vehicle delivered in excellent condition…")} style={{ fontSize: 14 }} />
            </Section>

            {/* توقيع الاستلام */}
            <Section n={3} title={T("توقيع العميل بالاستلام", "Customer signature")} required isAr={isAr} done={!!signature}
              hint={T("يوقّع العميل بإقرار استلام السيارة.", "Customer signs to confirm receipt.")}>
              <SignaturePad value={signature} onChange={setSignature} isAr={isAr} big />
            </Section>
          </div>

          {/* شريط الإتمام */}
          <div style={{ ...card, marginTop: 18, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "rgba(16,17,19,.96)" }}>
            <span style={{ fontSize: 12.5, color: signature ? "#3ecd8e" : "var(--abh-steel)", display: "inline-flex", alignItems: "center", gap: 7 }}>
              {signature ? <>{Ic.check({ s: 14 })}{T("جاهز للتسليم", "Ready to complete")}</> : T("• توقيع العميل مطلوب", "• Signature required")}
            </span>
            <Pill icon={Ic.check} onClick={submit}>{busy ? T("جارٍ…", "…") : T("إتمام التسليم", "Complete delivery")}</Pill>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ n, title, hint, required, done, isAr, children }: any) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <span className="abh-num" style={{ display: "grid", placeItems: "center", height: 28, width: 28, flexShrink: 0, borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: done ? "none" : "1px solid rgba(255,255,255,.15)", background: done ? "linear-gradient(135deg,#9fd4b0,#7fc49a)" : "rgba(255,255,255,.03)", color: done ? "#0b0c0e" : "var(--abh-platinum)" }}>
          {done ? <Ic.check s={14} sw={2.6} /> : n}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15.5, color: "var(--abh-ivory)" }}>{title}</span>
            {required && <span style={{ fontSize: 9, color: "#e7b4b4", border: "1px solid rgba(231,180,180,.4)", borderRadius: 999, padding: "1px 8px" }}>{isAr ? "إجباري" : "Required"}</span>}
          </div>
          {hint && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--abh-steel)", lineHeight: 1.5 }}>{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}