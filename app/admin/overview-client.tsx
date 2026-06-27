"use client";
/**
 * app/admin/overview-client.tsx — نظرة عامة (CLIENT) · v4
 * ──────────────────────────────────────────────────────────────────────
 * Layout:
 *   KPIs (4)
 *   شارت قيمة الحجوزات (عريض)  |  حالة التحصيل
 *   توزيع الحجوزات (باي كبير)   |  طرق الدفع (باي كبير)
 *   أقرب الحجوزات              |  أكثر الخدمات طلبًا
 *
 * • فلتر فترة (يوم/أسبوع/شهر/سنة) — بيانات حقيقية من السيرفر.
 * • شارت إيراد + تبديل قيمة/عدد + إصلاح اتجاه الهوفر RTL.
 * • الباي شارتس كبيرة مالية الكونتينر + الـlegend تحتها.
 */
import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { card, SubHead, Ic, EGP, PageHeader, carImg } from "@/components/admin/ui";

type RangeKey = "day" | "week" | "month" | "year";

const STATUS: Record<string, { ar: string; en: string; color: string }> = {
  completed: { ar: "مكتملة",      en: "Completed",   color: "#3ecd8e" },
  active:    { ar: "قيد التنفيذ", en: "In progress", color: "#f5993d" },
  upcoming:  { ar: "قادمة",       en: "Upcoming",    color: "#6f9ceb" },
  cancelled: { ar: "ملغية",       en: "Cancelled",   color: "#ef5a4d" },
};

const PALETTE = ["#cbcdcd", "#f5993d", "#3ecd8e", "#6f9ceb", "#c98ae0", "#e0c98a"];

/* ───────── عدّاد متحرّك ───────── */
function CountUp({ value, dur = 1100, prefix = "" }: { value: number; dur?: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return <span className="abh-num">{prefix}{EGP(n)}</span>;
}

/* ───────── سهم تريند ───────── */
function Trend({ v }: { v: number }) {
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
  const id = useMemo(() => `sp-${Math.random().toString(36).slice(2, 8)}`, []);
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / rng) * 26}`);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: 30, display: "block" }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polyline points={`0,30 ${pts.join(" ")} 100,30`} fill={`url(#${id})`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── كارت KPI ───────── */
function KPI({ label, value, prefix, suffix, trend, icon: Icon, spark, sparkColor, hi, trendNote, delay = 0 }: any) {
  return (
    <div className="abh-lift" style={{ ...card, position: "relative", overflow: "hidden", padding: "22px 22px 0", background: hi ? "linear-gradient(155deg,rgba(203,205,205,.08),rgba(255,255,255,.015))" : "rgba(255,255,255,.02)", animation: `abh-fadeUp .6s var(--abh-ease) ${delay}s both`, display: "flex", flexDirection: "column" }}>
      <span style={{ position: "absolute", insetInline: 22, top: 0, height: 1, opacity: hi ? 1 : .35, background: "linear-gradient(90deg,transparent,rgba(203,205,205,.6),transparent)" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-steel)" }}>{label}</div>
        <span style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: 11, flexShrink: 0, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "var(--abh-platinum)" }}><Icon s={17} /></span>
      </div>
      <div className="abh-num" dir="ltr" style={{ marginTop: 14, fontSize: 36, lineHeight: 1, color: "var(--abh-ivory)", display: "flex", alignItems: "baseline", gap: 7 }}>
        <CountUp value={value} prefix={prefix || ""} />
        {suffix && <span style={{ fontSize: 14, color: "var(--abh-steel)" }}>{suffix}</span>}
      </div>
      <div style={{ marginTop: 10, marginBottom: spark ? 0 : 18, display: "flex", alignItems: "center", gap: 8, minHeight: 20 }}>
        {typeof trend === "number" && <Trend v={trend} />}
        {typeof trend === "number" && trendNote && <span style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{trendNote}</span>}
      </div>
      {spark && <div style={{ marginInline: -22, marginTop: 6 }}><Spark data={spark} color={sparkColor} /></div>}
    </div>
  );
}

