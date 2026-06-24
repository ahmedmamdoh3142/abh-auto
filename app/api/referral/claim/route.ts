// app/api/referral/claim/route.ts — استخدام كود إحالة (مكافأة للطرفين).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { claimReferral } from "@/lib/referrals";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { code } = await request.json();
    const c = String(code ?? "").trim();
    if (!c) return NextResponse.json({ ok: false, error: "code_required" });

    const result = await claimReferral(c, user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error("POST /api/referral/claim failed:", err);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}