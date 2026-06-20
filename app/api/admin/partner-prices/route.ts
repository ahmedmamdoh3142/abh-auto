/**
 * app/api/admin/partner-prices/route.ts
 * إدارة دفتر أسعار شركة معيّنة (السعر الخاص + العمولة لكل خدمة/حجم).
 *
 *   GET    ?partnerId=...   → كل أسعار الشركة الحالية كخريطة { "serviceId:size": {price,commission} }
 *   PUT                     → حفظ جماعي لمصفوفة الأسعار (upsert + حذف الفارغ)
 *   DELETE ?partnerId=...&serviceId=...&size=...  → حذف سعر خدمة/حجم واحد
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";

export async function GET(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get("partnerId");
    if (!partnerId) return NextResponse.json({ ok: false, error: "partner_required" }, { status: 400 });

    const rows = await query<any>(
      `SELECT service_id, size_code, price, commission
         FROM partner_service_prices
        WHERE partner_id = $1`,
      [partnerId]
    );

    // خريطة سهلة للواجهة: "serviceId:size" → { price, commission }
    const prices: Record<string, { price: number; commission: number }> = {};
    for (const r of rows) {
      prices[`${r.service_id}:${r.size_code}`] = {
        price: Number(r.price),
        commission: Number(r.commission),
      };
    }

    return NextResponse.json({ ok: true, partnerId, prices });
  } catch (err) {
    console.error("GET /api/admin/partner-prices failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

type PriceInput = {
  serviceId: number;
  sizeCode: string;
  price: number;       // سعر الشركة
  commission: number;  // عمولتك الثابتة
};

export async function PUT(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    const partnerId = body.partnerId ? String(body.partnerId) : null;
    const prices: PriceInput[] = Array.isArray(body.prices) ? body.prices : [];
    if (!partnerId) return NextResponse.json({ ok: false, error: "partner_required" }, { status: 400 });

    for (const p of prices) {
      const price = Number(p.price) || 0;
      const commission = Number(p.commission) || 0;

      // سعر صفر أو أقل = إزالة السعر الخاص (الشركة ترجع للسعر الأساسي لهذه الخدمة)
      if (!(price > 0)) {
        await query(
          `DELETE FROM partner_service_prices
            WHERE partner_id = $1 AND service_id = $2 AND size_code = $3`,
          [partnerId, p.serviceId, p.sizeCode]
        ).catch(() => {});
        continue;
      }

      await query(
        `INSERT INTO partner_service_prices (partner_id, service_id, size_code, price, commission)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (partner_id, service_id, size_code)
         DO UPDATE SET price = EXCLUDED.price,
                       commission = EXCLUDED.commission,
                       updated_at = now()`,
        [partnerId, p.serviceId, p.sizeCode, price, commission]
      );
    }

    return NextResponse.json({ ok: true, count: prices.length });
  } catch (err) {
    console.error("PUT /api/admin/partner-prices failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get("partnerId");
    const serviceId = searchParams.get("serviceId");
    const size = searchParams.get("size");
    if (!partnerId) return NextResponse.json({ ok: false, error: "partner_required" }, { status: 400 });

    if (serviceId && size) {
      await query(
        `DELETE FROM partner_service_prices
          WHERE partner_id = $1 AND service_id = $2 AND size_code = $3`,
        [partnerId, serviceId, size]
      );
    } else {
      // حذف كل أسعار الشركة (تصفير دفترها)
      await query(`DELETE FROM partner_service_prices WHERE partner_id = $1`, [partnerId]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/partner-prices failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
