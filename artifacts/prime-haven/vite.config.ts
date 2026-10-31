import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const projectDir = __dirname;
const workspaceRoot = path.resolve(projectDir, "../..");
const port = 3000;
const basePath = process.env.BASE_PATH || "/";

const LEGACY_SUPABASE_URL = "https://kbxijzsrywcwnyvtbruh.supabase.co";
const LEGACY_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieGlqenNyeXdjd255dnRicnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mjg4MDIsImV4cCI6MjA4MzIwNDgwMn0.RduQgS5QJO9zRawpibzvgCmz5yZow2p-cqkpVa5guns";

function supabaseAuthMigrationPlugin() {
  const middleware = async (req: any, res: any, next: any) => {
    if (req.url !== "/api/migrate-auth" || req.method !== "POST") {
      return next();
    }

    const targetUrl = process.env.VITE_SUPABASE_URL || "https://iuoyngmfpxqgjutmvauj.supabase.co";
    const targetAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!serviceRoleKey) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ migrated: false, reason: "no_service_role_key" }));
      return;
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const { email, username, password } = body;

      if (!password) {
        res.statusCode = 400;
        res.end(JSON.stringify({ migrated: false }));
        return;
      }

      let verifiedUser: any = null;
      let userEmail: string | undefined = email;

      if (username && !String(username).includes("@")) {
        // Verify admin username & password against legacy admin-login Edge Function
        const legacyAdminRes = await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/admin-login`, {
          method: "POST",
          headers: {
            Origin: "https://primehaven.tech",
            apikey: LEGACY_SUPABASE_KEY,
            Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });
        if (!legacyAdminRes.ok) {
          res.statusCode = 401;
          res.end(JSON.stringify({ migrated: false }));
          return;
        }
        const adminData: any = await legacyAdminRes.json();
        verifiedUser = adminData?.session?.user || adminData?.user;
        userEmail = verifiedUser?.email;
      } else {
        const loginEmail = email || username;
        const legacyAuthRes = await fetch(`${LEGACY_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: LEGACY_SUPABASE_KEY,
            Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: loginEmail, password }),
        });
        if (!legacyAuthRes.ok) {
          res.statusCode = 401;
          res.end(JSON.stringify({ migrated: false }));
          return;
        }
        const authData: any = await legacyAuthRes.json();
        verifiedUser = authData?.user;
        userEmail = verifiedUser?.email || loginEmail;
      }

      if (!verifiedUser?.id || !userEmail) {
        res.statusCode = 400;
        res.end(JSON.stringify({ migrated: false }));
        return;
      }

      // Create or update user in the new Supabase project's auth.users with the exact original UUID
      await fetch(`${targetUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: verifiedUser.id,
          email: userEmail,
          password,
          email_confirm: true,
          user_metadata: verifiedUser.user_metadata || {},
        }),
      });

      // Sign in to the new Supabase project
      const newSignInRes = await fetch(`${targetUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: targetAnonKey || serviceRoleKey,
          Authorization: `Bearer ${targetAnonKey || serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail, password }),
      });

      if (newSignInRes.ok) {
        const newSession: any = await newSignInRes.json();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            migrated: true,
            session: newSession,
            user: {
              id: verifiedUser.id,
              email: userEmail,
              username: username || verifiedUser.user_metadata?.username,
              name: verifiedUser.user_metadata?.full_name || username || "Admin",
            },
          })
        );
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ migrated: true }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ migrated: false, error: err?.message }));
    }
  };

  return {
    name: "supabase-auth-migration",
    configureServer(server: any) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(middleware);
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
        target: process.env.VITE_SUPABASE_URL || "https://iuoyngmfpxqgjutmvauj.supabase.co",
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
        target: process.env.VITE_SUPABASE_URL || "https://iuoyngmfpxqgjutmvauj.supabase.co",
        changeOrigin: true,
        headers: {
          Origin: "https://primehaven.tech",
        },
      },
    },
  },
});
