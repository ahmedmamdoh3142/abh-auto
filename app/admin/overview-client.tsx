"use client";
/**
 * app/admin/overview-client.tsx — نظرة عامة (CLIENT) · v2
 * ديزاين عالمي: KPI بتريند + سباركلاين، شارت إيراد SVG تفاعلي (هوفر)،
 * دونات توزيع الحالات، تقسيم الدفع، أكثر الخدمات، وأقرب الحجوزات.
 * ثنائي اللغة (ar/en) + العملة ريال سعودي (SAR / ريال).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { card, SubHead, Ic, EGP, PageHeader, carImg } from "@/components/admin/ui";

const STATUS: Record<string, { ar: string; en: string; color: string }> = {
  upcoming:  { ar: "قادمة",       en: "Upcoming",    color: "#8a9099" },
  active:    { ar: "قيد التنفيذ", en: "In progress", color: "#f5993d" },
  completed: { ar: "مكتملة",      en: "Completed",   color: "#3ecd8e" },
  cancelled: { ar: "ملغية",       en: "Cancelled",   color: "#ef5a4d" },
};

/* ───────── عدّاد متحرّك ───────── */
function CountUp({ value, dur = 1100, prefix = "" }: { value: number; dur?: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const tick = (t: number) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return <span className="abh-num">{prefix}{EGP(n)}</span>;
}

/* ───────── سهم تريند ───────── */
function Trend({ v, isAr }: { v: number; isAr: boolean }) {
  const up = v >= 0;
  const color = v === 0 ? "var(--abh-steel)" : up ? "#3ecd8e" : "#ef5a4d";
  return (
    <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600, color, background: v === 0 ? "rgba(255,255,255,.04)" : up ? "rgba(62,205,142,.12)" : "rgba(239,90,77,.12)", border: `1px solid ${v === 0 ? "rgba(255,255,255,.08)" : up ? "rgba(62,205,142,.3)" : "rgba(239,90,77,.3)"}` }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "none" : "scaleY(-1)" }}><path d="M7 14l5-5 5 5" /></svg>
      {Math.abs(v)}%
    </span>
  );
}

/* ───────── سباركلاين صغير داخل KPI ───────── */
function Spark({ data, color = "#cbcdcd" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / rng) * 26}`);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: 30, display: "block" }}>
      <defs><linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polyline points={`0,30 ${pts.join(" ")} 100,30`} fill={`url(#sp-${color})`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── كارت KPI ───────── */
function KPI({ label, value, prefix, suffix, trend, icon: Icon, spark, sparkColor, hi, isAr, delay = 0 }: any) {
  return (
    <div className="abh-lift" style={{ ...card, position: "relative", overflow: "hidden", padding: "22px 22px 0", background: hi ? "linear-gradient(155deg,rgba(203,205,205,.08),rgba(255,255,255,.015))" : "rgba(255,255,255,.02)", animation: `abh-fadeUp .6s var(--abh-ease) ${delay}s both`, display: "flex", flexDirection: "column" }}>
      <span style={{ position: "absolute", insetInline: 22, top: 0, height: 1, opacity: hi ? 1 : .35, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.6),transparent)" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 11, flexShrink: 0, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}><Icon s={17} /></span>
      </div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 14, fontSize: 38, lineHeight: 1, color: "var(--abh-ivory)", display: "flex", alignItems: "baseline", gap: 7, justifyContent: isAr ? "flex-end" : "flex-start" }}>
        <CountUp value={value} prefix={prefix || ""} />
        {suffix && <span style={{ fontSize: 14, color: "var(--abh-steel)" }}>{suffix}</span>}
      </div>
      <div style={{ marginTop: 10, marginBottom: spark ? 0 : 18, display: "flex", alignItems: "center", gap: 8 }}>
        {typeof trend === "number" && <Trend v={trend} isAr={isAr} />}
        {typeof trend === "number" && <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{isAr ? "عن الشهر السابق" : "vs last month"}</span>}
      </div>
      {spark && <div style={{ marginInline: -22, marginTop: 6 }}><Spark data={spark} color={sparkColor} /></div>}
    </div>
  );
}

