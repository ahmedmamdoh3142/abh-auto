import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/logout failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}