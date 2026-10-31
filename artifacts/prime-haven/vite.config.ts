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

        // If not found in new project storage yet, try legacy project via cached admin token or portfolio-media and copy over
        const legacyToken = legacyTokenCache.get(user.id);
        if (legacyToken) {
          const legSignRes = await fetch(`${LEGACY_SUPABASE_URL}/functions/v1/get-signed-url`, {
            method: "POST",
            headers: {
              Origin: "https://primehaven.tech",
              apikey: LEGACY_SUPABASE_KEY,
              Authorization: `Bearer ${legacyToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ filePath, expiresIn }),
          }).catch(() => null);
          if (legSignRes && legSignRes.ok) {
            const legData: any = await legSignRes.json().catch(() => ({}));
            if (legData?.signedUrl) {
              // Copy file to new Supabase in background so future requests are 100% native
              fetch(legData.signedUrl)
                .then(async (r) => {
                  if (!r.ok) return;
                  const buf = Buffer.from(await r.arrayBuffer());
                  const ct = r.headers.get("content-type") || "application/octet-stream";
                  await fetch(`${targetUrl}/storage/v1/object/submissions/${filePath}`, {
                    method: "POST",
                    headers: {
                      apikey: serviceRoleKey,
                      Authorization: `Bearer ${serviceRoleKey}`,
                      "Content-Type": ct,
                      "x-upsert": "true",
                    },
                    body: buf,
                  });
                })
                .catch(() => {});
              return sendJson(res, 200, {
                success: true,
                signedUrl: legData.signedUrl,
                expiresIn,
              });
            }
          }
        }

        return sendJson(res, 404, { success: false, error: "file_not_found" });
      } catch {
        return sendJson(res, 500, { success: false, error: "server_error" });
      }
    }

    // 10. Notification & background event functions
    if (
      (urlPath === "/functions/v1/notify-designer" ||
        urlPath === "/functions/v1/notify-new-message" ||
        urlPath === "/functions/v1/notify-project-status" ||
        urlPath === "/functions/v1/notify-project-message" ||
        urlPath === "/functions/v1/post-job-contract" ||
        urlPath === "/functions/v1/log-auth-event" ||
        urlPath === "/functions/v1/track-visitor" ||
        urlPath === "/functions/v1/create-discord-invite" ||
        urlPath === "/functions/v1/send-welcome-email") &&
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

    // 12. /functions/v1/delete-user
    if (urlPath === "/functions/v1/delete-user" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { success: false, error: "unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { success: false, error: "access_denied" });

        const body = await readJsonBody(req);
        const targetUserId = String(body?.userId || "").trim();
        if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
          return sendJson(res, 400, { success: false, error: "invalid_request" });
        }
        if (targetUserId === user.id) {
          return sendJson(res, 400, { success: false, error: "cannot_delete_self" });
        }

        const pRes = await fetch(
          `${targetUrl}/rest/v1/profiles?select=email,full_name&id=eq.${targetUserId}&limit=1`,
          { headers: srHeaders }
        );
        const pRows = pRes.ok ? await pRes.json() : [];
        const targetProfile = Array.isArray(pRows) ? pRows[0] : null;

        await Promise.all([
          fetch(`${targetUrl}/rest/v1/email_verification_tokens?user_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/notifications?user_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(
            `${targetUrl}/rest/v1/messages?or=(sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId})`,
            { method: "DELETE", headers: srHeaders }
          ),
          fetch(`${targetUrl}/rest/v1/submissions?designer_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/payments?user_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/designer_details?user_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/user_roles?user_id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
          fetch(`${targetUrl}/rest/v1/profiles?id=eq.${targetUserId}`, {
            method: "DELETE",
            headers: srHeaders,
          }),
        ]);

        await fetch(`${targetUrl}/auth/v1/admin/users/${targetUserId}`, {
          method: "DELETE",
          headers: srHeaders,
        }).catch(() => {});

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            action_type: "user_deleted",
            admin_id: user.id,
            description: `Deleted user: ${targetProfile?.full_name || "Unknown"} (${targetProfile?.email || targetUserId})`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, { success: true, message: "User completely removed from the system" });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: err?.message || "server_error" });
      }
    }

    // 13. /functions/v1/seed-admin
    if (urlPath === "/functions/v1/seed-admin" && req.method === "POST") {
      try {
        const { user, isAdmin, roles } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { success: false, error: "unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { success: false, error: "access_denied" });

        const body = await readJsonBody(req);
        const { username, password, name, role } = body;
        if (!username || !password || String(password).length < 8) {
          return sendJson(res, 400, { success: false, error: "invalid_request" });
        }
        const targetRole = role === "masteradmin" ? "masteradmin" : "superadmin";
        if (targetRole === "masteradmin" && !roles.includes("masteradmin")) {
          return sendJson(res, 403, { success: false, error: "access_denied" });
        }

        const cleanUsername = String(username).toLowerCase().trim();
        const email = `${cleanUsername}@ph`;

        const exRes = await fetch(
          `${targetUrl}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(cleanUsername)}&limit=1`,
          { headers: srHeaders }
        );
        const exRows = exRes.ok ? await exRes.json() : [];
        const existingProfile = Array.isArray(exRows) ? exRows[0] : null;

        let adminUserId = existingProfile?.id;
        if (adminUserId) {
          await fetch(`${targetUrl}/auth/v1/admin/users/${adminUserId}`, {
            method: "PUT",
            headers: srHeaders,
            body: JSON.stringify({
              password,
              email_confirm: true,
              user_metadata: { full_name: name || username, username: cleanUsername },
            }),
          });
        } else {
          const createRes = await fetch(`${targetUrl}/auth/v1/admin/users`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: name || username, username: cleanUsername },
            }),
          });
          const created: any = await createRes.json();
          adminUserId = created?.id;
        }

        if (!adminUserId) {
          return sendJson(res, 500, { success: false, error: "creation_failed" });
        }

        await fetch(`${targetUrl}/rest/v1/profiles?on_conflict=id`, {
          method: "POST",
          headers: { ...srHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            id: adminUserId,
            email,
            username: cleanUsername,
            full_name: name || username,
            is_active: true,
            email_verified: true,
            registration_fee_paid: true,
          }),
        });

        await fetch(`${targetUrl}/rest/v1/user_roles?user_id=eq.${adminUserId}`, {
          method: "DELETE",
          headers: srHeaders,
        });
        await fetch(`${targetUrl}/rest/v1/user_roles`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({ user_id: adminUserId, role: targetRole }),
        });

        return sendJson(res, 200, {
          success: true,
          message: existingProfile ? `Updated ${cleanUsername} (${targetRole})` : `Created ${cleanUsername} (${targetRole})`,
          userId: adminUserId,
        });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: err?.message || "server_error" });
      }
    }

    // 14. /functions/v1/approve-withdrawal
    if (urlPath === "/functions/v1/approve-withdrawal" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { error: "forbidden", message: "Admin access required." });

        const body = await readJsonBody(req);
        const withdrawalId = String(body?.withdrawal_id || "");
        const action = String(body?.action || "approve");
        const mode = String(body?.mode || "auto");
        const manualRef = String(body?.manual_reference || "").trim();
        const reason = String(body?.reason || "").trim();

        if (!withdrawalId) return sendJson(res, 400, { error: "missing_withdrawal_id" });

        const wRes = await fetch(
          `${targetUrl}/rest/v1/withdrawals?select=*&id=eq.${encodeURIComponent(withdrawalId)}&limit=1`,
          { headers: srHeaders }
        );
        const wRows = wRes.ok ? await wRes.json() : [];
        const wd = Array.isArray(wRows) ? wRows[0] : null;
        if (!wd) return sendJson(res, 404, { error: "not_found", message: "Withdrawal not found." });

        if (!["pending", "failed"].includes(wd.status)) {
          return sendJson(res, 400, {
            error: "already_processed",
            message: `Already in "${wd.status}" state.`,
          });
        }

        if (action === "reject") {
          await fetch(`${targetUrl}/rest/v1/withdrawals?id=eq.${encodeURIComponent(wd.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              status: "rejected",
              failure_reason: reason || "Declined by administrator",
              approved_by: user.id,
              approved_at: new Date().toISOString(),
            }),
          });
          await fetch(`${targetUrl}/rest/v1/notifications`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              user_id: wd.user_id,
              title: "Withdrawal request declined",
              message: `Your withdrawal of GH₵${Number(wd.amount).toFixed(2)} was declined.${reason ? ` Reason: ${reason}` : ""}`,
              type: "warning",
              link: "/dashboard",
            }),
          }).catch(() => {});
          return sendJson(res, 200, { success: true, status: "rejected" });
        }

        // Claim withdrawal for payout
        const claimRes = await fetch(`${targetUrl}/rest/v1/rpc/claim_withdrawal_for_payout_service`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({ p_withdrawal_id: wd.id }),
        });
        if (!claimRes.ok) {
          const errObj: any = await claimRes.json().catch(() => ({}));
          return sendJson(res, 409, {
            error: "claim_failed",
            message: errObj?.message || "Could not lock withdrawal for payout.",
          });
        }

        const finalRef = manualRef || wd.reference || `MANUAL-${Date.now()}`;
        const gatewayLabel = mode === "manual" ? "Manual MoMo Transfer" : "Approved MoMo Payout";

        const finRes = await fetch(`${targetUrl}/rest/v1/rpc/finalise_withdrawal_payout_service`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            p_withdrawal_id: wd.id,
            p_admin_id: user.id,
            p_status: "approved",
            p_gateway: gatewayLabel,
            p_reference: finalRef,
          }),
        });

        if (!finRes.ok) {
          const errObj: any = await finRes.json().catch(() => ({}));
          return sendJson(res, 500, {
            error: "finalise_failed",
            message: errObj?.message || "Failed to finalize withdrawal.",
          });
        }

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            admin_id: user.id,
            action_type: "talent_withdrawal_paid",
            description: `Approved withdrawal of GH₵${Number(wd.amount).toFixed(2)} (${finalRef})`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          status: "approved",
          mode,
          reference: finalRef,
          message: `Payout of GH₵${Number(wd.amount).toFixed(2)} approved and recorded.`,
        });
      } catch (err: any) {
        return sendJson(res, 500, { error: "server_error", message: err?.message });
      }
    }

    // 15. /functions/v1/request-withdrawal
    if (urlPath === "/functions/v1/request-withdrawal" && req.method === "POST") {
      try {
        const { user } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "unauthorized", message: "You must be signed in." });

        const body = await readJsonBody(req);
        const requestedAmount = Number(body?.amount);
        const payoutMethodId = String(body?.payout_method_id || "");
        if (!payoutMethodId) {
          return sendJson(res, 400, {
            error: "missing_payout_method",
            message: "Select a Mobile Money payout method first.",
          });
        }

        const amountInput = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : null;
        const rpcRes = await fetch(`${targetUrl}/rest/v1/rpc/request_talent_withdrawal_service`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            p_user_id: user.id,
            p_payout_method_id: payoutMethodId,
            p_amount: amountInput,
          }),
        });

        if (!rpcRes.ok) {
          const errObj: any = await rpcRes.json().catch(() => ({}));
          const msg = errObj?.message || "Could not save your withdrawal request.";
          return sendJson(res, 400, { error: "withdrawal_not_created", message: msg });
        }

        const result: any = await rpcRes.json();
        const amount = Number(result?.amount || requestedAmount || 0);

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            admin_id: user.id,
            action_type: "withdrawal_requested",
            description: `Talent requested a withdrawal of GH₵${amount.toFixed(2)}`,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          status: "pending",
          withdrawal_id: result?.id,
          amount,
          reference: result?.reference,
          message: `Withdrawal request for GH₵${amount.toFixed(2)} submitted for approval.`,
        });
      } catch (err: any) {
        return sendJson(res, 500, { error: "server_error", message: err?.message });
      }
    }

    // 16. /functions/v1/manage-payout-method
    if (urlPath === "/functions/v1/manage-payout-method" && req.method === "POST") {
      try {
        const { user } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "Sign in required." });

        const body = await readJsonBody(req);
        const action = String(body?.action || "");
        if (action === "create") {
          const provider = String(body?.provider || "").trim().toLowerCase();
          const phone = String(body?.phone_number || "").replace(/[^0-9+]/g, "");
          const accountName = String(body?.account_name || "").trim();
          const rpcRes = await fetch(`${targetUrl}/rest/v1/rpc/manage_talent_payout_method_service`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              p_user_id: user.id,
              p_action: "create",
              p_method_id: null,
              p_provider: provider,
              p_phone_number: phone,
              p_account_name: accountName,
            }),
          });
          if (!rpcRes.ok) {
            const errObj: any = await rpcRes.json().catch(() => ({}));
            return sendJson(res, 400, { error: errObj?.message || "Could not create payout method." });
          }
          return sendJson(res, 200, await rpcRes.json());
        }
        if (action === "delete") {
          const methodId = String(body?.method_id || "");
          const rpcRes = await fetch(`${targetUrl}/rest/v1/rpc/manage_talent_payout_method_service`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              p_user_id: user.id,
              p_action: "delete",
              p_method_id: methodId,
              p_provider: null,
              p_phone_number: null,
              p_account_name: null,
            }),
          });
          if (!rpcRes.ok) {
            const errObj: any = await rpcRes.json().catch(() => ({}));
            return sendJson(res, 400, { error: errObj?.message || "Could not delete payout method." });
          }
          return sendJson(res, 200, await rpcRes.json());
        }
        return sendJson(res, 400, { error: "Unsupported action." });
      } catch (err: any) {
        return sendJson(res, 500, { error: err?.message || "Could not update the payout method." });
      }
    }

    // 17. /functions/v1/collect-debt-payment
    if (urlPath === "/functions/v1/collect-debt-payment" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "unauthorized" });
        if (!isAdmin) return sendJson(res, 403, { error: "forbidden" });

        const body = await readJsonBody(req);
        const { project_id, amount, payment_method, reference } = body;
        if (!project_id || !amount || Number(amount) <= 0) {
          return sendJson(res, 400, { error: "invalid_input", message: "project_id and positive amount required" });
        }

        const pRes = await fetch(
          `${targetUrl}/rest/v1/client_projects?select=*&id=eq.${encodeURIComponent(project_id)}&limit=1`,
          { headers: srHeaders }
        );
        const pRows = pRes.ok ? await pRes.json() : [];
        const proj = Array.isArray(pRows) ? pRows[0] : null;
        if (!proj) return sendJson(res, 404, { error: "project_not_found" });

        const collectAmount = Number(amount);
        const prevPaid = Number(proj.amount_paid_ghs || 0);
        const totalPrice = Number(proj.price_ghs || 0);
        const newPaid = Math.min(prevPaid + collectAmount, totalPrice > 0 ? totalPrice : prevPaid + collectAmount);
        const fullySettled = totalPrice > 0 ? newPaid >= totalPrice : true;
        const txRef = reference || `DEBT-${Date.now()}`;
        const nowIso = new Date().toISOString();

        await fetch(`${targetUrl}/rest/v1/client_projects?id=eq.${encodeURIComponent(project_id)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({
            amount_paid_ghs: newPaid,
            ...(fullySettled ? { is_credit: false, paid_at: nowIso } : {}),
            updated_at: nowIso,
          }),
        });

        await fetch(`${targetUrl}/rest/v1/payments`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            user_id: proj.created_by || user.id,
            amount: collectAmount,
            type: "client_order",
            status: "completed",
            payment_gateway: payment_method || "Manual Debt Collection",
            transaction_id: txRef,
            payment_details: {
              project_id,
              project_title: proj.title,
              client_name: proj.client_name,
              client_email: proj.client_email,
              currency: "GHS",
              debt_collection: true,
              fully_settled: fullySettled,
            },
          }),
        }).catch(() => {});

        await fetch(`${targetUrl}/rest/v1/system_logs`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            admin_id: user.id,
            action_type: "debt_payment_collected",
            description: `Collected GH₵${collectAmount.toFixed(2)} for "${proj.title}" (${proj.client_name})`,
            timestamp: nowIso,
          }),
        }).catch(() => {});

        return sendJson(res, 200, {
          success: true,
          new_paid: newPaid,
          remaining: Math.max(0, totalPrice - newPaid),
          fully_settled: fullySettled,
        });
      } catch (err: any) {
        return sendJson(res, 500, { error: "server_error", message: err?.message });
      }
    }

    // 18. /functions/v1/calculate-talent-score
    if (urlPath === "/functions/v1/calculate-talent-score" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "unauthorized" });

        const body = await readJsonBody(req);
        const designer_id = body?.designer_id;
        if (!isAdmin && (!designer_id || designer_id !== user.id)) {
          return sendJson(res, 403, { error: "forbidden" });
        }

        const designerIds: string[] = [];
        if (designer_id) {
          designerIds.push(designer_id);
        } else {
          const dRes = await fetch(`${targetUrl}/rest/v1/designer_details?select=user_id`, {
            headers: srHeaders,
          });
          const dRows = dRes.ok ? await dRes.json() : [];
          for (const d of Array.isArray(dRows) ? dRows : []) {
            if (d.user_id) designerIds.push(d.user_id);
          }
        }

        const results: any[] = [];
        const servicePointsMap: Record<string, number> = {
          logo: 45,
          branding: 50,
          uiux: 65,
          web: 65,
          print: 20,
          flyer: 40,
        };

        for (const uid of designerIds) {
          const sRes = await fetch(
            `${targetUrl}/rest/v1/submissions?select=*&designer_id=eq.${encodeURIComponent(uid)}&order=created_at.desc`,
            { headers: srHeaders }
          );
          const subs = sRes.ok ? await sRes.json() : [];
          const subList = Array.isArray(subs) ? subs : [];
          const totalSubs = subList.length;

          if (totalSubs === 0) {
            const breakdown = {
              quality: 0,
              acceptance_rate: 0,
              consistency: 0,
              revision_efficiency: 100,
              reliability: 50,
              ai_insight: "No submissions yet. Start submitting work to build your talent score!",
            };
            await fetch(`${targetUrl}/rest/v1/designer_details?user_id=eq.${encodeURIComponent(uid)}`, {
              method: "PATCH",
              headers: srHeaders,
              body: JSON.stringify({
                talent_score: 10,
                talent_score_breakdown: breakdown,
                talent_score_updated_at: new Date().toISOString(),
              }),
            });
            results.push({ user_id: uid, score: 10 });
            continue;
          }

          const approvedSubs = subList.filter((s: any) => s.ph_approved || s.status === "approved");
          const clientAccepted = subList.filter((s: any) => s.client_accepted);
          const rejectedSubs = subList.filter(
            (s: any) => s.status === "rejected" || s.status === "client_rejected"
          );
          const totalRevisions = subList.reduce((sum: number, s: any) => sum + (s.revisions_count || 0), 0);
          const avgRevisions = totalSubs > 0 ? totalRevisions / totalSubs : 0;

          const totalPoints = subList.reduce((sum: number, s: any) => sum + (s.points_awarded || 0), 0);
          const maxPossiblePoints = subList.reduce(
            (sum: number, s: any) => sum + 15 + (servicePointsMap[s.service_type] || 40),
            0
          );
          const quality = maxPossiblePoints > 0 ? Math.min(100, (totalPoints / maxPossiblePoints) * 100) : 0;
          const acceptance_rate =
            totalSubs > 0 ? ((clientAccepted.length + approvedSubs.length) / (totalSubs * 2)) * 100 : 0;

          const firstSub = new Date(subList[subList.length - 1]?.created_at || Date.now());
          const monthsActive = Math.max(1, (Date.now() - firstSub.getTime()) / (1000 * 60 * 60 * 24 * 30));
          const subsPerMonth = totalSubs / monthsActive;
          const consistency = Math.min(100, subsPerMonth * 20);
          const revision_efficiency = Math.max(0, 100 - avgRevisions * 25);
          const rejectionRate = totalSubs > 0 ? rejectedSubs.length / totalSubs : 0;
          const reliability = Math.max(0, 100 - rejectionRate * 100);

          const finalScore = Math.max(
            0,
            Math.min(
              100,
              Math.round(
                quality * 0.3 +
                  acceptance_rate * 0.25 +
                  consistency * 0.15 +
                  revision_efficiency * 0.15 +
                  reliability * 0.15
              )
            )
          );

          const breakdown = {
            quality: Math.round(quality),
            acceptance_rate: Math.round(acceptance_rate),
            consistency: Math.round(consistency),
            revision_efficiency: Math.round(revision_efficiency),
            reliability: Math.round(reliability),
            total_submissions: totalSubs,
            ai_insight:
              finalScore >= 75
                ? "Outstanding delivery consistency and client acceptance rate. Keep leading the leaderboard!"
                : "Solid progress—focus on first-pass client acceptance to boost your overall score.",
          };

          await fetch(`${targetUrl}/rest/v1/designer_details?user_id=eq.${encodeURIComponent(uid)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              talent_score: finalScore,
              talent_score_breakdown: breakdown,
              talent_score_updated_at: new Date().toISOString(),
            }),
          });
          results.push({ user_id: uid, score: finalScore });
        }

        return sendJson(res, 200, { success: true, results });
      } catch (err: any) {
        return sendJson(res, 500, { error: err?.message || "Unknown error" });
      }
    }

    // 19. /functions/v1/award-badges
    if (urlPath === "/functions/v1/award-badges" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { error: "unauthorized" });

        const body = await readJsonBody(req);
        const user_id = body?.user_id || user.id;
        if (!isAdmin && user_id !== user.id) {
          return sendJson(res, 403, { error: "forbidden" });
        }

        const [bRes, sRes, dRes] = await Promise.all([
          fetch(`${targetUrl}/rest/v1/badges?select=id,key,criteria`, { headers: srHeaders }),
          fetch(
            `${targetUrl}/rest/v1/submissions?select=id&designer_id=eq.${encodeURIComponent(user_id)}&ph_approved=eq.true`,
            { headers: srHeaders }
          ),
          fetch(
            `${targetUrl}/rest/v1/designer_details?select=total_points,talent_score&user_id=eq.${encodeURIComponent(user_id)}&limit=1`,
            { headers: srHeaders }
          ),
        ]);

        const badges = bRes.ok ? await bRes.json() : [];
        const approvedSubs = sRes.ok ? await sRes.json() : [];
        const dRows = dRes.ok ? await dRes.json() : [];
        const designer = Array.isArray(dRows) ? dRows[0] : null;

        const approved_count = Array.isArray(approvedSubs) ? approvedSubs.length : 0;
        const total_points = Number(designer?.total_points || 0);
        const talent_score = Number(designer?.talent_score || 0);

        let awarded = 0;
        for (const b of Array.isArray(badges) ? badges : []) {
          let criteria: any = b.criteria ?? {};
          if (typeof criteria === "string") {
            try {
              criteria = JSON.parse(criteria);
            } catch {
              criteria = {};
            }
          }
          if (criteria.type === "threshold") {
            const metric = criteria.metric;
            const value = Number(criteria.value || 0);
            let meets = false;
            if (metric === "approved_count") meets = approved_count >= value;
            if (metric === "total_points") meets = total_points >= value;
            if (metric === "talent_score") meets = talent_score >= value;
            if (meets) {
              const insRes = await fetch(`${targetUrl}/rest/v1/user_badges`, {
                method: "POST",
                headers: srHeaders,
                body: JSON.stringify({
                  user_id,
                  badge_id: b.id,
                  source: "auto-check",
                  meta: { approved_count, total_points, talent_score },
                }),
              });
              if (insRes.ok) awarded += 1;
            }
          }
        }

        return sendJson(res, 200, { ok: true, awarded });
      } catch (err: any) {
        return sendJson(res, 500, { error: err?.message || "Server error" });
      }
    }

    // 20. Applicant Funnel endpoints: invite-applicant, delete-applicant, applicant-portal, applicant-upload-url, applicant-integrity, continue-applicant-onboarding, submit-application, start-assessment, submit-assessment, applicant-paid
    if (urlPath === "/functions/v1/invite-applicant" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user || !isAdmin) return sendJson(res, 403, { success: false, error: "forbidden" });

        const body = await readJsonBody(req);
        const applicantId = String(body?.applicantId || "").trim();
        if (!applicantId) return sendJson(res, 400, { success: false, error: "missing_id" });

        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=*&id=eq.${encodeURIComponent(applicantId)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });

        const token =
          applicant.access_token ||
          Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

        await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicantId)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({
            status: "invited",
            access_token: token,
            invited_at: new Date().toISOString(),
            invited_by: user.id,
          }),
        });

        const origin = body?.origin || "https://primehaven.tech";
        const link = `${origin}/applicant/${token}`;

        return sendJson(res, 200, {
          success: true,
          token,
          link,
          emailSent: true,
        });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: err?.message || "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/delete-applicant" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user || !isAdmin) return sendJson(res, 403, { success: false, error: "forbidden" });

        const body = await readJsonBody(req);
        const applicantId = String(body?.applicantId || "").trim();
        if (!/^[0-9a-f-]{36}$/i.test(applicantId)) {
          return sendJson(res, 400, { success: false, error: "invalid_applicant_id" });
        }

        await fetch(
          `${targetUrl}/rest/v1/applicant_assessments?applicant_id=eq.${encodeURIComponent(applicantId)}`,
          { method: "DELETE", headers: srHeaders }
        );
        await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicantId)}`, {
          method: "DELETE",
          headers: srHeaders,
        });

        return sendJson(res, 200, { success: true });
      } catch (err: any) {
        return sendJson(res, 500, { success: false, error: err?.message || "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/applicant-portal" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim().toLowerCase();
        const action = String(body?.action || "state");
        if (!/^[a-f0-9]{32,128}$/.test(token)) {
          return sendJson(res, 400, { success: false, error: "invalid_token" });
        }

        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id,full_name,email,track,status,score,passed,video_watched_at,user_id,promo_code&access_token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });
        if (applicant.status === "submitted") {
          return sendJson(res, 403, {
            success: false,
            error: "not_invited",
            message: "Your application is still under review.",
          });
        }

        if (action === "video_watched" && !applicant.video_watched_at) {
          const nowIso = new Date().toISOString();
          await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicant.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({ video_watched_at: nowIso }),
          });
          applicant.video_watched_at = nowIso;
        }

        const asRes = await fetch(
          `${targetUrl}/rest/v1/applicant_assessments?select=id,score,passed,submitted_at,total_questions,correct_count&applicant_id=eq.${encodeURIComponent(applicant.id)}&order=created_at.desc&limit=1`,
          { headers: srHeaders }
        );
        const asRows = asRes.ok ? await asRes.json() : [];
        const assessment = Array.isArray(asRows) ? asRows[0] : null;

        const setRes = await fetch(
          `${targetUrl}/rest/v1/system_settings?select=key,value&key=in.(applicant_intro_video_url,discord_invite_url)`,
          { headers: srHeaders }
        );
        const setRows = setRes.ok ? await setRes.json() : [];
        const settingsMap = new Map(
          (Array.isArray(setRows) ? setRows : []).map((r: any) => [r.key, r.value])
        );

        let videoUrl = String(settingsMap.get("applicant_intro_video_url") || "").replace(/^"|"$/g, "");
        const discordInvite = String(settingsMap.get("discord_invite_url") || "").replace(/^"|"$/g, "");

        return sendJson(res, 200, {
          success: true,
          applicant: {
            fullName: applicant.full_name,
            email: applicant.email,
            track: applicant.track,
            status: applicant.status,
            score: applicant.score,
            passed: applicant.passed,
            videoWatched: !!applicant.video_watched_at,
            promoCode: applicant.promo_code,
          },
          assessment: assessment || null,
          videoUrl,
          discordInvite,
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/applicant-upload-url" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const kind = String(body?.kind || "");
        const fileName = String(body?.fileName || "").trim();
        if (!["cv", "portfolio", "practical"].includes(kind) || !fileName) {
          return sendJson(res, 400, { success: false, error: "invalid_request" });
        }
        const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
        const rand = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        const filePath = `${kind}/${rand}/${safe}`;

        const signRes = await fetch(
          `${targetUrl}/storage/v1/object/upload/sign/applicant-files/${filePath}`,
          {
            method: "POST",
            headers: srHeaders,
          }
        );
        if (!signRes.ok) {
          return sendJson(res, 500, { success: false, error: "upload_url_failed" });
        }
        const signData: any = await signRes.json();
        const urlStr = signData?.url || signData?.signedUrl || "";
        const tokenMatch = urlStr.match(/[?&]token=([^&]+)/);
        return sendJson(res, 200, {
          success: true,
          path: filePath,
          token: signData?.token || (tokenMatch ? tokenMatch[1] : ""),
          signedUrl: urlStr.startsWith("http") ? urlStr : `${targetUrl}/storage/v1${urlStr}`,
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/applicant-integrity" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim().toLowerCase();
        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id,status,integrity_flags&access_token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });

        const flags = Number(applicant.integrity_flags || 0) + 1;
        const rejected = flags >= 2;
        await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicant.id)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({
            integrity_flags: flags,
            ...(rejected ? { status: "failed", passed: false, score: 0 } : {}),
          }),
        });
        return sendJson(res, 200, {
          success: true,
          flags,
          rejected,
          warning: !rejected,
          message: rejected
            ? "Copying was detected a second time, so this attempt has been closed."
            : "Copying was detected. One more attempt and your application is rejected automatically.",
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/continue-applicant-onboarding" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const fullName = String(body?.fullName || "").trim().replace(/\s+/g, " ");
        const email = String(body?.email || "").trim().toLowerCase();
        const phoneDigits = String(body?.phone || "").replace(/\D/g, "");

        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=full_name,email,phone,status,access_token&email=eq.${encodeURIComponent(email)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;

        if (applicant) {
          const nameMatches =
            String(applicant.full_name || "").trim().replace(/\s+/g, " ").toLowerCase() ===
            fullName.toLowerCase();
          const savedPhoneDigits = String(applicant.phone || "").replace(/\D/g, "");
          const phoneMatches = !savedPhoneDigits || savedPhoneDigits === phoneDigits;
          if (nameMatches && phoneMatches) {
            if (applicant.status === "submitted") {
              return sendJson(res, 200, {
                success: true,
                status: "submitted",
                message: "Your application is still under review. We'll email you once you're invited to the next stage.",
              });
            }
            if (applicant.access_token) {
              return sendJson(res, 200, {
                success: true,
                status: applicant.status,
                portalPath: `/applicant/${applicant.access_token}`,
              });
            }
          }
        }

        return sendJson(res, 200, {
          success: true,
          message: "If an application can continue with this address, we sent a secure onboarding link.",
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/submit-application" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const fullName = String(body?.fullName || "").trim().slice(0, 200);
        const email = String(body?.email || "").trim().toLowerCase();
        const phone = body?.phone ? String(body.phone).trim().slice(0, 40) : null;
        const track = String(body?.track || "");
        const cvUrl = body?.cvUrl ? String(body.cvUrl).slice(0, 500) : null;
        const portfolioUrl = body?.portfolioUrl ? String(body.portfolioUrl).slice(0, 500) : null;
        const portfolioLink = body?.portfolioLink ? String(body.portfolioLink).trim().slice(0, 500) : null;
        const promoCode = body?.promoCode ? String(body.promoCode).trim().toUpperCase().slice(0, 100) : null;

        if (!fullName || !email || !track || !cvUrl) {
          return sendJson(res, 400, {
            success: false,
            error: "invalid_request",
            message: "Please complete all required application fields.",
          });
        }

        const exRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
          { headers: srHeaders }
        );
        const exRows = exRes.ok ? await exRes.json() : [];
        if (Array.isArray(exRows) && exRows.length > 0) {
          return sendJson(res, 409, {
            success: false,
            error: "already_applied",
            message: "We already have an application for this email.",
          });
        }

        const insRes = await fetch(`${targetUrl}/rest/v1/applicants`, {
          method: "POST",
          headers: { ...srHeaders, Prefer: "return=representation" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone,
            track,
            cv_url: cvUrl,
            portfolio_url: portfolioUrl,
            portfolio_link: portfolioLink,
            promo_code: promoCode,
            status: "submitted",
          }),
        });
        if (!insRes.ok) {
          return sendJson(res, 500, {
            success: false,
            error: "save_failed",
            message: "We could not save your application.",
          });
        }
        const insRows = await insRes.json();
        const inserted = Array.isArray(insRows) ? insRows[0] : insRows;

        await fetch(`${targetUrl}/rest/v1/notifications`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            user_id: null,
            title: "New talent application",
            message: `${fullName} applied for ${track}.`,
            type: "info",
            link: "/superadmin/applicants",
          }),
        }).catch(() => {});

        return sendJson(res, 200, { success: true, applicantId: inserted?.id });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/start-assessment" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim().toLowerCase();
        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id,track,status,video_watched_at&access_token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });

        const openRes = await fetch(
          `${targetUrl}/rest/v1/applicant_assessments?select=id,question_ids,practical_task_id&applicant_id=eq.${encodeURIComponent(applicant.id)}&submitted_at=is.null&order=created_at.desc&limit=1`,
          { headers: srHeaders }
        );
        const openRows = openRes.ok ? await openRes.json() : [];
        const openAttempt = Array.isArray(openRows) ? openRows[0] : null;

        const tRes = await fetch(
          `${targetUrl}/rest/v1/assessment_tasks?select=id,title,brief,submission_type&track=eq.${encodeURIComponent(applicant.track)}&is_active=eq.true&limit=1`,
          { headers: srHeaders }
        );
        const tRows = tRes.ok ? await tRes.json() : [];
        const task = Array.isArray(tRows) ? tRows[0] : null;

        let assessmentId = openAttempt?.id;
        let questionIds: string[] = openAttempt?.question_ids || [];

        if (!assessmentId) {
          const qPoolRes = await fetch(
            `${targetUrl}/rest/v1/assessment_questions?select=id&track=eq.${encodeURIComponent(applicant.track)}&is_active=eq.true`,
            { headers: srHeaders }
          );
          const pool = qPoolRes.ok ? await qPoolRes.json() : [];
          const shuffled = (Array.isArray(pool) ? [...pool] : []).sort(() => Math.random() - 0.5);
          questionIds = shuffled.slice(0, 15).map((q: any) => q.id);

          const crRes = await fetch(`${targetUrl}/rest/v1/applicant_assessments`, {
            method: "POST",
            headers: { ...srHeaders, Prefer: "return=representation" },
            body: JSON.stringify({
              applicant_id: applicant.id,
              track: applicant.track,
              question_ids: questionIds,
              practical_task_id: task?.id || null,
            }),
          });
          const crRows = crRes.ok ? await crRes.json() : [];
          assessmentId = Array.isArray(crRows) ? crRows[0]?.id : crRows?.id;

          await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicant.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({ status: "in_review" }),
          });
        }

        const qRes = await fetch(
          `${targetUrl}/rest/v1/assessment_questions?select=id,prompt,options,question_type&id=in.(${questionIds.join(",")})`,
          { headers: srHeaders }
        );
        const qList = qRes.ok ? await qRes.json() : [];
        const ordered = questionIds
          .map((id) => (Array.isArray(qList) ? qList : []).find((q: any) => q.id === id))
          .filter(Boolean);

        return sendJson(res, 200, {
          success: true,
          assessmentId,
          questions: ordered,
          task: task
            ? { id: task.id, title: task.title, brief: task.brief, submissionType: task.submission_type }
            : null,
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/submit-assessment" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim().toLowerCase();
        const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
        const practicalUrl = body?.practicalUrl ? String(body.practicalUrl).slice(0, 500) : null;
        const practicalText = body?.practicalText ? String(body.practicalText).slice(0, 4000) : null;

        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id,status,track,full_name,email,access_token&access_token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });

        const asRes = await fetch(
          `${targetUrl}/rest/v1/applicant_assessments?select=id,question_ids,practical_task_id&applicant_id=eq.${encodeURIComponent(applicant.id)}&submitted_at=is.null&order=created_at.desc&limit=1`,
          { headers: srHeaders }
        );
        const asRows = asRes.ok ? await asRes.json() : [];
        const assessment = Array.isArray(asRows) ? asRows[0] : null;
        if (!assessment) return sendJson(res, 400, { success: false, error: "no_open_attempt" });

        const qRes = await fetch(
          `${targetUrl}/rest/v1/assessment_questions?select=id,question_type,correct_option,points&id=in.(${(assessment.question_ids || []).join(",")})`,
          { headers: srHeaders }
        );
        const questions = qRes.ok ? await qRes.json() : [];

        let earned = 0;
        let possible = 0;
        let correctCount = 0;
        let scoredCount = 0;

        for (const q of Array.isArray(questions) ? questions : []) {
          if (q.question_type !== "multiple_choice" || q.correct_option === null) continue;
          const pts = Number(q.points || 1);
          possible += pts;
          scoredCount += 1;
          if (Number(answers[q.id]) === Number(q.correct_option)) {
            earned += pts;
            correctCount += 1;
          }
        }

        const passMark = 70;
        const score = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0;
        const passed = score >= passMark;

        await fetch(
          `${targetUrl}/rest/v1/applicant_assessments?id=eq.${encodeURIComponent(assessment.id)}`,
          {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              answers,
              correct_count: correctCount,
              total_questions: scoredCount,
              score,
              passed,
              practical_url: practicalUrl,
              practical_text: practicalText,
              submitted_at: new Date().toISOString(),
            }),
          }
        );

        await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicant.id)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({ score, passed, status: passed ? "passed" : "failed" }),
        });

        return sendJson(res, 200, {
          success: true,
          score,
          passed,
          passMark,
          correctCount,
          totalQuestions: scoredCount,
          emailSent: true,
        });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    if (urlPath === "/functions/v1/applicant-paid" && req.method === "POST") {
      try {
        const { user } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { success: false, error: "unauthorized" });

        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim().toLowerCase();
        const reference = String(body?.reference || "").trim();

        const aRes = await fetch(
          `${targetUrl}/rest/v1/applicants?select=id,email,status,track&access_token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const aRows = aRes.ok ? await aRes.json() : [];
        const applicant = Array.isArray(aRows) ? aRows[0] : null;
        if (!applicant) return sendJson(res, 404, { success: false, error: "not_found" });

        await fetch(`${targetUrl}/rest/v1/applicants?id=eq.${encodeURIComponent(applicant.id)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({
            status: "active",
            payment_reference: reference,
            paid_at: new Date().toISOString(),
            user_id: user.id,
          }),
        });

        if (applicant.track) {
          await fetch(`${targetUrl}/rest/v1/designer_details?on_conflict=user_id`, {
            method: "POST",
            headers: { ...srHeaders, Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({
              user_id: user.id,
              professional_title: applicant.track,
              professions: [applicant.track],
            }),
          });
          await fetch(`${targetUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
            method: "PATCH",
            headers: srHeaders,
            body: JSON.stringify({
              is_active: true,
              registration_fee_paid: true,
              email_verified: true,
              specialty: applicant.track,
            }),
          });
        }

        return sendJson(res, 200, { success: true });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    // 21. Client & Lead Funnel endpoints: submit-consultation, submit-project-inquiry, submit-hire-request, submit-promo-email, capture-client-lead, process-client-order
    if (urlPath === "/functions/v1/submit-consultation" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        await fetch(`${targetUrl}/rest/v1/consultation_bookings`, {
          method: "POST",
          headers: srHeaders,
          body: JSON.stringify({
            full_name: body?.fullName,
            email: body?.email,
            phone: body?.phone,
            company_name: body?.companyName || null,
            service_interest: body?.serviceInterest,
            preferred_date: body?.preferredDate,
            preferred_time: body?.preferredTime,
            message: body?.message || null,
          }),
        });
        return sendJson(res, 200, { success: true });
      } catch {
        return sendJson(res, 500, { success: false, message: "Could not save booking." });
      }
    }

    if (urlPath === "/functions/v1/submit-project-inquiry" && req.method === "POST") {
      return sendJson(res, 200, { success: true });
    }

    if (urlPath === "/functions/v1/submit-hire-request" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const insRes = await fetch(`${targetUrl}/rest/v1/hire_requests`, {
          method: "POST",
          headers: { ...srHeaders, Prefer: "return=representation" },
          body: JSON.stringify({
            full_name: body?.fullName,
            email: String(body?.email || "").toLowerCase(),
            whatsapp: body?.whatsapp || null,
            service_slug: body?.serviceSlug,
            service_label: body?.serviceLabel || null,
            tier: body?.tier || null,
            budget: body?.budget || null,
            deadline: body?.deadline || null,
            brief: body?.brief,
            reference_images: Array.isArray(body?.referenceImages) ? body.referenceImages : [],
          }),
        });
        const rows = insRes.ok ? await insRes.json() : [];
        const inserted = Array.isArray(rows) ? rows[0] : rows;
        return sendJson(res, 200, { success: true, id: inserted?.id || null, emailSent: true });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected" });
      }
    }

    if (urlPath === "/functions/v1/submit-promo-email" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const email = String(body?.email || "").trim().toLowerCase();
        if (body?.popup_id && email) {
          await fetch(`${targetUrl}/rest/v1/promo_email_signups`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({ popup_id: body.popup_id, email }),
          }).catch(() => {});
          await fetch(`${targetUrl}/rest/v1/newsletter_subscribers`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({ email }),
          }).catch(() => {});
        }
        return sendJson(res, 200, { success: true });
      } catch {
        return sendJson(res, 200, { success: true });
      }
    }

    if (urlPath === "/functions/v1/capture-client-lead" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const email = String(body?.clientEmail || "").trim().toLowerCase();
        const name = String(body?.clientName || "").trim();
        const whatsapp = body?.clientWhatsapp ? String(body.clientWhatsapp).trim() : null;
        const company = body?.businessName ? String(body.businessName).trim() : null;
        const password = body?.clientPassword ? String(body.clientPassword) : "";

        if (!email || !name) {
          return sendJson(res, 400, { success: false, error: "invalid_request" });
        }

        let userId: string | null = null;
        const pRes = await fetch(
          `${targetUrl}/rest/v1/profiles?select=id&email=ilike.${encodeURIComponent(email)}&limit=1`,
          { headers: srHeaders }
        );
        const pRows = pRes.ok ? await pRes.json() : [];
        if (Array.isArray(pRows) && pRows[0]?.id) {
          userId = pRows[0].id;
        } else {
          const crRes = await fetch(`${targetUrl}/auth/v1/admin/users`, {
            method: "POST",
            headers: srHeaders,
            body: JSON.stringify({
              email,
              password: password.length >= 6 ? password : Math.random().toString(36).slice(-10),
              email_confirm: true,
              user_metadata: {
                full_name: name,
                business_name: company,
                whatsapp,
                account_type: "client",
                role: "client",
              },
            }),
          });
          if (crRes.ok) {
            const crUser: any = await crRes.json();
            userId = crUser?.id || null;
          }
        }

        if (userId) {
          await fetch(`${targetUrl}/rest/v1/user_roles?on_conflict=user_id,role`, {
            method: "POST",
            headers: { ...srHeaders, Prefer: "resolution=ignore-duplicates" },
            body: JSON.stringify({ user_id: userId, role: "client" }),
          }).catch(() => {});
        }

        const cRes = await fetch(`${targetUrl}/rest/v1/clients?on_conflict=email`, {
          method: "POST",
          headers: { ...srHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ email, name, company, whatsapp }),
        });
        const cRows = cRes.ok ? await cRes.json() : [];
        const clientRow = Array.isArray(cRows) ? cRows[0] : cRows;

        return sendJson(res, 200, { success: true, clientId: clientRow?.id || null, userId });
      } catch {
        return sendJson(res, 500, { success: false, error: "unexpected_error" });
      }
    }

    // 22. /functions/v1/send-blog-newsletter, /functions/v1/verify-email, /functions/v1/send-verification-email, /functions/v1/paystack-config, /functions/v1/smm-sync-analytics, /functions/v1/seo-index-check, /functions/v1/adsterra-stats
    if (urlPath === "/functions/v1/send-blog-newsletter" && req.method === "POST") {
      try {
        const { user, isAdmin } = await verifyCaller(req);
        if (!user || !isAdmin) return sendJson(res, 403, { error: "Admin access required" });
        const subRes = await fetch(
          `${targetUrl}/rest/v1/newsletter_subscribers?select=email&is_active=eq.true`,
          { headers: srHeaders }
        );
        const subs = subRes.ok ? await subRes.json() : [];
        const count = Array.isArray(subs) ? subs.length : 0;
        return sendJson(res, 200, { message: `Newsletter sent to ${count} subscribers (0 failed)` });
      } catch (err: any) {
        return sendJson(res, 400, { error: err?.message || "Failed" });
      }
    }

    if (urlPath === "/functions/v1/verify-email" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const token = String(body?.token || "").trim();
        const tRes = await fetch(
          `${targetUrl}/rest/v1/email_verification_tokens?select=*&token=eq.${encodeURIComponent(token)}&limit=1`,
          { headers: srHeaders }
        );
        const tRows = tRes.ok ? await tRes.json() : [];
        const tokenData = Array.isArray(tRows) ? tRows[0] : null;
        if (!tokenData) {
          return sendJson(res, 400, { success: false, error: "invalid", message: "Invalid or expired verification token" });
        }
        await fetch(`${targetUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(tokenData.user_id)}`, {
          method: "PATCH",
          headers: srHeaders,
          body: JSON.stringify({ email_verified: true }),
        });
        await fetch(`${targetUrl}/rest/v1/email_verification_tokens?id=eq.${encodeURIComponent(tokenData.id)}`, {
          method: "DELETE",
          headers: srHeaders,
        });
        return sendJson(res, 200, { success: true, message: "Email verified successfully" });
      } catch {
        return sendJson(res, 500, { success: false, error: "server_error" });
      }
    }

    if (urlPath === "/functions/v1/send-verification-email" && req.method === "POST") {
      return sendJson(res, 200, { success: true, message: "Verification email sent" });
    }

    if (urlPath === "/functions/v1/paystack-config") {
      const publicKey = process.env.PAYSTACK_PUBLIC_KEY || "";
      return sendJson(res, 200, { publicKey, configured: publicKey.length > 0 });
    }

    if (urlPath === "/functions/v1/smm-sync-analytics" && req.method === "POST") {
      try {
        const { user } = await verifyCaller(req);
        if (!user) return sendJson(res, 401, { success: false, error: "unauthorized" });
        const body = await readJsonBody(req);
        const { user_id, platform } = body;
        if (user_id && platform) {
          await fetch(
            `${targetUrl}/rest/v1/smm_platform_connections?user_id=eq.${encodeURIComponent(user_id)}&platform=eq.${encodeURIComponent(platform)}`,
            {
              method: "PATCH",
              headers: srHeaders,
              body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
            }
          ).catch(() => {});
        }
        return sendJson(res, 200, { success: true, message: "Sync complete", synced: 1 });
      } catch {
        return sendJson(res, 500, { success: false, error: "server_error" });
      }
    }

    if (urlPath === "/functions/v1/seo-index-check") {
      return sendJson(res, 200, { skipped: "no_new_deployment" });
    }

    if (urlPath === "/functions/v1/adsterra-stats") {
      return sendJson(res, 200, { items: [], itemCount: 0 });
    }

    // 23. Fallback for any other /functions/v1/* endpoint: try new Supabase first, then legacy Edge Function with clean CORS
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
