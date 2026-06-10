/**
 * app/admin/page.tsx — نظرة عامة (SERVER). أرقام حقيقية من القاعدة.
 */
import { requireAdmin } from "@/lib/admin/guard";
import { query } from "@/lib/db";
import OverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [counts] = await query<{
    revenue: string; upcoming: string; active: string; completed: string;
    cancelled: string; members: string;
  }>(
    `SELECT
       COALESCE((SELECT sum(total) FROM bookings WHERE status <> 'cancelled'),0) AS revenue,
       (SELECT count(*) FROM bookings WHERE status='upcoming') AS upcoming,
       (SELECT count(*) FROM bookings WHERE status='active') AS active,
       (SELECT count(*) FROM bookings WHERE status='completed') AS completed,
       (SELECT count(*) FROM bookings WHERE status='cancelled') AS cancelled,
       (SELECT count(*) FROM users WHERE role='member') AS members`
  );

  const recent = await query<any>(
    `SELECT b.reference, b.vehicle_label, b.status, b.total,
            b.scheduled_date, b.scheduled_time, b.plate
     FROM bookings b
     WHERE b.status IN ('upcoming','active')
     ORDER BY b.scheduled_date NULLS LAST, b.created_at DESC
     LIMIT 5`
  );

  return (
    <OverviewClient
      counts={{
        revenue: Number(counts?.revenue) || 0,
        upcoming: Number(counts?.upcoming) || 0,
        active: Number(counts?.active) || 0,
        completed: Number(counts?.completed) || 0,
        cancelled: Number(counts?.cancelled) || 0,
        members: Number(counts?.members) || 0,
      }}
      recent={recent.map((r) => ({
        reference: r.reference,
        vehicle: r.vehicle_label || "—",
        status: r.status,
        total: Number(r.total) || 0,
        date: r.scheduled_date ? new Date(r.scheduled_date).toISOString().slice(0, 10) : "",
        time: r.scheduled_time || "",
        plate: r.plate || "",
      }))}
    />
  );
}