/* ═════════════ فلتر الفترة ═════════════ */
function PeriodTabs({ range, isAr, pending, onPick }: { range: RangeKey; isAr: boolean; pending: boolean; onPick: (r: RangeKey) => void }) {
  const opts: { k: RangeKey; ar: string; en: string }[] = [
    { k: "day", ar: "اليوم", en: "Day" },
    { k: "week", ar: "أسبوع", en: "Week" },
    { k: "month", ar: "شهر", en: "Month" },
    { k: "year", ar: "سنة", en: "Year" },
  ];
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", opacity: pending ? 0.6 : 1, transition: "opacity .2s" }}>
      {opts.map((o) => {
        const on = o.k === range;
        return (
          <button key={o.k} onClick={() => onPick(o.k)} disabled={pending}
            style={{ borderRadius: 999, padding: "8px 16px", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", cursor: pending ? "wait" : "pointer", border: "none", transition: "all .3s var(--abh-ease)", color: on ? "#000" : "var(--abh-platinum)", background: on ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent" }}>
            {isAr ? o.ar : o.en}
          </button>
        );
      })}
    </div>
  );
}

/* ═════════════ شارت الإيراد (SVG تفاعلي + تبديل قيمة/عدد) ═════════════ */
function RevenueChart({ series, range, isAr, ccy }: { series: any[]; range: RangeKey; isAr: boolean; ccy: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [metric, setMetric] = useState<"value" | "cnt">("value");
  const W = 760, H = 260, padX = 10, padTop = 20, padBottom = 28;
  const vals = series.map((s) => (metric === "value" ? s.value : s.cnt));
  const max = Math.max(...vals, 1);
  const n = series.length;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBottom);
  const line = series.map((s, i) => `${x(i)},${y(metric === "value" ? s.value : s.cnt)}`).join(" ");
  const area = `${padX},${H - padBottom} ${line} ${W - padX},${H - padBottom}`;
  const total = vals.reduce((a, b) => a + b, 0);
  const loc = isAr ? "ar-EG" : "en-US";

  const fmtBucket = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(+d)) return iso;
    if (range === "day") return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    if (range === "year") return d.toLocaleDateString(loc, { month: "short" });
    if (range === "week") return d.toLocaleDateString(loc, { weekday: "short" });
    return d.toLocaleDateString(loc, { day: "numeric", month: "short" });
  };
  const ticks = [0, 0.5, 1].map((f) => ({ v: Math.round(max * f), yy: y(max * f) }));
  const rangeLabel = { day: isAr ? "اليوم · بالساعة" : "Today · hourly", week: isAr ? "آخر ٧ أيام" : "Last 7 days", month: isAr ? "آخر ٣٠ يوم" : "Last 30 days", year: isAr ? "آخر ١٢ شهر" : "Last 12 months" }[range];

  return (
    <div style={{ ...card, padding: 26, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--abh-steel)" }}>
            {metric === "value" ? (isAr ? "قيمة الحجوزات" : "Booking value") : (isAr ? "عدد الحجوزات" : "Bookings count")} · {rangeLabel}
          </div>
          <div className="abh-num" dir="ltr" style={{ marginTop: 8, fontSize: 30, color: "var(--abh-ivory)", textAlign: isAr ? "right" : "left" }}>
            {EGP(total)} {metric === "value" && <span style={{ fontSize: 14, color: "var(--abh-steel)" }}>{ccy}</span>}
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 3, padding: 3, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)" }}>
          {(["value", "cnt"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} style={{ borderRadius: 999, padding: "6px 13px", fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", border: "none", color: metric === m ? "#000" : "var(--abh-platinum)", background: metric === m ? "linear-gradient(135deg,#fff,#cbcdcd)" : "transparent" }}>
              {m === "value" ? (isAr ? "قيمة" : "Value") : (isAr ? "عدد" : "Count")}
            </button>
          ))}
        </div>
      </div>

      {/* المحور الزمني LTR دائمًا — يطابق الهوفر مع النقاط */}
      <div style={{ position: "relative", direction: "ltr", flex: 1, minHeight: 220 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cbcdcd" stopOpacity="0.22" /><stop offset="100%" stopColor="#cbcdcd" stopOpacity="0" /></linearGradient>
            <linearGradient id="rev-stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f5993d" /><stop offset="100%" stopColor="#3ecd8e" /></linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padX} y1={t.yy} x2={W - padX} y2={t.yy} stroke="rgba(255,255,255,.06)" strokeWidth="1" strokeDasharray="3 5" />
              <text x={padX} y={t.yy - 4} fill="var(--abh-steel)" fontSize="9.5" textAnchor="start" className="abh-num">{EGP(t.v)}</text>
            </g>
          ))}
          <polyline points={area} fill="url(#rev-fill)" stroke="none" />
          <polyline points={line} fill="none" stroke="url(#rev-stroke)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {active !== null && (
            <g>
              <line x1={x(active)} y1={padTop} x2={x(active)} y2={H - padBottom} stroke="rgba(255,255,255,.25)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(metric === "value" ? series[active].value : series[active].cnt)} r="5" fill="#0b0c0e" stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          {series.map((s, i) => (
            <div key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ flex: 1, cursor: "crosshair" }} />
          ))}
        </div>

        {active !== null && (
          <div style={{ position: "absolute", top: 0, left: `${(active / Math.max(1, n - 1)) * 100}%`, transform: "translateX(-50%)", pointerEvents: "none", background: "rgba(12,13,14,.96)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "8px 12px", minWidth: 120, boxShadow: "0 20px 50px -20px rgba(0,0,0,.9)", direction: isAr ? "rtl" : "ltr" }}>
            <div style={{ fontSize: 10.5, color: "var(--abh-steel)" }}>{fmtBucket(series[active].bucket)}</div>
            <div className="abh-num" dir="ltr" style={{ fontSize: 16, color: "var(--abh-ivory)", marginTop: 2 }}>{EGP(series[active].value)} <span style={{ fontSize: 10, color: "var(--abh-steel)" }}>{ccy}</span></div>
            <div style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 1 }}>{series[active].cnt} {isAr ? "حجز" : "bookings"}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 9.5, color: "var(--abh-steel)", direction: "ltr" }}>
        <span>{fmtBucket(series[0]?.bucket)}</span>
        <span>{fmtBucket(series[Math.floor(n / 2)]?.bucket)}</span>
        <span>{fmtBucket(series[n - 1]?.bucket)}</span>
      </div>
    </div>
  );
}

