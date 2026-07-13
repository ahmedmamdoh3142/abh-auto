/**
 * app/api/admin/inventory/movements/route.ts — سجل حركات المخزون (قراءة فقط).
 * GET ?type=&limit= → أحدث الحركات مع اسم الخامة والمخزن والفاعل.
 * الأنواع: receive (توريد) · transfer (نقل رئيسي→وسيط) · issue (صرف على مهمة) · adjust (تسوية)
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // اختياري: تصفية بنوع
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

    const rows = await query<any>(
      `SELECT m.id, m.quantity, m.movement_type, m.unit_price, m.note, m.created_at,
              i.name AS item_name, i.unit,
              wf.code AS from_code, wt.code AS to_code,
              u.name AS actor_name
         FROM stock_movements m
         JOIN inventory_items i ON i.id = m.item_id
         LEFT JOIN warehouses wf ON wf.id = m.from_warehouse
         LEFT JOIN warehouses wt ON wt.id = m.to_warehouse
         LEFT JOIN users u ON u.id = m.created_by
        WHERE ($1::text IS NULL OR m.movement_type = $1)
        ORDER BY m.created_at DESC
        LIMIT $2`,
      [type, limit]
    );

    const movements = rows.map((r) => ({
      id: Number(r.id),
      quantity: Number(r.quantity) || 0,
      type: r.movement_type,
      unitPrice: Number(r.unit_price) || 0,
      note: r.note || "",
      createdAt: r.created_at,
      itemName: r.item_name,
      unit: r.unit,
      fromCode: r.from_code || null,
      toCode: r.to_code || null,
      actor: r.actor_name || "—",
    }));
    return NextResponse.json({ ok: true, movements });
  } catch (err) {
    console.error("GET /api/admin/inventory/movements failed:", err);
    return bad("server_error", 500);
  }
}