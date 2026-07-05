import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMySubmissions from "./tools/list-my-submissions";
import listMyNotifications from "./tools/list-my-notifications";
import listOpenJobContracts from "./tools/list-open-job-contracts";

// Build the direct Supabase auth issuer from the project ref. VITE_SUPABASE_PROJECT_ID is
// inlined by Vite at build time, so this stays import-safe (no runtime env read at module load).
// The sentinel keeps the URL well-formed during the manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "prime-haven-mcp",
  title: "Prime Haven",
  version: "0.1.0",
  instructions:
    "Tools for the Prime Haven creative platform. Use `get_my_profile` to identify the signed-in user, " +
    "`list_my_submissions` to review a designer's recent submissions, `list_my_notifications` for their inbox, " +
    "and `list_open_job_contracts` to discover jobs available to claim.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMySubmissions, listMyNotifications, listOpenJobContracts],
});