/* ═════════════ باي/دونات كبير مالي الكونتينر + legend تحته ═════════════ */
function BigPie({ title, segments, isAr, centerLabel, ccy, showRevenue }: {
  title: string;
  segments: { key: string; label: string; value: number; color: string; revenue?: number }[];
  isAr: boolean; centerLabel: string; ccy: string; showRevenue?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  // دونات كبير
  const SIZE = 230, R = 92, SW = 30, C = 2 * Math.PI * R;
  const GAP = segments.length > 1 ? 4 : 0;
  let offset = 0;
  const hov = segments.find((s) => s.key === hover);

  return (
    <div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", height: "100%" }}>
      <SubHead>{title}</SubHead>
      {segments.length === 0 ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--abh-steel)", fontSize: 13, minHeight: 200 }}>
          {isAr ? "لا توجد بيانات بعد." : "No data yet."}
        </div>
      ) : (
        <>
          {/* الدونات الكبير في النص */}
          <div style={{ display: "grid", placeItems: "center", padding: "8px 0 22px" }}>
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={SW} />
                {segments.map((s) => {
                  const frac = s.value / total;
                  const len = Math.max(0, frac * C - GAP);
                  const dim = hover && hover !== s.key;
                  const el = (
                    <circle key={s.key} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
                      stroke={s.color} strokeWidth={hover === s.key ? SW + 5 : SW}
                      strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray .9s var(--abh-ease), stroke-width .25s, opacity .25s", opacity: dim ? 0.3 : 1, cursor: "pointer" }}
                      onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)} />
                  );
                  offset += frac * C;
                  return el;
                })}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <div className="abh-num" style={{ fontSize: 44, color: "var(--abh-ivory)", lineHeight: 1 }}>
                    {hov ? hov.value : total}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--abh-steel)", marginTop: 5 }}>
                    {hov ? hov.label : centerLabel}
                  </div>
                  {hov && (
                    <div className="abh-num" style={{ fontSize: 12, color: "var(--abh-platinum)", marginTop: 4 }}>
                      {Math.round((hov.value / total) * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* legend تحت الباي */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: "auto" }}>
            {segments.map((s) => (
              <div key={s.key} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 13, cursor: "pointer", background: hover === s.key ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", transition: "background .25s" }}>
                <span style={{ height: 11, width: 11, borderRadius: 4, background: s.color, flexShrink: 0, boxShadow: `0 0 12px ${s.color}55` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "rgba(203,205,205,.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                  {showRevenue && s.revenue !== undefined && (
                    <div className="abh-num" dir="ltr" style={{ fontSize: 10.5, color: "var(--abh-steel)", marginTop: 2 }}>{EGP(s.revenue)} {ccy}</div>
                  )}
                </div>
                <div style={{ textAlign: "end" }}>
                  <div className="abh-num" style={{ fontSize: 15, color: "var(--abh-ivory)", lineHeight: 1 }}>{s.value}</div>
                  <div className="abh-num" style={{ fontSize: 10, color: "var(--abh-steel)", marginTop: 2 }}>{Math.round((s.value / total) * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═════════════ المكوّن الرئيسي ═════════════ */
export default function OverviewClient({ counts, series, topServices, byPayment, recent, locale, range }: {
  counts: any; series: any[]; topServices: any[]; byPayment: any[]; recent: any[];
  locale?: string; range: RangeKey;
}) {
  const isAr = locale !== "en";
  const ccy = isAr ? "ريال" : "SAR";
  const T = (ar: string, en: string) => (isAr ? ar : en);
  const loc = isAr ? "ar-EG" : "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const fmtDate = (iso: string) => { if (!iso) return "—"; const d = new Date(iso); if (isNaN(+d)) return iso; return d.toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short" }); };
  const sparkData = series.map((s) => s.value);
  const payTotal = (counts.paidCount || 0) + (counts.unpaidCount || 0) || 1;
  const paidPct = Math.round(((counts.paidCount || 0) / payTotal) * 100);
  const maxSvc = Math.max(1, ...topServices.map((s) => s.cnt));

  const periodNote = { day: T("عن أمس", "vs yesterday"), week: T("عن الأسبوع السابق", "vs last week"), month: T("عن الشهر السابق", "vs last month"), year: T("عن السنة السابقة", "vs last year") }[range];
  const countLabel = { day: T("حجوزات اليوم", "Bookings today"), week: T("حجوزات الأسبوع", "Bookings this week"), month: T("حجوزات الشهر", "Bookings this month"), year: T("حجوزات السنة", "Bookings this year") }[range];

  // مقاطع باي توزيع الحجوزات
  const statusSegments = (["completed", "active", "upcoming", "cancelled"] as const)
    .map((k) => ({ key: k, label: isAr ? STATUS[k].ar : STATUS[k].en, value: counts[k] || 0, color: STATUS[k].color }))
    .filter((s) => s.value > 0);

  // مقاطع باي طرق الدفع
  const paymentSegments = byPayment.map((p, i) => ({
    key: p.code || `p${i}`, label: p.name, value: p.cnt, revenue: p.revenue, color: PALETTE[i % PALETTE.length],
  }));

  const pickRange = (r: RangeKey) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("range", r);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="abh-fade-up">
      <style>{`
        .ov-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: stretch; }
        @media (max-width: 860px) { .ov-grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <PageHeader
        title={T("نظرة عامة", "Overview")}
        subtitle={T("ملخّص حيّ لأداء الورشة — الإيراد، الحجوزات، الدفع وأكثر الخدمات طلبًا.", "A live snapshot of the studio — revenue, bookings, payments and top services.")}
        seed="overview-hero"
        action={<PeriodTabs range={range} isAr={isAr} pending={pending} onPick={pickRange} />}
      />

      <div className="abh-col" style={{ gap: 22 }}>
        {/* ── KPI ── */}
        <div className="abh-grid-kpi">
          <KPI label={T("الإيراد المحصّل", "Collected revenue")} value={counts.collected} suffix={ccy} trend={counts.revTrend} trendNote={periodNote} icon={Ic.trending} spark={sparkData} sparkColor="#3ecd8e" hi delay={0} />
          <KPI label={countLabel} value={counts.periodCount} trend={counts.countTrend} trendNote={periodNote} icon={Ic.calendar} delay={0.05} />
          <KPI label={T("قيد التنفيذ الآن", "Active now")} value={counts.active} icon={Ic.sliders} delay={0.1} />
          <KPI label={T("عملاء مسجّلون", "Members")} value={counts.members} suffix={counts.newMembers ? `+${counts.newMembers} ${T("جديد", "new")}` : undefined} icon={Ic.users} delay={0.15} />
        </div>

        {/* ── قيمة الحجوزات + حالة التحصيل ── */}
        <div className="abh-grid-2-1">
          <RevenueChart series={series} range={range} isAr={isAr} ccy={ccy} />

          <div style={{ ...card, padding: 26, display: "flex", flexDirection: "column" }}>
            <SubHead>{T("حالة التحصيل", "Collection status")}</SubHead>
            <div className="abh-num" dir="ltr" style={{ fontSize: 30, color: "var(--abh-ivory)", textAlign: isAr ? "right" : "left" }}>{EGP(counts.collected)} <span style={{ fontSize: 13, color: "var(--abh-steel)" }}>{ccy}</span></div>
            <div style={{ fontSize: 11, color: "var(--abh-steel)", marginTop: 4, marginBottom: 16 }}>{T("من إجمالي متوقّع", "of expected")} <span dir="ltr" className="abh-num">{EGP(counts.expected)} {ccy}</span></div>
            <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", display: "flex" }}>
              <span style={{ width: `${paidPct}%`, background: "linear-gradient(90deg,#3ecd8e,#9fd4b0)", transformOrigin: isAr ? "right" : "left", animation: "abh-growX .9s var(--abh-ease) both" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              <div><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(203,205,205,.85)" }}><span style={{ height: 8, width: 8, borderRadius: 2, background: "#3ecd8e" }} />{T("مدفوعة", "Paid")}</div><div className="abh-num" style={{ fontSize: 18, color: "var(--abh-ivory)", marginTop: 3 }}>{counts.paidCount}</div></div>
              <div style={{ textAlign: "end" }}><div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(203,205,205,.85)" }}><span style={{ height: 8, width: 8, borderRadius: 2, background: "#f0c069" }} />{T("بانتظار الدفع", "Awaiting")}</div><div className="abh-num" style={{ fontSize: 18, color: "var(--abh-ivory)", marginTop: 3 }}>{counts.unpaidCount}</div></div>
            </div>
            <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--abh-steel)" }}>{T("نسبة التحصيل", "Collection rate")}</span>
              <span className="abh-num" style={{ color: "var(--abh-ivory)" }}>{paidPct}%</span>
            </div>
          </div>
        </div>

        {/* ── توزيع الحجوزات + طرق الدفع (باي شارتس كبيرة) ── */}
        <div className="ov-grid-2">
          <BigPie title={T("توزيع الحجوزات", "Bookings distribution")} segments={statusSegments} isAr={isAr} centerLabel={T("إجمالي", "Total")} ccy={ccy} />
          <BigPie title={T("طرق الدفع", "Payment methods")} segments={paymentSegments} isAr={isAr} centerLabel={T("حجز", "orders")} ccy={ccy} showRevenue />
        </div>

        {/* ── أقرب الحجوزات + أكثر الخدمات ── */}
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

          {/* أكثر الخدمات */}
          <div style={{ ...card, padding: 26 }}>
            <SubHead>{T("أكثر الخدمات طلبًا", "Top services")}</SubHead>
            <div className="abh-col" style={{ gap: 14 }}>
              {topServices.length === 0 && <div style={{ color: "var(--abh-steel)", fontSize: 13, padding: "12px 0" }}>{T("لا توجد بيانات بعد.", "No data yet.")}</div>}
              {topServices.map((s, i) => (
                <div key={i} style={{ animation: `abh-fadeUp .5s var(--abh-ease) ${i * 0.06}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <span className="abh-num" style={{ fontSize: 11, color: "var(--abh-steel)", width: 18 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: "rgba(203,205,205,.9)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                    <span className="abh-num" style={{ fontSize: 13, color: "var(--abh-ivory)" }}>{s.cnt}</span>
                  </div>
                  <div style={{ position: "relative", height: 6, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden", marginInlineStart: 27 }}>
                    <span style={{ position: "absolute", insetInlineStart: 0, top: 0, height: "100%", width: `${(s.cnt / maxSvc) * 100}%`, borderRadius: 999, background: "linear-gradient(90deg,#3ecd8e66,#3ecd8e)", transformOrigin: isAr ? "right" : "left", animation: `abh-growX .8s var(--abh-ease) ${i * 0.06}s both` }} />
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