import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const projectDir = __dirname;
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
    dedupe: ["react", "react-dom"],
  },
  root: projectDir,
  build: {
    outDir: path.join(projectDir, "dist"),
    emptyOutDir: true,
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
