// app/api/promo/validate/route.ts — تحقق من كود الخصم + حساب مبدئي للخصم.
// يستقبل بنود الطلب (services + أسعارها) ويرجّع الخصم المتوقّع لكل خدمة.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPromoByCode, checkPromoValidity, computePromo, type PromoLine } from "@/lib/promo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();
    if (!code) return NextResponse.json({ ok: false, error: "empty" });

    // بنود الطلب اختيارية: [{ serviceId, unit }] + أساس الحد الأدنى.
    const lines: PromoLine[] = Array.isArray(body.lines)
      ? body.lines.map((l: any) => ({ serviceId: Number(l.serviceId), unit: Number(l.unit) || 0 }))
      : [];
    const subtotalForMin = Number(body.subtotal) || lines.reduce((s, l) => s + l.unit, 0);

    const user = await getCurrentUser();
    const promo = await getPromoByCode(code);
    if (!promo) return NextResponse.json({ ok: false, error: "not_found" });

    const invalid = await checkPromoValidity(promo, user?.id);
    if (invalid) return NextResponse.json({ ok: false, error: invalid });

    // لو الكود مربوط بخدمات لكن مفيش بنود مبعوتة، نرجّع معلوماته بدون حساب.
    const comp = lines.length ? computePromo(promo, lines, subtotalForMin) : null;
    if (comp?.error) return NextResponse.json({ ok: false, error: comp.error });

    return NextResponse.json({
      ok: true,
      code: promo.code,
      kind: promo.kind,
      label: promo.label,
      percent: promo.discountPercent,     // توافق قديم
      discountPercent: promo.discountPercent,
      fixedAmount: promo.fixedAmount,
      minOrder: promo.minOrder,
      serviceIds: promo.services.map((s) => s.serviceId),
      discount: comp?.discount ?? 0,
      perService: comp?.perService ?? {},
      matchedServiceIds: comp?.matchedServiceIds ?? [],
    });
  } catch (err) {
    console.error("POST /api/promo/validate failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}