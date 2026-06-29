/**
 * app/api/admin/price-files/route.ts — نظام «ملفات الأسعار» (snapshots موثّقة)
 *
 *   GET                          → قائمة الملفات (رؤوس فقط) + إحصائيات لكل ملف.
 *        ?id=<uuid>              → ملف واحد كامل بكل سطوره (للفتح/التعديل).
 *
 *   POST                         → إنشاء ملف جديد (snapshot كامل).
 *        body: { name, category, note?, items:[{serviceId,sizeCode,price,old,commission,name}] }
 *
 *   PATCH                        → تعديل رأس ملف (الاسم/الملاحظة فقط — السطور immutable).
 *        body: { id, name?, note? }
 *
 *   PUT  ?action=primary         → اعتماد ملف كأساسي لفئته (+ تطبيقه أوتوماتيك لو partner/rep).
 *        body: { id }
 *   PUT  ?action=duplicate       → حفظ نسخة جديدة من ملف (بأسعار مُمرّرة من الواجهة).
 *        body: { sourceId?, name, category, note?, items:[...] }
 *
 *   DELETE ?id=<uuid>            → حذف ملف (ممنوع حذف المعتمد إلا لو فيه معتمد بديل).
 *
 * ملاحظات التصميم:
 *  • كل ملف Snapshot كامل ومستقل → الملفات القديمة تبقى ثابتة حتى لو تغيّرت الخدمات.
 *  • المعتمد: واحد لكل فئة. اعتماد ملف partner/rep يطبّق أسعاره فورًا على كل الشركاء.
 *    - partner → partner_service_prices لكل شركة (price + commission).
 *    - rep/public → نخزّن الاعتماد فقط (الأسعار تُقرأ من الملف عند الحاجة).
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

/**
 * ملاحظة توافق: نستخدم ترانزاكشن يدوية عبر query("BEGIN"/"COMMIT"/"ROLLBACK").
 * لو عندك helper جاهز اسمه tx() أو withTransaction()، تقدر تستبدل runTx بيه.
 * المهم إن BEGIN/COMMIT يمشوا على نفس الاتصال — لو الـpool بتاعك بيوزّع اتصالات
 * مختلفة لكل query، استخدم helper الترانزاكشن بتاعك بدل runTx.
 */
async function runTx<T>(fn: () => Promise<T>): Promise<T> {
  await query("BEGIN");
  try {
    const out = await fn();
    await query("COMMIT");
    return out;
  } catch (e) {
    await query("ROLLBACK").catch(() => {});
    throw e;
  }
}

type Category = "public" | "partner" | "rep";
type ItemInput = {
  serviceId: number;
  sizeCode: string;
  price: number;
  old?: number;
  commission?: number;
  name?: { ar?: string; en?: string } | null;
};

const isCat = (v: any): v is Category => v === "public" || v === "partner" || v === "rep";

