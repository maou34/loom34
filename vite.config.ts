import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Mode « tunnel » (`npm run dev:tunnel` + `npm run tunnel`) : le site local, sur la
 * base Supabase LOCALE, partagé via un tunnel Cloudflare temporaire. Les visiteurs
 * ne peuvent pas joindre 127.0.0.1 : Vite relaie donc Supabase (/supabase) et le
 * serveur d'images (/upload, /gallery, comme nginx en prod) sous la même adresse.
 * L'en-tête Origin est retiré vers le serveur d'images, dont la liste CORS ne
 * connaît pas les adresses *.trycloudflare.com (les requêtes restent du même site
 * côté navigateur). Pas de rechargement à chaud : son websocket ne passerait pas.
 */
const dropOrigin = (proxy: { on: (event: "proxyReq", cb: (req: { removeHeader: (name: string) => void }) => void) => void }) =>
  proxy.on("proxyReq", (req) => req.removeHeader("origin"));
const tunnelServer = {
  host: "localhost",
  port: 8080,
  allowedHosts: [".trycloudflare.com"],
  hmr: false,
  proxy: {
    "/supabase": {
      target: "http://127.0.0.1:54321",
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/supabase/, ""),
    },
    "/upload": { target: "http://127.0.0.1:8081", changeOrigin: true, configure: dropOrigin },
    "/gallery": { target: "http://127.0.0.1:8081", changeOrigin: true, configure: dropOrigin },
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 🔧 Serveur DEV uniquement
  server: mode === "tunnel" ? tunnelServer : {
    host: "localhost",
    port: 8080,
    proxy: {
      "/upload": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/upload/, "/upload"),
        // Configuration CORS
        cors: true,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    },
  },

  // 🚀 Serveur PROD (vite preview + PM2)
  preview: {
    host: "localhost",
    port: 4173,
    proxy: {
      "/upload": "http://127.0.0.1:8081",
    },
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  optimizeDeps: {
    include: [
      // Force pré-bundling pour éviter des imports ESM "cassés" dans certains découpages de chunks
      "framer-motion",
    ],
  },

  build: {
    // Vite 8 (Rolldown) : groupes de fichiers des bibliothèques, pour qu'elles restent en
    // cache chez les visiteurs d'une mise en ligne à l'autre. Chaque groupe capture les
    // fichiers dont le chemin correspond (contrairement à l'ancien manualChunks de Rollup,
    // les dépendances d'une bibliothèque ne suivent pas d'office : elles sont listées).
    // Pas de groupe « admin » : les pages admin sont chargées à la demande (lazy dans
    // App.tsx) ; un groupe manuel y attirait des modules partagés avec le site public et
    // faisait précharger tout l'admin (1,2 Mo) par chaque visiteur.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules[\\/](react|react-dom|scheduler|react-router|cookie|set-cookie-parser)[\\/]/, priority: 10 },
            { name: "framer-motion", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 9 },
            { name: "query-vendor", test: /node_modules[\\/]@tanstack[\\/]/, priority: 8 },
            { name: "supabase-vendor", test: /node_modules[\\/]@supabase[\\/]/, priority: 8 },
            { name: "ui-vendor", test: /node_modules[\\/]@radix-ui[\\/]/, priority: 7 },
          ],
        },
      },
    },

    sourcemap: true,

    chunkSizeWarningLimit: 600,

    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
      },
    },
  },
}));