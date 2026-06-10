"use client";
import React, { useEffect, useState } from "react";
import { card, SubHead, Chip, Ic, EGP, PageHeader, carImg } from "@/components/admin/ui";

const STATUS_AR: Record<string, string> = { upcoming: "قادم", active: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const TONE: Record<string, any> = { upcoming: "platinum", active: "live", completed: "neutral", cancelled: "bad" };

function CountUp({ value, dur = 1000 }: { value: number; dur?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const tick = (t: number) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="abh-num">{EGP(n)}</span>;
}

function KPI({ label, value, sub, icon: Icon, hi, delay = 0 }: any) {
  return (
    <div className="abh-lift" style={{ ...card, position: "relative", overflow: "hidden", padding: "24px 24px 22px", background: hi ? "linear-gradient(150deg,rgba(203,205,205,.07),rgba(255,255,255,.02))" : "rgba(255,255,255,.02)", animation: `abh-fadeUp .6s var(--abh-ease) ${delay}s both` }}>
      <span style={{ position: "absolute", insetInline: 24, top: 0, height: 1, opacity: hi ? 1 : .35, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.6),transparent)" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}><Icon s={17} /></span>
      </div>
      <div className="abh-num" style={{ marginTop: 16, fontSize: 40, lineHeight: 1, color: "var(--abh-ivory)" }}><CountUp value={value} /></div>
      {sub && <div style={{ marginTop: 9, fontSize: 11, color: "var(--abh-steel)" }}>{sub}</div>}
    </div>
  );
}

export default function OverviewClient({ counts, recent }: { counts: any; recent: any[] }) {
  const seg = [["upcoming", counts.upcoming], ["active", counts.active], ["completed", counts.completed], ["cancelled", counts.cancelled]] as const;
  const maxSeg = Math.max(1, counts.upcoming, counts.active, counts.completed, counts.cancelled);
  return (
    <div className="abh-fade-up">
      <PageHeader title="نظرة عامة" subtitle="ملخّص حيّ لأداء الورشة والحجوزات والإيراد." seed="overview-hero" />
      <div className="abh-col" style={{ gap: 24 }}>
        <div className="abh-grid-kpi">
          <KPI label="الإيراد الإجمالي" value={counts.revenue} sub="ج.م · غير شامل الملغي" icon={Ic.trending} hi delay={0} />
          <KPI label="حجوزات قادمة" value={counts.upcoming} sub="بانتظار التنفيذ" icon={Ic.calendar} delay={0.05} />
          <KPI label="قيد التنفيذ" value={counts.active} sub="في الورشة الآن" icon={Ic.sliders} delay={0.1} />
          <KPI label="عملاء مسجّلون" value={counts.members} sub="إجمالي الأعضاء" icon={Ic.users} delay={0.15} />
        </div>

        <div className="abh-grid-2-1">
          <div style={{ ...card, padding: 28 }}>
            <SubHead action={<a href="/admin/bookings" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-platinum)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>الكل <Ic.arrowUp s={13} /></a>}>أقرب الحجوزات</SubHead>
            <div className="abh-col" style={{ gap: 14 }}>
              {recent.length === 0 && <div style={{ color: "var(--abh-steel)", fontSize: 13, padding: "20px 0" }}>لا توجد حجوزات قادمة حاليًا.</div>}
              {recent.map((b, i) => (
                <a key={b.reference} href="/admin/bookings" className="abh-lift" style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 12, textDecoration: "none", animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.05}s both` }}>
                  <span style={{ height: 58, width: 78, borderRadius: 12, flexShrink: 0, backgroundImage: `url('${carImg(b.plate || b.vehicle)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(.55) brightness(.75)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, color: "var(--abh-ivory)" }}>{b.vehicle}</span>
                      <Chip tone={TONE[b.status]} dot live={b.status === "active"}>{STATUS_AR[b.status]}</Chip>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 4 }}>{b.plate} · {b.date} {b.time}</div>
                  </div>
                  <div className="abh-num" style={{ fontSize: 17, color: "var(--abh-ivory)", direction: "ltr" }}>{EGP(b.total)}</div>
                </a>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: 28 }}>
            <SubHead>توزيع الحجوزات</SubHead>
            <div className="abh-col" style={{ gap: 16 }}>
              {seg.map(([k, v], i) => (
                <div key={k}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                    <span style={{ height: 10, width: 10, borderRadius: 3, background: ["#fff", "#cbcdcd", "#666a6e", "#3a3c3e"][i] }} />
                    <span style={{ fontSize: 12.5, color: "rgba(203,205,205,.8)", flex: 1 }}>{STATUS_AR[k]}</span>
                    <span className="abh-num" style={{ fontSize: 15, color: "var(--abh-ivory)" }}>{v}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${(v / maxSeg) * 100}%`, borderRadius: 999, background: ["linear-gradient(90deg,#cbcdcd,#fff)", "linear-gradient(90deg,#8a8d90,#cbcdcd)", "#666a6e", "#3a3c3e"][i], transformOrigin: "left", animation: `abh-growX .8s var(--abh-ease) ${i * 0.08}s both` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
