/**
 * Root layout — ABH Auto
 *
 * Responsibilities
 *  - Load typography (Cormorant Garamond display, Hanken Grotesk sans,
 *    Playfair Display editorial italics, IBM Plex Sans Arabic) into CSS
 *    variables consumed by tailwind tokens.
 *  - Resolve current locale from cookie + provide messages via
 *    NextIntlClientProvider.
 *  - Provide membership session via AuthProvider (navbar / booking / login).
 *  - Wire global chrome: LoadingScreen, LuxuryCursor, ScrollProgress,
 *    SmoothScrollProvider, Navbar, Footer, WhatsAppFab.
 *  - Define site metadata, OpenGraph and Twitter card defaults.
 */
import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Playfair_Display,
  Hanken_Grotesk,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { LoadingScreen } from "@/components/shared/loading-screen";
import { LuxuryCursor } from "@/components/shared/luxury-cursor";
import { ScrollProgress } from "@/components/shared/scroll-progress";
import { SmoothScrollProvider } from "@/components/shared/smooth-scroll-provider";
import { AmbientOrbs } from "@/components/shared/ambient-orbs";
import { AuthProvider } from "@/components/shared/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFab } from "@/components/shared/whatsapp-fab";
import HideOnAdmin from "@/components/shared/hide-on-admin";
import { localeDirection } from "@/lib/i18n";
import { siteConfig } from "@/lib/site-config";


import "./globals.css";

// --- Fonts -----------------------------------------------------------------

// Cormorant Garamond — couture high-contrast serif. More presence and a far
// larger range of weights than Italiana, while keeping the elegant character.
// Used for display headlines and the brand mark.
const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Playfair — secondary editorial serif for taglines / italics.
const fontEditorial = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

// Hanken Grotesk — refined, slightly editorial grotesque for body and UI.
// Reads more premium than Inter, with similar metrics (safe drop-in).
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
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
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Membership session — shared by navbar, booking and login */}
          <AuthProvider>
            {/* Global chrome */}
            <LoadingScreen />
            <LuxuryCursor />
            <ScrollProgress />

            <SmoothScrollProvider>
              <AmbientOrbs />
              <HideOnAdmin><Navbar /></HideOnAdmin>
              <main className="relative">{children}</main>
              <HideOnAdmin><Footer /></HideOnAdmin>
            </SmoothScrollProvider>

            <HideOnAdmin><WhatsAppFab /></HideOnAdmin>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}