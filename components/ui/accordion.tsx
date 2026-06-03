/**
 * Accordion — Radix Accordion wrapped with luxury motion + glass styling.
 *
 * Used by the FAQ section. Chevron rotates 180° on open. Content uses
 * Radix data-state animations defined in globals.css.
 */
"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "group/item relative overflow-hidden",
      "border-b border-white/[0.06] last:border-b-0",
      "transition-colors duration-500",
      "hover:bg-white/[0.015]",
      className,
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      data-cursor="hover"
      className={cn(
        "group/trigger flex flex-1 items-center justify-between gap-6",
        "py-7 md:py-8 text-start",
        "font-display text-xl md:text-2xl font-light tracking-tight text-ivory",
        "transition-colors duration-500",
        "hover:text-platinum",
        "[&[data-state=open]]:text-ivory",
        className,
      )}
      {...props}
    >
      {children}
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.02] transition-all duration-500 group-hover/trigger:border-white/30 group-hover/trigger:bg-white/[0.05] group-data-[state=open]/item:border-white/40 group-data-[state=open]/item:bg-white/[0.06]">
        <ChevronDown
          className="h-4 w-4 text-platinum transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/item:rotate-180"
          strokeWidth={1.5}
        />
        <span className="pointer-events-none absolute inset-0 rounded-full ring-0 ring-white/0 transition-all duration-700 group-data-[state=open]/item:ring-1 group-data-[state=open]/item:ring-white/20" />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-base leading-relaxed text-platinum/80",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
    )}
    {...props}
  >
    <div className={cn("pb-8 pe-16 max-w-3xl", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
