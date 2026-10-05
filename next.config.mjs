import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["drizzle-orm", "pg", "pg-pool"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ahvmjptomjjnqjylofpa.supabase.co",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/catalog", destination: "/products" },
      { source: "/catalog/:path*", destination: "/products/:path*" },
    ];
  },
  // Stabilize production minify when large client chunks (e.g. three.js / Beams)
  // cause Terser worker early-exit under PWA + parallel minify.
  webpack: (config, { dev }) => {
    if (!dev) {
      config.parallelism = Math.min(config.parallelism ?? 4, 2);
      for (const plugin of config.optimization?.minimizer ?? []) {
        if (
          plugin?.constructor?.name === "TerserPlugin" &&
          plugin.options
        ) {
          plugin.options.parallel = false;
        }
      }
    }
    return config;
  },
};

export default withPWA(nextConfig);
