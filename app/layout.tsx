/**
 * Root layout — ABH Auto
 *
 * Responsibilities
 *  - Load typography into CSS variables consumed by tailwind tokens.
 *  - Resolve current locale + provide messages via NextIntlClientProvider.
 *  - Provide membership session via AuthProvider.
 *  - Wire global chrome. العناصر البصرية غير الأساسية (cursor / orbs / scroll
 *    progress / intro) تُحمَّل بعد أول رسم عبر DeferredChrome و DeferredIntro
 *    لتقليل الـ Script Evaluation الأولي وتحسين الـ LCP.
 *  - Define site metadata, OpenGraph and Twitter card defaults.
 *  - Google Analytics (GTM/GA4) + بانر موافقة الكوكيز.
 */
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import {
  Cormorant_Garamond,
  Playfair_Display,
  Hanken_Grotesk,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { DeferredIntro } from "@/components/shared/deferred-intro";
import { DeferredChrome } from "@/components/shared/deferred-chrome";
import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";
import { AuthProvider } from "@/components/shared/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFab } from "@/components/shared/whatsapp-fab";
import HideOnAdmin from "@/components/shared/hide-on-admin";
import GoogleAnalytics, { GoogleAnalyticsNoScript } from "@/components/analytics/google-analytics";
import CookieConsent from "@/components/analytics/cookie-consent";
import { localeDirection } from "@/lib/i18n";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

// --- Fonts -----------------------------------------------------------------

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const fontEditorial = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
  preload: false,
});

const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

// --- Metadata --------------------------------------------------------------

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "ceramic coating",
    "paint protection film",
    "PPF",
    "luxury car protection",
    "armoring",
    "vehicle detailing",
    "atelier",
    "concierge",
    "Dubai",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.webp",
  },
  robots: { index: true, follow: true },
  // 🔽 Facebook domain verification via `other`
  verification: {
    other: {
      "facebook-domain-verification": "tpwmogfvey8h190vb0gl5i06xs10ht",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

// --- Layout ----------------------------------------------------------------

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = localeDirection[locale as keyof typeof localeDirection] ?? "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fontDisplay.variable} ${fontEditorial.variable} ${fontSans.variable} ${fontArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="cursor-luxury overflow-x-hidden bg-obsidian font-sans antialiased">
        {/* Google Tag Manager — fallback بدون جافاسكربت */}
        <GoogleAnalyticsNoScript />
        {/* تحميل GTM/GA4 + تتبّع تغيير الصفحات (Suspense لأجل useSearchParams) */}
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>

        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {/* عناصر بصرية غير أساسية — تُحمَّل بعد أول رسم */}
            <DeferredIntro />
            <DeferredChrome />

            <SmoothScrollProvider>
              <HideOnAdmin><Navbar /></HideOnAdmin>
              <main className="relative">{children}</main>
              <HideOnAdmin><Footer /></HideOnAdmin>
            </SmoothScrollProvider>

            <HideOnAdmin><WhatsAppFab /></HideOnAdmin>
          </AuthProvider>
        </NextIntlClientProvider>

        {/* بانر موافقة الكوكيز */}
        <CookieConsent locale={locale} />
      </body>
    </html>
  );
}