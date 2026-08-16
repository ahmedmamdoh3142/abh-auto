/**
 * app/api/admin/sales-tasks/full-export/route.ts
 * بيرجع كل تاسكات المبيعات (حسب نفس فلاتر الصفحة) + كل الكومنتات/سجل النشاط
 * الكامل لكل تاسك (author + body + created_at) — مُستخدَم في تقرير الـPDF التفصيلي.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

function hasFullAccess(admin: any) {
  return admin.role === "admin" || admin.is_super_admin === true || admin.isSuperAdmin === true;
}

export async function GET(request: Request) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");
  const q = url.searchParams.get("q")?.trim() || "";
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const scope = url.searchParams.get("scope");
  const assignedTo = url.searchParams.get("assignedTo");
  const leadSource = url.searchParams.get("leadSource");

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  const fullAccess = hasFullAccess(admin);
  if (!fullAccess || scope !== "all") {
    where.push(`(t.assigned_to = $${i++} OR t.created_by = $${i++})`);
    params.push(admin.id, admin.id);
  } else if (assignedTo === "unassigned") {
    where.push(`t.assigned_to IS NULL`);
  } else if (assignedTo) {
    where.push(`t.assigned_to = $${i++}`);
    params.push(assignedTo);
  }

  if (stage && stage !== "all") { where.push(`t.stage = $${i++}::sales_task_stage`); params.push(stage); }
  if (leadSource && leadSource !== "all") { where.push(`t.lead_source = $${i++}`); params.push(leadSource); }
  if (q) {
    where.push(`(t.customer_name ILIKE $${i} OR t.customer_phone ILIKE $${i})`);
    params.push(`%${q}%`); i++;
  }
  if (dateFrom) { where.push(`t.created_at::date >= $${i++}::date`); params.push(dateFrom); }
  if (dateTo) { where.push(`t.created_at::date <= $${i++}::date`); params.push(dateTo); }

  const sql = `
    SELECT t.id, t.customer_name, t.customer_phone, t.customer_email, t.customer_city,
           t.services_snapshot, t.quality, t.price_objection, t.initial_note, t.lead_source,
           t.vehicle_brand_name, t.vehicle_model, t.vehicle_size,
           t.stage, au.name AS assigned_name, cu.name AS created_name,
           t.created_at, t.updated_at,
           t.close_result, t.close_reason, t.close_note, t.closed_at,
           to_char(t.follow_up_date, 'YYYY-MM-DD') AS follow_up_date,
           t.follow_up_note, t.follow_up_cancelled_at, t.follow_up_cancel_reason,
           COALESCE(
             (SELECT json_agg(json_build_object(
                 'id', n.id,
                 'authorName', n.author_name,
                 'body', n.body,
                 'createdAt', n.created_at
               ) ORDER BY n.created_at ASC)
              FROM sales_task_notes n WHERE n.task_id = t.id),
             '[]'::json
           ) AS notes
    FROM sales_tasks t
    LEFT JOIN users cu ON cu.id = t.created_by
    LEFT JOIN users au ON au.id = t.assigned_to
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY t.created_at DESC
  `;

  try {
    const rows = await query<any>(sql, params);
    const tasks = rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email,
      customerCity: r.customer_city,
      services: r.services_snapshot ?? [],
      quality: r.quality,
      priceObjection: !!r.price_objection,
      initialNote: r.initial_note,
      leadSource: r.lead_source,
      vehicleBrandName: r.vehicle_brand_name,
      vehicleModel: r.vehicle_model,
      vehicleSize: r.vehicle_size,
      stage: r.stage,
      assignedName: r.assigned_name,
      createdName: r.created_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      closeResult: r.close_result,
      closeReason: r.close_reason,
      closeNote: r.close_note,
      closedAt: r.closed_at,
      followUpDate: r.follow_up_date,
      followUpNote: r.follow_up_note,
      followUpCancelledAt: r.follow_up_cancelled_at,
      followUpCancelReason: r.follow_up_cancel_reason,
      notes: r.notes ?? [],
    }));
    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    console.error("GET /api/admin/sales-tasks/full-export failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}