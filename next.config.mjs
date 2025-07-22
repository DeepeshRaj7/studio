// next.config.mjs (or .js)
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts', // Path to your service worker source file (e.g., in app router)
  swDest: 'public/sw.js', // Output path for the generated service worker
  // Optional: Add runtimeCaching for specific assets
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
  // ... other Next.js configurations
};

export default withSerwist(nextConfig);