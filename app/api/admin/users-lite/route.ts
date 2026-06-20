// app/api/admin/users-lite/route.ts — بحث مختصر عن العملاء (للاختيار في حملة موجّهة).
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    const rows = await query<any>(
      `SELECT id, name, email FROM users
       WHERE role = 'member'
         AND ($1 = '' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')
       ORDER BY name LIMIT 20`,
      [q]
    );
    return NextResponse.json({
      ok: true,
      users: rows.map((u) => ({ id: u.id, name: u.name, email: String(u.email) })),
    });
  } catch (err) {
    console.error("GET /api/admin/users-lite failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}