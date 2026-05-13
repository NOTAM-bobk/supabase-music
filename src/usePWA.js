import { useEffect, useState } from "react";

/**
 * usePWA
 * - Listens for SW messages (SONG_CACHED)
 * - Exposes `cacheSongs(songs)` to kick off background caching
 * - Exposes `cachedSongs` set so the UI can show a cached indicator
 * - Exposes `isOffline` boolean
 * - Exposes `installPrompt` / `install()` for the "Add to Home Screen" prompt
 */
export function usePWA() {
  const [cachedSongs,   setCachedSongs]   = useState(new Set());
  const [isOffline,     setIsOffline]     = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed,     setInstalled]     = useState(false);

  /* Online / offline detection */
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* Listen for SW → client messages */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === "SONG_CACHED") {
        setCachedSongs(prev => new Set([...prev, event.data.name]));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  /* Capture the beforeinstallprompt event */
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  /**
   * Send a list of songs to the SW for background caching.
   * songs: Array<{ url: string, name: string }>
   */
  const cacheSongs = async (songs) => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "CACHE_SONGS", songs });
  };

  /**
   * Trigger the native "Add to Home Screen" install prompt.
   */
  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  return { cachedSongs, isOffline, installPrompt, installed, cacheSongs, install };
}
