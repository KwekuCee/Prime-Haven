import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const basePath = process.env.BASE_PATH || "/";
const isReplit = typeof process.env.REPL_ID === "string";

// process.cwd() is reliably set to artifacts/prime-haven by both:
//   - pnpm (runs scripts from the package directory)
//   - bun --cwd ./artifacts/prime-haven
// Two levels up reaches the workspace root, which is where both
// Replit's artifact.toml publicDir and Lovable's dist-check expect output.
const projectDir = process.cwd();
const workspaceRoot = path.resolve(projectDir, "../..");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    mcpPlugin(),
    ...(isReplit
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          ...(process.env.NODE_ENV !== "production"
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) =>
                  m.cartographer({ root: workspaceRoot })
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
      "@": path.join(projectDir, "src"),
      "@assets": path.join(workspaceRoot, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: projectDir,
  build: {
    outDir: path.join(workspaceRoot, "dist"),
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
