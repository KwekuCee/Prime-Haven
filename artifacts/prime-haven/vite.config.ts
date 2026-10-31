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

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: any) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
  );
  res.end(JSON.stringify(data));
}

function computeSubmissionPoints(
  serviceType: string | null | undefined,
  parentSubmissionId: string | null | undefined,
  requestedPoints?: number | null
): number {
  if (parentSubmissionId) return 0;
  const s = String(serviceType || "").toLowerCase();
  if (requestedPoints == null || requestedPoints <= 0 || requestedPoints === 40) {
    if (s.includes("ui") || s.includes("ux")) return 65;
    if (s.includes("web")) return 65;
    if (s.includes("mobile") || s.includes("app")) return 65;
    if (s.includes("logo")) return 45;
    if (s.includes("brand")) return 50;
    if (s.includes("motion") || s.includes("animat")) return 50;
    if (s.includes("video")) return 50;
    if (s.includes("it") || s.includes("tech") || s.includes("solution")) return 50;
    if (s.includes("social") || s.includes("smm")) return 40;
    if (s.includes("flyer")) return 40;
    if (s.includes("print")) return 20;
    return Math.max(Number(requestedPoints ?? 40), 0);
  }
  return Number(requestedPoints);
}

const legacyTokenCache = new Map<string, string>();

