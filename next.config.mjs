import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,

  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  images: {
    qualities: [40, 45, 50, 55, 60, 65, 70, 75],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
    ],
    formats: ['image/webp'],

    // ── التغيير الوحيد ──
    // كان 7 أيام: كل أسبوع الـ optimizer بيعيد ضغط كل صورة من الأول،
    // فأول زائر بعد انتهاء الكاش بيدفع تكلفة الضغط → يضرب الـ LCP.
    // سنة كاملة. لو غيّرت صورة → غيّر اسم الملف (discount-35-lab-v2.webp).
    minimumCacheTTL: 31536000,

    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 64, 256, 512],
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      'embla-carousel-react',
      'sonner',
    ],
  },

  outputFileTracingRoot: process.cwd(),

  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });
    return config;
  },
};

export default withNextIntl(nextConfig);
