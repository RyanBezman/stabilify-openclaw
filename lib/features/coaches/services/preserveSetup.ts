import { supabase } from "../../../supabase";
import { fail, ok, type Result } from "../../shared";
import type { ActiveCoach, CoachSpecialization } from "../types";

type CoachThreadRow = {
  id: string;
  coach_profile_id: string;
  specialization: CoachSpecialization;
  intake_json: Record<string, unknown> | null;
  intake_updated_at: string | null;
  last_message_at: string | null;
};

type CoachPlanStatus = "draft" | "active" | "superseded";

type CoachPlanRow = {
  id: string;
  user_id: string;
  thread_id: string;
  type: CoachSpecialization;
  status: CoachPlanStatus;
  title: string | null;
  plan_json: Record<string, unknown>;
  version: number;
  supersedes_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

type CoachSelectionBySpecialization = Record<CoachSpecialization, ActiveCoach | null>;

type ResolvedSourceSetup = {
  thread: CoachThreadRow | null;
  activePlan: CoachPlanRow | null;
  draftPlan: CoachPlanRow | null;
};

const SPECIALIZATIONS: CoachSpecialization[] = ["workout", "nutrition"];

async function resolveCoachProfileId(
  specialization: CoachSpecialization,
  coach: ActiveCoach,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("specialization", specialization)
    .eq("gender", coach.gender)
    .eq("personality", coach.personality)
    .maybeSingle<{ id: string }>();

  if (error) {
    return fail(error);
  }
  if (!data?.id) {
    return fail("Couldn't find that coach profile.", { code: "NOT_FOUND" });
  }
  return ok({ id: data.id });
}

async function fetchThreadByCoachProfile(
  userId: string,
  specialization: CoachSpecialization,
  coachProfileId: string,
): Promise<Result<{ row: CoachThreadRow | null }>> {
  const { data, error } = await supabase
    .from("coach_threads")
    .select("id, coach_profile_id, specialization, intake_json, intake_updated_at, last_message_at")
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .eq("coach_profile_id", coachProfileId)
    .maybeSingle<CoachThreadRow>();

  if (error) {
    return fail(error);
  }
  return ok({ row: data ?? null });
}

async function fetchThreadById(threadId: string): Promise<Result<{ row: CoachThreadRow | null }>> {
  const { data, error } = await supabase
    .from("coach_threads")
    .select("id, coach_profile_id, specialization, intake_json, intake_updated_at, last_message_at")
    .eq("id", threadId)
    .maybeSingle<CoachThreadRow>();

  if (error) {
    return fail(error);
  }
  return ok({ row: data ?? null });
}

async function fetchLatestThreadWithIntake(
  userId: string,
  specialization: CoachSpecialization,
): Promise<Result<{ row: CoachThreadRow | null }>> {
  const { data, error } = await supabase
    .from("coach_threads")
    .select("id, coach_profile_id, specialization, intake_json, intake_updated_at, last_message_at")
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .not("intake_json", "is", null)
    .order("intake_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<CoachThreadRow>();

  if (error) {
    return fail(error);
  }
  return ok({ row: data ?? null });
}

async function ensureThreadForCoachProfile(
  userId: string,
  specialization: CoachSpecialization,
  coachProfileId: string,
): Promise<Result<{ row: CoachThreadRow }>> {
  const existingRes = await fetchThreadByCoachProfile(userId, specialization, coachProfileId);
  if (existingRes.error) {
    return fail(existingRes.error);
  }
  if (existingRes.data?.row) {
    return ok({ row: existingRes.data.row });
  }

  const { data, error } = await supabase
    .from("coach_threads")
    .insert({
      user_id: userId,
      coach_profile_id: coachProfileId,
      specialization,
      intake_json: null,
      intake_updated_at: null,
      last_message_at: null,
    })
    .select("id, coach_profile_id, specialization, intake_json, intake_updated_at, last_message_at")
    .single<CoachThreadRow>();

  if (!error && data) {
    return ok({ row: data });
  }

  const refetchedRes = await fetchThreadByCoachProfile(userId, specialization, coachProfileId);
  if (refetchedRes.error) {
    return fail(refetchedRes.error);
  }
  if (!refetchedRes.data?.row) {
    return fail(error ?? "Couldn't create coach thread.");
  }
  return ok({ row: refetchedRes.data.row });
}

async function fetchLatestPlanForThread(
  threadId: string,
  specialization: CoachSpecialization,
  status: CoachPlanStatus,
): Promise<Result<{ row: CoachPlanRow | null }>> {
  const { data, error } = await supabase
    .from("coach_plans")
    .select("id, user_id, thread_id, type, status, title, plan_json, version, supersedes_plan_id, created_at, updated_at")
    .eq("thread_id", threadId)
    .eq("type", specialization)
    .eq("status", status)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<CoachPlanRow>();

  if (error) {
    return fail(error);
  }
  return ok({ row: data ?? null });
}

async function fetchLatestActivePlanForUser(
  userId: string,
  specialization: CoachSpecialization,
): Promise<Result<{ row: CoachPlanRow | null }>> {
  const { data, error } = await supabase
    .from("coach_plans")
    .select("id, user_id, thread_id, type, status, title, plan_json, version, supersedes_plan_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("type", specialization)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<CoachPlanRow>();

  if (error) {
    return fail(error);
  }
  return ok({ row: data ?? null });
}

async function fetchNextPlanVersion(
  threadId: string,
  specialization: CoachSpecialization,
): Promise<Result<{ version: number }>> {
  const { data, error } = await supabase
    .from("coach_plans")
    .select("version")
    .eq("thread_id", threadId)
    .eq("type", specialization)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>();

  if (error) {
    return fail(error);
  }
  return ok({ version: (data?.version ?? 0) + 1 });
}

async function deletePlan(planId: string): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.from("coach_plans").delete().eq("id", planId);
  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

async function supersedePlan(planId: string): Promise<Result<{ ok: true }>> {
  const { error } = await supabase
    .from("coach_plans")
    .update({ status: "superseded" satisfies CoachPlanStatus })
    .eq("id", planId);

  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

async function clearThreadMessages(threadId: string): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.from("coach_messages").delete().eq("thread_id", threadId);
  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

async function updateThreadWorkspaceState(
  threadId: string,
  intakeJson: Record<string, unknown> | null,
): Promise<Result<{ ok: true }>> {
  const { error } = await supabase
    .from("coach_threads")
    .update({
      intake_json: intakeJson,
      intake_updated_at: intakeJson ? new Date().toISOString() : null,
      last_message_at: null,
    })
    .eq("id", threadId);

  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

async function insertCopiedActivePlan(args: {
  sourcePlan: CoachPlanRow;
  targetThreadId: string;
  specialization: CoachSpecialization;
  nextVersion: number;
  supersedesPlanId: string | null;
}): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.from("coach_plans").insert({
    user_id: args.sourcePlan.user_id,
    thread_id: args.targetThreadId,
    type: args.specialization,
    status: "active" satisfies CoachPlanStatus,
    title: args.sourcePlan.title,
    plan_json: args.sourcePlan.plan_json,
    version: args.nextVersion,
    supersedes_plan_id: args.supersedesPlanId,
  });

  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

async function resolveSourceSetup(
  userId: string,
  specialization: CoachSpecialization,
  sourceCoach: ActiveCoach | null,
): Promise<Result<{ setup: ResolvedSourceSetup }>> {
  if (sourceCoach) {
    const sourceProfileRes = await resolveCoachProfileId(specialization, sourceCoach);
    if (sourceProfileRes.error || !sourceProfileRes.data) {
      return fail(sourceProfileRes.error);
    }
    const threadRes = await fetchThreadByCoachProfile(
      userId,
      specialization,
      sourceProfileRes.data.id,
    );
    if (threadRes.error) {
      return fail(threadRes.error);
    }
    if (threadRes.data?.row) {
      const activePlanRes = await fetchLatestPlanForThread(
        threadRes.data.row.id,
        specialization,
        "active",
      );
      if (activePlanRes.error) {
        return fail(activePlanRes.error);
      }
      const draftPlanRes = await fetchLatestPlanForThread(
        threadRes.data.row.id,
        specialization,
        "draft",
      );
      if (draftPlanRes.error) {
        return fail(draftPlanRes.error);
      }
      return ok({
        setup: {
          thread: threadRes.data.row,
          activePlan: activePlanRes.data?.row ?? null,
          draftPlan: draftPlanRes.data?.row ?? null,
        },
      });
    }
  }

  const latestActivePlanRes = await fetchLatestActivePlanForUser(userId, specialization);
  if (latestActivePlanRes.error) {
    return fail(latestActivePlanRes.error);
  }
  if (latestActivePlanRes.data?.row) {
    const threadRes = await fetchThreadById(latestActivePlanRes.data.row.thread_id);
    if (threadRes.error) {
      return fail(threadRes.error);
    }
    const draftPlanRes = await fetchLatestPlanForThread(
      latestActivePlanRes.data.row.thread_id,
      specialization,
      "draft",
    );
    if (draftPlanRes.error) {
      return fail(draftPlanRes.error);
    }
    return ok({
      setup: {
        thread: threadRes.data?.row ?? null,
        activePlan: latestActivePlanRes.data.row,
        draftPlan: draftPlanRes.data?.row ?? null,
      },
    });
  }

  const intakeThreadRes = await fetchLatestThreadWithIntake(userId, specialization);
  if (intakeThreadRes.error) {
    return fail(intakeThreadRes.error);
  }
  if (!intakeThreadRes.data?.row) {
    return ok({
      setup: {
        thread: null,
        activePlan: null,
        draftPlan: null,
      },
    });
  }

  const draftPlanRes = await fetchLatestPlanForThread(
    intakeThreadRes.data.row.id,
    specialization,
    "draft",
  );
  if (draftPlanRes.error) {
    return fail(draftPlanRes.error);
  }

  return ok({
    setup: {
      thread: intakeThreadRes.data.row,
      activePlan: null,
      draftPlan: draftPlanRes.data?.row ?? null,
    },
  });
}

async function preserveSetupForSpecialization(args: {
  userId: string;
  specialization: CoachSpecialization;
  sourceCoach: ActiveCoach | null;
  targetCoach: ActiveCoach | null;
}): Promise<Result<{ ok: true }>> {
  if (!args.targetCoach) {
    return ok({ ok: true });
  }

  const sourceSetupRes = await resolveSourceSetup(
    args.userId,
    args.specialization,
    args.sourceCoach,
  );
  if (sourceSetupRes.error || !sourceSetupRes.data) {
    return fail(sourceSetupRes.error);
  }

  const targetProfileRes = await resolveCoachProfileId(
    args.specialization,
    args.targetCoach,
  );
  if (targetProfileRes.error || !targetProfileRes.data) {
    return fail(targetProfileRes.error);
  }

  const targetThreadRes = await ensureThreadForCoachProfile(
    args.userId,
    args.specialization,
    targetProfileRes.data.id,
  );
  if (targetThreadRes.error || !targetThreadRes.data) {
    return fail(targetThreadRes.error);
  }
  const targetThread = targetThreadRes.data.row;
  const sourceSetup = sourceSetupRes.data.setup;
  const sourceThreadId = sourceSetup.thread?.id ?? sourceSetup.activePlan?.thread_id ?? null;
  const sameThread = sourceThreadId === targetThread.id;

  if (sameThread) {
    return ok({ ok: true });
  }

  const clearMessagesRes = await clearThreadMessages(targetThread.id);
  if (clearMessagesRes.error) {
    return fail(clearMessagesRes.error);
  }

  const updateThreadRes = await updateThreadWorkspaceState(
    targetThread.id,
    sourceSetup.thread?.intake_json ?? null,
  );
  if (updateThreadRes.error) {
    return fail(updateThreadRes.error);
  }

  const targetDraftRes = await fetchLatestPlanForThread(
    targetThread.id,
    args.specialization,
    "draft",
  );
  if (targetDraftRes.error) {
    return fail(targetDraftRes.error);
  }
  const targetDraft = targetDraftRes.data?.row ?? null;

  if (targetDraft && targetDraft.id !== sourceSetup.draftPlan?.id) {
    const deleteTargetDraftRes = await deletePlan(targetDraft.id);
    if (deleteTargetDraftRes.error) {
      return fail(deleteTargetDraftRes.error);
    }
  }

  if (sourceSetup.draftPlan) {
    const deleteSourceDraftRes = await deletePlan(sourceSetup.draftPlan.id);
    if (deleteSourceDraftRes.error) {
      return fail(deleteSourceDraftRes.error);
    }
  }

  const targetActiveRes = await fetchLatestPlanForThread(
    targetThread.id,
    args.specialization,
    "active",
  );
  if (targetActiveRes.error) {
    return fail(targetActiveRes.error);
  }
  const targetActive = targetActiveRes.data?.row ?? null;

  if (!sourceSetup.activePlan) {
    if (targetActive) {
      const supersedeTargetRes = await supersedePlan(targetActive.id);
      if (supersedeTargetRes.error) {
        return fail(supersedeTargetRes.error);
      }
    }
    return ok({ ok: true });
  }

  if (targetActive) {
    const supersedeTargetRes = await supersedePlan(targetActive.id);
    if (supersedeTargetRes.error) {
      return fail(supersedeTargetRes.error);
    }
  }

  const nextVersionRes = await fetchNextPlanVersion(targetThread.id, args.specialization);
  if (nextVersionRes.error || !nextVersionRes.data) {
    return fail(nextVersionRes.error);
  }

  const insertPlanRes = await insertCopiedActivePlan({
    sourcePlan: sourceSetup.activePlan,
    targetThreadId: targetThread.id,
    specialization: args.specialization,
    nextVersion: nextVersionRes.data.version,
    supersedesPlanId: targetActive?.id ?? null,
  });
  if (insertPlanRes.error) {
    return fail(insertPlanRes.error);
  }

  const supersedeSourceRes = await supersedePlan(sourceSetup.activePlan.id);
  if (supersedeSourceRes.error) {
    return fail(supersedeSourceRes.error);
  }

  return ok({ ok: true });
}

export async function preserveUnifiedCoachSetupOnServer(args: {
  userId: string;
  sourceSelection: CoachSelectionBySpecialization;
  targetSelection: CoachSelectionBySpecialization;
}): Promise<Result<{ ok: true }>> {
  for (const specialization of SPECIALIZATIONS) {
    const preserveRes = await preserveSetupForSpecialization({
      userId: args.userId,
      specialization,
      sourceCoach: args.sourceSelection[specialization],
      targetCoach: args.targetSelection[specialization],
    });
    if (preserveRes.error) {
      return fail(preserveRes.error);
    }
  }

  return ok({ ok: true });
}
