import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_open_job_contracts",
  title: "List open job contracts",
  description:
    "List Prime Haven job contracts that are still open for designers to claim. Optional category filter.",
  inputSchema: {
    category: z.string().optional().describe("Optional category filter (e.g. 'graphic-design')"),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: rows, error } = await (supabase as any).rpc("get_open_job_contracts");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const data = ((rows ?? []) as any[])
      .filter((r) => !category || r.category === category)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        description: r.description,
        budget: r.budget,
        deadline: r.deadline,
        active_designers_count: r.active_designers_count,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});
