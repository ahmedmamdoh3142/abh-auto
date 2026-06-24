// app/api/account/loyalty/route.ts — حالة عضوية العميل الحالي + سلّم المستويات.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserLoyalty } from "@/lib/loyalty";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // الشركاء (partner) ليهم نظام أسعار خاص — مفيش عضويات ولاء ليهم.
  if (user.role === "partner") {
    return NextResponse.json({ ok: true, enabled: false });
  }

  try {
    const res = await getUserLoyalty(user.id);
    if (!res) return NextResponse.json({ ok: true, enabled: false });

    return NextResponse.json({
      ok: true,
      enabled: true,
      tiers: res.tiers,
      loyalty: res.loyalty,
    });
  } catch (err) {
    console.error("GET /api/account/loyalty failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}