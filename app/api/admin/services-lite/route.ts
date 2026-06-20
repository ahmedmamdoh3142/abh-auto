// app/api/admin/services-lite/route.ts — قائمة خدمات مختصرة (id + اسم + تصنيف) لفورم الكوبونات.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ar";
    const rows = await query<any>(
      `SELECT s.id, s.name AS name_raw, c.name AS cat_raw, s.is_on_request
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       WHERE s.surface='catalog' AND s.is_active = true
       ORDER BY c.sort, s.sort`
    );
    const pick = (j: any) => (!j ? "" : typeof j === "string" ? j : (j[locale] ?? j.ar ?? j.en ?? ""));
    const services = rows.map((r) => ({
      id: Number(r.id),
      name: pick(r.name_raw),
      category: pick(r.cat_raw),
      onRequest: !!r.is_on_request,
    }));
    return NextResponse.json({ ok: true, services });
  } catch (err) {
    console.error("GET /api/admin/services-lite failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}