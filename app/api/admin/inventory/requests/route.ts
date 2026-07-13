/**
 * app/api/admin/inventory/requests/route.ts — طلبات الخامات (المشرف → المخزن الوسيط).
 *
 *   GET                      → كل الطلبات مع بنودها وحالة كل طلب + اسم الطالب/المراجع.
 *   POST { items:[{itemId, quantity}], note }
 *                            → طلب جديد (حالة pending) — أي حد عنده inventory يقدر يطلب.
 *   PATCH { id, action:'approve'|'reject', items? }
 *       approve             → يحرّك الكميات (رئيسي → وسيط) تلقائيًا، يسجّل حركات transfer،
 *                             ويحوّل الحالة fulfilled. يفشل لو الرصيد غير كافٍ في الرئيسي.
 *       reject              → يحوّل الحالة rejected (بدون تحريك مخزون).
 *
 * الموافقة تحرّك الكمية الفعلية: لكل بند، تُخصم من الرئيسي وتُضاف للوسيط، وتُسجّل
 * حركة transfer. لو أي بند رصيده غير كافٍ في الرئيسي → تفشل العملية كلها (معاملة ذرّية).
 */
import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function warehouseId(code: string): Promise<number | null> {
  const r = await query<{ id: string }>(`SELECT id FROM warehouses WHERE code = $1 LIMIT 1`, [code]);
  return r[0] ? Number(r[0].id) : null;
}

export async function GET() {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const rows = await query<any>(
      `SELECT r.id, r.status, r.note, r.created_at, r.reviewed_at,
              ru.name AS requested_by_name,
              rv.name AS reviewed_by_name,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'itemId', ri.item_id,
                         'name', i.name,
                         'unit', i.unit,
                         'quantity', ri.quantity,
                         'approvedQty', ri.approved_quantity,
                         'mainQty', COALESCE(ms.quantity, 0)
                       ) ORDER BY ri.id)
                FROM material_request_items ri
                JOIN inventory_items i ON i.id = ri.item_id
                LEFT JOIN warehouse_stock ms ON ms.item_id = ri.item_id AND ms.warehouse_id = (SELECT id FROM warehouses WHERE code='main')
                WHERE ri.request_id = r.id
              ), '[]') AS items
         FROM material_requests r
         LEFT JOIN users ru ON ru.id = r.requested_by
         LEFT JOIN users rv ON rv.id = r.reviewed_by
        ORDER BY
          CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
          r.created_at DESC
        LIMIT 200`
    );

    const requests = rows.map((r) => ({
      id: Number(r.id),
      status: r.status,
      note: r.note || "",
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      requestedBy: r.requested_by_name || "—",
      reviewedBy: r.reviewed_by_name || null,
      items: (Array.isArray(r.items) ? r.items : []).map((it: any) => ({
        itemId: Number(it.itemId),
        name: it.name,
        unit: it.unit,
        quantity: Number(it.quantity) || 0,
        approvedQty: it.approvedQty != null ? Number(it.approvedQty) : null,
        mainQty: Number(it.mainQty) || 0,
      })),
    }));
    return NextResponse.json({ ok: true, requests });
  } catch (err) {
    console.error("GET /api/admin/inventory/requests failed:", err);
    return bad("server_error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) return bad("unauthorized", 401);

    const b = await request.json();
    const note = b.note ? String(b.note).trim() : null;
    const items: { itemId: number; quantity: number }[] = Array.isArray(b.items)
      ? b.items.map((x: any) => ({ itemId: Number(x.itemId), quantity: Math.max(0, Number(x.quantity) || 0) })).filter((x: any) => x.itemId && x.quantity > 0)
      : [];
    if (items.length === 0) return bad("no_items");

    const ins = await query<{ id: string }>(
      `INSERT INTO material_requests (requested_by, status, note) VALUES ($1, 'pending', $2) RETURNING id`,
      [admin.id, note]
    );
    const reqId = Number(ins[0].id);
    for (const it of items) {
      await query(
        `INSERT INTO material_request_items (request_id, item_id, quantity) VALUES ($1, $2, $3)`,
        [reqId, it.itemId, it.quantity]
      );
    }
    return NextResponse.json({ ok: true, id: reqId });
  } catch (err) {
    console.error("POST /api/admin/inventory/requests failed:", err);
    return bad("server_error", 500);
  }
}

