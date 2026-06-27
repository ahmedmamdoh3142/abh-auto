"use client";
/**
 * components/analytics/google-analytics.tsx — تحميل Google Tag Manager + GA4
 * مع Consent Mode v2 (الوضع الافتراضي: مرفوض، لحد ما المستخدم يوافق).
 *
 * • بيهيّئ الموافقة الافتراضية = denied قبل أي تحميل (مطلوب لـ Consent Mode).
 * • بيحمّل GTM (اللي بدوره بيحمّل GA4).
 * • بيتتبّع تغيير الصفحات في App Router (page_view) تلقائيًا.
 *
 * ضع <GoogleAnalytics /> داخل <body> في app/layout.tsx.
 */
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GTM_ID, trackPageView } from "@/lib/analytics";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // تتبّع page_view عند كل تغيير مسار (App Router مايعملش reload)
  useEffect(() => {
    if (!GTM_ID) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  if (!GTM_ID) return null;

  return (
    <>
      {/* Consent Mode v2 — الافتراضي مرفوض قبل أي تحميل */}
      <Script id="gtm-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>

      {/* تحميل Google Tag Manager */}
      <Script id="gtm-loader" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
    </>
  );
}

/** يوضع مباشرة بعد فتح <body> — fallback لو الجافاسكربت متعطّل. */
export function GoogleAnalyticsNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0" width="0" style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}