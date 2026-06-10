"use client";
import React, { useMemo, useState } from "react";
import { card, Ghost, Chip, Ic, EGP, Modal, useToast, PageHeader, carImg } from "@/components/admin/ui";

const STATUS_AR: Record<string, string> = { upcoming: "قادم", active: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const TONE: Record<string, any> = { upcoming: "platinum", active: "live", completed: "neutral", cancelled: "bad" };
const PAY_AR: Record<string, string> = { paid: "مدفوع", pay_at_branch: "دفع بالفرع", pending: "معلّق", refunded: "مُسترَد" };
const STAGES = ["تم الاستلام", "قيد العمل", "فحص الجودة", "جاهزة"];

function StagePipeline({ stage, onSet }: { stage: number; onSet?: (s: number) => void }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.3)", padding: 18 }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
        <span style={{ position: "absolute", insetInline: 0, top: 11, height: 1, background: "rgba(255,255,255,.1)" }} />
        <span style={{ position: "absolute", insetInlineStart: 0, top: 11, height: 1, width: `${(stage / (STAGES.length - 1)) * 100}%`, background: "linear-gradient(90deg,rgba(203,205,205,.5),#fff)", transition: "width .6s var(--abh-ease)" }} />
        {STAGES.map((s, i) => {
          const done = i < stage, act = i === stage;
          return (
            <button key={i} onClick={() => onSet?.(i)} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ display: "grid", placeItems: "center", height: 24, width: 24, borderRadius: 999, border: `1px solid ${act ? "transparent" : done ? "rgba(203,205,205,.5)" : "rgba(255,255,255,.12)"}`, background: act ? "linear-gradient(135deg,#fff,#cbcdcd)" : done ? "rgba(203,205,205,.12)" : "rgba(255,255,255,.03)", color: act ? "#000" : done ? "var(--abh-ivory)" : "var(--abh-steel)" }}>{done ? <Ic.check s={12} sw={2.6} /> : <Ic.dot s={12} />}</span>
              <span style={{ fontSize: 9.5, textAlign: "center", maxWidth: 60, color: act ? "var(--abh-ivory)" : done ? "var(--abh-platinum)" : "var(--abh-steel)" }}>{s}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingsClient({ initial }: { initial: any[]; locale?: string }) {
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tabs = [["all", "الكل"], ["upcoming", "قادمة"], ["active", "قيد التنفيذ"], ["completed", "مكتملة"], ["cancelled", "ملغية"]];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const [k] of tabs) if (k !== "all") c[k] = list.filter((b) => b.status === k).length;
    return c;
  }, [list]);
  const filtered = list.filter((b) => (tab === "all" || b.status === tab) && (q === "" || (b.customer + b.vehicle + b.reference + b.plate).toLowerCase().includes(q.toLowerCase())));
  const detail = detailId ? list.find((b) => b.id === detailId) : null;

  async function mutate(id: string, body: any) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "fail");
      setList((ls) => ls.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
      toast("تم التحديث");
    } catch { toast("فشل التحديث", "bad"); }
    finally { setBusy(false); }
  }
  const advance = (b: any) => mutate(b.id, { stage: Math.min(3, (b.stage || 0) + 1) });
  const setStage = (b: any, s: number) => mutate(b.id, { stage: s });
  const cancel = (b: any) => mutate(b.id, { action: "cancel" });

  return (
    <div className="abh-fade-up">
      <PageHeader title="الحجوزات" subtitle="تابع كل طلب من الاستلام حتى التسليم، وحدّث مراحل العمل لحظيًا." seed="bookings-hero" />

      <div className="abh-col" style={{ gap: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", gap: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 4, flexWrap: "wrap" }}>
            {tabs.map(([k, l]) => {
              const on = tab === k;
              return <button key={k} onClick={() => setTab(k)} style={{ borderRadius: 999, padding: "9px 16px", fontSize: 11.5, letterSpacing: ".08em", color: on ? "#000" : "rgba(203,205,205,.7)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent", border: "none", cursor: "pointer" }}>{l}<span style={{ marginInlineStart: 6, opacity: .6 }}>{counts[k] ?? 0}</span></button>;
            })}
          </div>
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 340 }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--abh-steel)" }}><Ic.search s={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم العميل أو السيارة أو الرقم…" style={{ width: "100%", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "11px 16px 11px 40px", fontSize: 13, color: "var(--abh-ivory)", outline: "none" }} />
          </div>
        </div>

        <div className="abh-col" style={{ gap: 16 }}>
          {filtered.length === 0 && <div style={{ ...card, borderStyle: "dashed", padding: 48, textAlign: "center", color: "var(--abh-steel)" }}>لا توجد حجوزات في هذا التصنيف</div>}
          {filtered.map((b, i) => (
            <div key={b.id} className="abh-lift" style={{ ...card, overflow: "hidden", borderColor: b.status === "active" ? "rgba(203,205,205,.22)" : "rgba(255,255,255,.08)", animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.04}s both` }}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                <div style={{ width: 150, minHeight: 132, flexShrink: 0, position: "relative", backgroundImage: `url('${carImg(b.plate || b.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(.5) brightness(.7)" }}>
                  <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(0,0,0,.4))" }} />
                </div>
                <div style={{ flex: "1 1 280px", padding: "20px 22px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18, color: "var(--abh-ivory)" }}>{b.vehicle}</span>
                      <Chip tone={TONE[b.status]} dot live={b.status === "active"}>{STATUS_AR[b.status]}</Chip>
                      <Chip tone={b.payment === "paid" ? "platinum" : "neutral"}>{PAY_AR[b.payment] || b.payment}</Chip>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--abh-steel)", marginTop: 7, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>{b.customer}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.pin s={13} />{b.branch}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.clock s={13} />{b.date} {b.time}</span>
                      {b.plate && <span style={{ direction: "ltr" }}>{b.plate}</span>}
                    </div>
                    {b.services.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{b.services.map((s: string, j: number) => <Chip key={j}>{s}</Chip>)}</div>}
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <div style={{ fontSize: 9.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-steel)" }}>الإجمالي</div>
                    <div className="abh-num" style={{ fontSize: 24, color: "var(--abh-ivory)", direction: "ltr" }}>{EGP(b.total)}</div>
                    <div style={{ fontSize: 10, color: "var(--abh-steel)", direction: "ltr" }}>{b.reference}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {b.status === "active" && <Ghost sm icon={Ic.check} onClick={() => !busy && advance(b)}>تقدّم</Ghost>}
                    <Ghost sm icon={Ic.eye} onClick={() => setDetailId(b.id)}>تفاصيل</Ghost>
                  </div>
                </div>
              </div>
              {b.status === "active" && <div style={{ padding: "0 22px 18px" }}><StagePipeline stage={b.stage || 0} onSet={(s) => !busy && setStage(b, s)} /></div>}
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <Modal title="تفاصيل الحجز" onClose={() => setDetailId(null)} wide>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 18 }}>
            <Chip tone={TONE[detail.status]} dot live={detail.status === "active"}>{STATUS_AR[detail.status]}</Chip>
            <Chip tone={detail.payment === "paid" ? "platinum" : "neutral"}>{PAY_AR[detail.payment] || detail.payment}</Chip>
            <span className="abh-num" style={{ marginInlineStart: "auto", fontSize: 13, color: "var(--abh-platinum)", direction: "ltr" }}>{detail.reference}</span>
          </div>
          <div style={{ height: 150, borderRadius: 18, marginBottom: 18, position: "relative", overflow: "hidden", backgroundImage: `url('${carImg(detail.plate || detail.vehicle, 1200)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(.4)" }}>
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.85),transparent)" }} />
            <span className="abh-display" style={{ position: "absolute", bottom: 14, insetInlineStart: 18, fontSize: 26, color: "#fff" }}>{detail.vehicle}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden", marginBottom: 18 }}>
            {[["العميل", detail.customer], ["اللوحة", detail.plate || "—"], ["الفرع", detail.branch], ["الموعد", `${detail.date} ${detail.time}`]].map((r, i) => (
              <div key={i} style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", borderInlineEnd: i % 2 === 0 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{r[0]}</div>
                <div style={{ fontSize: 14, color: "var(--abh-ivory)", marginTop: 3 }}>{r[1]}</div>
              </div>
            ))}
          </div>
          {detail.services.length > 0 && <>
            <div style={{ marginBottom: 9, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>الخدمات</div>
            <div className="abh-col" style={{ gap: 8, marginBottom: 18 }}>
              {detail.services.map((s: string, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: "11px 15px", fontSize: 14 }}><Ic.sparkle s={14} />{s}</div>)}
            </div>
          </>}
          {detail.status === "active" && <div style={{ marginBottom: 18 }}><div style={{ marginBottom: 10, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-platinum)" }}>مرحلة العمل</div><StagePipeline stage={detail.stage || 0} onSet={(s) => setStage(detail, s)} /></div>}
          {(detail.status === "upcoming" || detail.status === "active") && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Ghost danger icon={Ic.trash} onClick={() => { cancel(detail); setDetailId(null); }}>إلغاء الحجز</Ghost>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
