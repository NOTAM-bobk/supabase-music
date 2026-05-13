import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* Use our custom service worker so we keep full control
         over audio caching logic, but still get Workbox's
         auto-generated precache manifest injected into it.     */
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",

      /* Tells Workbox which built assets to precache.
         It injects these into the SW as self.__WB_MANIFEST     */
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },

      registerType: "autoUpdate",

      manifest: {
        name: "My Music Player",
        short_name: "Music",
        description: "Stream and play music offline from your personal library",
        start_url: "/",
        display: "standalone",
        background_color: "#f0ede6",
        theme_color: "#f0ede6",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
