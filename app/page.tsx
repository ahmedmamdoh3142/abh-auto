/**
 * Home page — Composed narrative of all sections. (+ partner pricing)
 *
 * لو المستخدم شركة (partner):
 *   • يُخفى البانر الترويجي وقسم العروض تمامًا.
 *   • قسم الخدمات يعرض أسعار الشركة.
 *
 *   1. Hero          → first impression, identity  (سلايدر 9 صور)
 *   2. Stats         → credibility
 *   3. Promo Banner  → (مخفي للشركاء)
 *   4. Offers        → (مخفي للشركاء)
 *   5. Services      → atelier disciplines (بأسعار الشركة لو شركة)
 *   6. Why · Projects · Testimonials · CTA
 */
import { Hero } from "@/components/sections/hero";
import { StatsSection } from "@/components/sections/stats-section";
import { PromoBanner } from "@/components/sections/promo-banner";
import { OffersSection } from "@/components/sections/offers-section";
import { ServicesSection } from "@/components/sections/services-section";
import { WhySection } from "@/components/sections/why-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { CtaSection } from "@/components/sections/cta-section";
import { getLocale } from "next-intl/server";
import { getHomeData } from "@/lib/home-data";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const home = await getHomeData(locale as "en" | "ar", user?.id ?? null);

  // الشركاء لا يرون البانر/العروض الترويجية
  const showPromos = !home.isPartner;

  return (
    <>
      {/* Hero owns the viewport — سلايد ٠ هي عنصر الـ LCP */}
      <Hero media={home.hero} slides={home.heroSlides} />

      {/* Stats live in the cool steel zone */}
      <div className="bg-zone-cool">
        <StatsSection stats={home.stats} eyebrow="بأرقام واضحة" />
      </div>

      {/* Promo banner — مخفي للشركاء */}
      {showPromos && home.banner && (
        <PromoBanner copy={home.banner as any} image={home.images?.offers?.[0] ?? "/images/offer-1.webp"} />
      )}

      {/* Offers — مخفي للشركاء */}
      {showPromos && (home.offers as any[]).length > 0 && (
        <div className="bg-zone-warm">
          <OffersSection offers={home.offers as any} offersAll={home.offersAll as any} txt={home.offersText as any} />
        </div>
      )}

      {/* Services — بأسعار الشركة لو المستخدم شركة */}
      <ServicesSection services={home.services as any} txt={home.servicesText as any} />

      {/* Why */}
      <div className="bg-zone-platinum">
        <WhySection txt={home.whyText as any} images={home.images?.why ?? []} />
      </div>

      {/* Projects */}
      <div className="bg-zone-cool">
        <ProjectsSection projects={home.projects as any} txt={home.projectsText as any} />
      </div>

      <TestimonialsSection testimonials={home.testimonials as any} txt={home.testimonialsText as any} />

      <CtaSection />
    </>
  );
}