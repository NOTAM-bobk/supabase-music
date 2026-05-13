/* ─── My Music Player — Service Worker ─────────────────────
   vite-plugin-pwa injectManifest strategy:
   - self.__WB_MANIFEST is replaced at build time with the
     precache list of all Vite hashed assets
   - Audio from Supabase gets Cache First + range support
     so songs play and seek correctly offline
──────────────────────────────────────────────────────────── */

const SHELL_CACHE = "shell-v1";
const AUDIO_CACHE = "audio-v1";
const CDN_CACHE   = "cdn-v1";

/* ── Install: precache all Vite build assets ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      /* self.__WB_MANIFEST is injected by vite-plugin-pwa at build time */
      const assets = (self.__WB_MANIFEST || []).map((entry) =>
        typeof entry === "string" ? entry : entry.url
      );
      return cache.addAll(["/", "/index.html", ...assets]);
    })
  );
  self.skipWaiting();
});

/* ── Activate: remove old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, AUDIO_CACHE, CDN_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: route to the right strategy ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* 1. Supabase audio storage → Cache First with range support */
  if (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/storage/")
  ) {
    event.respondWith(cacheFirstAudio(request));
    return;
  }

  /* 2. Google Fonts + CDN scripts → Cache First */
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "cdn.jsdelivr.net"
  ) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  /* 3. Same-origin app shell → Cache First (covers hashed JS/CSS) */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  /* 4. Everything else → Network with cache fallback */
  event.respondWith(networkFirst(request));
});

/* ── Strategy: Cache First ── */
async function cacheFirst(request, cacheName) {
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

/* ── Strategy: Network First ── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

/* ── Audio: Cache First with byte-range support ── */
async function cacheFirstAudio(request) {
  const cache    = await caches.open(AUDIO_CACHE);
  const cacheKey = request.url;
  const cached   = await cache.match(cacheKey);

  if (cached) {
    const range = request.headers.get("range");
    return range ? buildRangeResponse(cached, range) : cached;
  }

  /* Fetch full file (no range header) so we store a complete copy */
  try {
    const fullReq = new Request(request.url, {
      method: "GET", mode: "cors", credentials: "omit",
    });
    const response = await fetch(fullReq);
    if (!response.ok && response.status !== 206) return response;

    const buffer = await response.arrayBuffer();
    const fullResponse = new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":   response.headers.get("Content-Type") || "audio/mpeg",
        "Content-Length": String(buffer.byteLength),
        "Accept-Ranges":  "bytes",
      },
    });

    /* Cache the full file */
    await cache.put(cacheKey, fullResponse.clone());

    /* Tell the app this song is now cached */
    const clients = await self.clients.matchAll();
    const name = decodeURIComponent(
      request.url.split("/").pop().split("?")[0]
    );
    clients.forEach((c) => c.postMessage({ type: "SONG_CACHED", name }));

    /* Respond — handle range if the browser asked for one */
    const range = request.headers.get("range");
    return range ? buildRangeResponse(fullResponse, range) : fullResponse;
  } catch {
    return new Response("Audio unavailable offline", { status: 503 });
  }
}

/* Slice a cached full response into a 206 Partial Content response */
async function buildRangeResponse(fullResponse, rangeHeader) {
  const buffer = await fullResponse.clone().arrayBuffer();
  const total  = buffer.byteLength;
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

/* ── Message: pre-cache a batch of songs from the app ── */
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
        } catch { /* skip */ }
      }
    })()
  );
});
