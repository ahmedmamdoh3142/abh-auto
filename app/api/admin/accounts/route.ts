/**
 * app/api/admin/accounts/route.ts — إدارة كل الحسابات (member / staff / admin / partner)
 *
 *   GET                 → كل الحسابات (مع اسم الشركة لو partner)
 *   POST                → إنشاء حساب جديد (الأدمن يكتب الباسوورد). لو الدور partner
 *                          يُنشأ صف partners تلقائيًا في نفس المعاملة.
 *   PATCH               → تعديل بيانات حساب (الاسم/الإيميل/الهاتف/الدور/الباسوورد/الشركة)
 *   DELETE ?id=...      → حذف حساب (وبالـ CASCADE: شركته وأسعاره وجلساته)
 *
 * ملاحظة أمان: الباسوورد يُحفظ كـ hash فقط (bcrypt) عبر hashPassword.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { hashPassword } from "@/lib/auth";

const ROLES = ["member", "staff", "admin", "partner"] as const;
type Role = (typeof ROLES)[number];

export async function GET() {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const rows = await query<any>(
      `SELECT u.id, u.name, u.email, u.phone, u.city_code, u.role, u.member_since,
              p.id AS partner_id, p.company_name, p.is_active AS partner_active
         FROM users u
         LEFT JOIN partners p ON p.user_id = u.id
        ORDER BY u.created_at DESC`
    );

    const accounts = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      city: u.city_code ?? "",
      role: u.role as Role,
      since: u.member_since,
      partnerId: u.partner_id ?? null,
      companyName: u.company_name ?? null,
      partnerActive: u.partner_active ?? null,
    }));

    return NextResponse.json({ ok: true, accounts });
  } catch (err) {
    console.error("GET /api/admin/accounts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const b = await request.json();
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    const phone = b.phone ? String(b.phone).trim() : null;
    const city = b.city ? String(b.city).trim() : null;
    const role: Role = ROLES.includes(b.role) ? b.role : "member";
    const password = String(b.password ?? "");
    const companyName = b.companyName ? String(b.companyName).trim() : null;

    if (!name || !email) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    if (role === "partner" && !companyName)
      return NextResponse.json({ ok: false, error: "company_name_required" }, { status: 400 });

    // إيميل مستخدم؟
    const exists = await query<any>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (exists[0]) return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });

    const hash = await hashPassword(password);

    const userRows = await query<{ id: string }>(
      `INSERT INTO users (name, email, phone, city_code, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6::public.user_role)
       RETURNING id`,
      [name, email, phone, city, hash, role]
    );
    const userId = userRows[0].id;

    let partnerId: string | null = null;
    if (role === "partner") {
      const pr = await query<{ id: string }>(
        `INSERT INTO partners (user_id, company_name, contact_person, company_phone, company_email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, companyName, name, phone, email]
      );
      partnerId = pr[0].id;
    }

    return NextResponse.json({ ok: true, id: userId, partnerId });
  } catch (err) {
    console.error("POST /api/admin/accounts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const b = await request.json();
    const id = b.id ? String(b.id) : null;
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    const phone = b.phone ? String(b.phone).trim() : null;
    const city = b.city ? String(b.city).trim() : null;
    const role: Role = ROLES.includes(b.role) ? b.role : "member";
    const companyName = b.companyName ? String(b.companyName).trim() : null;
    const newPassword = b.password ? String(b.password) : null;

    if (!name || !email) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });

    // تحديث بيانات المستخدم
    await query(
      `UPDATE users SET name=$2, email=$3, phone=$4, city_code=$5, role=$6::public.user_role, updated_at=now()
       WHERE id=$1`,
      [id, name, email, phone, city, role]
    );

    // باسوورد جديد (اختياري)
    if (newPassword) {
      if (newPassword.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
      const hash = await hashPassword(newPassword);
      await query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [id, hash]);
    }

    // مزامنة صف الشركة حسب الدور
    if (role === "partner") {
      if (!companyName) return NextResponse.json({ ok: false, error: "company_name_required" }, { status: 400 });
      // upsert صف partners
      await query(
        `INSERT INTO partners (user_id, company_name, contact_person, company_phone, company_email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id)
         DO UPDATE SET company_name = EXCLUDED.company_name,
                       is_active = true,
                       updated_at = now()`,
        [id, companyName, name, phone, email]
      );
    } else {
      // لم يعد شركة → عطّل شراكته (لا نحذف عشان نحفظ سجلّ الحجوزات القديمة)
      await query(`UPDATE partners SET is_active=false, updated_at=now() WHERE user_id=$1`, [id]).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/accounts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

    // لا تسمح للأدمن بحذف نفسه
    if (id === admin.id) return NextResponse.json({ ok: false, error: "cannot_delete_self" }, { status: 400 });

    await query(`DELETE FROM users WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/accounts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
