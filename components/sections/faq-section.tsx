/**
 * FaqSection — Cinematic FAQ presented as a luxury accordion.
 *
 * Two-column layout on desktop: aside (eyebrow + heading + contact bridge)
 * on the left, accordion on the right. Translations come from
 * `messages/*.json` under `faq.items[]`.
 */
"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowUpRight, MessageSquareText } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { siteConfig } from "@/lib/site-config";

export function FaqSection() {
  const t = useTranslations("faq");
  const tCommon = useTranslations("common");
  const items = (t.raw("items") as { q: string; a: string }[]) ?? [];

  return (
    <section id="faq" className="section relative overflow-hidden">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[20%] h-[40rem] w-[40rem] rounded-full bg-platinum/[0.04] blur-[160px]" />
        <div className="absolute right-[-15%] bottom-[10%] h-[36rem] w-[36rem] rounded-full bg-steel/[0.08] blur-[140px]" />
        <div className="grid-lines absolute inset-0 opacity-40" />
      </div>

      <div className="container relative mx-auto px-6 md:px-10">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.4fr] lg:gap-24">
          {/* Aside — left column */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-platinum/70">
                <span className="h-px w-10 bg-gradient-to-r from-transparent via-platinum/50 to-platinum/50" />
                {t("eyebrow")}
              </div>

              <h2 className="mt-7 font-display text-5xl md:text-6xl font-light leading-[0.95] tracking-tight text-ivory">
                {t("title")}
              </h2>

              <p className="mt-6 max-w-md text-base leading-relaxed text-platinum/70">
                {t("subtitle")}
              </p>

              {/* Contact bridge */}
              <div className="mt-12 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-6 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <MessageSquareText
                      className="h-5 w-5 text-platinum"
                      strokeWidth={1.4}
                    />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-platinum/60">
                      {tCommon("stillCurious")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ivory/90">
                      {tCommon("conciergePrompt")}
                    </p>
                    <a
                      href={`mailto:${siteConfig.contact.email}`}
                      data-cursor="hover"
                      className="link-magnetic mt-4 inline-flex items-center gap-2 text-sm text-ivory"
                    >
                      <span>{siteConfig.contact.email}</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.6}
                      />
                    </a>
                  </div>
                </div>

                {/* Subtle inner glow on hover */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-platinum/[0.05] via-transparent to-transparent" />
                </span>
              </div>
            </motion.div>
          </aside>

          {/* Accordion — right column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.15,
            }}
            className="relative"
          >
            <div className="hairline mb-2" />
            <Accordion type="single" collapsible className="w-full">
              {items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="relative"
                >
                  <span className="absolute start-0 top-7 text-[10px] font-mono uppercase tracking-[0.2em] text-platinum/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="ps-12">
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="hairline mt-2" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