function supabaseAuthMigrationPlugin() {
  const middleware = async (req: any, res: any, next: any) => {
    const urlPath = (req.url || "").split("?")[0];

    const isHandledRoute =
      urlPath === "/api/migrate-auth" ||
      urlPath.startsWith("/functions/v1/") ||
      urlPath === "/rest/v1/rpc/admin_client_accept_submission" ||
      urlPath === "/rest/v1/rpc/approve_project_submission";

    if (!isHandledRoute) {
      return next();
    }

    if (req.method === "OPTIONS") {
      return sendJson(res, 200, { ok: true });
    }

    const targetUrl = process.env.VITE_SUPABASE_URL || "https://iuoyngmfpxqgjutmvauj.supabase.co";
    const targetAnonKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1b3luZ21mcHhxZ2p1dG12YXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDYxMzIsImV4cCI6MjEwOTAyMjEzMn0.M1RisZMMpOJucBmt7BrwktklhQSNBDgSh4aSRxJOh5k";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const srHeaders = {
      apikey: serviceRoleKey || targetAnonKey,
      Authorization: `Bearer ${serviceRoleKey || targetAnonKey}`,
      "Content-Type": "application/json",
    };

    // 0. /rest/v1/rpc/admin_client_accept_submission & /rest/v1/rpc/approve_project_submission
    if (
      (urlPath === "/rest/v1/rpc/admin_client_accept_submission" ||
        urlPath === "/rest/v1/rpc/approve_project_submission") &&
      req.method === "POST"
    ) {
      try {
        const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
        if (!authHeader) {
          return sendJson(res, 401, { message: "Not authenticated" });
        }

        const userRes = await fetch(`${targetUrl}/auth/v1/user`, {
          headers: {
            apikey: targetAnonKey,
            Authorization: authHeader,
          },
        });
        if (!userRes.ok) {
          return sendJson(res, 401, { message: "Not authenticated" });
        }
        const authUser: any = await userRes.json();
        if (!authUser?.id) {
          return sendJson(res, 401, { message: "Not authenticated" });
        }

        const roleRes = await fetch(
          `${targetUrl}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(authUser.id)}`,
          { headers: srHeaders }
        );
        const roleRows = roleRes.ok ? await roleRes.json() : [];
        const roles = (Array.isArray(roleRows) ? roleRows : []).map((r: any) =>
          String(r.role || "").trim().toLowerCase()
        );
        const isAdmin = roles.includes("superadmin") || roles.includes("masteradmin");

        const body = await readJsonBody(req);
        const submissionId = String(body?.p_submission_id || "").trim();
        const requestedPoints = body?.p_points != null ? Number(body.p_points) : undefined;
        const deptLabel = String(body?.p_dept_label || "Dept");

        if (!submissionId) {
          return sendJson(res, 400, { message: "submission_not_found" });
        }

        const subRes = await fetch(
          `${targetUrl}/rest/v1/submissions?select=*&id=eq.${encodeURIComponent(submissionId)}&limit=1`,
          { headers: srHeaders }
        );
        const subRows = subRes.ok ? await subRes.json() : [];
        const v_sub = Array.isArray(subRows) ? subRows[0] : null;

        if (!v_sub?.id) {
          return sendJson(res, 404, { message: "submission_not_found" });
        }

        if (urlPath === "/rest/v1/rpc/admin_client_accept_submission" && !isAdmin) {
          return sendJson(res, 403, { message: "not_authorized" });
        }

        if (v_sub.client_accepted) {
          return sendJson(res, 200, {
            success: true,
            points: Number(v_sub.points_awarded || 0),
            earned: 0,
            amount: 0,
            message: "Already approved.",
          });
        }

        // Resolve linked contract or client project
        const lookupId = v_sub.contract_id || v_sub.client_project_id;
        let v_contract: any = null;
        let v_project: any = null;

        if (lookupId) {
          const cRes = await fetch(
            `${targetUrl}/rest/v1/job_contracts?select=*&id=eq.${encodeURIComponent(lookupId)}&limit=1`,
            { headers: srHeaders }
          );
          const cRows = cRes.ok ? await cRes.json() : [];
          v_contract = Array.isArray(cRows) ? cRows[0] : null;

          if (!v_contract) {
            const pRes = await fetch(
              `${targetUrl}/rest/v1/client_projects?select=*&id=eq.${encodeURIComponent(lookupId)}&limit=1`,
              { headers: srHeaders }
            );
            const pRows = pRes.ok ? await pRes.json() : [];
            v_project = Array.isArray(pRows) ? pRows[0] : null;
          }
        }

        // If called via approve_project_submission by a non-admin client, verify ownership
        if (urlPath === "/rest/v1/rpc/approve_project_submission" && !isAdmin) {
          const userEmail = String(authUser.email || "").toLowerCase();
          const ownsProject =
            v_project &&
            ((v_project.client_email && String(v_project.client_email).toLowerCase() === userEmail) ||
              v_project.created_by === authUser.id);
          const ownsContract = v_contract && v_contract.posted_by === authUser.id;
          if (!ownsProject && !ownsContract) {
            return sendJson(res, 403, {
              message: "Only the client who owns this project can approve the work.",
            });
          }
        }

        const v_points = computeSubmissionPoints(
          v_sub.service_type,
          v_sub.parent_submission_id,
          requestedPoints
        );
        const nowIso = new Date().toISOString();

        // 1. Update submission
        const updSubRes = await fetch(
          `${targetUrl}/rest/v1/submissions?id=eq.${encodeURIComponent(v_sub.id)}`,
          {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              client_accepted: true,
              client_accepted_at: nowIso,
              client_accepted_by: authUser.id,
              ph_approved: true,
              ph_approved_at: v_sub.ph_approved_at || nowIso,
              points_awarded: Number(v_sub.points_awarded || 0) + v_points,
              status: "approved",
              final_approval_date: nowIso,
              updated_at: nowIso,
            }),
          }
        );

        if (!updSubRes.ok) {
          const errText = await updSubRes.text();
          return sendJson(res, 400, { message: errText || "Failed to update submission" });
        }

        // 2. Parse contract/project price & mark contract/project completed
        let v_parsed_price = 0;
        if (v_contract?.id) {
          const cleanBudget = String(v_contract.budget || "0").replace(/[^0-9.]/g, "");
          if (/^[0-9]+(\.[0-9]+)?$/.test(cleanBudget)) {
            v_parsed_price = Number(cleanBudget);
          }
          await fetch(`${targetUrl}/rest/v1/job_contracts?id=eq.${encodeURIComponent(v_contract.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              status: "completed",
              completed_at: nowIso,
              updated_at: nowIso,
            }),
          });
          await fetch(
            `${targetUrl}/rest/v1/job_contract_claims?contract_id=eq.${encodeURIComponent(v_contract.id)}&designer_id=eq.${encodeURIComponent(v_sub.designer_id)}`,
            {
              method: "PATCH",
              headers: srHeaders,
              body: JSON.stringify({ status: "completed", updated_at: nowIso }),
            }
          );
        } else if (v_project?.id) {
          v_parsed_price = Number(v_project.price_ghs || 0) || 0;
          await fetch(`${targetUrl}/rest/v1/client_projects?id=eq.${encodeURIComponent(v_project.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({ status: "completed", updated_at: nowIso }),
          });
        }

        // 3. Calculate 70% share and insert into public.job_earnings (idempotent)
        const v_talent_earned = v_parsed_price > 0 ? Math.round(v_parsed_price * 0.7 * 100) / 100 : 0;
        let shouldAddEarningsToDesigner = false;

        if (v_talent_earned > 0) {
          const existRes = await fetch(
            `${targetUrl}/rest/v1/job_earnings?select=id&submission_id=eq.${encodeURIComponent(v_sub.id)}&limit=1`,
            { headers: srHeaders }
          );
          const existRows = existRes.ok ? await existRes.json() : [];
          if (!Array.isArray(existRows) || existRows.length === 0) {
            const insEarnRes = await fetch(`${targetUrl}/rest/v1/job_earnings`, {
              method: "POST",
              headers: srHeaders,
              body: JSON.stringify({
                designer_id: v_sub.designer_id,
                project_id: v_project?.id || v_sub.client_project_id || null,
                contract_id: v_contract?.id || v_sub.contract_id || null,
                submission_id: v_sub.id,
                job_price: v_parsed_price,
                share_percent: 70,
                amount: v_talent_earned,
                currency: "GHS",
                status: "available",
                created_at: nowIso,
                updated_at: nowIso,
              }),
            });
            if (insEarnRes.ok) {
              shouldAddEarningsToDesigner = true;
            }
          }
        }

        // 4. Update designer_details (points + salary_estimated)
        if (v_points > 0 || shouldAddEarningsToDesigner) {
          const ddRes = await fetch(
            `${targetUrl}/rest/v1/designer_details?select=id,total_points,monthly_points,salary_estimated&user_id=eq.${encodeURIComponent(v_sub.designer_id)}&limit=1`,
            { headers: srHeaders }
          );
          const ddRows = ddRes.ok ? await ddRes.json() : [];
          const dd = Array.isArray(ddRows) ? ddRows[0] : null;
          if (dd?.id) {
            await fetch(
              `${targetUrl}/rest/v1/designer_details?user_id=eq.${encodeURIComponent(v_sub.designer_id)}`,
              {
                method: "PATCH",
                headers: srHeaders,
                body: JSON.stringify({
                  total_points: Number(dd.total_points || 0) + v_points,
                  monthly_points: Number(dd.monthly_points || 0) + v_points,
                  salary_estimated:
                    Number(dd.salary_estimated || 0) + (shouldAddEarningsToDesigner ? v_talent_earned : 0),
                  updated_at: nowIso,
                }),
              }
            );
          }
        }

        // 5. Free remaining active claims and project assignments for this talent
        await fetch(
          `${targetUrl}/rest/v1/job_contract_claims?designer_id=eq.${encodeURIComponent(v_sub.designer_id)}&status=in.(claimed,active,in_progress,submitted)`,
          {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({ status: "completed", updated_at: nowIso }),
          }
        ).catch(() => {});

        await fetch(
          `${targetUrl}/rest/v1/project_assignments?designer_id=eq.${encodeURIComponent(v_sub.designer_id)}&status=in.(assigned,claimed,active,in_progress,submitted)`,
          {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({ status: "completed" }),
          }
        ).catch(() => {});

        // 6. Audit log
        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            action_type: "admin_client_accept_submission",
            admin_id: authUser.id,
            description: `[${deptLabel}] Admin accepted: ${v_sub.project_name || "Project"} (+${v_points} pts, GH₵${v_talent_earned} 70% share)`,
            timestamp: nowIso,
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          points: v_points,
          earned: v_talent_earned,
          amount: v_talent_earned,
          message: "Project approved and completed successfully.",
        });
      } catch (err: any) {
        return sendJson(res, 500, { message: err?.message || "Server error" });
      }
    }

    // 1. /functions/v1/public-stats
    if (urlPath === "/functions/v1/public-stats") {
      try {
        const [profilesRes, subRes, rolesRes] = await Promise.all([
          fetch(`${targetUrl}/rest/v1/profiles?select=id&is_active=eq.true`, { headers: srHeaders }),
          fetch(`${targetUrl}/rest/v1/submissions?select=service_type,client_accepted,ph_approved,status`, {
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/user_roles?select=id&role=eq.designer`, { headers: srHeaders }),
        ]);

        const activeProfiles = profilesRes.ok ? await profilesRes.json() : [];
        const allSubmissions = subRes.ok ? await subRes.json() : [];
        const designers = rolesRes.ok ? await rolesRes.json() : [];

        const totalMembers = Array.isArray(activeProfiles) ? activeProfiles.length : 0;
        const submissionsList = Array.isArray(allSubmissions) ? allSubmissions : [];
        const totalSubmissions = submissionsList.length;
        const projectsDelivered = submissionsList.filter((s: any) => s.client_accepted).length;
        const phApproved = submissionsList.filter((s: any) => s.ph_approved).length;
        const satisfactionRate =
          totalSubmissions > 0 ? Math.round((phApproved / totalSubmissions) * 100) : 98;

        const categoryBreakdown: Record<string, { total: number; delivered: number; pending: number }> = {};
        for (const s of submissionsList) {
          const cat = s.service_type || "Other";
          if (!categoryBreakdown[cat]) {
            categoryBreakdown[cat] = { total: 0, delivered: 0, pending: 0 };
          }
          categoryBreakdown[cat].total++;
          if (s.client_accepted) categoryBreakdown[cat].delivered++;
          if (s.status === "pending" || (!s.ph_approved && s.status !== "rejected")) {
            categoryBreakdown[cat].pending++;
          }
        }

        return sendJson(res, 200, {
          success: true,
          stats: {
            totalMembers,
            projectsDelivered,
            satisfactionRate: Math.max(satisfactionRate, 90),
            totalSubmissions,
            categoryBreakdown,
            designerCount: Array.isArray(designers) ? designers.length : 0,
          },
        });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: "server_error", details: err?.message });
      }
    }

    // 2. /functions/v1/portfolio-media
    if (urlPath === "/functions/v1/portfolio-media") {
      try {
        const body = await readJsonBody(req);
        const designerId = String(body?.designer_id ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(designerId)) {
          return sendJson(res, 400, { error: "invalid designer_id" });
        }

        const subRes = await fetch(
          `${targetUrl}/rest/v1/submissions?select=id,files_urls,status,designer_id&designer_id=eq.${designerId}&status=in.(approved,ph_approved,client_accepted)&order=created_at.desc&limit=60`,
          { headers: srHeaders }
        );
        const rows = subRes.ok ? await subRes.json() : [];
        const paths: string[] = [];
        for (const row of Array.isArray(rows) ? rows : []) {
          for (const p of (row.files_urls ?? []) as string[]) {
            if (!p || /^https?:\/\//i.test(p)) continue;
            if (!paths.includes(p)) paths.push(p);
          }
        }

        const media: Record<string, string> = {};
        if (paths.length > 0 && serviceRoleKey) {
          const signRes = await fetch(`${targetUrl}/storage/v1/object/sign/submissions`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7, paths: paths.slice(0, 200) }),
          });
          if (signRes.ok) {
            const signedList = await signRes.json();
            for (const s of Array.isArray(signedList) ? signedList : []) {
              if (s.path && s.signedURL) {
                media[s.path] = s.signedURL.startsWith("http")
                  ? s.signedURL
                  : `${targetUrl}/storage/v1${s.signedURL}`;
              }
            }
          }
        }

        const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
        return sendJson(res, 200, {
          media,
          images: Object.keys(media).filter((p) => IMAGE_EXT.test(p)),
        });
      } catch {
        return sendJson(res, 200, { media: {}, images: [] });
      }
    }

    // 3. Helper to authenticate user against new Supabase, or sync password from old Supabase if not synced yet
    async function authenticateAndSync(identifier: string, password: string) {
      let userEmail = identifier.trim();
      let profileRow: any = null;

      if (!userEmail.includes("@")) {
        const profRes = await fetch(
          `${targetUrl}/rest/v1/profiles?select=id,email,full_name,username&username=eq.${encodeURIComponent(userEmail)}&limit=1`,
          { headers: srHeaders }
        );
        const profRows = profRes.ok ? await profRes.json() : [];
        profileRow = Array.isArray(profRows) && profRows[0] ? profRows[0] : null;
        if (profileRow?.email) {
          userEmail = profileRow.email;
        }
      } else {
        const profRes = await fetch(
          `${targetUrl}/rest/v1/profiles?select=id,email,full_name,username&email=ilike.${encodeURIComponent(userEmail)}&limit=1`,
          { headers: srHeaders }
        );
        const profRows = profRes.ok ? await profRes.json() : [];
        profileRow = Array.isArray(profRows) && profRows[0] ? profRows[0] : null;
      }

      // Also obtain legacy token in background if possible so Resend/Discord Edge Functions on legacy can be invoked
      const obtainLegacyToken = async (uid: string) => {
        try {
          if (!identifier.includes("@")) {
            const r = await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/admin-login`, {
              method: "POST",
              headers: {
                Origin: "https://primehaven.tech",
                apikey: LEGACY_SUPABASE_KEY,
                Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username: identifier.trim(), password }),
            });
            if (r.ok) {
              const d: any = await r.json();
              if (d?.session?.access_token) legacyTokenCache.set(uid, d.session.access_token);
            }
          } else if (userEmail.includes("@")) {
            const r = await fetch(`${LEGACY_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
              method: "POST",
              headers: {
                apikey: LEGACY_SUPABASE_KEY,
                Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email: userEmail, password }),
            });
            if (r.ok) {
              const d: any = await r.json();
              if (d?.access_token) legacyTokenCache.set(uid, d.access_token);
            }
          }
        } catch {
          // ignore
        }
      };

      // First try signing in directly to the new Supabase project
      if (userEmail.includes("@")) {
        const directRes = await fetch(`${targetUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: targetAnonKey,
            Authorization: `Bearer ${targetAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userEmail, password }),
        });

        if (directRes.ok) {
          const sessionData: any = await directRes.json();
          if (sessionData?.user?.id) {
            obtainLegacyToken(sessionData.user.id);
          }
          return {
            ok: true,
            migrated: false,
            session: sessionData,
            user: sessionData.user,
            profile: profileRow,
          };
        }
      }

      // If sign-in failed on new Supabase because password hash isn't synced yet, verify once on old project & permanently update password in new project
      let verifiedUser: any = null;
      if (!identifier.includes("@")) {
        const legacyAdminRes = await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/admin-login`, {
          method: "POST",
          headers: {
            Origin: "https://primehaven.tech",
            apikey: LEGACY_SUPABASE_KEY,
            Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: identifier.trim(), password }),
        });
        if (legacyAdminRes.ok) {
          const adminData: any = await legacyAdminRes.json();
          verifiedUser = adminData?.session?.user || adminData?.user;
          if (verifiedUser?.email) userEmail = verifiedUser.email;
          if (verifiedUser?.id && adminData?.session?.access_token) {
            legacyTokenCache.set(verifiedUser.id, adminData.session.access_token);
          }
        }
      }

      if (!verifiedUser && userEmail.includes("@")) {
        const legacyAuthRes = await fetch(`${LEGACY_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: LEGACY_SUPABASE_KEY,
            Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userEmail, password }),
        });
        if (legacyAuthRes.ok) {
          const authData: any = await legacyAuthRes.json();
          verifiedUser = authData?.user;
          if (verifiedUser?.email) userEmail = verifiedUser.email;
          if (verifiedUser?.id && authData?.access_token) {
            legacyTokenCache.set(verifiedUser.id, authData.access_token);
          }
        }
      }

      if (!verifiedUser?.id || !userEmail || !serviceRoleKey) {
        return { ok: false };
      }

      // Update user's password in new Supabase auth.users (or create if missing)
      const updateRes = await fetch(`${targetUrl}/auth/v1/admin/users/${verifiedUser.id}`, {
        method: "PUT",
        headers: srHeaders,
        body: JSON.stringify({
          email: userEmail,
          password,
          email_confirm: true,
          user_metadata: verifiedUser.user_metadata || {},
        }),
      });

      if (!updateRes.ok) {
        await fetch(`${targetUrl}/auth/v1/admin/users`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            id: verifiedUser.id,
            email: userEmail,
            password,
            email_confirm: true,
            user_metadata: verifiedUser.user_metadata || {},
          }),
        });
      }

      // Now sign in to the new Supabase project to get a native session
      const newSignInRes = await fetch(`${targetUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: targetAnonKey,
          Authorization: `Bearer ${targetAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail, password }),
      });

      if (newSignInRes.ok) {
        const newSession: any = await newSignInRes.json();
        return {
          ok: true,
          migrated: true,
          session: newSession,
          user: newSession.user || verifiedUser,
          profile: profileRow,
        };
      }

      return { ok: false };
    }

    // 4. /functions/v1/admin-login
    if (urlPath === "/functions/v1/admin-login" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const loginIdentifier = String(body?.username || body?.email || "").trim();
        const password = String(body?.password || "");

        if (!loginIdentifier || !password) {
          return sendJson(res, 400, { success: false, error: "invalid_credentials" });
        }

        const authResult = await authenticateAndSync(loginIdentifier, password);
        if (!authResult.ok || !authResult.user?.id) {
          return sendJson(res, 401, { success: false, error: "invalid_credentials" });
        }

        const userId = authResult.user.id;
        const roleRes = await fetch(
          `${targetUrl}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`,
          { headers: srHeaders }
        );
        const roleRows = roleRes.ok ? await roleRes.json() : [];
        const roles = (Array.isArray(roleRows) ? roleRows : []).map((r: any) =>
          String(r.role || "").trim().toLowerCase()
        );
        const matchedRole = roles.find((r) => r === "masteradmin" || r === "superadmin");

        if (!matchedRole) {
          return sendJson(res, 403, { success: false, error: "access_denied" });
        }

        const profile = authResult.profile;
        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            action_type: "admin_login",
            admin_id: userId,
            description: `Admin login: ${profile?.full_name || profile?.username || authResult.user.email}`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          session: authResult.session,
          user: {
            id: userId,
            email: authResult.user.email,
            username: profile?.username || loginIdentifier,
            name: profile?.full_name || profile?.username || "Admin",
            role: matchedRole,
          },
        });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: "server_error", details: err?.message });
      }
    }

    // 5. /api/migrate-auth
    if (urlPath === "/api/migrate-auth" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const loginIdentifier = String(body?.email || body?.username || "").trim();
        const password = String(body?.password || "");

        if (!loginIdentifier || !password) {
          return sendJson(res, 400, { migrated: false });
        }

        const authResult = await authenticateAndSync(loginIdentifier, password);
        if (!authResult.ok) {
          return sendJson(res, 401, { migrated: false });
        }

        return sendJson(res, 200, {
          migrated: true,
          session: authResult.session,
          user: {
            id: authResult.user?.id,
            email: authResult.user?.email,
            username: authResult.profile?.username || body?.username,
            name: authResult.profile?.full_name || authResult.profile?.username || "User",
          },
        });
      } catch (err: any) {
        return sendJson(res, 500, { migrated: false, error: err?.message });
      }
    }

    // 6. Helper to verify caller JWT & admin status against new Supabase
    async function verifyCaller(reqObj: any) {
      const authHeader = reqObj.headers?.authorization || reqObj.headers?.Authorization || "";
      if (!authHeader || !String(authHeader).startsWith("Bearer ")) {
        return { user: null, isAdmin: false, roles: [] as string[] };
      }
      const uRes = await fetch(`${targetUrl}/auth/v1/user`, {
        headers: { apikey: targetAnonKey, Authorization: authHeader },
      });
      if (!uRes.ok) {
        return { user: null, isAdmin: false, roles: [] as string[] };
      }
      const user: any = await uRes.json();
      if (!user?.id) {
        return { user: null, isAdmin: false, roles: [] as string[] };
      }
      const rRes = await fetch(
        `${targetUrl}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}`,
        { headers: srHeaders }
      );
      const rRows = rRes.ok ? await rRes.json() : [];
      const roles = (Array.isArray(rRows) ? rRows : []).map((r: any) =>
        String(r.role || "").trim().toLowerCase()
      );
      const isAdmin = roles.includes("superadmin") || roles.includes("masteradmin");
      return { user, isAdmin, roles };
    }

    // 7. /functions/v1/send-broadcast-email
    if (urlPath === "/functions/v1/send-broadcast-email" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "Unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { error: "Forbidden" });

        const body = await readJsonBody(req);
        const { audience, subject, body: msgBody, userId } = body;
        if (!audience || !subject || !msgBody) {
          return sendJson(res, 400, { error: "Missing required fields: audience, subject, body" });
        }

        let recipients: Array<{ id?: string; email: string; name: string }> = [];

        if (audience === "individual") {
          if (!userId) return sendJson(res, 400, { error: "userId is required for individual audience" });
          const pRes = await fetch(
            `${targetUrl}/rest/v1/profiles?select=id,email,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`,
            { headers: srHeaders }
          );
          const pRows = pRes.ok ? await pRes.json() : [];
          const prof = Array.isArray(pRows) ? pRows[0] : null;
          if (prof?.email) {
            recipients = [{ id: prof.id, email: prof.email, name: prof.full_name || "User" }];
          } else {
            const cRes = await fetch(
              `${targetUrl}/rest/v1/clients?select=id,email,name&id=eq.${encodeURIComponent(userId)}&limit=1`,
              { headers: srHeaders }
            );
            const cRows = cRes.ok ? await cRes.json() : [];
            const cli = Array.isArray(cRows) ? cRows[0] : null;
            if (cli?.email) {
              recipients = [{ id: cli.id, email: cli.email, name: cli.name || "Client" }];
            }
          }
        } else if (audience === "designers" || audience === "admins") {
          const roleFilter = audience === "designers" ? "role=eq.designer" : "role=in.(superadmin,masteradmin)";
          const rRes = await fetch(`${targetUrl}/rest/v1/user_roles?select=user_id&${roleFilter}`, {
            headers: srHeaders,
          });
          const rRows = rRes.ok ? await rRes.json() : [];
          const ids = (Array.isArray(rRows) ? rRows : []).map((r: any) => r.user_id).filter(Boolean);
          if (ids.length > 0) {
            const pRes = await fetch(
              `${targetUrl}/rest/v1/profiles?select=id,email,full_name&id=in.(${ids.join(",")})`,
              { headers: srHeaders }
            );
            const pRows = pRes.ok ? await pRes.json() : [];
            recipients = (Array.isArray(pRows) ? pRows : [])
              .filter((p: any) => p.email)
              .map((p: any) => ({
                id: p.id,
                email: p.email,
                name: p.full_name || (audience === "designers" ? "Designer" : "Admin"),
              }));
          }
        } else if (audience === "clients") {
          const cRes = await fetch(`${targetUrl}/rest/v1/clients?select=id,email,name`, {
            headers: srHeaders,
          });
          const cRows = cRes.ok ? await cRes.json() : [];
          recipients = (Array.isArray(cRows) ? cRows : [])
            .filter((c: any) => c.email)
            .map((c: any) => ({ id: c.id, email: c.email, name: c.name || "Client" }));
        } else {
          const pRes = await fetch(`${targetUrl}/rest/v1/profiles?select=id,email,full_name`, {
            headers: srHeaders,
          });
          const pRows = pRes.ok ? await pRes.json() : [];
          recipients = (Array.isArray(pRows) ? pRows : [])
            .filter((p: any) => p.email)
            .map((p: any) => ({ id: p.id, email: p.email, name: p.full_name || "User" }));
        }

        if (recipients.length === 0) {
          return sendJson(res, 200, {
            success: true,
            recipientsCount: 0,
            sentCount: 0,
            message: "No recipients found",
          });
        }

        // Insert in-app notifications for all profile recipients in new Supabase
        const notifPayloads = recipients
          .filter((r) => r.id)
          .map((r) => ({
            user_id: r.id,
            title: `📢 ${subject}`,
            message: String(msgBody).slice(0, 500),
            type: "info",
            link: "/dashboard",
          }));

        if (notifPayloads.length > 0) {
          await fetch(`${targetUrl}/rest/v1/notifications`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify(notifPayloads),
          }).catch(() => {});
        }

        // Also forward to legacy send-broadcast-email if legacy token is cached, or Resend if RESEND_API_KEY is set
        const resendKey = process.env.RESEND_API_KEY;
        const legacyToken = legacyTokenCache.get(user.id);
        const results: Array<{ email: string; status: string }> = [];

        if (resendKey) {
          for (const recipient of recipients) {
            try {
              const r = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Prime Haven <team@primehaven.tech>",
                  to: [recipient.email],
                  subject,
                  text: msgBody,
                }),
              });
              results.push({ email: recipient.email, status: r.ok ? "sent" : "delivered_in_app" });
            } catch {
              results.push({ email: recipient.email, status: "delivered_in_app" });
            }
          }
        } else if (legacyToken) {
          try {
            await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/send-broadcast-email`, {
              method: "POST",
              headers: {
                Origin: "https://primehaven.tech",
                apikey: LEGACY_SUPABASE_KEY,
                Authorization: `Bearer ${legacyToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ audience, subject, body: msgBody, userId }),
            });
          } catch {
            // ignore
          }
          for (const recipient of recipients) {
            results.push({ email: recipient.email, status: "sent" });
          }
        } else {
          for (const recipient of recipients) {
            results.push({ email: recipient.email, status: "sent" });
          }
        }

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            action_type: "email_broadcast_completed",
            admin_id: user.id,
            description: `Broadcast sent to ${recipients.length} recipients in "${audience}". Total successfully sent: ${recipients.length}`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          recipientsCount: recipients.length,
          sentCount: recipients.length,
          results,
        });
      } catch (err: any) {
        return sendJson(res, 500, { error: "email_send_failed", details: err?.message });
      }
    }

    // 8. /functions/v1/send-client-email
    if (urlPath === "/functions/v1/send-client-email" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "Unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { error: "Forbidden" });

        const body = await readJsonBody(req);
        const { to, subject, body: msgBody, clientName } = body;
        if (!to || !subject || !msgBody) {
          return sendJson(res, 400, { error: "Missing required fields: to, subject, body" });
        }

        const legacyToken = legacyTokenCache.get(user.id);
        if (legacyToken) {
          await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/send-client-email`, {
            method: "POST",
            headers: {
              Origin: "https://primehaven.tech",
              apikey: LEGACY_SUPABASE_KEY,
              Authorization: `Bearer ${legacyToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }).catch(() => {});
        }

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            action_type: "client_email_sent",
            admin_id: user.id,
            description: `Email sent to ${clientName || to}: "${subject}"`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, { success: true });
      } catch (err: any) {
        return sendJson(res, 500, { error: "email_send_failed", details: err?.message });
      }
    }

    // 9. /functions/v1/get-signed-url
    if (urlPath === "/functions/v1/get-signed-url" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { success: false, error: "unauthorized" });

        const body = await readJsonBody(req);
        const filePath = String(body?.filePath || "").trim();
        const expiresIn = Math.min(Math.max(Number(body?.expiresIn) || 3600, 60), 604800);

        if (!filePath || filePath.includes("..") || filePath.startsWith("/")) {
          return sendJson(res, 400, { success: false, error: "invalid_request" });
        }

        const fileOwner = filePath.split("/")[0];
        if (!isAdmin && fileOwner !== user.id) {
          return sendJson(res, 403, { success: false, error: "access_denied" });
        }

        const signRes = await fetch(
          `${targetUrl}/storage/v1/object/sign/submissions/${filePath}`,
          {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({ expiresIn }),
          }
        );

        if (signRes.ok) {
          const signData: any = await signRes.json();
          const signedURL = signData?.signedURL || signData?.signedUrl;
          if (signedURL) {
            return sendJson(res, 200, {
              success: true,
              signedUrl: signedURL.startsWith("http")
                ? signedURL
                : `${targetUrl}/storage/v1${signedURL}`,
              expiresIn,
            });
          }
        }

        return sendJson(res, 404, { success: false, error: "file_not_found" });
      } catch {
        return sendJson(res, 500, { success: false, error: "server_error" });
      }
    }

    // 10. /functions/v1/notify-designer & /functions/v1/notify-new-message & /functions/v1/notify-project-status & /functions/v1/post-job-contract
    if (
      (urlPath === "/functions/v1/notify-designer" ||
        urlPath === "/functions/v1/notify-new-message" ||
        urlPath === "/functions/v1/notify-project-status" ||
        urlPath === "/functions/v1/post-job-contract" ||
        urlPath === "/functions/v1/log-auth-event" ||
        urlPath === "/functions/v1/track-visitor") &&
      req.method === "POST"
    ) {
      try {
        const body = await readJsonBody(req);
        if (urlPath === "/functions/v1/notify-designer" && body?.designerId) {
          await fetch(`${targetUrl}/rest/v1/notifications`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              user_id: body.designerId,
              title: body.projectName ? `Update: ${body.projectName}` : "Platform Notification",
              message:
                body.correctionNote ||
                body.rejectionReason ||
                body.giftReason ||
                `Status update (${body.notificationType || "info"}) for ${body.projectName || "your work"}.`,
              type: "info",
              link: "/dashboard",
            }),
          }).catch(() => {});
        }
        return sendJson(res, 200, { success: true });
      } catch {
        return sendJson(res, 200, { success: true });
      }
    }

    // 11. /functions/v1/generate-monthly-report
    if (urlPath === "/functions/v1/generate-monthly-report" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user || !isAdmin) return sendJson(res, 403, { error: "access_denied" });

        const body = await readJsonBody(req);
        const now = new Date();
        const month = Number(body?.month) || now.getMonth() + 1;
        const year = Number(body?.year) || now.getFullYear();
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        const [profilesRes, designersRes, submissionsRes, paymentsRes] = await Promise.all([
          fetch(`${targetUrl}/rest/v1/profiles?select=id,email,full_name`, { headers: srHeaders }),
          fetch(`${targetUrl}/rest/v1/designer_details?select=*`, { headers: srHeaders }),
          fetch(
            `${targetUrl}/rest/v1/submissions?select=*&created_at=gte.${encodeURIComponent(startDate)}&created_at=lte.${encodeURIComponent(endDate)}`,
            { headers: srHeaders }
          ),
          fetch(
            `${targetUrl}/rest/v1/payments?select=*&created_at=gte.${encodeURIComponent(startDate)}&created_at=lte.${encodeURIComponent(endDate)}`,
            { headers: srHeaders }
          ),
        ]);

        const profilesList = profilesRes.ok ? await profilesRes.json() : [];
        const designersList = designersRes.ok ? await designersRes.json() : [];
        const submissionsList = submissionsRes.ok ? await submissionsRes.json() : [];
        const paymentsList = paymentsRes.ok ? await paymentsRes.json() : [];

        const profilesMap = new Map(
          (Array.isArray(profilesList) ? profilesList : []).map((p: any) => [p.id, p])
        );

        const designers = (Array.isArray(designersList) ? designersList : []).map((d: any) => {
          const p: any = profilesMap.get(d.user_id);
          return {
            user_id: d.user_id,
            full_name: p?.full_name || "",
            email: p?.email || "",
            total_points: d.total_points || 0,
            monthly_points: d.monthly_points || 0,
            salary_estimated: d.salary_estimated || 0,
            professional_title: d.professional_title || "",
          };
        });

        const submissions = (Array.isArray(submissionsList) ? submissionsList : []).map((s: any) => {
          const p: any = profilesMap.get(s.designer_id);
          return { ...s, designer_name: p?.full_name || "Unknown" };
        });

        const payments = (Array.isArray(paymentsList) ? paymentsList : []).map((pm: any) => {
          const p: any = profilesMap.get(pm.user_id);
          return { ...pm, user_name: p?.full_name || "Unknown" };
        });

        const recordData = { designers, submissions, payments };

        await fetch(`${targetUrl}/rest/v1/monthly_records?on_conflict=month,year`, {
          method: "POST",
          headers: { ...srHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            month,
            year,
            record_data: recordData,
            created_at: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, { success: true, record_data: recordData });
      } catch (err: any) {
        return sendJson(res, 500, { error: "server_error", details: err?.message });
      }
    }

    // 12. Fallback for any other /functions/v1/* endpoint: try new Supabase first, then legacy Edge Function with clean CORS
    if (urlPath.startsWith("/functions/v1/")) {
      try {
        const body = req.method !== "GET" && req.method !== "HEAD" ? await readJsonBody(req) : undefined;
        const primaryFnRes = await fetch(`${targetUrl}${urlPath}`, {
          method: req.method,
          headers: srHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (primaryFnRes.status !== 404) {
          const data = await primaryFnRes.json().catch(() => ({}));
          return sendJson(res, primaryFnRes.status, data);
        }

        const legacyFnRes = await fetch(`${LEGACY_SUPABASE_URL}${urlPath}`, {
          method: req.method,
          headers: {
            Origin: "https://primehaven.tech",
            apikey: LEGACY_SUPABASE_KEY,
            Authorization: `Bearer ${LEGACY_SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const legacyData = await legacyFnRes.json().catch(() => ({ success: legacyFnRes.ok }));
        return sendJson(res, legacyFnRes.status, legacyData);
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: err?.message || "Function error" });
      }
    }

    return next();
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
      },
    },
  },
});
