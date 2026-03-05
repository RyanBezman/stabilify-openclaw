import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanStatus = "draft" | "active" | "superseded";

export async function loadLatestPlanByType(
  supabaseUser: SupabaseClient,
  args: {
    threadId: string;
    planType: "workout" | "nutrition";
    status?: PlanStatus;
  }
) {
  const query = supabaseUser
    .from("coach_plans")
    .select("id, thread_id, type, status, title, plan_json, version, supersedes_plan_id, created_at, updated_at")
    .eq("thread_id", args.threadId)
    .eq("type", args.planType)
    .order("version", { ascending: false })
    .limit(1);

  const { data, error } = args.status
    ? await query.eq("status", args.status).maybeSingle()
    : await query.maybeSingle();

  if (error) return { error: error.message } as const;
  return { row: data ?? null } as const;
}

export async function createDraftPlanVersion(
  supabaseUser: SupabaseClient,
  args: {
    userId: string;
    threadId: string;
    planType: "workout" | "nutrition";
    title: string;
    planJson: Record<string, unknown>;
  }
) {
  // Keep a single draft row per thread/type while always bumping version.
  // Explicit update/insert avoids relying on ON CONFLICT with partial indexes.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const latestRes = await loadLatestPlanByType(supabaseUser, {
      threadId: args.threadId,
      planType: args.planType,
    });
    if ("error" in latestRes) return latestRes;

    const activeRes = await loadLatestPlanByType(supabaseUser, {
      threadId: args.threadId,
      planType: args.planType,
      status: "active",
    });
    if ("error" in activeRes) return activeRes;

    const draftRes = await loadLatestPlanByType(supabaseUser, {
      threadId: args.threadId,
      planType: args.planType,
      status: "draft",
    });
    if ("error" in draftRes) return draftRes;

    const nextVersion = Math.max(1, Number(latestRes.row?.version ?? 0) + 1);
    const supersedesPlanId = activeRes.row?.id ?? null;

    const draftPayload = {
      user_id: args.userId,
      thread_id: args.threadId,
      type: args.planType,
      status: "draft",
      title: args.title,
      plan_json: args.planJson,
      version: nextVersion,
      supersedes_plan_id: supersedesPlanId,
    };

    if (draftRes.row?.id) {
      const { data, error } = await supabaseUser
        .from("coach_plans")
        .update(draftPayload)
        .eq("id", draftRes.row.id)
        .eq("user_id", args.userId)
        .select("id, version")
        .single();

      if (!error) return { row: data } as const;
      const code = String((error as { code?: string })?.code ?? "");
      if (code === "23505" && attempt === 0) continue;
      return { error: error.message } as const;
    }

    const { data, error } = await supabaseUser
      .from("coach_plans")
      .insert(draftPayload)
      .select("id, version")
      .single();

    if (!error) return { row: data } as const;
    const code = String((error as { code?: string })?.code ?? "");
    if (code === "23505" && attempt === 0) continue;
    return { error: error.message } as const;
  }

  return { error: "Failed to create draft plan version after retry." } as const;
}

export async function promoteDraftPlanVersion(
  supabaseUser: SupabaseClient,
  args: {
    threadId: string;
    planType: "workout" | "nutrition";
  }
) {
  const draftRes = await loadLatestPlanByType(supabaseUser, {
    threadId: args.threadId,
    planType: args.planType,
    status: "draft",
  });
  if ("error" in draftRes) return draftRes;
  if (!draftRes.row) return { error: "No draft plan found." } as const;

  const { error: supersedeErr } = await supabaseUser
    .from("coach_plans")
    .update({ status: "superseded" })
    .eq("thread_id", args.threadId)
    .eq("type", args.planType)
    .eq("status", "active");
  if (supersedeErr) return { error: supersedeErr.message } as const;

  const { data, error } = await supabaseUser
    .from("coach_plans")
    .update({ status: "active" })
    .eq("id", draftRes.row.id)
    .select("id, version")
    .single();

  if (error) return { error: error.message } as const;
  return { row: data } as const;
}

export async function discardDraftPlanVersion(
  supabaseUser: SupabaseClient,
  args: {
    threadId: string;
    planType: "workout" | "nutrition";
  }
) {
  const draftRes = await loadLatestPlanByType(supabaseUser, {
    threadId: args.threadId,
    planType: args.planType,
    status: "draft",
  });
  if ("error" in draftRes) return draftRes;
  if (!draftRes.row) return { error: "No draft plan found." } as const;

  const { error } = await supabaseUser
    .from("coach_plans")
    .delete()
    .eq("id", draftRes.row.id);

  if (error) return { error: error.message } as const;
  return { ok: true } as const;
}
