/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: true,
  },
  webpack: (config, { nextRuntime, webpack }) => {
    // Mock __dirname y __filename para el entorno Edge usando DefinePlugin
    if (nextRuntime === 'edge') {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: '"/"',
          __filename: '"/index.js"',
        })
      );
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

const pwaConfig = withPWA(nextConfig);

// Sobrescribimos webpack después del wrapper de PWA para aplicar el DefinePlugin al final
const originalWebpack = pwaConfig.webpack;
pwaConfig.webpack = (config, options) => {
  const resolvedConfig = originalWebpack ? originalWebpack(config, options) : config;
  
  if (options.nextRuntime === 'edge') {
    resolvedConfig.plugins.push(
      new options.webpack.DefinePlugin({
        __dirname: '"/"',
        __filename: '"/index.js"',
      })
    );
  }
  return resolvedConfig;
};

module.exports = pwaConfig;