/* ═════════════ شارت الإيراد (SVG تفاعلي) ═════════════ */
function RevenueChart({ series, isAr, ccy }: { series: any[]; isAr: boolean; ccy: string }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 760, H = 240, padX = 8, padTop = 18, padBottom = 26;
  const vals = series.map((s) => s.value);
  const max = Math.max(...vals, 1);
  const n = series.length;
  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBottom);
  const line = series.map((s, i) => `${x(i)},${y(s.value)}`).join(" ");
  const area = `${padX},${H - padBottom} ${line} ${W - padX},${H - padBottom}`;
  const total = vals.reduce((a, b) => a + b, 0);
  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDay = (d: string) => new Date(d).toLocaleDateString(loc, { day: "numeric", month: "short" });
  const ticks = [0, 0.5, 1].map((f) => ({ v: Math.round(max * f), yy: y(max * f) }));

  return (
    <div style={{ ...card, padding: 26 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{isAr ? "قيمة الحجوزات · آخر ١٤ يوم" : "Booking value · last 14 days"}</div>
          <div className="abh-num" dir="ltr" style={{ marginTop: 8, fontSize: 30, color: "var(--abh-ivory)", textAlign: isAr ? "right" : "left" }}>{EGP(total)} <span style={{ fontSize: 14, color: "var(--abh-steel)" }}>{ccy}</span></div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--abh-platinum)", borderRadius: 999, padding: "6px 12px", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)" }}><span style={{ height: 8, width: 8, borderRadius: 999, background: "linear-gradient(135deg,#f5993d,#3ecd8e)" }} />{isAr ? "إجمالي يومي" : "Daily total"}</span>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cbcdcd" stopOpacity="0.22" /><stop offset="100%" stopColor="#cbcdcd" stopOpacity="0" /></linearGradient>
            <linearGradient id="rev-stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f5993d" /><stop offset="100%" stopColor="#3ecd8e" /></linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padX} y1={t.yy} x2={W - padX} y2={t.yy} stroke="rgba(255,255,255,.06)" strokeWidth="1" strokeDasharray="3 5" />
              <text x={isAr ? W - padX : padX} y={t.yy - 4} fill="var(--abh-steel)" fontSize="9.5" textAnchor={isAr ? "end" : "start"} className="abh-num">{EGP(t.v)}</text>
            </g>
          ))}
          <polyline points={area} fill="url(#rev-fill)" stroke="none" />
          <polyline points={line} fill="none" stroke="url(#rev-stroke)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {active !== null && (
            <g>
              <line x1={x(active)} y1={padTop} x2={x(active)} y2={H - padBottom} stroke="rgba(255,255,255,.25)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(series[active].value)} r="5" fill="#0b0c0e" stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* طبقة هوفر شفافة بأعمدة متساوية */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          {series.map((s, i) => (
            <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ flex: 1, cursor: "crosshair" }} />
          ))}
        </div>

        {/* تولتيب */}
        {active !== null && (
          <div style={{ position: "absolute", top: 0, insetInlineStart: `${(active / (n - 1)) * 100}%`, transform: "translateX(-50%)", pointerEvents: "none", background: "rgba(12,13,14,.96)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "8px 12px", minWidth: 120, boxShadow: "0 20px 50px -20px rgba(0,0,0,.9)" }}>
            <div style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{fmtDay(series[active].day)}</div>
            <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "var(--abh-ivory)", marginTop: 2 }}>{EGP(series[active].value)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
            <div style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 1 }}>{series[active].cnt} {isAr ? "حجز" : "bookings"}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 9.5, color: "var(--abh-steel)" }}>
        <span>{fmtDay(series[0]?.day)}</span><span>{fmtDay(series[Math.floor(n / 2)]?.day)}</span><span>{isAr ? "اليوم" : "Today"}</span>
      </div>
    </div>
  );
}

