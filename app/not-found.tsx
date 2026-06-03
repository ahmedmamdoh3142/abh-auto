/**
 * Not Found — Editorial 404 page.
 *
 * Treats absent routes like a missing volume in a library catalogue —
 * with composure rather than apology.
 */
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-platinum/[0.05] blur-[160px]" />
        <div className="grid-lines absolute inset-0 opacity-30" />
        <div className="noise absolute inset-0 opacity-[0.04]" />
      </div>

      <div className="container mx-auto px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-platinum/60">
            File not in the catalogue
          </p>

          <h1
            aria-label="404"
            className="mt-8 font-display text-[clamp(7rem,18vw,18rem)] font-light leading-[0.85] tracking-tight text-metallic"
          >
            404
          </h1>

          <p className="balance mx-auto mt-6 max-w-xl text-base md:text-lg leading-relaxed text-platinum/70">
            The page you&apos;re looking for has either been retired or never
            existed. The concierge can guide you back to anything you need.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Button asChild variant="primary" size="lg" arrow>
              <Link href="/">Return home</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/contact">Contact concierge</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
