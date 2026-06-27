/**
 * app/sitemap.ts
 * يولّد /sitemap.xml تلقائيًا بكل الصفحات العامة للموقع.
 * Google يستخدمه ليكتشف ويفهرس صفحاتك بشكل أسرع وأدق.
 */
import type { MetadataRoute } from "next";

const SITE = "https://abh-auto.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // الصفحات العامة الثابتة
  const routes = [
    { path: "", priority: 1.0, freq: "weekly" as const },
    { path: "/services", priority: 0.9, freq: "weekly" as const },
    { path: "/offers", priority: 0.9, freq: "weekly" as const },
    { path: "/projects", priority: 0.8, freq: "monthly" as const },
    { path: "/about", priority: 0.7, freq: "monthly" as const },
    { path: "/contact", priority: 0.7, freq: "monthly" as const },
    { path: "/booking", priority: 0.8, freq: "monthly" as const },
  ];

  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}