/**
 * app/my-work/page.tsx — شاشة الفني (SERVER guard).
 * يتأكد أن الداخل فني، وإلا يوجّهه بعيدًا. الشاشة نفسها client.
 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import MyWorkClient from "./my-work-client";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?redirect=/my-work");
  if (user.role !== "technician") redirect("/"); // مش فني → برّه

  const locale = (await getLocale()) as Locale;
  return <MyWorkClient technicianName={user.name} locale={locale} />;
}