/* ───────────────────────── GET ───────────────────────── */
export async function GET(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // ── ملف واحد كامل ──
    if (id) {
      const headRows = await query<any>(
        `SELECT id, name, category, note, is_primary, created_at, updated_at
           FROM price_files WHERE id = $1`,
        [id]
      );
      if (!headRows.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

      const items = await query<any>(
        `SELECT service_id, size_code, price, old_price, commission, name_snapshot
           FROM price_file_items WHERE file_id = $1`,
        [id]
      );

      // خريطة "serviceId:size" → القيم
      const map: Record<string, { price: number; old: number; commission: number }> = {};
      for (const r of items) {
        map[`${r.service_id}:${r.size_code}`] = {
          price: Number(r.price) || 0,
          old: r.old_price != null ? Number(r.old_price) : 0,
          commission: Number(r.commission) || 0,
        };
      }
      const h = headRows[0];
      return NextResponse.json({
        ok: true,
        file: {
          id: h.id, name: h.name, category: h.category, note: h.note,
          isPrimary: h.is_primary, createdAt: h.created_at, updatedAt: h.updated_at,
          prices: map,
        },
      });
    }

    // ── قائمة الملفات (رؤوس + إحصائيات) ──
    const rows = await query<any>(
      `SELECT f.id, f.name, f.category, f.note, f.is_primary, f.created_at, f.updated_at,
              COALESCE(cnt.priced, 0)      AS priced_count,
              COALESCE(cnt.commission, 0)  AS commission_total
         FROM price_files f
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT service_id) FILTER (WHERE price > 0) AS priced,
                  COALESCE(SUM(commission) FILTER (WHERE price > 0), 0) AS commission
             FROM price_file_items i WHERE i.file_id = f.id
         ) cnt ON true
        ORDER BY f.created_at DESC`
    );

    const files = rows.map((r) => ({
      id: r.id, name: r.name, category: r.category, note: r.note,
      isPrimary: r.is_primary, createdAt: r.created_at, updatedAt: r.updated_at,
      pricedCount: Number(r.priced_count) || 0,
      commissionTotal: Number(r.commission_total) || 0,
    }));
    return NextResponse.json({ ok: true, files });
  } catch (err) {
    console.error("GET /api/admin/price-files failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ─────────────── إدراج سطور snapshot لملف ─────────────── */
async function insertItems(fileId: string, items: ItemInput[]) {
  for (const it of items) {
    const price = Number(it.price) || 0;
    const old = it.old != null && Number(it.old) > 0 ? Number(it.old) : null;
    const commission = Number(it.commission) || 0;
    // نخزّن كل خدمة/حجم مُمرّرة (حتى السعر 0 = موثّق إنه غير مسعّر)، لكن نتفادى التكرار
    await query(
      `INSERT INTO price_file_items (file_id, service_id, size_code, price, old_price, commission, name_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (file_id, service_id, size_code) DO UPDATE
         SET price = EXCLUDED.price, old_price = EXCLUDED.old_price,
             commission = EXCLUDED.commission, name_snapshot = EXCLUDED.name_snapshot`,
      [fileId, it.serviceId, it.sizeCode, price, old, commission,
       it.name ? JSON.stringify(it.name) : null]
    );
  }
}

/* ───────────────────────── POST (إنشاء) ───────────────────────── */
export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || "").trim();
    const category = body.category;
    const note = body.note ? String(body.note) : null;
    const items: ItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!name) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    if (!isCat(category)) return NextResponse.json({ ok: false, error: "bad_category" }, { status: 400 });

    const newId = await runTx(async () => {
      const rows = await query<{ id: string }>(
        `INSERT INTO price_files (name, category, note, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [name, category, note, admin.id]
      );
      const fileId = rows[0].id;
      await insertItems(fileId, items);
      return fileId;
    });

    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    console.error("POST /api/admin/price-files failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ───────────────────────── PATCH (تعديل الرأس) ───────────────────────── */
export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    const id = body.id ? String(body.id) : null;
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    const name = body.name != null ? String(body.name).trim() : null;
    const note = body.note != null ? String(body.note) : null;

    await query(
      `UPDATE price_files
          SET name = COALESCE($2, name),
              note = COALESCE($3, note),
              updated_at = now()
        WHERE id = $1`,
      [id, name, note]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/price-files failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ───── تطبيق ملف معتمد (partner) على كل الشركاء فعليًا ───── */
async function applyToAllPartners(fileId: string) {
  // نقرأ سطور الملف
  const items = await query<any>(
    `SELECT service_id, size_code, price, commission
       FROM price_file_items WHERE file_id = $1 AND price > 0`,
    [fileId]
  );
  // كل الشركاء النشطين
  const partners = await query<any>(`SELECT id FROM partners WHERE is_active = true`);
  for (const p of partners) {
    for (const it of items) {
      await query(
        `INSERT INTO partner_service_prices (partner_id, service_id, size_code, price, commission)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (partner_id, service_id, size_code)
         DO UPDATE SET price = EXCLUDED.price, commission = EXCLUDED.commission, updated_at = now()`,
        [p.id, it.service_id, it.size_code, Number(it.price) || 0, Number(it.commission) || 0]
      );
    }
  }
  return { partners: partners.length, services: items.length };
}

/* ───────────────────────── PUT (اعتماد / نسخة جديدة) ───────────────────────── */
export async function PUT(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    // ════ اعتماد ملف كأساسي لفئته ════
    if (action === "primary") {
      const id = body.id ? String(body.id) : null;
      if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

      const result = await runTx(async () => {
        const headRows = await query<any>(`SELECT id, category FROM price_files WHERE id = $1`, [id]);
        if (!headRows.length) throw new Error("not_found");
        const cat = headRows[0].category as Category;

        // شيل الاعتماد عن باقي ملفات نفس الفئة، ثم اعتمد ده (في نفس الترانزاكشن)
        await query(`UPDATE price_files SET is_primary = false WHERE category = $1 AND is_primary = true`, [cat]);
        await query(`UPDATE price_files SET is_primary = true,  updated_at = now() WHERE id = $1`, [id]);

        // partner → طبّق فعليًا على كل الشركاء
        let applied = null;
        if (cat === "partner") applied = await applyToAllPartners(id);
        return { category: cat, applied };
      });

      return NextResponse.json({ ok: true, ...result });
    }

    // ════ حفظ كنسخة جديدة (duplicate) ════
    if (action === "duplicate") {
      const name = String(body.name || "").trim();
      const category = body.category;
      const note = body.note ? String(body.note) : null;
      const items: ItemInput[] = Array.isArray(body.items) ? body.items : [];
      if (!name) return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
      if (!isCat(category)) return NextResponse.json({ ok: false, error: "bad_category" }, { status: 400 });

      const newId = await runTx(async () => {
        const rows = await query<{ id: string }>(
          `INSERT INTO price_files (name, category, note, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
          [name, category, note, admin.id]
        );
        const fileId = rows[0].id;
        await insertItems(fileId, items);
        return fileId;
      });

      return NextResponse.json({ ok: true, id: newId });
    }

    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  } catch (err: any) {
    if (err?.message === "not_found") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    console.error("PUT /api/admin/price-files failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/* ───────────────────────── DELETE ───────────────────────── */
export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    // ممنوع حذف الملف المعتمد (لازم تعتمد بديل أولًا)
    const rows = await query<any>(`SELECT is_primary FROM price_files WHERE id = $1`, [id]);
    if (!rows.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (rows[0].is_primary) {
      return NextResponse.json({ ok: false, error: "primary_protected" }, { status: 409 });
    }

    await query(`DELETE FROM price_files WHERE id = $1`, [id]); // السطور تتحذف بالـCASCADE
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/price-files failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}