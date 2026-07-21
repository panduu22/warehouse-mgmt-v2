// sw.ts — Serwist Service Worker Entry Point
//
// This file is compiled by @serwist/next via webpack during `next build`
// and is placed at /sw.js (served from public/sw.js).
//
// RULES:
//   - /api/* routes are ALWAYS NetworkOnly — live warehouse data must never be stale.
//   - Auth endpoints (/api/auth/*) are also NetworkOnly — tokens must always be fresh.
//   - Static assets (_next/static/) use CacheFirst (they are content-hashed, safe forever).
//   - Navigation (HTML document requests) uses NetworkFirst with /offline as fallback.

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// Augment the ServiceWorkerGlobalScope to include the build-time manifest
// injected by the @serwist/next webpack plugin.
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── API / Auth: NetworkOnly ──────────────────────────────────────────────────
// All /api/* requests bypass the cache entirely.
// This must be the FIRST rule so it takes precedence over defaultCache handlers.
const apiRouteCache: RuntimeCaching = {
  matcher: ({ url }) => url.pathname.startsWith("/api/"),
  handler: new NetworkOnly(),
};

// ── Serwist Instance ─────────────────────────────────────────────────────────
const serwist = new Serwist({
  // Precache all Next.js build assets discovered at build time.
  precacheEntries: self.__SW_MANIFEST,

  // Immediately activate the new SW without waiting for existing tabs to close.
  skipWaiting: true,

  // Claim all open pages so the new SW controls them right away.
  clientsClaim: true,

  // Use the Navigation Preload API to reduce response latency on navigation.
  navigationPreload: true,

  runtimeCaching: [
    // 1. API routes — always live, never cached.
    apiRouteCache,

    // 2. defaultCache covers:
    //    • _next/static/** → CacheFirst (content-hashed, expires in 365 days)
    //    • _next/image/**  → StaleWhileRevalidate
    //    • Google Fonts    → CacheFirst
    //    • Navigation      → NetworkFirst (falls back to /offline on failure)
    ...defaultCache,
  ],

  // ── Offline Fallback ───────────────────────────────────────────────────────
  // When a document navigation fails (user is offline), serve the /offline page
  // from the precache instead of showing a browser error.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
