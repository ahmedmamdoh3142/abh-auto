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
  const scope = url.searchParams.get("scope"); // "mine" | "all"
  const assignedTo = url.searchParams.get("assignedTo"); // staff id | "unassigned"

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  const fullAccess = hasFullAccess(admin);
  if (!fullAccess || scope !== "all") {
    // موظف عادي، أو أدمن مختار "تاسكاتي فقط" — يشوف بس اللي موجّه له
    where.push(`t.assigned_to = $${i++}`);
    params.push(admin.id);
  } else if (assignedTo === "unassigned") {
    where.push(`t.assigned_to IS NULL`);
  } else if (assignedTo) {
    where.push(`t.assigned_to = $${i++}`);
    params.push(assignedTo);
  }

  if (stage && stage !== "all") { where.push(`t.stage = $${i++}::sales_task_stage`); params.push(stage); }
  if (q) {
    where.push(`(t.customer_name ILIKE $${i} OR t.customer_phone ILIKE $${i})`);
    params.push(`%${q}%`); i++;
  }
  if (dateFrom) { where.push(`t.created_at::date >= $${i++}::date`); params.push(dateFrom); }
  if (dateTo) { where.push(`t.created_at::date <= $${i++}::date`); params.push(dateTo); }

  const sql = `
    SELECT t.id, t.customer_name, t.customer_phone, t.customer_email, t.customer_city,
           t.services_snapshot, t.quality, t.price_objection, t.initial_note,
           t.vehicle_brand_id, t.vehicle_brand_name, t.vehicle_model, t.vehicle_size,
           t.stage, t.assigned_to, au.name AS assigned_name,
           t.created_by, t.created_at, t.updated_at,
           t.close_result, t.close_reason, t.close_note, t.closed_by, t.closed_at,
           cu.name AS created_name,
           (SELECT count(*)::int FROM sales_task_notes n WHERE n.task_id = t.id) AS notes_count,
           (SELECT max(n.created_at) FROM sales_task_notes n WHERE n.task_id = t.id) AS last_activity_at
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
      vehicleBrandId: r.vehicle_brand_id,
      vehicleBrandName: r.vehicle_brand_name,
      vehicleModel: r.vehicle_model,
      vehicleSize: r.vehicle_size,
      stage: r.stage,
      assignedTo: r.assigned_to,
      assignedName: r.assigned_name,
      createdBy: r.created_by,
      createdName: r.created_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      closeResult: r.close_result,
      closeReason: r.close_reason,
      closeNote: r.close_note,
      closedBy: r.closed_by,
      closedAt: r.closed_at,
      notesCount: r.notes_count,
      lastActivityAt: r.last_activity_at,
    }));
    return NextResponse.json({ ok: true, tasks, fullAccess });
  } catch (err) {
    console.error("GET /api/admin/sales-tasks failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const b = await request.json();
    const customerName = String(b.customerName ?? "").trim();
    const customerPhone = String(b.customerPhone ?? "").trim();
    const customerEmail = b.customerEmail ? String(b.customerEmail).trim() : null;
    const customerCity = b.customerCity ? String(b.customerCity).trim() : null;
    const services = Array.isArray(b.services) ? b.services.slice(0, 20) : [];
    const quality = ["hot", "warm", "cold"].includes(b.quality) ? b.quality : null;
    const priceObjection = b.priceObjection === true;
    const initialNote = b.initialNote ? String(b.initialNote).trim().slice(0, 2000) : null;
    const vehicleBrandId = b.vehicleBrandId ? String(b.vehicleBrandId) : null;
    const vehicleBrandName = b.vehicleBrandName ? String(b.vehicleBrandName) : null;
    const vehicleModel = b.vehicleModel ? String(b.vehicleModel) : null;
    const vehicleSize = ["small", "medium", "large"].includes(b.vehicleSize) ? b.vehicleSize : null;
    const assignedTo = b.assignedTo ? String(b.assignedTo) : null;

    if (!customerName || !customerPhone) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const rows = await query<{ id: string }>(
      `INSERT INTO sales_tasks
         (customer_name, customer_phone, customer_email, customer_city,
          services_snapshot, quality, price_objection, initial_note,
          vehicle_brand_id, vehicle_brand_name, vehicle_model, vehicle_size,
          assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::sales_task_quality,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [customerName, customerPhone, customerEmail, customerCity,
       JSON.stringify(services), quality, priceObjection, initialNote,
       vehicleBrandId, vehicleBrandName, vehicleModel, vehicleSize,
       assignedTo, admin.id]
    );

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("POST /api/admin/sales-tasks failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}