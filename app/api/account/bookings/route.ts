import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// تحديث الحجز (إعادة جدولة)
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, time } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    }

    // التحقق من أن الحجز يخص المستخدم
    const check = await query<{ id: string }>(
      `SELECT id FROM bookings WHERE reference = $1 AND user_id = $2`,
      [id, user.id]
    );
    if (check.length === 0) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (date !== undefined) {
      updates.push(`scheduled_date = $${idx++}`);
      values.push(date);
    }
    if (time !== undefined) {
      updates.push(`scheduled_time = $${idx++}`);
      values.push(time);
    }

    if (updates.length === 0) {
      return NextResponse.json({ ok: true });
    }

    values.push(id, user.id);
    await query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE reference = $${idx++} AND user_id = $${idx}`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/account/bookings failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// إلغاء الحجز (حذف فعلي)
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    }

    // التحقق من الملكية ثم الحذف (ON DELETE CASCADE سيمسح booking_items و booking_status_history تلقائياً)
    const result = await query(
      `DELETE FROM bookings WHERE reference = $1 AND user_id = $2`,
      [id, user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account/bookings failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}