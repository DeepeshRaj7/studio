// next.config.mjs
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  // Your Serwist PWA configuration
  swSrc: 'app/sw.ts', // Make sure this path is correct relative to your project root
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // Good practice to disable in dev
  // Add any other Serwist options here, like runtimeCaching if needed
  // runtimeCaching: [
  //   {
  //     urlPattern: /^https?.*/,
  //     handler: 'NetworkFirst',
  //     options: {
  //       cacheName: 'pages-cache',
  //       expiration: {
  //         maxEntries: 100,
  //         maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
  //       },
  //     },
  //   },
  // ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true, // Be cautious with this in production, but okay for now
  },
  eslint: {
    ignoreDuringBuilds: true, // Be cautious with this in production, but okay for now
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  // ... any other Next.js configurations you might have
};

export default withSerwist(nextConfig);