/* ─── My Music Player — Service Worker ─────────────────────
   Uses vite-plugin-pwa's injectManifest strategy:
   • self.__WB_MANIFEST is replaced at build time with the
     list of all Vite-hashed assets (JS, CSS, HTML, fonts…)
   • Audio files from Supabase get our custom Cache First +
     range-request handler so seek works offline too.
──────────────────────────────────────────────────────────── */

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

const AUDIO_CACHE = "audio-v1";

/* ── Precache all Vite build assets (hashed filenames) ── */
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

/* ── Skip waiting immediately when a new SW is found ── */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

/* ── Audio files from Supabase → custom Cache First with range support ── */
registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/storage/"),
  async ({ request }) => cacheFirstAudio(request)
);

/* ── Google Fonts → Cache First, 1 year ── */
registerRoute(
  ({ url }) =>
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new CacheFirst({
    cacheName: "fonts-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

/* ── CDN scripts (supabase-js, etc.) → Cache First, 7 days ── */
registerRoute(
  ({ url }) => url.hostname === "cdn.jsdelivr.net",
  new CacheFirst({
    cacheName: "cdn-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

/* ─── Audio caching helpers ──────────────────────────────── */

async function cacheFirstAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cacheKey = request.url;

  /* Return cached full response, slicing for range requests */
  const cached = await cache.match(cacheKey);
  if (cached) {
    const range = request.headers.get("range");
    return range ? buildRangeResponse(cached, range) : cached;
  }

  /* Fetch the complete file (strip range header so we always
     store a full copy — critical for offline seek to work)   */
  try {
    const fullReq = new Request(request.url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });
    const response = await fetch(fullReq);
    if (!response.ok && response.status !== 206) return response;

    const buffer = await response.arrayBuffer();
    const fullResponse = new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":   response.headers.get("Content-Type")   || "audio/mpeg",
        "Content-Length": String(buffer.byteLength),
        "Accept-Ranges":  "bytes",
      },
    });

    /* Store in cache */
    await cache.put(cacheKey, fullResponse.clone());

    /* Notify clients this song is now cached */
    const clients = await self.clients.matchAll();
    const name = decodeURIComponent(request.url.split("/").pop().split("?")[0]);
    clients.forEach((c) => c.postMessage({ type: "SONG_CACHED", name }));

    /* Respond to the original request (handle range if needed) */
    const range = request.headers.get("range");
    return range ? buildRangeResponse(fullResponse, range) : fullResponse;
  } catch {
    return new Response("Audio unavailable offline", { status: 503 });
  }
}

async function buildRangeResponse(fullResponse, rangeHeader) {
  const buffer     = await fullResponse.clone().arrayBuffer();
  const total      = buffer.byteLength;
  const [, spec]   = rangeHeader.split("=");
  const [s, e]     = spec.split("-");
  const start      = parseInt(s, 10) || 0;
  const end        = e ? parseInt(e, 10) : total - 1;
  const chunk      = buffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    headers: {
      "Content-Type":   fullResponse.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range":  `bytes ${start}-${end}/${total}`,
      "Content-Length": String(chunk.byteLength),
      "Accept-Ranges":  "bytes",
    },
  });
}

/* ── Message: batch pre-cache songs sent from the app ── */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_SONGS") return;

  event.waitUntil(
    (async () => {
      const cache = await caches.open(AUDIO_CACHE);
      for (const song of event.data.songs || []) {
        if (await cache.match(song.url)) continue;
        try {
          const res = await fetch(new Request(song.url, {
            method: "GET", mode: "cors", credentials: "omit",
          }));
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          await cache.put(
            song.url,
            new Response(buf, {
              status: 200,
              headers: {
                "Content-Type":   res.headers.get("Content-Type") || "audio/mpeg",
                "Content-Length": String(buf.byteLength),
                "Accept-Ranges":  "bytes",
              },
            })
          );
          const clients = await self.clients.matchAll();
          clients.forEach((c) =>
            c.postMessage({ type: "SONG_CACHED", name: song.name })
          );
        } catch { /* skip failed fetches */ }
      }
    })()
  );
});
