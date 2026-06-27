/**
 * app/robots.ts
 * يولّد /robots.txt تلقائيًا. يسمح بفهرسة كل الموقع ويشير لخريطة الموقع.
 * يمنع فهرسة لوحة الأدمن وواجهات الـAPI وصفحات الحساب الخاصة.
 */
import type { MetadataRoute } from "next";

const SITE = "https://abh-auto.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/login"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}