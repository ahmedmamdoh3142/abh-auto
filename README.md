# Elite Protection — Atelier of Automotive Protection

A production-grade marketing platform for an ultra-luxury car protection
atelier, built with **Next.js 15 (App Router)**, **React 19**,
**TypeScript**, **Tailwind CSS**, **Framer Motion**, **GSAP**, **Three.js
(R3F)**, **Lenis** smooth scroll, **Radix UI**, and **next-intl** for full
**English ↔ Arabic** localisation with RTL support.

The aesthetic is the brief: **Apple-grade restraint × Porsche / Rolls
Royce / Tesla-level materiality** — strict 4-tone monochrome palette,
cinematic motion, and editorial typography.

---

## Quick start

```bash
# install
npm install

# dev (http://localhost:3000)
npm run dev

# production build
npm run build
npm run start
```

> **Node**: 20 LTS or newer recommended.

The first build will fetch the Google Fonts (Cormorant Garamond, Inter,
IBM Plex Sans Arabic). No `.env` is required to run the demo.

---

## Languages

The site ships fully bilingual:

- **English** (LTR)
- **Arabic** (RTL)

Locale is stored in the `NEXT_LOCALE` cookie via a server action and
applied through `<html lang dir>` plus the `next-intl` provider. Switch
via the globe icon in the navbar.

Translations live in `messages/en.json` and `messages/ar.json`.

---

## Palette

The brief required a strict four-tone palette. Tokens live in
`tailwind.config.ts`:

| Token       | Hex       | Use                              |
| ----------- | --------- | -------------------------------- |
| `obsidian`  | `#000000` | Page background, deepest surface |
| `ivory`     | `#ffffff` | Primary text, key highlights     |
| `platinum`  | `#cbcdcd` | Secondary text, hairlines        |
| `steel`     | `#666a6e` | Muted accents, deep shadow rims  |

A 50–950 `ink` scale is derived for incidental opacity work.

---

## Architecture

```
app/
├── layout.tsx           Root — fonts, providers, chrome
├── page.tsx             Homepage — composes all sections
├── globals.css          Design tokens + reusable primitives
├── not-found.tsx        Editorial 404
├── login/               Member portal (split-screen luxury form)
├── api/contact/         Demo POST endpoint for the contact form
└── (marketing)/         Marketing route group
    ├── services/
    ├── offers/
    ├── projects/
    ├── about/
    └── contact/

components/
├── 3d/                  React-Three-Fiber scenes (hero particles)
├── animations/          Framer-Motion primitives (RevealText, Counter)
├── layout/              Navbar, Footer
├── sections/            All page sections (hero, services, …, cta)
├── shared/              Cursor, loading screen, scroll progress, FAB
└── ui/                  Radix primitives (button, dialog, accordion, …)

hooks/                   useLenis, useMouse, useSpotlight, useMagnetic
lib/                     i18n config, server actions, site config, utils
messages/                en.json · ar.json
public/                  Static assets (favicons, OG image)
```

### Notable techniques

- **Loading screen** with progressive hexagonal logo + cinematic exit.
- **Luxury cursor** with `mix-blend-difference` so it adapts to any
  background. Auto-disabled on touch devices.
- **Three.js hero** — 1,400 particle field + floating shards with mouse
  parallax, lazy-loaded.
- **3D circular carousels** for *Projects* and *Testimonials*, built
  with pure CSS `perspective` + `transform-style: preserve-3d`. No
  external carousel library on those sections.
- **Scroll progress** indicator on top of the viewport (spring-eased).
- **Lenis** smooth scroll lifts every section transition.
- **Magnetic cursor states** via `data-cursor="hover"` attributes.
- **Mouse-reactive spotlights** on cards via `--mx / --my` CSS variables.

---

## Tooling

| Concern               | Library                              |
| --------------------- | ------------------------------------ |
| Framework             | Next.js 15 (App Router)              |
| UI                    | React 19, Tailwind CSS, Radix UI     |
| Motion                | Framer Motion, GSAP + ScrollTrigger  |
| 3D                    | Three.js, @react-three/fiber, drei   |
| Smooth scroll         | @studio-freight/lenis                |
| i18n                  | next-intl 3.x                        |
| Icons                 | lucide-react                         |
| Type system           | TypeScript strict                    |

---

## Customisation

- Brand details — `lib/site-config.ts`
- Copy / translations — `messages/{en,ar}.json`
- Imagery — Unsplash URLs in `lib/site-config.ts` (swap for your own)
- Colour & typography — `tailwind.config.ts` + `app/globals.css`

---

## Production checklist

Before shipping a real instance you should:

1. Replace placeholder Unsplash imagery with licensed brand photography.
2. Swap `lib/site-config.ts` URLs (Instagram, WhatsApp, etc).
3. Add a real OG image at `public/og.jpg` (1200 × 630).
4. Wire `app/api/contact/route.ts` to a real CRM / mail relay.
5. Audit translations with a native Arabic copywriter.
6. Set `metadataBase` in `app/layout.tsx` to your production URL.

---

© Elite Protection — concept &amp; build for demonstration.
