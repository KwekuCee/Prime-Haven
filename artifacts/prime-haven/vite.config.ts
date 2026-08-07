import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const basePath = process.env.BASE_PATH || "/";

const projectDir = process.cwd();

export default defineConfig({
  base: basePath,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.join(projectDir, "src"),
      "@assets": path.join(projectDir, "public"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: projectDir,
  build: {
    outDir: path.join(projectDir, "dist"),
    emptyOutDir: true,
    // Deployment hosts compress static assets when serving them. Calculating
    // every chunk's gzip size here only delays the build and can exceed the
    // deployment executor deadline on cold workers.
    reportCompressedSize: false,
    target: "es2022",
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
