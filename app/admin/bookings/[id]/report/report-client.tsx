"use client";
/**
 * app/admin/bookings/[id]/report/report-client.tsx — التقرير النهائي.
 * صفحة خفيفة: تجلب البيانات وتفتح نافذة طباعة PDF بهوية ABH.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { card, Ic, Pill, Ghost, useToast } from "@/components/admin/ui";
import { printWorkOrderReport } from "@/lib/admin/report-print";

export default function ReportClient({ bookingId, locale }: { bookingId: string; locale: string }) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const router = useRouter();
  const toast = useToast();

  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/bookings/${bookingId}/report?locale=${isAr ? "ar" : "en"}`)
      .then((res) => res.json())
      .then((j) => { if (alive && j?.ok) setR(j.report); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [bookingId, isAr]);

  const print = useCallback(() => {
    if (!r) return;
    try { printWorkOrderReport(r, { isAr, ccy }); }
    catch (e) { console.error(e); toast(T("تعذّر فتح الطباعة", "Couldn't open print"), "bad"); }
  }, [r, isAr, ccy, T, toast]);

  return (
    <div className="abh-fade-up" style={{ maxWidth: 640, margin: "60px auto 0" }}>
      <div style={{ ...card, padding: 40, textAlign: "center" }}>
        {loading ? (
          <div style={{ color: "var(--abh-steel)" }}>{T("جارٍ التحميل…", "Loading…")}</div>
        ) : !r ? (
          <div style={{ color: "var(--abh-steel)" }}>{T("تعذّر تحميل التقرير.", "Could not load report.")}</div>
        ) : (
          <>
            <div style={{ display: "grid", placeItems: "center", height: 64, width: 64, margin: "0 auto 18px", borderRadius: 999, border: "1px solid rgba(203,205,205,.25)", background: "rgba(203,205,205,.06)", color: "var(--abh-platinum)" }}>
              {Ic.check({ s: 30 })}
            </div>
            <h1 className="abh-display" style={{ margin: 0, fontSize: 26, fontWeight: 300, color: "var(--abh-ivory)", textTransform: "uppercase", lineHeight: 1.1 }}>{T("تقرير أمر العمل", "Work order report")}</h1>
            <div dir="ltr" style={{ fontSize: 12, color: "var(--abh-steel)", marginTop: 8 }}>{r.workOrderNo ? `WO-${r.workOrderNo} · ` : ""}{r.reference}</div>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px 20px", flexWrap: "wrap", marginTop: 22, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <Meta label={T("السيارة", "Vehicle")} value={r.vehicle} />
              <Meta label={T("العميل", "Customer")} value={r.customer} />
              <Meta label={T("المهام", "Tasks")} value={String(r.tasks.length)} />
              <Meta label={T("الصور", "Photos")} value={String(r.intakePhotos.length + r.deliveryPhotos.length)} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 26 }}>
              <Ghost onClick={() => router.push("/admin/bookings")}>{T("رجوع", "Back")}</Ghost>
              <Pill icon={Ic.eye} onClick={print}>{T("فتح التقرير (PDF)", "Open report (PDF)")}</Pill>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--abh-ivory)", marginTop: 3 }}>{value}</div>
    </div>
  );
}