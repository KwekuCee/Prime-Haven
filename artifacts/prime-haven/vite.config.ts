import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const projectDir = __dirname;
const workspaceRoot = path.resolve(projectDir, "../..");
const port = 3000;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.join(projectDir, "tailwind.config.ts"),
        }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.join(projectDir, "src"),
      "@assets": path.join(projectDir, "public"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    entries: ["index.html", "src/**/*.{ts,tsx}"],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "framer-motion",
      "@tanstack/react-query",
      "next-themes",
      "lucide-react",
      "react-i18next",
      "i18next",
      "i18next-browser-languagedetector",
      "@supabase/supabase-js",
    ],
  },
  root: projectDir,
  build: {
    outDir: path.join(projectDir, "dist"),
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "@supabase/supabase-js"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/functions/v1": {
        target: "https://kbxijzsrywcwnyvtbruh.supabase.co",
        changeOrigin: true,
        headers: {
          Origin: "https://primehaven.tech",
        },
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/functions/v1": {
        target: "https://kbxijzsrywcwnyvtbruh.supabase.co",
        changeOrigin: true,
        headers: {
          Origin: "https://primehaven.tech",
        },
      },
    },
  },
});
