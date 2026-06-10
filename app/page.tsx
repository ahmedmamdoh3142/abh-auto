/**
 * Home page — Composed narrative of all sections.
 *
 * Cinematic arc with deliberate "breath" markers between sections so the
 * eye has rest points without breaking the dark continuity.
 *
 *   1. Hero          → first impression, identity
 *   2. Marquee       → typographic transition
 *   3. Stats         → credibility
 *   4. Promo Banner  → time-bound offer hook
 *   5. Offers        → curated packages
 *   6. Services      → atelier disciplines
 *   7. Why           → standards & process
 *   8. Projects      → portfolio (3D carousel)
 *   9. Testimonials  → social proof (3D carousel)
 *  10. CTA           → cinematic close
 *  (Footer rendered in the root layout.)
 */
import { Hero } from "@/components/sections/hero";
import { MarqueeStrip } from "@/components/sections/marquee-strip";
import { StatsSection } from "@/components/sections/stats-section";
import { PromoBanner } from "@/components/sections/promo-banner";
import { OffersSection } from "@/components/sections/offers-section";
import { ServicesSection } from "@/components/sections/services-section";
import { WhySection } from "@/components/sections/why-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { CtaSection } from "@/components/sections/cta-section";
import { SectionDivider } from "@/components/shared/section-divider";
import { getLocale } from "next-intl/server";
import { getHomeData } from "@/lib/home-data";

export default async function HomePage() {
  const locale = await getLocale();
  const home = await getHomeData(locale as "en" | "ar");
  return (
    <>
      {/* Hero owns the viewport — no divider after it (marquee handles the seam) */}
      <Hero />

      {/* Stats live in the cool steel zone */}
      <div className="bg-zone-cool">
        <StatsSection stats={home.stats} eyebrow="بأرقام واضحة" />
      </div>

      {/* Promo banner is its own visual island */}
        <PromoBanner copy={home.banner as any} image={home.images?.offers?.[0] ?? "/images/offer-1.webp"} />
      {/* Offers + Services — the commercial duet */}
      <div className="bg-zone-warm">
        <OffersSection offers={home.offers as any} offersAll={home.offersAll as any} txt={home.offersText as any} />
      </div>

      <ServicesSection services={home.services as any} txt={home.servicesText as any} />

      {/* Why — institutional credibility, slight platinum bloom */}
      <div className="bg-zone-platinum">
        <WhySection txt={home.whyText as any} images={home.images?.why ?? []} />
      </div>

      {/* Projects — back into cool steel */}
      <div className="bg-zone-cool">
        <ProjectsSection projects={home.projects as any} txt={home.projectsText as any} />
      </div>

      <TestimonialsSection testimonials={home.testimonials as any} txt={home.testimonialsText as any} />

      {/* CTA absorbs the seam itself — no divider above */}
      <CtaSection />
    </>
  );
}