/**
 * Footer — Minimal, centered, editorial.
 *
 * Compact version with refined spacing and subtle background texture.
 */
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { logo } from "@/components/shared/logo";
import { siteConfig } from "@/lib/site-config";

/* ---- Inline brand-coloured social icons (lucide doesn't carry Snap/TikTok) -- */

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22c4.78-.79 8.43-4.93 8.43-9.94Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 1.8c-3.39 0-6.18 2.76-6.18 6.15 0 .6.03 1.41.06 2.13-.21-.12-.45-.18-.69-.18-.84 0-1.5.66-1.5 1.5 0 .69.48 1.29 1.14 1.44.39.09 1.05.27 1.32.69-.27 1.32-1.77 4.05-4.41 4.5-.21.03-.36.18-.39.39-.03.21.06.42.24.51.12.06 1.05.54 2.46.81-.06.12-.09.27-.06.42.06.36.39.6.84.69.27.06.54.06.84.06.39 0 .84-.03 1.35-.06.51-.03 1.05.18 1.59.66.84.78 1.92 1.74 3.66 1.74 1.74 0 2.79-.96 3.63-1.74.54-.48 1.08-.69 1.59-.66.51.03.96.06 1.38.06.27 0 .54 0 .81-.06.45-.09.78-.33.84-.69.03-.15 0-.3-.06-.42 1.41-.27 2.34-.75 2.46-.81.18-.09.27-.3.24-.51-.03-.21-.18-.36-.39-.39-2.64-.45-4.14-3.18-4.41-4.5.27-.42.93-.6 1.32-.69.66-.15 1.14-.75 1.14-1.44 0-.84-.66-1.5-1.5-1.5-.24 0-.48.06-.69.18.03-.72.06-1.53.06-2.13 0-3.39-2.79-6.15-6.18-6.15Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.78a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.21Z" />
    </svg>
  );
}

const socials = [
  { href: "https://www.facebook.com/profile.php?id=61588741474865", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.instagram.com/abh.auto/", label: "Instagram", Icon: InstagramIcon },
  { href: "https://www.snapchat.com/add/abhauto1?share_id=ql_6HRtNv6k&locale=en-US", label: "Snapchat", Icon: SnapchatIcon },
  { href: "https://www.tiktok.com/@abhauto1?lang=en", label: "TikTok", Icon: TikTokIcon },
];

export function Footer() {
  const tCommon = useTranslations("common");
  const year = new Date().getFullYear();
  const t = useTranslations('footer');

  return (
    <footer className="relative isolate overflow-hidden border-t border-white/[0.06] bg-obsidian">
      {/* subtle diagonal texture + ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="absolute left-1/2 top-0 h-px w-[78%] -translate-x-1/2 bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.03] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="container mx-auto px-6 py-10 md:px-10 md:py-12">
        <div className="flex flex-col items-center text-center">
          <logo />

          <p className="mt-4 max-w-md text-sm leading-relaxed text-platinum/55">
            {t('tagline')}
          </p>

          <div className="my-7 h-px w-20 bg-gradient-to-r from-transparent via-platinum/35 to-transparent" />

          <div className="flex items-center gap-2.5">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                data-cursor="hover"
                className="group grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.025] transition-all duration-500 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]"
              >
                <Icon className="h-4 w-4 text-platinum transition-colors duration-500 group-hover:text-ivory" />
              </a>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-platinum/40 md:flex-row md:gap-6">
            <p>
              © {year} {siteConfig.name}. {tCommon("allRights")}
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" data-cursor="hover" className="transition-colors duration-500 hover:text-ivory">
                {tCommon("privacy")}
              </Link>
              <Link href="#" data-cursor="hover" className="transition-colors duration-500 hover:text-ivory">
                {tCommon("terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}