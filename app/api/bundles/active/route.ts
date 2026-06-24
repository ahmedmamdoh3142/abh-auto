// app/api/bundles/active/route.ts — البندلات النشطة لصفحة الحجز (عام).
// يرجّع معرّفات الخدمات المؤهِّلة/الهدايا + إعدادات كل بندل. الواجهة تربط الـids
// بالخدمات الموجودة عندها أصلًا (DbServiceMeta.id).
import { NextResponse } from "next/server";
import { getActiveBundles } from "@/lib/bundles";

export async function GET() {
  try {
    const bundles = await getActiveBundles();
    return NextResponse.json({
      ok: true,
      bundles: bundles.map((b) => ({
        id: b.id,
        title: b.title,
        giftMode: b.giftMode,
        giftPercent: b.giftPercent,
        minTriggerCount: b.minTriggerCount,
        maxGifts: b.maxGifts,
        stackable: b.stackable,
        triggerIds: b.triggerIds,
        giftIds: b.giftIds,
      })),
    });
  } catch (err) {
    console.error("GET /api/bundles/active failed:", err);
    return NextResponse.json({ ok: false, error: "server_error", bundles: [] }, { status: 500 });
  }
}