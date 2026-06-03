/**
 * PageHero — A reusable hero band for marketing subpages.
 *
 * Tall (≈ 70svh), full-bleed image background with cinematic grade and
 * an eyebrow / title / subtitle stack centred at the bottom-start.
 *
 * Intentionally lighter than the homepage Hero — no video, no 3D — so it
 * stays performant on every subpage but maintains aesthetic discipline.
 */
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { RevealText } from "@/components/animations/reveal-text";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
}

export function PageHero({ eyebrow, title, subtitle, image }: PageHeroProps) {
  return (
    <section className="relative isolate h-[70svh] min-h-[600px] w-full overflow-hidden pt-24">
      {/* Background */}
      <div className="absolute inset-0 -z-30">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-obsidian/85 via-obsidian/45 to-obsidian" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_92%)]" />
      <div className="grid-lines absolute inset-0 -z-10 opacity-30" />
      <div className="noise absolute inset-0 -z-10 opacity-[0.04]" />

      {/* Content — bottom start */}
      <div className="relative z-10 flex h-full items-end">
        <div className="container mx-auto px-6 pb-16 md:px-10 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-platinum/70">
              <span className="h-px w-12 bg-gradient-to-r from-transparent via-platinum/60 to-platinum/60" />
              {eyebrow}
            </div>

            <h1 className="mt-8 font-display text-6xl md:text-8xl lg:text-9xl font-light leading-[0.92] tracking-tight text-ivory">
              <RevealText text={title} className="text-metallic" />
            </h1>

            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1,
                  delay: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="balance mt-8 max-w-2xl text-base md:text-lg leading-relaxed text-platinum/75"
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-platinum/40"
        >
          <span className="h-8 w-px bg-gradient-to-b from-transparent to-platinum/50" />
          scroll
        </motion.div>
      </div>
    </section>
  );
}