export async function PATCH(request: Request) {
  const client = await pool.connect();
  try {
    const admin = await getAdminWithPerm("inventory");
    if (!admin) { client.release(); return bad("unauthorized", 401); }

    const b = await request.json();
    const id = b.id ? Number(b.id) : null;
    const action = String(b.action ?? "");
    if (!id) { client.release(); return bad("id_required"); }

    // الرفض — بسيط، بدون تحريك مخزون
    if (action === "reject") {
      await query(
        `UPDATE material_requests SET status='rejected', reviewed_by=$2, reviewed_at=now() WHERE id=$1 AND status='pending'`,
        [id, admin.id]
      );
      client.release();
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    if (action !== "approve") { client.release(); return bad("bad_action"); }

    // ── الموافقة: تحريك ذرّي للكميات (رئيسي → وسيط) ──
    const mainId = await warehouseId("main");
    const interId = await warehouseId("intermediate");
    if (!mainId || !interId) { client.release(); return bad("no_warehouse"); }

    // كميات معتمَدة اختيارية لكل بند (لو الأدمن عدّلها)، وإلا الكمية المطلوبة.
    const approvedMap = new Map<number, number>();
    if (Array.isArray(b.items)) {
      for (const x of b.items) {
        const iid = Number(x.itemId); const q = Math.max(0, Number(x.approvedQty ?? x.quantity) || 0);
        if (iid) approvedMap.set(iid, q);
      }
    }

    await client.query("BEGIN");

    // نتأكد أن الطلب معلّق ونجيب بنوده
    const reqRows = await client.query(`SELECT status FROM material_requests WHERE id=$1 FOR UPDATE`, [id]);
    if (!reqRows.rows[0]) { await client.query("ROLLBACK"); client.release(); return bad("not_found", 404); }
    if (reqRows.rows[0].status !== "pending") { await client.query("ROLLBACK"); client.release(); return bad("not_pending"); }

    const itemRows = await client.query(
      `SELECT ri.item_id, ri.quantity FROM material_request_items ri WHERE ri.request_id = $1`,
      [id]
    );

    // نتحقق من كفاية الرصيد في الرئيسي لكل بند أولًا
    for (const row of itemRows.rows) {
      const itemId = Number(row.item_id);
      const wanted = approvedMap.has(itemId) ? approvedMap.get(itemId)! : Number(row.quantity);
      if (wanted <= 0) continue;
      const stock = await client.query(
        `SELECT COALESCE(quantity,0) AS q FROM warehouse_stock WHERE warehouse_id=$1 AND item_id=$2`,
        [mainId, itemId]
      );
      const have = Number(stock.rows[0]?.q) || 0;
      if (have < wanted) {
        await client.query("ROLLBACK"); client.release();
        return NextResponse.json({ ok: false, error: "insufficient_stock", itemId, have, wanted }, { status: 400 });
      }
    }

    // كل البنود متاحة → نفّذ التحريك + سجّل transfer + حدّث الكمية المعتمدة
    for (const row of itemRows.rows) {
      const itemId = Number(row.item_id);
      const wanted = approvedMap.has(itemId) ? approvedMap.get(itemId)! : Number(row.quantity);
      if (wanted <= 0) { continue; }

      // اخصم من الرئيسي
      await client.query(
        `UPDATE warehouse_stock SET quantity = quantity - $3, updated_at=now() WHERE warehouse_id=$1 AND item_id=$2`,
        [mainId, itemId, wanted]
      );
      // أضف للوسيط (upsert)
      await client.query(
        `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity) VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at=now()`,
        [interId, itemId, wanted]
      );
      // حركة transfer
      await client.query(
        `INSERT INTO stock_movements (item_id, from_warehouse, to_warehouse, quantity, movement_type, note, created_by)
         VALUES ($1, $2, $3, $4, 'transfer', $5, $6)`,
        [itemId, mainId, interId, wanted, `موافقة طلب #${id}`, admin.id]
      );
      // سجّل الكمية المعتمدة
      await client.query(
        `UPDATE material_request_items SET approved_quantity = $3 WHERE request_id = $1 AND item_id = $2`,
        [id, itemId, wanted]
      );
    }

    await client.query(
      `UPDATE material_requests SET status='fulfilled', reviewed_by=$2, reviewed_at=now() WHERE id=$1`,
      [id, admin.id]
    );

    await client.query("COMMIT");
    client.release();
    return NextResponse.json({ ok: true, status: "fulfilled" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    client.release();
    console.error("PATCH /api/admin/inventory/requests failed:", err);
    return bad("server_error", 500);
  }
}