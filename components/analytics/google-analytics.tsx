"use client";
/**
 * components/analytics/google-analytics.tsx — GA4 مباشر (بدون Google Tag Manager).
 *
 * لماذا اتشال GTM:
 *   الـGTM container كان بيحمّل ~607KB (GA4 + Google Ads + Snapchat + TikTok)
 *   وبياكل ~900ms من الـmain thread، وده كان أكبر سبب لضعف الأداء على الموبايل.
 *   بما إن المطلوب هو تحليلات بسيطة فقط (عدد الزوار + قمع الحجز)، حمّلنا GA4
 *   مباشرة (~50KB) بدل GTM. نفس الأحداث تشتغل، بحمل أقل بكتير.
 *
 * Consent Mode v2 لسه شغّال: الافتراضي denied، وبيتحوّل granted لما المستخدم
 * يوافق من بانر الكوكيز.
 */
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA4_ID, trackPageView } from "@/lib/analytics";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // تتبّع page_view عند كل تغيير مسار (App Router مايعملش reload)
  useEffect(() => {
    if (!GA4_ID) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  if (!GA4_ID) return null;

  return (
    <>
      {/* Consent Mode v2 + تهيئة gtag — قبل تحميل GA4 (شرط عمل الـconsent) */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
          gtag('js', new Date());
          // send_page_view:false لأن التتبّع بيتم يدويًا من trackPageView
          // (App Router مابيعملش reload، فلازم نبعت page_view بنفسنا)
          gtag('config', '${GA4_ID}', { send_page_view: false });
        `}
      </Script>

      {/* GA4 — lazyOnload: بعد حدث load، خارج المسار الحرج */}
      <Script
        id="ga4-loader"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
      />
    </>
  );
}

/** لم يعد مستخدمًا (كان fallback لـGTM بدون جافاسكربت). نُبقيه فارغًا لتوافق الاستدعاءات. */
export function GoogleAnalyticsNoScript() {
  return null;
}