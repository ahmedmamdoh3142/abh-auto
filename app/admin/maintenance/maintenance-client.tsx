"use client";
/**
 * app/admin/maintenance/maintenance-client.tsx — طلبات صيانة الضمان (CLIENT).
 * قبول الطلب ينشئ حجز صيانة مجاني فورًا (عبر PATCH action=approve)، والرفض
 * يتطلّب سبب إجباري (نص فقط، بدون قائمة أسباب جاهزة).
 */
import { useMemo, useState } from "react";
import { card, Ghost, Ic, useToast, PageHeader, Modal, Textarea } from "@/components/admin/ui";

type Req = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleLabel: string;
  plate: string;
  warrantyServiceName: string;
  warrantyExpiresAt: string | null;
  problemDescription: string;
  branchCode: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  reviewedByName: string;
  reviewedAt: string | null;
  resultingReference: string;
  createdAt: string;
};

const STATUS_TONE: Record<string, { ar: string; en: string; color: string }> = {
  pending: { ar: "قيد المراجعة", en: "Pending", color: "#e8cf9a" },
  approved: { ar: "مقبولة", en: "Approved", color: "#3ecd8e" },
  rejected: { ar: "مرفوضة", en: "Rejected", color: "#ef5a4d" },
};

export default function MaintenanceClient({ initial, locale }: { initial: Req[]; locale?: string }) {
  const isAr = locale !== "en";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<Req | null>(null);
  const [reason, setReason] = useState("");

  const counts = useMemo(
    () => ({
      all: list.length,
      pending: list.filter((r) => r.status === "pending").length,
      approved: list.filter((r) => r.status === "approved").length,
      rejected: list.filter((r) => r.status === "rejected").length,
    }),
    [list]
  );

  const filtered = tab === "all" ? list : list.filter((r) => r.status === tab);

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(+d)) return iso;
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  async function patch(id: string, body: any) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "fail");
      return j;
    } finally {
      setBusy(false);
    }
  }

  const approve = async (r: Req) => {
    try {
      const j = await patch(r.id, { action: "approve" });
      setList((ls) =>
        ls.map((x) => (x.id === r.id ? { ...x, status: "approved", resultingReference: j.booking?.reference || "" } : x))
      );
      toast(T(`تمت الموافقة — حجز الصيانة: ${j.booking?.reference ?? ""}`, `Approved — booking ${j.booking?.reference ?? ""}`));
    } catch {
      toast(T("فشلت الموافقة", "Approval failed"), "bad");
    }
  };

  const submitReject = async () => {
    if (!rejecting || !reason.trim()) return;
    try {
      await patch(rejecting.id, { action: "reject", reason: reason.trim() });
      setList((ls) => ls.map((x) => (x.id === rejecting.id ? { ...x, status: "rejected", rejectionReason: reason.trim() } : x)));
      toast(T("تم رفض الطلب", "Request rejected"));
      setRejecting(null);
      setReason("");
    } catch {
      toast(T("فشل الرفض", "Rejection failed"), "bad");
    }
  };

  const tabs: [string, string][] = [
    ["pending", T("قيد المراجعة", "Pending")],
    ["approved", T("مقبولة", "Approved")],
    ["rejected", T("مرفوضة", "Rejected")],
    ["all", T("الكل", "All")],
  ];

  return (
    <div className="abh-fade-up">
      <PageHeader
        title={T("طلبات صيانة الضمان", "Warranty service requests")}
        subtitle={T(
          "راجع طلبات صيانة الضمان المجانية ووافق أو ارفض مع ذكر السبب.",
          "Review free warranty service requests — approve or reject with a reason."
        )}
        seed="maintenance-hero"
      />

      <div
        style={{
          display: "flex",
          gap: 4,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.08)",
          background: "rgba(255,255,255,.02)",
          padding: 4,
          marginBottom: 20,
          width: "fit-content",
        }}
      >
        {tabs.map(([k, l]) => {
          const on = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              style={{
                borderRadius: 999,
                padding: "9px 16px",
                fontSize: 11.5,
                color: on ? "#000" : "rgba(203,205,205,.7)",
                background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {l}
              <span style={{ marginInlineStart: 6, opacity: on ? 0.6 : 1 }}>{(counts as any)[k] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...card, borderStyle: "dashed", padding: 56, textAlign: "center", color: "var(--abh-steel)" }}>
          {T("لا توجد طلبات في هذا التصنيف", "No requests in this category")}
        </div>
      ) : (
        <div className="abh-col" style={{ gap: 14 }}>
          {filtered.map((r) => {
            const st = STATUS_TONE[r.status];
            return (
              <div key={r.id} style={{ ...card, padding: 20, borderInlineStart: `3px solid ${st.color}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 10,
                          color: st.color,
                          background: `${st.color}1a`,
                          border: `1px solid ${st.color}55`,
                        }}
                      >
                        {isAr ? st.ar : st.en}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--abh-steel)" }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    <div className="abh-display" style={{ fontSize: 19, color: "var(--abh-ivory)", textTransform: "uppercase" }}>
                      {r.vehicleLabel}
                    </div>
                    <div dir="ltr" style={{ fontSize: 11, color: "var(--abh-steel)" }}>
                      {r.plate}
                    </div>
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <div style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{r.customerName}</div>
                    <div dir="ltr" style={{ fontSize: 11, color: "var(--abh-steel)" }}>
                      {r.customerPhone}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.07)",
                    background: "rgba(255,255,255,.02)",
                    padding: "12px 15px",
                  }}
                >
                  <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)", marginBottom: 6 }}>
                    {T("المشكلة", "Issue")}
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--abh-platinum)" }}>{r.problemDescription}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 12 }}>
                  <MiniField label={T("الخدمة المغطّاة", "Covered service")} value={r.warrantyServiceName || "—"} />
                  <MiniField label={T("الضمان حتى", "Warranty until")} value={fmtDate(r.warrantyExpiresAt || "")} />
                  <MiniField label={T("الموعد المفضّل", "Preferred slot")} value={`${r.preferredDate || "—"} ${r.preferredTime || ""}`} ltr />
                  <MiniField label={T("الفرع", "Branch")} value={r.branchCode || "—"} />
                </div>

                {r.status === "rejected" && r.rejectionReason && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "#f0b3ac" }}>
                    <strong style={{ fontWeight: 600 }}>{T("سبب الرفض", "Rejection reason")}:</strong> {r.rejectionReason}
                  </div>
                )}
                {r.status === "approved" && r.resultingReference && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: "#3ecd8e" }}>
                    {T("حجز الصيانة", "Service booking")}: <span dir="ltr">{r.resultingReference}</span>
                  </div>
                )}

                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      disabled={busy}
                      onClick={() => approve(r)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 999,
                        border: "none",
                        padding: "10px 20px",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        color: "#0c0d0e",
                        background: "linear-gradient(135deg,#fff,#cbcdcd)",
                        cursor: busy ? "default" : "pointer",
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {Ic.check({ s: 15 })}
                      {T("قبول وإنشاء حجز مجاني", "Approve & create free booking")}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setRejecting(r)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 999,
                        border: "1px solid rgba(239,90,77,.5)",
                        padding: "10px 20px",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        color: "#f0c9c9",
                        background: "rgba(42,20,20,.5)",
                        cursor: busy ? "default" : "pointer",
                      }}
                    >
                      {T("رفض", "Reject")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <Modal title={T("سبب الرفض", "Rejection reason")} onClose={() => { setRejecting(null); setReason(""); }}>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e: any) => setReason(e.target.value)}
            placeholder={T("مثال: الضمان لا يغطي هذا النوع من الأعطال…", "e.g. This issue isn't covered by the warranty…")}
          />
          {!reason.trim() && (
            <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: "#c98a8a" }}>{T("لازم تكتب السبب.", "A reason is required.")}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
            <Ghost onClick={() => { setRejecting(null); setReason(""); }}>{T("تراجع", "Cancel")}</Ghost>
            <button
              disabled={!reason.trim() || busy}
              onClick={submitReject}
              style={{
                opacity: !reason.trim() || busy ? 0.4 : 1,
                borderRadius: 999,
                border: "1px solid rgba(239,90,77,.5)",
                padding: "11px 22px",
                fontSize: 12,
                fontWeight: 600,
                color: "#f0c9c9",
                background: "rgba(42,20,20,.6)",
                cursor: "pointer",
              }}
            >
              {T("تأكيد الرفض", "Confirm rejection")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MiniField({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "9px 12px" }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
      <div dir={ltr ? "ltr" : undefined} style={{ marginTop: 4, fontSize: 12.5, color: "var(--abh-ivory)" }}>
        {value}
      </div>
    </div>
  );
}