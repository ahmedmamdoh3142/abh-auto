import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.5rem', sm: '2rem', lg: '3rem', xl: '4rem' },
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // Brand palette — strict luxury monochrome
        obsidian: '#000000',
        ivory: '#ffffff',
        platinum: '#cbcdcd',
        steel: '#666a6e',
        // Functional tonal scale built from the four brand colors
        ink: {
          50: '#f5f5f6',
          100: '#e6e7e8',
          200: '#cbcdcd',
          300: '#9ea1a3',
          400: '#666a6e',
          500: '#3e4144',
          600: '#26282a',
          700: '#161719',
          800: '#0b0c0d',
          900: '#050506',
          950: '#000000',
        },
        // Semantic tokens (read from CSS vars for theme switching)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        // Loaded via next/font in app/layout.tsx
        display:   ['var(--font-display)', 'Cormorant Garamond', 'serif'],
        editorial: ['var(--font-editorial)', 'serif'],
        sans:      ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic:    ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Larger, more confident editorial scale (clamps scale with viewport;
        // base body sizes scale via the root font-size lift in globals.css).
        'hero-sm': ['clamp(2.75rem, 8.5vw, 4.75rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        'hero':    ['clamp(3.75rem, 11.5vw, 9.5rem)', { lineHeight: '0.9',  letterSpacing: '-0.045em' }],
        'display': ['clamp(2.25rem, 5.5vw, 5rem)',    { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },
      backgroundImage: {
        'metallic': 'linear-gradient(135deg, #cbcdcd 0%, #ffffff 30%, #666a6e 65%, #cbcdcd 100%)',
        'silver-sheen': 'linear-gradient(110deg, #cbcdcd 0%, #ffffff 45%, #666a6e 55%, #cbcdcd 100%)',
        'radial-spotlight': 'radial-gradient(ellipse at center, rgba(203,205,205,0.12), transparent 60%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glass': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 32px -8px rgba(0,0,0,0.6)',
        'glow-platinum': '0 0 0 1px rgba(203,205,205,0.18), 0 12px 60px -12px rgba(203,205,205,0.35)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'shimmer': 'shimmer 2.8s linear infinite',
        'float': 'float 7s ease-in-out infinite',
        'spin-slow': 'spin 28s linear infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'grain': 'grain 7s steps(6) infinite',
        'marquee': 'marquee 38s linear infinite',
        'accordion-down': 'accordion-down 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'accordion-up':   'accordion-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to:   { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to:   { height: '0', opacity: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%':      { transform: 'translateY(-14px) translateX(6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '0.9', transform: 'scale(1.04)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%':  { transform: 'translate(-5%,-5%)' },
          '30%':  { transform: 'translate(3%,-7%)' },
          '50%':  { transform: 'translate(-7%,3%)' },
          '70%':  { transform: 'translate(7%,5%)' },
          '90%':  { transform: 'translate(-3%,7%)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;