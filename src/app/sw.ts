// app/sw.ts (or .js) - This is your custom service worker logic
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry } from '@serwist/precaching';
import { installSerwist } from '@serwist/sw';

// Declare global self for TypeScript
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

// This will be replaced by the precache manifest
// @ts-ignore
const manifest = self.__SW_MANIFEST;

installSerwist({
  precacheEntries: manifest,
  runtimeCaching: defaultCache, // Use default caching strategies
});

// Add your custom service worker logic here (e.g., push notifications)
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim()); // Takes control of any clients not currently controlled
});

// Example: Intercept fetch requests (defaultCache handles common cases)
// self.addEventListener('fetch', (event) => {
//   if (event.request.mode === 'navigate') {
//     event.respondWith(caches.match('/offline.html') || fetch(event.request));
//   }
// });