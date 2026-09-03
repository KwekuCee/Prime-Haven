// Mirrors a paid client project into the Job Contracts board so admins and
// professionals can work from either surface. The two rows stay linked through
// job_contracts.client_project_id and are kept in sync by database triggers.

type AnyClient = {
  from: (table: string) => any;
};

export interface MirrorProjectInput {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  client_name?: string | null;
  budget?: string | null;
  deadline?: string | null;
  reference_images?: string[] | null;
  required_professions?: string[] | null;
  posted_by?: string | null;
}

export async function ensureJobContract(admin: AnyClient, project: MirrorProjectInput) {
  try {
    const { data: existing } = await admin
      .from("job_contracts")
      .select("id")
      .eq("client_project_id", project.id)
      .maybeSingle();
    if (existing?.id) return existing.id as string;

    const { data, error } = await admin
      .from("job_contracts")
      .insert({
        client_project_id: project.id,
        title: project.title,
        description: project.description || "Client project — see brief in the project workspace.",
        category: project.category,
        client_name: project.client_name ?? null,
        budget: project.budget ?? null,
        deadline: project.deadline ?? null,
        reference_files: Array.isArray(project.reference_images) ? project.reference_images : [],
        target_professions: Array.isArray(project.required_professions) ? project.required_professions : null,
        posted_by: project.posted_by ?? null,
        status: "active",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("ensureJobContract insert failed (non-critical):", error);
      return null;
    }
    return (data?.id as string) ?? null;
  } catch (err) {
    console.error("ensureJobContract failed (non-critical):", err);
    return null;
  }
}
