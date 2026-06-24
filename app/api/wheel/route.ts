// app/api/wheel/route.ts — عجلة الحظ.
//   GET  → الإعدادات + القطاعات (للعرض) + هل يقدر يلفّ.
//   POST → ينفّذ اللفّة (السيرفر يختار ويصدّر الكوبون) ويرجّع القطاع الفائز.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWheelConfig, getSegments, canSpin, spin } from "@/lib/wheel";

export async function GET() {
  try {
    const cfg = await getWheelConfig();
    if (!cfg || !cfg.isActive) return NextResponse.json({ ok: true, active: false });

    const segments = await getSegments();
    const user = await getCurrentUser();
    let gate: { allowed: boolean; nextAt: string | null } = { allowed: true, nextAt: null };
    if (user) gate = await canSpin(user.id, cfg);

    return NextResponse.json({
      ok: true,
      active: true,
      requireLogin: cfg.requireLogin,
      loggedIn: !!user,
      title: cfg.title,
      subtitle: cfg.subtitle,
      canSpin: !!user && gate.allowed,
      nextAt: gate.nextAt,
      // لا نكشف الأوزان للكلاينت — بس ما يلزم للعرض.
      segments: segments.map((s) => ({ id: s.id, label: s.label, hex: s.hex, kind: s.kind, value: s.value })),
    });
  } catch (err) {
    console.error("GET /api/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const result = await spin(user.id);
    if (!result.ok) {
      const status = result.error === "cooldown" ? 429 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/wheel failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}