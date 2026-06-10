import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
    const city = body.city !== undefined ? String(body.city).trim() : undefined;

    // ملاحظة: لا نسمح بتعديل الإيميل هنا (فريد ومرتبط بالدخول)
    if (name !== undefined && !name) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }

    // نبني التحديث ديناميكيًا حسب الحقول المُرسلة فقط
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${i++}`); values.push(phone || null); }
    if (city !== undefined) { fields.push(`city_code = $${i++}`); values.push(city || null); }

    if (fields.length === 0) {
      return NextResponse.json({ ok: true }); // لا تغييرات
    }

    values.push(user.id); // المعرّف من الجلسة وليس من العميل
    await query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/account/profile failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}