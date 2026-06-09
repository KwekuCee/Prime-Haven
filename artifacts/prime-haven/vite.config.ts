import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const port = process.env.PORT ? Number(process.env.PORT) : 5173;
const basePath = process.env.BASE_PATH || "/";
const isReplit = typeof process.env.REPL_ID === "string";

// On Replit: output to artifacts/prime-haven/dist (matches artifact.toml publicDir)
// On Lovable/CI: output to workspace root dist/ so dist-check finds index.html
const outDir = isReplit
  ? path.resolve(import.meta.dirname, "dist")
  : path.resolve(import.meta.dirname, "../../dist");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    ...(isReplit
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          ...(process.env.NODE_ENV !== "production"
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, ".."),
                  })
                ),
                await import("@replit/vite-plugin-dev-banner").then((m) =>
                  m.devBanner()
                ),
              ]
            : []),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets"
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