/* ═════════════ دونات توزيع الحالات ═════════════ */
function Donut({ counts, isAr }: { counts: any; isAr: boolean }) {
  const segs = (["upcoming", "active", "completed", "cancelled"] as const).map((k) => ({ k, v: counts[k] || 0, ...STATUS[k] }));
  const total = segs.reduce((a, s) => a + s.v, 0) || 1;
  const R = 56, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ ...card, padding: 26 }}>
      <SubHead>{isAr ? "توزيع الحجوزات" : "Bookings distribution"}</SubHead>
      <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
          <svg viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14" />
            {segs.map((s) => {
              const len = (s.v / total) * C;
              const el = <circle key={s.k} cx="75" cy="75" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" style={{ transition: "stroke-dasharray .9s var(--abh-ease)" }} />;
              offset += len;
              return el;
            })}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div className="abh-num" style={{ fontSize: 30, color: "var(--abh-ivory)", lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)", marginTop: 3 }}>{isAr ? "إجمالي" : "Total"}</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 11 }}>
          {segs.map((s) => (
            <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ height: 10, width: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "rgba(203,205,205,.85)", flex: 1 }}>{isAr ? s.ar : s.en}</span>
              <span className="abh-num" style={{ fontSize: 14, color: "var(--abh-ivory)" }}>{s.v}</span>
              <span className="abh-num" style={{ fontSize: 10.5, color: "var(--abh-steel)", minWidth: 34, textAlign: "end" }}>{Math.round((s.v / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ المكوّن الرئيسي ═════════════ */
export default function OverviewClient({ counts, series, topServices, recent, locale }: { counts: any; series: any[]; topServices: any[]; recent: any[]; locale?: string }) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const loc = isAr ? "ar-EG" : "en-US";
  const fmtDate = (iso: string) => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(+d)) return iso; return d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }); };
  const sparkData = series.map((s) => s.value);
  const payTotal = (counts.paidCount || 0) + (counts.unpaidCount || 0) || 1;
  const paidPct = Math.round(((counts.paidCount || 0) / payTotal) * 100);
  const maxSvc = Math.max(1, ...topServices.map((s) => s.cnt));

  return (
    <div className="abh-fade-up">
      <PageHeader title={T("نظرة عامة", "Overview")} subtitle={T("ملخّص حيّ لأداء الورشة — الإيراد، الحجوزات، الدفع وأكثر الخدمات طلبًا.", "A live snapshot of the studio — revenue, bookings, payments and top services.")} seed="overview-hero" />

      <div className="abh-col" style={{ gap: 22 }}>
        {/* ── KPI ── */}
        <div className="abh-grid-kpi">
          <KPI label={T("الإيراد المحصّل", "Collected revenue")} value={counts.collected} suffix={ccy} trend={counts.revTrend} icon={Ic.trending} spark={sparkData} sparkColor="#3ecd8e" hi isAr={isAr} delay={0} />
          <KPI label={T("حجوزات هذا الشهر", "Bookings this month")} value={counts.monthCount} trend={counts.countTrend} icon={Ic.calendar} isAr={isAr} delay={0.05} />
          <KPI label={T("قيد التنفيذ الآن", "Active now")} value={counts.active} icon={Ic.sliders} isAr={isAr} delay={0.1} />
          <KPI label={T("عملاء مسجّلون", "Members")} value={counts.members} suffix={counts.newMembers ? `+${counts.newMembers} ${T("جديد", "new")}` : undefined} icon={Ic.users} isAr={isAr} delay={0.15} />
        </div>

        {/* ── شارت + دونات ── */}
        <div className="abh-grid-2-1">
          <RevenueChart series={series} isAr={isAr} ccy={ccy} />
          <Donut counts={counts} isAr={isAr} />
        </div>

        {/* ── أقرب الحجوزات + (دفع/خدمات) ── */}
        <div className="abh-grid-2-1">
          <div style={{ ...card, padding: 26 }}>
            <SubHead action={<a href="/admin/bookings" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--abh-platinum)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>{T("الكل", "View all")} <span style={{ transform: isAr ? "scaleX(-1)" : "none", display: "inline-flex" }}><Ic.arrowUp s={13} /></span></a>}>{T("أقرب الحجوزات", "Closest bookings")}</SubHead>
            <div className="abh-col" style={{ gap: 12 }}>
              {recent.length === 0 && <div style={{ color: "var(--abh-steel)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>{T("لا توجد حجوزات قادمة حاليًا.", "No upcoming bookings right now.")}</div>}
              {recent.map((b, i) => {
                const st = STATUS[b.status] || STATUS.upcoming;
                const paid = b.payment === "paid";
                return (
                  <a key={b.reference} href="/admin/bookings" className="abh-lift" style={{ display: "flex", alignItems: "center", gap: 15, borderRadius: 18, border: "1px solid rgba(255,255,255,.07)", borderInlineStart: `3px solid ${st.color}`, background: "rgba(255,255,255,.02)", padding: 12, textDecoration: "none", animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.05}s both` }}>
                    <span style={{ height: 56, width: 76, borderRadius: 12, flexShrink: 0, backgroundImage: `url('${carImg(b.plate || b.vehicle, 400)}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.72)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, color: "var(--abh-ivory)" }}>{b.vehicle}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: st.color }}><span style={{ height: 6, width: 6, borderRadius: 999, background: st.color }} />{isAr ? st.ar : st.en}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--abh-steel)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ic.clock s={11} />{fmtDate(b.date)} · {b.time}</span>
                        <span>{b.customer}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "end", flexShrink: 0 }}>
                      <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "var(--abh-ivory)" }}>{EGP(b.total)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
                      <div style={{ fontSize: 9.5, color: paid ? "#3ecd8e" : "#f0c069", marginTop: 2 }}>{paid ? T("مدفوع", "Paid") : T("بانتظار الدفع", "Unpaid")}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="abh-col" style={{ gap: 22 }}>
            {/* تقسيم الدفع */}
            <div style={{ ...card, padding: 26 }}>
              <SubHead>{T("حالة التحصيل", "Collection status")}</SubHead>
              <div className="abh-num" dir="ltr" style={{ fontSize: 30, color: "var(--abh-ivory)", textAlign: isAr ? "right" : "left" }}>{EGP(counts.collected)} <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{ccy}</span></div>
              <div style={{ fontSize: 11, color: "var(--abh-steel)", marginTop: 4, marginBottom: 16 }}>{T("من إجمالي متوقّع", "of expected")} <span dir="ltr" className="abh-num">{EGP(counts.expected)} {ccy}</span></div>
              <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", display: "flex" }}>
                <span style={{ width: `${paidPct}%`, background: "linear-gradient(90deg,#3ecd8e,#9fd4b0)", transformOrigin: "left", animation: "abh-growX .9s var(--abh-ease) both" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(203,205,205,.85)" }}><span style={{ height: 8, width: 8, borderRadius: 2, background: "#3ecd8e" }} />{T("مدفوعة", "Paid")}</div><div className="abh-num" style={{ fontSize: 18, color: "var(--abh-ivory)", marginTop: 3 }}>{counts.paidCount}</div></div>
                <div style={{ textAlign: "end" }}><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(203,205,205,.85)" }}><span style={{ height: 8, width: 8, borderRadius: 2, background: "#f0c069" }} />{T("بانتظار الدفع", "Awaiting")}</div><div className="abh-num" style={{ fontSize: 18, color: "var(--abh-ivory)", marginTop: 3 }}>{counts.unpaidCount}</div></div>
              </div>
            </div>

            {/* أكثر الخدمات */}
            <div style={{ ...card, padding: 26 }}>
              <SubHead>{T("أكثر الخدمات طلبًا", "Top services")}</SubHead>
              <div className="abh-col" style={{ gap: 13 }}>
                {topServices.length === 0 && <div style={{ color: "var(--abh-steel)", fontSize: 13, padding: "12px 0" }}>{T("لا توجد بيانات بعد.", "No data yet.")}</div>}
                {topServices.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                      <span className="abh-num" style={{ fontSize: 11, color: "var(--abh-steel)", width: 18 }}>{i + 1}</span>
                      <span style={{ fontSize: 12.5, color: "rgba(203,205,205,.88)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                      <span className="abh-num" style={{ fontSize: 12.5, color: "var(--abh-ivory)" }}>{s.cnt}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden", marginInlineStart: 27 }}>
                      <span style={{ display: "block", height: "100%", width: `${(s.cnt / maxSvc) * 100}%`, borderRadius: 999, background: "linear-gradient(90deg,#8a8d90,#fff)", transformOrigin: "left", animation: `abh-growX .8s var(--abh-ease) ${i * 0.08}s both` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}