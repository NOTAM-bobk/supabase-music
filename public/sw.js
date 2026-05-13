/* ─── My Music Player — Service Worker ─────────────────────
   Strategy:
   • App shell (HTML/JS/CSS) → Cache First, network fallback
   • Audio files             → Cache First, then background-fetch from network
   • Supabase storage URLs   → Stale-While-Revalidate so new songs appear
     automatically once online, but cached copies play offline
──────────────────────────────────────────────────────────── */

const CACHE_VERSION  = "v1";
const SHELL_CACHE    = `shell-${CACHE_VERSION}`;
const AUDIO_CACHE    = `audio-${CACHE_VERSION}`;
const DYNAMIC_CACHE  = `dynamic-${CACHE_VERSION}`;

/* App shell assets that Vite will emit */
const SHELL_ASSETS = [
  "/",
  "/index.html",
];

/* ── Install: pre-cache the app shell ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: clean up old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, AUDIO_CACHE, DYNAMIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: route requests to the right strategy ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* 1. Audio files from Supabase storage → Cache First */
  if (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/storage/")
  ) {
    event.respondWith(cacheFirstAudio(request));
    return;
  }

  /* 2. Google Fonts → Cache First (static assets) */
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  /* 3. CDN scripts (supabase-js, etc.) → Cache First */
  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  /* 4. Same-origin requests (app shell, JS chunks) → Cache First */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  /* 5. Everything else → Network with dynamic cache fallback */
  event.respondWith(networkFirst(request));
});

/* ── Strategy: Cache First ── */
async function cacheFirst(request, cacheName = DYNAMIC_CACHE) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline — resource not cached", { status: 503 });
  }
}

/* ── Strategy: Cache First for Audio (streams + range support) ──
   Audio elements use Range requests. We cache the full response
   and reconstruct a proper range response from it so the browser
   can seek even when offline.
── */
async function cacheFirstAudio(request) {
  const cacheKey = request.url; // use URL string as key (no range header)
  const cache    = await caches.open(AUDIO_CACHE);

  /* Check if we have a full (non-partial) cached copy */
  const cached = await cache.match(cacheKey);
  if (cached) {
    /* If browser is asking for a byte range, slice our cached body */
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      return buildRangeResponse(cached, rangeHeader);
    }
    return cached;
  }

  /* Not cached — fetch the full file (ignore any range header so we
     get the complete audio blob to store) */
  try {
    const fullRequest = new Request(request.url, {
      headers: { ...Object.fromEntries(request.headers) },
      mode:        "cors",
      credentials: "omit",
    });
    // Strip range header so we always fetch the complete file
    const cleanRequest = new Request(request.url, {
      method:      "GET",
      mode:        "cors",
      credentials: "omit",
    });

    const response = await fetch(cleanRequest);

    if (response.ok || response.status === 206) {
      /* Store the full file in cache (clone before consuming) */
      const fullResponse = new Response(await response.clone().arrayBuffer(), {
        status:  200,
        headers: {
          "Content-Type":  response.headers.get("Content-Type")  || "audio/mpeg",
          "Content-Length": response.headers.get("Content-Length") || "",
          "Accept-Ranges": "bytes",
        },
      });
      cache.put(cacheKey, fullResponse.clone());

      /* Respond to the original (possibly ranged) request */
      const rangeHeader = request.headers.get("range");
      if (rangeHeader) {
        return buildRangeResponse(fullResponse, rangeHeader);
      }
      return fullResponse;
    }

    return response;
  } catch (err) {
    return new Response("Audio unavailable offline", { status: 503 });
  }
}

/* Build a 206 Partial Content response from a cached full response */
async function buildRangeResponse(fullResponse, rangeHeader) {
  const arrayBuffer = await fullResponse.clone().arrayBuffer();
  const totalBytes  = arrayBuffer.byteLength;

  /* Parse "bytes=start-end" */
  const [, rangeSpec] = rangeHeader.split("=");
  const [startStr, endStr] = rangeSpec.split("-");
  const start = parseInt(startStr, 10) || 0;
  const end   = endStr ? parseInt(endStr, 10) : totalBytes - 1;
  const chunk = arrayBuffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    headers: {
      "Content-Type":  fullResponse.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${totalBytes}`,
      "Content-Length": String(chunk.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
}

/* ── Strategy: Network First (with cache fallback) ── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

/* ── Message: allow the app to trigger a full cache refresh ── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  /* The app can send { type: "CACHE_SONGS", songs: [{url, name}] }
     to pre-cache a batch of songs in the background */
  if (event.data?.type === "CACHE_SONGS") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(AUDIO_CACHE);
        const songs = event.data.songs || [];
        for (const song of songs) {
          const already = await cache.match(song.url);
          if (already) continue;
          try {
            const response = await fetch(new Request(song.url, {
              method: "GET", mode: "cors", credentials: "omit",
            }));
            if (response.ok) {
              const full = new Response(await response.arrayBuffer(), {
                status: 200,
                headers: {
                  "Content-Type":  response.headers.get("Content-Type")  || "audio/mpeg",
                  "Content-Length": response.headers.get("Content-Length") || "",
                  "Accept-Ranges": "bytes",
                },
              });
              await cache.put(song.url, full);
              /* Notify all clients that this song is now cached */
              const clients = await self.clients.matchAll();
              clients.forEach(c => c.postMessage({ type: "SONG_CACHED", name: song.name }));
            }
          } catch { /* skip if fetch fails */ }
        }
      })()
    );
  }
});
