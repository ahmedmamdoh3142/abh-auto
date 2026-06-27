/**
 * app/api/admin/price-templates/route.ts
 * ───────────────────────────────────────────────────────────────────────────
 * دفتر الأسعار المعتمد (شركاء/مناديب) — قابل للتعديل من اللوحة وبيتحفظ في DB.
 *
 *   GET  ?kind=partner|rep   → خريطة { "serviceId:size": { price, commission } }
 *   PUT                      → حفظ جماعي { kind, prices: [{serviceId,sizeCode,price,commission}] }
 *                              (سعر 0 وعمولة 0 = حذف الصف)
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

type Kind = "partner" | "rep";
const isKind = (k: any): k is Kind => k === "partner" || k === "rep";

export async function GET(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    if (!isKind(kind)) return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });

    const rows = await query<any>(
      `SELECT service_id, size_code, price, commission
         FROM price_templates
        WHERE kind = $1`,
      [kind]
    );

    const prices: Record<string, { price: number; commission: number }> = {};
    for (const r of rows) {
      prices[`${r.service_id}:${r.size_code}`] = {
        price: Number(r.price),
        commission: Number(r.commission),
      };
    }
    return NextResponse.json({ ok: true, kind, prices });
  } catch (err) {
    console.error("GET /api/admin/price-templates failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

type PriceInput = { serviceId: number; sizeCode: string; price: number; commission: number };

export async function PUT(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    const kind = body?.kind;
    const prices: PriceInput[] = Array.isArray(body?.prices) ? body.prices : [];
    if (!isKind(kind)) return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });

    for (const p of prices) {
      const price = Number(p.price) || 0;
      const commission = Number(p.commission) || 0;

      // سعر صفر وعمولة صفر = حذف الصف (يرجع للسعر العام عند التطبيق)
      if (!(price > 0) && !(commission > 0)) {
        await query(
          `DELETE FROM price_templates WHERE kind=$1 AND service_id=$2 AND size_code=$3`,
          [kind, p.serviceId, p.sizeCode]
        ).catch(() => {});
        continue;
      }

      await query(
        `INSERT INTO price_templates (kind, service_id, size_code, price, commission)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (kind, service_id, size_code)
         DO UPDATE SET price = EXCLUDED.price,
                       commission = EXCLUDED.commission,
                       updated_at = now()`,
        [kind, p.serviceId, p.sizeCode, price, commission]
      );
    }

    return NextResponse.json({ ok: true, count: prices.length });
  } catch (err) {
    console.error("PUT /api/admin/price-templates failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}