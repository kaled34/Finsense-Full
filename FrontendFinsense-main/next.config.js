/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: true,
  },
  webpack: (config, { nextRuntime }) => {
    // Mock __dirname for the edge runtime to prevent ReferenceError
    if (nextRuntime === 'edge') {
      config.node = {
        __dirname: true,
      };
    }
    return config;
  },
};

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  // Desactivamos en desarrollo, habilitamos en producción
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    exclude: [
      /\[.*\]/,
      /%5B.*%5D/,
      /_next\/static\/chunks\/app\/.*\/\[.*\]/,
    ],
  },
});

module.exports = withPWA(nextConfig);
