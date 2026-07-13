/**
 * app/api/admin/inventory/route.ts — إدارة الخامات + التوريد (بمتوسط تكلفة مرجّح).
 *
 *   GET                → كل الخامات مع رصيدها في المخزنين (رئيسي/وسيط) + آخر سعر.
 *   POST               → خامة جديدة (+ كمية أولية اختيارية للمخزن الرئيسي بسعرها).
 *   PATCH { id, ... }  → تعديل بيانات خامة (اسم/وحدة/حد التنبيه). لا يمسّ الرصيد.
 *   PUT   { id, action:'restock', qty, unitPrice }
 *                      → توريد للمخزن الرئيسي بسعر جديد. يحدّث الرصيد + متوسط
 *                        التكلفة المرجّح + يسجّل حركة receive.
 *   DELETE ?id=        → حذف خامة (لو لا حركات مرتبطة حرجة).
 *
 * متوسط التكلفة المرجّح: عند التوريد، السعر الجديد للخامة =
 *   (رصيد_قديم × سعر_قديم + كمية_موردة × سعر_توريد) ÷ (رصيد_قديم + كمية_موردة)
 * هذا يعكس التكلفة الحقيقية عند اختلاف أسعار الشراء بين التوريدات.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// معرّف المخزن حسب الكود (main/intermediate)
async function warehouseId(code: string): Promise<number | null> {
  const r = await query<{ id: string }>(`SELECT id FROM warehouses WHERE code = $1 LIMIT 1`, [code]);
  return r[0] ? Number(r[0].id) : null;
}

export async function GET() {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const rows = await query<any>(
      `SELECT i.id, i.sku, i.name, i.unit, i.purchase_price, i.low_threshold, i.is_active,
              COALESCE(m.quantity, 0) AS main_qty,
              COALESCE(w.quantity, 0) AS inter_qty
         FROM inventory_items i
         LEFT JOIN warehouse_stock m ON m.item_id = i.id AND m.warehouse_id = (SELECT id FROM warehouses WHERE code='main')
         LEFT JOIN warehouse_stock w ON w.item_id = i.id AND w.warehouse_id = (SELECT id FROM warehouses WHERE code='intermediate')
        WHERE i.is_active = true
        ORDER BY i.name->>'ar', i.id`
    );

    const items = rows.map((r) => ({
      id: Number(r.id),
      sku: r.sku || "",
      name: r.name,
      unit: r.unit,
      purchasePrice: Number(r.purchase_price) || 0,
      lowThreshold: Number(r.low_threshold) || 0,
      mainQty: Number(r.main_qty) || 0,
      interQty: Number(r.inter_qty) || 0,
      totalQty: (Number(r.main_qty) || 0) + (Number(r.inter_qty) || 0),
    }));
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("GET /api/admin/inventory failed:", err);
    return bad("server_error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const nameAr = String(b.nameAr ?? "").trim();
    const nameEn = String(b.nameEn ?? "").trim() || nameAr;
    const unit = String(b.unit ?? "").trim();
    const sku = b.sku ? String(b.sku).trim() : null;
    const purchasePrice = Math.max(0, Number(b.purchasePrice) || 0);
    const lowThreshold = Math.max(0, Number(b.lowThreshold) || 0);
    const initialQty = Math.max(0, Number(b.initialQty) || 0);

    if (!nameAr || !unit) return bad("missing_fields");

    const ins = await query<{ id: string }>(
      `INSERT INTO inventory_items (sku, name, unit, purchase_price, low_threshold)
       VALUES ($1, $2::jsonb, $3, $4, $5) RETURNING id`,
      [sku, JSON.stringify({ ar: nameAr, en: nameEn }), unit, purchasePrice, lowThreshold]
    );
    const itemId = Number(ins[0].id);

    // كمية أولية → المخزن الرئيسي + حركة receive
    if (initialQty > 0) {
      const mainId = await warehouseId("main");
      if (mainId) {
        await query(
          `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = now()`,
          [mainId, itemId, initialQty]
        );
        await query(
          `INSERT INTO stock_movements (item_id, to_warehouse, quantity, movement_type, unit_price, note, created_by)
           VALUES ($1, $2, $3, 'receive', $4, $5, $6)`,
          [itemId, mainId, initialQty, purchasePrice, "كمية أولية عند الإنشاء", admin.id]
        );
      }
    }

    return NextResponse.json({ ok: true, id: itemId });
  } catch (err) {
    console.error("POST /api/admin/inventory failed:", err);
    return bad("server_error", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const id = b.id ? Number(b.id) : null;
    if (!id) return bad("id_required");

    const nameAr = String(b.nameAr ?? "").trim();
    const nameEn = String(b.nameEn ?? "").trim() || nameAr;
    const unit = String(b.unit ?? "").trim();
    const sku = b.sku ? String(b.sku).trim() : null;
    const lowThreshold = Math.max(0, Number(b.lowThreshold) || 0);
    if (!nameAr || !unit) return bad("missing_fields");

    await query(
      `UPDATE inventory_items
          SET sku = $2, name = $3::jsonb, unit = $4, low_threshold = $5, updated_at = now()
        WHERE id = $1`,
      [id, sku, JSON.stringify({ ar: nameAr, en: nameEn }), unit, lowThreshold]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/inventory failed:", err);
    return bad("server_error", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const id = b.id ? Number(b.id) : null;
    const action = String(b.action ?? "");
    if (!id) return bad("id_required");

    if (action === "restock") {
      const qty = Math.max(0, Number(b.qty) || 0);
      const unitPrice = Math.max(0, Number(b.unitPrice) || 0);
      if (qty <= 0) return bad("qty_required");

      const mainId = await warehouseId("main");
      if (!mainId) return bad("no_warehouse");

      // الرصيد الحالي في الرئيسي + سعر الخامة الحالي (لمتوسط التكلفة)
      const cur = await query<any>(
        `SELECT COALESCE(s.quantity,0) AS qty, i.purchase_price AS price
           FROM inventory_items i
           LEFT JOIN warehouse_stock s ON s.item_id = i.id AND s.warehouse_id = $2
          WHERE i.id = $1`,
        [id, mainId]
      );
      if (!cur[0]) return bad("not_found", 404);
      const oldQty = Number(cur[0].qty) || 0;
      const oldPrice = Number(cur[0].price) || 0;

      // متوسط التكلفة المرجّح الجديد
      const newTotalQty = oldQty + qty;
      const weightedPrice = newTotalQty > 0
        ? (oldQty * oldPrice + qty * unitPrice) / newTotalQty
        : unitPrice;

      // حدّث الرصيد
      await query(
        `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = now()`,
        [mainId, id, qty]
      );
      // حدّث سعر الخامة لمتوسط التكلفة المرجّح
      await query(`UPDATE inventory_items SET purchase_price = $2, updated_at = now() WHERE id = $1`, [id, Math.round(weightedPrice * 100) / 100]);
      // سجّل الحركة بسعر التوريد الفعلي
      await query(
        `INSERT INTO stock_movements (item_id, to_warehouse, quantity, movement_type, unit_price, note, created_by)
         VALUES ($1, $2, $3, 'receive', $4, $5, $6)`,
        [id, mainId, qty, unitPrice, b.note ? String(b.note).trim() : "توريد", admin.id]
      );

      return NextResponse.json({ ok: true, newPrice: Math.round(weightedPrice * 100) / 100, newQty: newTotalQty });
    }

    return bad("no_op");
  } catch (err) {
    console.error("PUT /api/admin/inventory failed:", err);
    return bad("server_error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return bad("id_required");

    // حذف ناعم (لو فيه حركات، نبقيها للسجل) — نعطّل بدل الحذف الصلب.
    await query(`UPDATE inventory_items SET is_active = false, updated_at = now() WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/inventory failed:", err);
    return bad("server_error", 500);
  }
}