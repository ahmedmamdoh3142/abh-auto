/**
 * app/api/admin/accounts/route.ts — إدارة كل الحسابات (member / staff / admin / partner)
 *
 * (جديد) الصلاحيات + المسمى الوظيفي:
 *   • job_title (نص حر) و permissions (JSONB) تُحفظ للموظّف/المدير فقط.
 *   • العميل/الشركة: تُصفَّر صلاحياتهم ومسمّاهم دائمًا.
 *   • حماية super admin: لا تُعدَّل صلاحياته، ولا يُرفَّع أحد لـ super من هنا.
 *
 * الدخول باسم المستخدم — الإيميل يُولَّد داخليًا لو لم يُرسل. الاسم فريد.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin/guard";
import { hashPassword } from "@/lib/auth";
import { ALL_PERM_KEYS } from "@/lib/admin/permissions";

const ROLES = ["member", "staff", "admin", "partner"] as const;
type Role = (typeof ROLES)[number];

function genInternalEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "user";
  return `${slug}-${randomBytes(4).toString("hex")}@abh-auto.local`;
}

async function nameTaken(name: string, exceptId?: string): Promise<boolean> {
  const rows = exceptId
    ? await query<{ id: string }>(
        `SELECT id FROM users
          WHERE lower(name) = lower($1) AND id <> $2
            AND (password_hash IS NULL OR password_hash NOT LIKE 'nologin:%') LIMIT 1`,
        [name, exceptId]
      )
    : await query<{ id: string }>(
        `SELECT id FROM users
          WHERE lower(name) = lower($1)
            AND (password_hash IS NULL OR password_hash NOT LIKE 'nologin:%') LIMIT 1`,
        [name]
      );
  return !!rows[0];
}

/** ينقّي الصلاحيات لمفاتيح معروفة فقط (يمنع حقن مفاتيح غريبة). */
function sanitizePermissions(input: any, role: Role): string[] {
  if (role !== "admin" && role !== "staff") return []; // العميل/الشركة بلا صلاحيات
  if (!Array.isArray(input)) return [];
  return input.filter((k) => typeof k === "string" && (ALL_PERM_KEYS as string[]).includes(k));
}

export async function GET() {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const rows = await query<any>(
      `SELECT u.id, u.name, u.email, u.phone, u.city_code, u.role, u.member_since,
              u.job_title, u.permissions, u.is_super_admin,
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
      jobTitle: u.job_title ?? "",
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      isSuperAdmin: !!u.is_super_admin,
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
    let email = String(b.email ?? "").trim().toLowerCase();
    const phone = b.phone ? String(b.phone).trim() : null;
    const city = b.city ? String(b.city).trim() : null;
    const role: Role = ROLES.includes(b.role) ? b.role : "member";
    const password = String(b.password ?? "");
    const companyName = b.companyName ? String(b.companyName).trim() : null;
    const jobTitle = (role === "admin" || role === "staff") && b.jobTitle ? String(b.jobTitle).trim() : null;
    const permissions = sanitizePermissions(b.permissions, role);

    if (!name) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    if (role === "partner" && !companyName)
      return NextResponse.json({ ok: false, error: "company_name_required" }, { status: 400 });

    if (await nameTaken(name)) return NextResponse.json({ ok: false, error: "name_taken" }, { status: 409 });

    if (!email) email = genInternalEmail(name);
    const exists = await query<any>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (exists[0]) return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });

    const hash = await hashPassword(password);

    const userRows = await query<{ id: string }>(
      `INSERT INTO users (name, email, phone, city_code, password_hash, role, job_title, permissions)
       VALUES ($1, $2, $3, $4, $5, $6::public.user_role, $7, $8::jsonb)
       RETURNING id`,
      [name, email, phone, city, hash, role, jobTitle, JSON.stringify(permissions)]
    );
    const userId = userRows[0].id;

    let partnerId: string | null = null;
    if (role === "partner") {
      const pr = await query<{ id: string }>(
        `INSERT INTO partners (user_id, company_name, contact_person, company_phone, company_email)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
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
    const jobTitle = (role === "admin" || role === "staff") && b.jobTitle ? String(b.jobTitle).trim() : null;
    const permissions = sanitizePermissions(b.permissions, role);

    if (!name) return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });

    // حماية المدير الأعلى: لا يُعدَّل عبر هذا المسار (لا صلاحيات ولا دور).
    const target = await query<{ is_super_admin: boolean }>(`SELECT is_super_admin FROM users WHERE id = $1 LIMIT 1`, [id]);
    if (target[0]?.is_super_admin) {
      return NextResponse.json({ ok: false, error: "protected_super_admin" }, { status: 403 });
    }

    if (await nameTaken(name, id)) return NextResponse.json({ ok: false, error: "name_taken" }, { status: 409 });

    // تحديث البيانات + المسمى + الصلاحيات (is_super_admin لا يُلمَس هنا أبدًا).
    await query(
      `UPDATE users
          SET name=$2, phone=$3, city_code=$4, role=$5::public.user_role,
              job_title=$6, permissions=$7::jsonb, updated_at=now()
        WHERE id=$1`,
      [id, name, phone, city, role, jobTitle, JSON.stringify(permissions)]
    );

    if (email) {
      await query(`UPDATE users SET email=$2 WHERE id=$1`, [id, email]).catch(() => {});
    }

    if (newPassword) {
      if (newPassword.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
      const hash = await hashPassword(newPassword);
      await query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [id, hash]);
    }

    if (role === "partner") {
      if (!companyName) return NextResponse.json({ ok: false, error: "company_name_required" }, { status: 400 });
      await query(
        `INSERT INTO partners (user_id, company_name, contact_person, company_phone, company_email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id)
         DO UPDATE SET company_name = EXCLUDED.company_name, is_active = true, updated_at = now()`,
        [id, companyName, name, phone, email || null]
      );
    } else {
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

    if (id === admin.id) return NextResponse.json({ ok: false, error: "cannot_delete_self" }, { status: 400 });

    // منع حذف المدير الأعلى.
    const target = await query<{ is_super_admin: boolean }>(`SELECT is_super_admin FROM users WHERE id = $1 LIMIT 1`, [id]);
    if (target[0]?.is_super_admin) return NextResponse.json({ ok: false, error: "protected_super_admin" }, { status: 403 });

    await query(`DELETE FROM users WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/accounts failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}