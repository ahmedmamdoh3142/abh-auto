import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: true, user: null });
    }
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city_code,
        role: user.role,
        since: user.member_since,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}