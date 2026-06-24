// app/api/account/referral/route.ts — كود الإحالة الخاص بالعضو + إحصائياته.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCode, getStats, REFERRER_PCT, REFERRED_PCT } from "@/lib/referrals";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    // الشركاء لا يشاركون في برنامج الإحالة
    if (user.role === "partner") return NextResponse.json({ ok: true, enabled: false });

    const code = await getOrCreateCode(user.id);
    const stats = await getStats(user.id);
    return NextResponse.json({
      ok: true, enabled: true, code,
      referrerPct: REFERRER_PCT, referredPct: REFERRED_PCT,
      joined: stats.joined, rewarded: stats.rewarded,
    });
  } catch (err) {
    console.error("GET /api/account/referral failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}