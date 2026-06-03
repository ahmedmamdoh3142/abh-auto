/**
 * SmoothScrollProvider — Mounts Lenis smooth scrolling for the whole app.
 *
 * Wrap once in `app/layout.tsx`. The hook itself owns the raf loop and
 * tear-down. We disable Lenis on touch devices automatically inside the
 * hook to preserve native momentum.
 */
"use client";

import { type ReactNode } from "react";
import { useLenis } from "@/hooks/use-lenis";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useLenis();
  return <>{children}</>;
}
