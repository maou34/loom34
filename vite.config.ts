import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 🔧 Serveur DEV uniquement
  server: {
    host: "localhost",
    port: 8080,
    proxy: {
      "/upload": "http://localhost:8081",
    },
  },

  // 🚀 Serveur PROD (vite preview + PM2)
  preview: {
    host: "0.0.0.0",
    port: 4173,
    proxy: {
      '/upload': 'http://localhost:8081',
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  optimizeDeps: {
    include: ["react-dnd", "react-dnd-html5-backend"],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-toast",
          ],
          "query-vendor": ["@tanstack/react-query"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "markdown-vendor": ["react-markdown", "remark-gfm"],

          // Admin (back-office)
          admin: [
            "src/pages/admin/Dashboard.tsx",
            "src/pages/admin/Articles.tsx",
            "src/pages/admin/Events.tsx",
          ],
        },
      },
    },

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
