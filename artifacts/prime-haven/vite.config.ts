import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const backendHandler = require("../../api/backend.js");

const projectDir = __dirname;
const workspaceRoot = path.resolve(projectDir, "../..");
const port = 3000;
const basePath = process.env.BASE_PATH || "/";

function supabaseAuthMigrationPlugin() {
  return {
    name: "supabase-auth-migration",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => backendHandler(req, res, next));
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => backendHandler(req, res, next));
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), supabaseAuthMigrationPlugin()],
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
  envDir: workspaceRoot,
  build: {
    outDir: path.resolve(projectDir, "dist"),
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 3000,
    target: "es2022",
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/functions/v1": {
        target: "https://iuoyngmfpxqgjutmvauj.supabase.co",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/functions/v1": {
        target: "https://iuoyngmfpxqgjutmvauj.supabase.co",
        changeOrigin: true,
      },
    },
  },
});
