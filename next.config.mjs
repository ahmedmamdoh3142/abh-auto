import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // disable double-render in dev for perf
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
    ],
    formats: ['image/webp'],            // skip AVIF (slow to encode in dev)
    minimumCacheTTL: 60 * 60 * 24 * 7,  // 1 week — drastically reduces re-fetches
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 64, 256, 512],
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dropdown-menu',
      '@react-three/drei',
    ],
  },

  // Silence the multiple-lockfile warning
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
