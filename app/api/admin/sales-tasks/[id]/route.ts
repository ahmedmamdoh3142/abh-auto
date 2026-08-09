import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminWithPerm } from "@/lib/admin/guard";

const STAGES = new Set(["new", "contacted", "follow_up", "negotiating"]);
const STAGE_LABEL: Record<string, string> = {
  new: "جديد", contacted: "تم التواصل", follow_up: "قيد المتابعة", negotiating: "تفاوض",
  won: "تم الحجز", lost: "مرفوض",
};
const QUALITY_LABEL: Record<string, string> = { hot: "مستعد للشراء", warm: "مهتم", cold: "استفسار فقط" };
const LEAD_SOURCES = new Set(["facebook", "tiktok", "instagram", "whatsapp"]);
const LEAD_SOURCE_LABEL: Record<string, string> = {
  facebook: "فيسبوك", tiktok: "تيك توك", instagram: "انستجرام", whatsapp: "واتساب",
};

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const b = await request.json();

    const cur = await query<any>(
      `SELECT t.customer_name, t.customer_phone, t.stage, t.quality, t.price_objection,
              t.vehicle_brand_name, t.vehicle_model, t.vehicle_size, t.assigned_to, t.lead_source,
              (SELECT name FROM users WHERE id = t.assigned_to) AS assigned_name
       FROM sales_tasks t WHERE t.id = $1 LIMIT 1`,
      [id]
    );
    if (!cur[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const before = cur[0];

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const changes: string[] = [];

    if (typeof b.customerName === "string" && b.customerName.trim() && b.customerName.trim() !== before.customer_name) {
      sets.push(`customer_name = $${i++}`); vals.push(b.customerName.trim());
      changes.push(`الاسم: «${before.customer_name}» → «${b.customerName.trim()}»`);
    }
    if (typeof b.customerPhone === "string" && b.customerPhone.trim() && b.customerPhone.trim() !== before.customer_phone) {
      sets.push(`customer_phone = $${i++}`); vals.push(b.customerPhone.trim());
      changes.push(`التليفون: «${before.customer_phone}» → «${b.customerPhone.trim()}»`);
    }
    if (b.stage && STAGES.has(b.stage) && b.stage !== before.stage) {
      sets.push(`stage = $${i++}::sales_task_stage`); vals.push(b.stage);
      changes.push(`المرحلة: «${STAGE_LABEL[before.stage] ?? before.stage}» → «${STAGE_LABEL[b.stage] ?? b.stage}»`);
    }
    if (Array.isArray(b.services)) {
      sets.push(`services_snapshot = $${i++}::jsonb`); vals.push(JSON.stringify(b.services));
      changes.push(`تم تحديث الخدمات المهتم بها (${b.services.length})`);
    }
    if (b.quality === null || ["hot", "warm", "cold"].includes(b.quality)) {
      if (b.quality !== before.quality) {
        sets.push(`quality = $${i++}::sales_task_quality`); vals.push(b.quality);
        changes.push(`مستوى الاهتمام: «${before.quality ? QUALITY_LABEL[before.quality] : "—"}» → «${b.quality ? QUALITY_LABEL[b.quality] : "—"}»`);
      }
    }
    if (typeof b.priceObjection === "boolean" && b.priceObjection !== before.price_objection) {
      sets.push(`price_objection = $${i++}`); vals.push(b.priceObjection);
      changes.push(`الاعتراض على السعر: ${b.priceObjection ? "نعم" : "لا"}`);
    }
    if ("leadSource" in b) {
      const newSource = (b.leadSource === null || LEAD_SOURCES.has(b.leadSource)) ? b.leadSource : undefined;
      if (newSource !== undefined && newSource !== before.lead_source) {
        sets.push(`lead_source = $${i++}`); vals.push(newSource);
        changes.push(`مصدر الليد: «${before.lead_source ? LEAD_SOURCE_LABEL[before.lead_source] : "—"}» → «${newSource ? LEAD_SOURCE_LABEL[newSource] : "—"}»`);
      }
    }
    if ("vehicleBrandName" in b || "vehicleModel" in b || "vehicleSize" in b) {
      const newBrand = b.vehicleBrandName ?? before.vehicle_brand_name;
      const newModel = b.vehicleModel ?? before.vehicle_model;
      const newSize = b.vehicleSize ?? before.vehicle_size;
      if (newBrand !== before.vehicle_brand_name || newModel !== before.vehicle_model || newSize !== before.vehicle_size) {
        sets.push(`vehicle_brand_id = $${i++}`); vals.push(b.vehicleBrandId ?? null);
        sets.push(`vehicle_brand_name = $${i++}`); vals.push(newBrand ?? null);
        sets.push(`vehicle_model = $${i++}`); vals.push(newModel ?? null);
        sets.push(`vehicle_size = $${i++}`); vals.push(newSize ?? null);
        changes.push(`السيارة: «${before.vehicle_brand_name ?? "—"} ${before.vehicle_model ?? ""}» → «${newBrand ?? "—"} ${newModel ?? ""}»`);
      }
    }
    if ("assignedTo" in b) {
      const newAssigned = b.assignedTo ? String(b.assignedTo) : null;
      if (newAssigned !== before.assigned_to) {
        sets.push(`assigned_to = $${i++}`); vals.push(newAssigned);
        const newName = newAssigned ? (b.assignedToName ?? "—") : "غير موجّه";
        changes.push(`التوجيه: «${before.assigned_name ?? "غير موجّه"}» → «${newName}»`);
      }
    }

    if (sets.length === 0) return NextResponse.json({ ok: true, noChanges: true });

    vals.push(id);
    await query(`UPDATE sales_tasks SET ${sets.join(", ")} WHERE id = $${i}`, vals);

    if (changes.length > 0) {
      const body = `✏️ تعديل بيانات:\n${changes.join("\n")}`;
      await query(
        `INSERT INTO sales_task_notes (task_id, author_id, author_name, body) VALUES ($1,$2,$3,$4)`,
        [id, admin.id, admin.name, body]
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/sales-tasks/[id] failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminWithPerm("sales_tasks");
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await query(`DELETE FROM sales_tasks WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/sales-tasks/[id] failed:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}