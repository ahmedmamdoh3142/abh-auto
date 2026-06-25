/**
 * app/api/admin/users-lite/route.ts — بحث مختصر عن العملاء (للحجز اليدوي).
 * يرجّع: id, name, email, phone, city — عشان لما تختار عميل مسجّل تتعبّى بياناته
 * كاملة (بما فيها التليفون).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const like = `%${q}%`;

    const rows = await query<any>(
      `SELECT id, name, email, phone, city_code
         FROM users
        WHERE role <> 'admin'
          AND ($1 = '' OR name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
        ORDER BY COALESCE(member_since, now()) DESC
        LIMIT 20`,
      [q, like]
    );

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      city: u.city_code || "",
    }));

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("GET /api/admin/users-lite failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}