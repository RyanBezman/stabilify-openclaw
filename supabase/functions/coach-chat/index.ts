/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
// deno-lint-ignore-file
// @ts-nocheck — Supabase Edge Functions run in the Deno runtime; local TS may not resolve Deno globals.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  buildUnifiedCoachMessage,
  routeCheckinToTracks,
} from "./coordinator.ts";
import {
  normalizeWeeklyCheckinArtifact,
} from "./schemas.ts";
import {
  createDraftPlanVersion,
  discardDraftPlanVersion,
  loadLatestPlanByType,
  promoteDraftPlanVersion,
} from "./repositories/planVersions.ts";
import {
  computeNutritionTargets,
  goalFromProfileGoalType,
} from "./nutritionTargets.ts";

type SupabaseUserClient = ReturnType<typeof createClient>;

type CoachMessageRole = "user" | "assistant" | "system";
type PlanType = "workout" | "nutrition";
type CoachSpecialization = PlanType;
type CoachGender = "woman" | "man";
type CoachPersonality = "strict" | "sweet" | "relaxed" | "bubbly" | "hype" | "analyst";

type WorkoutIntake = {
  goal: "strength" | "fat_loss" | "recomp";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionMinutes: 30 | 45 | 60 | 75;
  equipment: "full_gym" | "home_basic";
  injuryNotes: string;
};
type PlanGoal = WorkoutIntake["goal"];

type NutritionGoal = "lose" | "maintain" | "gain";

type NutritionIntake = {
  heightCm: number;
  weightKg: number;
  ageYears: number;
  sex: "male" | "female" | "other";
  goal?: NutritionGoal;
};

type WorkoutPlan = {
  title: string;
  daysPerWeek: number;
  notes: string[];
  schedule: Array<{
    dayLabel: string;
    focus: string;
    items: Array<{ name: string; sets: string; reps: string }>;
  }>;
};

type NutritionPlan = {
  title: string;
  dailyCaloriesTarget: number;
  macros: {
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
  meals: Array<{
    name: string;
    targetCalories: number;
    items: string[];
  }>;
  notes: string[];
};

type CoachPlan = WorkoutPlan | NutritionPlan;
type CoachIntake = WorkoutIntake | NutritionIntake;
type WeightUnit = "lb" | "kg";
type WeightTrend = "down" | "flat" | "up" | "no_data";

type WeeklyCheckinInput = {
  energy: number;
  adherence_percent?: number;
  adherencePercent?: number;
  blockers: string;
};

type WeeklyWeightSnapshot = {
  unit: WeightUnit;
  entries: number;
  startWeight: number | null;
  endWeight: number | null;
  delta: number | null;
  trend: WeightTrend;
};

type WeeklyCheckinRow = {
  id: string;
  week_start: string;
  week_end: string;
  energy: number;
  adherence_percent: number;
  blockers: string;
  weight_snapshot: WeeklyWeightSnapshot;
  checkin_json?: Record<string, unknown> | null;
  adherence_score?: number | null;
  workout_plan_version?: number | null;
  nutrition_plan_version?: number | null;
  adjustment_json?: Record<string, unknown> | null;
  coach_summary: string | null;
  summary_model: string | null;
  created_at: string;
  updated_at: string;
};

type RequestBody = {
  action?: "history" | "workspace" | "dashboard_snapshot" | "send" | "plan_generate" | "plan_revise_days" | "plan_promote_draft" | "plan_discard_draft" | "checkin_history" | "checkin_submit" | "plan_feedback_log";
  message?: string;
  limit?: number;
  specialization?: CoachSpecialization;
  plan_type?: PlanType;
  coach_gender?: CoachGender;
  coach_personality?: CoachPersonality;
  intake?: CoachIntake;
  daysPerWeek?: number;
  checkin?: WeeklyCheckinInput & Record<string, unknown>;
  decision?: "accept" | "not_now" | "ask_coach";
  context?: string;
};

type ApiMessage = {
  id: string;
  role: CoachMessageRole;
  content: string;
  metadata?: { cta?: "review_draft_plan" } | null;
  created_at: string;
};

type CoachProfile = {
  id: string;
  display_name: string;
  gender: string;
  personality: string;
  system_prompt: string;
};

type PlanRevisionClassifierResult = {
  intent: "none" | "revise_days" | "revise_days_missing_days";
  days_per_week: number | null;
};

type WorkoutPlanPayload = {
  assistant_text?: string;
  plan_json?: WorkoutPlan;
};

type PlanRevisionIntent =
  | { kind: "none" }
  | { kind: "revise_days"; daysPerWeek: number }
  | { kind: "revise_focus"; goal: PlanGoal }
  | { kind: "revise_days_missing_days" };

type CheckinAction = "checkin_history" | "checkin_submit";
type NutritionPlanFeedbackDecision = "accept" | "not_now" | "ask_coach";
type CheckinFailureCategory = "validation" | "config" | "database" | "openai" | "timeout" | "auth" | "unknown";
type CheckinSummaryStatus =
  | "not_requested"
  | "idempotent_noop"
  | "skipped_missing_openai_key"
  | "skipped_invalid_models"
  | "generated"
  | "malformed_output"
  | "generation_failed"
  | "persist_failed";

type CheckinActionLogEvent = {
  action: CheckinAction;
  specialization: CoachSpecialization;
  week_start: string;
  thread_id: string;
  checkin_id: string | null;
  success: boolean;
  failure_category: CheckinFailureCategory | null;
  failure_reason: string | null;
  idempotent: boolean;
  summary_status: CheckinSummaryStatus;
  [key: string]: unknown;
};

type CheckinOperationError = Error & {
  checkin_category?: CheckinFailureCategory;
  checkin_status?: number;
  checkin_user_message?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function badRequest(message: string) {
  return json(400, { error: message });
}

function serverError(message: string) {
  return json(500, { error: message });
}

function forbidden(message: string, code?: string) {
  return json(403, { error: message, ...(code ? { code } : {}) });
}

function openAiNotConfigured() {
  return json(501, {
    error: "OpenAI is not configured. Add OPENAI_API_KEY to Supabase function secrets.",
    code: "OPENAI_NOT_CONFIGURED",
  });
}

async function readJson(req: Request): Promise<RequestBody> {
  try {
    const body = (await req.json()) as RequestBody;
    return body ?? {};
  } catch {
    return {};
  }
}

function clampDays(value: number) {
  return Math.max(1, Math.min(7, Math.round(value)));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatLocalDate(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return toIsoDate(date);
  }
}

function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function getWeekRange(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = shiftIsoDate(isoDate, offsetToMonday);
  const weekEnd = shiftIsoDate(weekStart, 6);
  return { weekStart, weekEnd };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}

function isValidWeightUnit(value: unknown): value is WeightUnit {
  return value === "lb" || value === "kg";
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit) {
  if (!Number.isFinite(value)) return NaN;
  if (from === to) return value;
  if (from === "lb" && to === "kg") return value * 0.45359237;
  return value / 0.45359237;
}

function validateWeeklyCheckinInput(input: unknown): input is WeeklyCheckinInput {
  const checkin = input as WeeklyCheckinInput;
  if (!checkin || typeof checkin !== "object") return false;

  const rawAdherence =
    typeof checkin.adherence_percent === "number"
      ? checkin.adherence_percent
      : checkin.adherencePercent;

  const validEnergy =
    Number.isFinite(checkin.energy) &&
    Math.round(checkin.energy) === checkin.energy &&
    checkin.energy >= 1 &&
    checkin.energy <= 5;

  const validAdherence =
    Number.isFinite(rawAdherence) &&
    Math.round(rawAdherence as number) === rawAdherence &&
    (rawAdherence as number) >= 0 &&
    (rawAdherence as number) <= 100;

  const validBlockers =
    typeof checkin.blockers === "string" &&
    checkin.blockers.trim().length <= 500;

  return Boolean(validEnergy && validAdherence && validBlockers);
}

function normalizeWeeklyCheckinInput(input: WeeklyCheckinInput) {
  const adherence = Number.isFinite(input.adherence_percent)
    ? input.adherence_percent
    : input.adherencePercent ?? 0;

  return {
    energy: Math.max(1, Math.min(5, Math.round(input.energy))),
    adherence_percent: clampPercent(adherence),
    blockers: input.blockers.trim(),
  };
}

function isNutritionPlanFeedbackDecision(
  value: unknown
): value is NutritionPlanFeedbackDecision {
  return value === "accept" || value === "not_now" || value === "ask_coach";
}

function normalizeFeedbackContext(value: unknown) {
  if (typeof value !== "string") return "checkin_review";
  const normalized = value.trim();
  return normalized.length ? normalized.slice(0, 80) : "checkin_review";
}

function logCheckinActionEvent(event: CheckinActionLogEvent) {
  console.info(
    `[coach-chat][checkin_action] ${JSON.stringify({
      ts: new Date().toISOString(),
      ...event,
    })}`
  );
}

function logNutritionPlanFeedbackEvent(event: {
  user_id: string;
  thread_id: string;
  week_start: string;
  decision: NutritionPlanFeedbackDecision;
  context: string;
  adherence_percent: number | null;
  adherence_score: number | null;
  success: boolean;
  reason: string | null;
}) {
  console.info(
    `[coach-chat][plan_feedback] ${JSON.stringify({
      ts: new Date().toISOString(),
      ...event,
    })}`
  );
}

function createCheckinOperationError(args: {
  category: CheckinFailureCategory;
  reason: string;
  status?: number;
  userMessage?: string;
}) {
  const error = new Error(args.reason) as CheckinOperationError;
  error.checkin_category = args.category;
  if (typeof args.status === "number") error.checkin_status = args.status;
  if (args.userMessage) error.checkin_user_message = args.userMessage;
  return error;
}

function inferCheckinFailureCategory(error: unknown): CheckinFailureCategory {
  const explicit = (error as CheckinOperationError | null)?.checkin_category;
  if (explicit) return explicit;

  const raw = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  if (!raw) return "unknown";
  if (raw.includes("missing or invalid checkin payload") || raw.includes("invalid checkin payload")) {
    return "validation";
  }
  if (raw.includes("timeout")) return "timeout";
  if (raw.includes("openai")) return "openai";
  if (raw.includes("auth") || raw.includes("jwt") || raw.includes("session")) return "auth";
  if (raw.includes("model") || raw.includes("config") || raw.includes("env")) return "config";
  if (
    raw.includes("database")
    || raw.includes("relation")
    || raw.includes("constraint")
    || raw.includes("sql")
    || raw.includes("duplicate key")
  ) {
    return "database";
  }
  return "unknown";
}

function fallbackCheckinErrorMessage(category: CheckinFailureCategory, action: CheckinAction) {
  if (category === "validation") return "Missing or invalid check-in payload.";
  if (category === "auth") return "You're not authorized for this check-in action right now.";
  if (category === "config") return "Weekly check-ins are temporarily unavailable. Please retry shortly.";
  if (category === "database") {
    return action === "checkin_submit"
      ? "Couldn't save your weekly check-in right now. Please retry."
      : "Couldn't load weekly check-ins right now. Please retry.";
  }
  if (category === "openai" || category === "timeout") {
    return action === "checkin_submit"
      ? "Your weekly check-in was saved, but summary generation is currently unavailable."
      : "Couldn't complete this weekly check-in request right now. Please retry.";
  }
  return "Couldn't complete this weekly check-in request right now. Please retry.";
}

function normalizeCheckinFailure(error: unknown, action: CheckinAction) {
  const category = inferCheckinFailureCategory(error);
  const fallbackStatusByCategory: Record<CheckinFailureCategory, number> = {
    validation: 400,
    config: 503,
    database: 500,
    openai: 502,
    timeout: 504,
    auth: 401,
    unknown: 500,
  };

  const opError = error as CheckinOperationError | null;
  const status = opError?.checkin_status ?? fallbackStatusByCategory[category];
  const reason = String(opError?.message ?? error ?? "Unknown check-in error.");
  const userMessage = opError?.checkin_user_message ?? fallbackCheckinErrorMessage(category, action);

  return {
    category,
    status,
    reason,
    userMessage,
  } as const;
}

function normalizeSummaryModelCandidates(input: Array<string | null | undefined>) {
  const models: string[] = [];
  const invalid: string[] = [];

  for (const candidate of input) {
    if (typeof candidate !== "string") continue;
    const model = candidate.trim();
    if (!model) continue;
    if (!/^[a-zA-Z0-9._:-]+$/.test(model)) {
      invalid.push(model);
      continue;
    }
    models.push(model);
  }

  return {
    models: Array.from(new Set(models)),
    invalid: Array.from(new Set(invalid)),
  } as const;
}

function normalizeCheckinSummaryTimeout(rawTimeout: unknown) {
  const numeric = Number(rawTimeout);
  const normalized = Number.isFinite(numeric)
    ? Math.max(1000, Math.min(30000, Math.round(numeric)))
    : 9000;
  return {
    input: Number.isFinite(numeric) ? numeric : null,
    normalized,
  } as const;
}

function serializeWeightSnapshotForIdempotency(snapshot: WeeklyWeightSnapshot) {
  const normalized = normalizeWeeklyWeightSnapshot(snapshot, snapshot.unit);
  return JSON.stringify({
    unit: normalized.unit,
    entries: normalized.entries,
    startWeight: normalized.startWeight,
    endWeight: normalized.endWeight,
    delta: normalized.delta,
    trend: normalized.trend,
  });
}

function serializeCheckinArtifactForIdempotency(artifact: ReturnType<typeof normalizeWeeklyCheckinArtifact>) {
  return JSON.stringify({
    linkedPlanVersion: {
      workoutVersion: artifact.linkedPlanVersion.workoutVersion,
      nutritionVersion: artifact.linkedPlanVersion.nutritionVersion,
    },
    currentWeightKg: artifact.currentWeightKg,
    waistCm: artifact.waistCm ?? null,
    progressPhotoPrompted: artifact.progressPhotoPrompted,
    strengthPRs: artifact.strengthPRs,
    consistencyNotes: artifact.consistencyNotes,
    bodyCompChanges: artifact.bodyCompChanges,
    trainingDifficulty: artifact.trainingDifficulty,
    nutritionAdherencePercent: artifact.nutritionAdherencePercent ?? null,
    nutritionAdherenceSubjective: artifact.nutritionAdherenceSubjective ?? null,
    appetiteCravings: artifact.appetiteCravings,
    energyRating: artifact.energyRating,
    recoveryRating: artifact.recoveryRating,
    sleepAvgHours: artifact.sleepAvgHours,
    sleepQuality: artifact.sleepQuality,
    stressLevel: artifact.stressLevel,
    scheduleConstraintsNextWeek: artifact.scheduleConstraintsNextWeek,
    injuryPain: artifact.injuryPain,
    computedAdherenceScore: artifact.computedAdherenceScore,
  });
}

function isIdempotentWeeklyCheckinSubmission(args: {
  existing: WeeklyCheckinRow | null;
  normalizedCheckin: ReturnType<typeof normalizeWeeklyCheckinInput>;
  snapshot: WeeklyWeightSnapshot;
  nextCheckinArtifact: ReturnType<typeof normalizeWeeklyCheckinArtifact>;
}) {
  const { existing, normalizedCheckin, snapshot, nextCheckinArtifact } = args;
  if (!existing) return false;

  const legacyFieldsMatch =
    existing.energy === normalizedCheckin.energy
    && existing.adherence_percent === normalizedCheckin.adherence_percent
    && existing.blockers === normalizedCheckin.blockers
    && serializeWeightSnapshotForIdempotency(existing.weight_snapshot) === serializeWeightSnapshotForIdempotency(snapshot);

  if (!legacyFieldsMatch) return false;

  const existingCheckinJson =
    existing.checkin_json && typeof existing.checkin_json === "object" && !Array.isArray(existing.checkin_json)
      ? (existing.checkin_json as Record<string, unknown>)
      : null;

  // Legacy rows without v2 payload still use legacy idempotency behavior.
  if (!existingCheckinJson || Object.keys(existingCheckinJson).length === 0) {
    return true;
  }

  const existingNormalizedArtifact = normalizeWeeklyCheckinArtifact(existingCheckinJson, {
    workoutVersion: Number.isFinite(existing.workout_plan_version) ? Number(existing.workout_plan_version) : null,
    nutritionVersion: Number.isFinite(existing.nutrition_plan_version)
      ? Number(existing.nutrition_plan_version)
      : null,
    computedAdherenceScore: Number.isFinite(existing.adherence_score)
      ? Number(existing.adherence_score)
      : existing.adherence_percent,
  });

  return (
    serializeCheckinArtifactForIdempotency(existingNormalizedArtifact)
    === serializeCheckinArtifactForIdempotency(nextCheckinArtifact)
  );
}

type ArtifactDiffPatch = {
  op: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

function cloneJsonValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function toArrayIndex(segment: string) {
  if (!/^\d+$/.test(segment)) return null;
  return Number(segment);
}

function decodeJsonPointerSegment(segment: string) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function toJsonPointerSegments(path: string) {
  if (!path.startsWith("/")) return [];
  return path
    .slice(1)
    .split("/")
    .map((segment) => decodeJsonPointerSegment(segment))
    .filter((segment) => segment.length > 0);
}

function createContainerForNextSegment(nextSegment: string | undefined) {
  return toArrayIndex(nextSegment ?? "") !== null ? [] : {};
}

function applyAddOrReplacePatch(target: unknown, path: string[], value: unknown) {
  if (!path.length) return;

  let cursor: unknown = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const nextSegment = path[index + 1];

    if (Array.isArray(cursor)) {
      const arrayIndex = toArrayIndex(segment);
      if (arrayIndex === null) return;
      const existing = cursor[arrayIndex];
      if (!existing || typeof existing !== "object") {
        cursor[arrayIndex] = createContainerForNextSegment(nextSegment);
      }
      cursor = cursor[arrayIndex];
      continue;
    }

    if (!cursor || typeof cursor !== "object") {
      return;
    }

    const record = cursor as Record<string, unknown>;
    const existing = record[segment];
    if (!existing || typeof existing !== "object") {
      record[segment] = createContainerForNextSegment(nextSegment);
    }
    cursor = record[segment];
  }

  const leaf = path[path.length - 1];
  if (Array.isArray(cursor)) {
    const arrayIndex = toArrayIndex(leaf);
    if (arrayIndex === null) return;
    if (arrayIndex === cursor.length) {
      cursor.push(cloneJsonValue(value));
      return;
    }
    cursor[arrayIndex] = cloneJsonValue(value);
    return;
  }

  if (!cursor || typeof cursor !== "object") return;
  (cursor as Record<string, unknown>)[leaf] = cloneJsonValue(value);
}

function applyRemovePatch(target: unknown, path: string[]) {
  if (!path.length) return;

  let cursor: unknown = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (Array.isArray(cursor)) {
      const arrayIndex = toArrayIndex(segment);
      if (arrayIndex === null) return;
      cursor = cursor[arrayIndex];
      continue;
    }

    if (!cursor || typeof cursor !== "object") return;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  const leaf = path[path.length - 1];
  if (Array.isArray(cursor)) {
    const arrayIndex = toArrayIndex(leaf);
    if (arrayIndex === null) return;
    if (arrayIndex < 0 || arrayIndex >= cursor.length) return;
    cursor.splice(arrayIndex, 1);
    return;
  }

  if (!cursor || typeof cursor !== "object") return;
  delete (cursor as Record<string, unknown>)[leaf];
}

function normalizeDiffPatchList(value: unknown) {
  if (!Array.isArray(value)) return [] as ArtifactDiffPatch[];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const op = row.op === "add" || row.op === "remove" || row.op === "replace"
        ? row.op
        : null;
      const path = typeof row.path === "string" ? row.path.trim() : "";
      if (!op || !path.startsWith("/")) return null;
      return {
        op,
        path,
        ...(Object.prototype.hasOwnProperty.call(row, "value")
          ? { value: row.value }
          : {}),
      } as ArtifactDiffPatch;
    })
    .filter((patch): patch is ArtifactDiffPatch => Boolean(patch));
}

type NormalizedNutritionPatch = ArtifactDiffPatch & {
  segments: string[];
};

function normalizeNutritionPatchSet(recommendations: Record<string, unknown>) {
  const patches = [
    ...normalizeDiffPatchList(recommendations.nutritionDiff),
    ...normalizeDiffPatchList(recommendations.mealPlanDiff),
  ];

  return patches
    .map((patch) => {
      const segments = toJsonPointerSegments(patch.path);
      if (!segments.length) return null;
      return {
        ...patch,
        segments,
      } satisfies NormalizedNutritionPatch;
    })
    .filter((patch): patch is NormalizedNutritionPatch => Boolean(patch));
}

function applyNutritionDiffPatchSet(
  activePlan: NutritionPlan,
  patches: NormalizedNutritionPatch[]
) {
  const nextPlan = cloneJsonValue(activePlan) as Record<string, unknown>;

  for (const patch of patches) {
    if (patch.op === "remove") {
      applyRemovePatch(nextPlan, patch.segments);
      continue;
    }
    applyAddOrReplacePatch(nextPlan, patch.segments, patch.value);
  }

  return nextPlan;
}

async function createNutritionDraftFromCheckinDiff(args: {
  supabaseUser: SupabaseUserClient;
  userId: string;
  threadId: string;
  activeNutritionPlan: NutritionPlan;
  recommendations: Record<string, unknown>;
}) {
  const patches = normalizeNutritionPatchSet(args.recommendations);
  if (!patches.length) {
    return {
      updated: false,
      version: null,
    } as const;
  }

  const patchedPlan = applyNutritionDiffPatchSet(
    args.activeNutritionPlan,
    patches
  );
  if (!isValidNutritionPlan(patchedPlan)) {
    return { error: "Patched nutrition draft plan failed validation." } as const;
  }

  const draftTitle =
    typeof patchedPlan.title === "string" && patchedPlan.title.trim().length
      ? patchedPlan.title.trim()
      : args.activeNutritionPlan.title;

  const draftRes = await createDraftPlanVersion(args.supabaseUser, {
    userId: args.userId,
    threadId: args.threadId,
    planType: "nutrition",
    title: draftTitle,
    planJson: patchedPlan as Record<string, unknown>,
  });
  if ("error" in draftRes) return { error: draftRes.error } as const;

  return {
    updated: true,
    version: Number.isFinite(draftRes.row?.version)
      ? Number(draftRes.row.version)
      : null,
  } as const;
}

function validateWorkoutIntake(input: unknown): input is WorkoutIntake {
  const intake = input as WorkoutIntake;
  if (!intake || typeof intake !== "object") return false;
  const validGoal = ["strength", "fat_loss", "recomp"].includes(intake.goal);
  const validExperience = ["beginner", "intermediate", "advanced"].includes(intake.experience);
  const validSession = [30, 45, 60, 75].includes(intake.sessionMinutes as number);
  const validEquipment = ["full_gym", "home_basic"].includes(intake.equipment);
  const validInjury = typeof intake.injuryNotes === "string";
  const validDays = Number.isFinite(intake.daysPerWeek) && clampDays(intake.daysPerWeek) === intake.daysPerWeek;
  return Boolean(validGoal && validExperience && validSession && validEquipment && validInjury && validDays);
}

function validateNutritionIntake(input: unknown): input is NutritionIntake {
  const intake = input as NutritionIntake;
  if (!intake || typeof intake !== "object") return false;

  const validHeight = Number.isFinite(intake.heightCm) && intake.heightCm >= 120 && intake.heightCm <= 230;
  const validWeight = Number.isFinite(intake.weightKg) && intake.weightKg >= 35 && intake.weightKg <= 250;
  const validAge = Number.isFinite(intake.ageYears) && intake.ageYears >= 16 && intake.ageYears <= 85;
  const validSex = intake.sex === "male" || intake.sex === "female" || intake.sex === "other";
  const validGoal = intake.goal === undefined || ["lose", "maintain", "gain"].includes(intake.goal);

  return Boolean(validHeight && validWeight && validAge && validSex && validGoal);
}

function isValidWorkoutPlan(input: unknown): input is WorkoutPlan {
  const plan = input as WorkoutPlan;
  if (!plan || typeof plan !== "object") return false;
  if (typeof plan.title !== "string" || !plan.title.trim()) return false;
  if (!Number.isFinite(plan.daysPerWeek)) return false;
  const days = clampDays(plan.daysPerWeek);
  if (days !== plan.daysPerWeek) return false;
  if (!Array.isArray(plan.notes) || !plan.notes.every((n) => typeof n === "string")) return false;
  if (!Array.isArray(plan.schedule) || plan.schedule.length !== days) return false;
  for (const day of plan.schedule) {
    if (!day || typeof day !== "object") return false;
    if (typeof day.dayLabel !== "string" || typeof day.focus !== "string") return false;
    if (!Array.isArray(day.items) || !day.items.length) return false;
    for (const item of day.items) {
      if (!item || typeof item !== "object") return false;
      if (typeof item.name !== "string" || !item.name.trim()) return false;
      if (typeof item.sets !== "string" || !item.sets.trim()) return false;
      if (typeof item.reps !== "string" || !item.reps.trim()) return false;
    }
  }
  return true;
}

function normalizeWorkoutIntake(intake: WorkoutIntake): WorkoutIntake {
  return {
    ...intake,
    daysPerWeek: clampDays(intake.daysPerWeek),
    injuryNotes: intake.injuryNotes?.trim?.() ?? "",
  };
}

function normalizeNutritionIntake(intake: NutritionIntake): NutritionIntake {
  return {
    ...intake,
    heightCm: Math.max(120, Math.min(230, Math.round(intake.heightCm))),
    weightKg: Math.max(35, Math.min(250, Math.round(intake.weightKg * 10) / 10)),
    ageYears: Math.max(16, Math.min(85, Math.round(intake.ageYears))),
    goal: intake.goal ?? undefined,
  };
}

function isValidNutritionPlan(input: unknown): input is NutritionPlan {
  const plan = input as NutritionPlan;
  if (!plan || typeof plan !== "object") return false;
  if (typeof plan.title !== "string" || !plan.title.trim()) return false;
  if (!Number.isFinite(plan.dailyCaloriesTarget) || plan.dailyCaloriesTarget <= 0) return false;
  if (!plan.macros || typeof plan.macros !== "object") return false;
  if (!Number.isFinite(plan.macros.proteinG) || plan.macros.proteinG <= 0) return false;
  if (!Number.isFinite(plan.macros.carbsG) || plan.macros.carbsG < 0) return false;
  if (!Number.isFinite(plan.macros.fatsG) || plan.macros.fatsG <= 0) return false;
  if (!Array.isArray(plan.notes) || !plan.notes.every((n) => typeof n === "string")) return false;
  if (!Array.isArray(plan.meals) || !plan.meals.length) return false;
  for (const meal of plan.meals) {
    if (!meal || typeof meal !== "object") return false;
    if (typeof meal.name !== "string" || !meal.name.trim()) return false;
    if (!Number.isFinite(meal.targetCalories) || meal.targetCalories <= 0) return false;
    if (!Array.isArray(meal.items) || !meal.items.length) return false;
    if (!meal.items.every((item) => typeof item === "string" && item.trim().length > 0)) return false;
  }
  return true;
}

function isValidPlanForType(input: unknown, planType: PlanType): input is CoachPlan {
  return planType === "nutrition" ? isValidNutritionPlan(input) : isValidWorkoutPlan(input);
}

function normalizeIntakeForType(intake: CoachIntake, planType: PlanType): CoachIntake {
  return planType === "nutrition"
    ? normalizeNutritionIntake(intake as NutritionIntake)
    : normalizeWorkoutIntake(intake as WorkoutIntake);
}

function validateIntakeForType(input: unknown, planType: PlanType): input is CoachIntake {
  return planType === "nutrition" ? validateNutritionIntake(input) : validateWorkoutIntake(input);
}

function resolveSpecialization(body: RequestBody): CoachSpecialization {
  if (body.specialization === "nutrition" || body.plan_type === "nutrition") {
    return "nutrition";
  }
  return "workout";
}

function isValidCoachGender(value: unknown): value is CoachGender {
  return value === "woman" || value === "man";
}

function isValidCoachPersonality(value: unknown): value is CoachPersonality {
  return (
    value === "strict" ||
    value === "sweet" ||
    value === "relaxed" ||
    value === "bubbly" ||
    value === "hype" ||
    value === "analyst"
  );
}

function normalizeMealTargets(
  meals: NutritionPlan["meals"],
  dailyCaloriesTarget: number
): NutritionPlan["meals"] {
  if (!Array.isArray(meals) || meals.length === 0) {
    const defaults = [35, 30, 20, 15];
    const names = ["Breakfast", "Lunch", "Dinner", "Snack"];
    return defaults.map((pct, index) => ({
      name: names[index],
      targetCalories: Math.round((dailyCaloriesTarget * pct) / 100),
      items: ["Coach-selected meal option"],
    }));
  }

  const total = meals.reduce((sum, meal) => sum + Math.max(0, meal.targetCalories || 0), 0);
  if (total <= 0) {
    const even = Math.round(dailyCaloriesTarget / meals.length);
    return meals.map((meal) => ({
      name: meal.name,
      targetCalories: even,
      items: meal.items,
    }));
  }

  return meals.map((meal) => ({
    name: meal.name,
    targetCalories: Math.max(80, Math.round((Math.max(0, meal.targetCalories || 0) / total) * dailyCaloriesTarget)),
    items: meal.items,
  }));
}

function hasPlanRevisionCue(message: string) {
  const lower = message.toLowerCase();
  const hasPlanWord = /\b(plan|workout|routine|program|split|schedule)\b/.test(lower);
  const hasReviseWord = /\b(change|revise|update|edit|adjust|modify|set|make|switch)\b/.test(lower);
  const hasDaysPattern = /\b([1-7])\s*(days?|x)\s*(\/\s*week|per\s*week|a\s*week)\b/.test(lower)
    || /\bdays?\s*(\/\s*week|per\s*week)\b/.test(lower);

  if (hasDaysPattern) return true;
  return hasPlanWord && hasReviseWord;
}

function extractDaysPerWeekFromMessage(message: string) {
  const lower = message.toLowerCase();
  const numberWordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  const explicitPatterns = [
    /\b([1-7])\s*(?:days?|x)\s*(?:\/\s*week|per\s*week|a\s*week)\b/i,
    /\bdays?\s*(?:\/\s*week|per\s*week)\s*(?:to|=|at)?\s*([1-7])\b/i,
    /\b([1-7])\s*days?\b/i,
    /\b(one|two|three|four|five|six|seven)\s*(?:days?|x)\s*(?:\/\s*week|per\s*week|a\s*week)\b/i,
    /\b(one|two|three|four|five|six|seven)\s*days?\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = lower.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 7) {
      return parsed;
    }
    const mapped = numberWordMap[match[1]];
    if (Number.isFinite(mapped) && mapped >= 1 && mapped <= 7) {
      return mapped;
    }
  }

  const hasPlanContext = /\b(plan|workout|routine|program|split|schedule)\b/.test(lower)
    && /\b(change|revise|update|edit|adjust|modify|set|make|switch)\b/.test(lower);
  if (!hasPlanContext) return null;

  const contextualPatterns = [
    /\b(?:to|at|for)\s*([1-7])\s*days?\b/i,
    /\bmake(?:\s+this|\s+my|\s+the)?\s*([1-7])\s*days?\b/i,
    /\bset(?:\s+it)?\s*to\s*([1-7])\s*days?\b/i,
    /\b(?:to|at|for)\s*(one|two|three|four|five|six|seven)\s*days?\b/i,
    /\bhow\s+about\s+(one|two|three|four|five|six|seven)\b/i,
  ];

  for (const pattern of contextualPatterns) {
    const match = lower.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 7) {
      return parsed;
    }
    const mapped = numberWordMap[match[1]];
    if (Number.isFinite(mapped) && mapped >= 1 && mapped <= 7) {
      return mapped;
    }
  }

  return null;
}

function extractGoalFromMessage(message: string): PlanGoal | null {
  const lower = message.toLowerCase();

  if (/\bstrength\b/.test(lower)) return "strength";
  if (/\b(recomp|recomposition|body recomposition)\b/.test(lower)) return "recomp";
  if (/\b(fat loss|lose fat|weight loss|lose weight|lean out|cutting)\b/.test(lower)) return "fat_loss";
  return null;
}

function hasFocusRevisionCue(message: string) {
  const lower = message.toLowerCase();
  const goal = extractGoalFromMessage(message);
  if (!goal) return false;

  const directCue = /\b(more|less|focus|emphasis|priorit(?:y|ize)|shift|switch|toward|towards|just)\b/.test(lower);
  const changeCue = /\b(change|revise|update|edit|adjust|modify|set|make|switch|want|need|can|could|should|let's|lets)\b/.test(lower);
  return directCue || changeCue;
}

function hasRevisionInstructionContext(message: string) {
  const lower = message.toLowerCase();
  return /\b(change|revise|update|edit|adjust|modify|set|make|switch|drop|increase|decrease|cut|bump)\b/.test(lower)
    || /\b(can|could|would|should)\s+(you|we|i)\b/.test(lower)
    || /\bplease\b/.test(lower)
    || /\b(i want|i'd like|i wanna|i need|let's|lets)\b/.test(lower)
    || /\bmy plan\b/.test(lower);
}

function extractStandaloneDaysReply(message: string) {
  const lower = message.toLowerCase().trim();
  if (!lower) return null;

  const digit = lower.match(/^([1-7])$/);
  if (digit?.[1]) return Number(digit[1]);

  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  return words[lower] ?? null;
}

function assistantAskedForDaysTarget(message: string | null | undefined) {
  if (!message?.trim()) return false;
  const lower = message.toLowerCase();
  return /\b(how many|what)\s+(days?|day)\b/.test(lower)
    || /\bdays?\s*(\/\s*week|per\s*week|a\s*week)\b/.test(lower)
    || /\btarget\b.*\bdays?\b/.test(lower)
    || /\b(what feels realistic|what do you think you can do)\b/.test(lower);
}

function extractFirstJsonObject(text: string) {
  const source = text.trim();
  const start = source.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  return null;
}

function extractWorkoutPlanPayloadFromText(text: string) {
  const candidate = extractFirstJsonObject(text);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as WorkoutPlan | WorkoutPlanPayload;

    if (isValidWorkoutPlan(parsed)) {
      return {
        assistantText: "",
        plan: parsed as WorkoutPlan,
      };
    }

    if (typeof parsed?.assistant_text === "string" && isValidWorkoutPlan(parsed?.plan_json)) {
      return {
        assistantText: parsed.assistant_text.trim(),
        plan: parsed.plan_json as WorkoutPlan,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function looksLikeWorkoutPlanText(text: string) {
  const lower = text.toLowerCase();
  if (lower.length < 220) return false;

  const dayMatches = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day\s*[1-7])\b/g)?.length ?? 0;
  const trainingTerms = lower.match(/\b(sets?|reps?|warm-?up|cool-?down|superset|exercise|workout|rest day)\b/g)?.length ?? 0;
  const listRows = text.split("\n").filter((line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line)).length;

  if (dayMatches >= 2 && trainingTerms >= 3) return true;
  if (trainingTerms >= 6 && listRows >= 4) return true;
  return false;
}

async function classifyPlanRevisionIntent(openAiKey: string, model: string, message: string) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["intent", "days_per_week"],
    properties: {
      intent: {
        type: "string",
        enum: ["none", "revise_days", "revise_days_missing_days"],
      },
      days_per_week: {
        type: ["integer", "null"],
        minimum: 1,
        maximum: 7,
      },
    },
  };

  const prompt = [
    "Classify this user message for workout-plan edits.",
    "Use revise_days only if the user is asking to change days/week in their plan.",
    "Use revise_days_missing_days if they ask to change the plan but do not provide a numeric days/week target.",
    "If the message only reports past/current behavior and does not request a plan change, use none.",
    "Use none for everything else.",
    "Return JSON only.",
    `Message: ${message}`,
  ].join("\n");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 120,
      messages: [
        { role: "system", content: "You classify intent for workout-plan updates." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "coach_plan_intent",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${errText}`);
  }

  const jsonResp = await resp.json();
  const raw = jsonResp?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    throw new Error("Classifier did not return structured content.");
  }

  const parsed = JSON.parse(raw) as PlanRevisionClassifierResult;
  const intent = parsed?.intent;
  const days = parsed?.days_per_week;

  if (intent === "revise_days") {
    if (typeof days === "number" && Number.isFinite(days)) {
      return { kind: "revise_days", daysPerWeek: clampDays(days) } as const;
    }
    return { kind: "revise_days_missing_days" } as const;
  }

  if (intent === "revise_days_missing_days") {
    return { kind: "revise_days_missing_days" } as const;
  }

  return { kind: "none" } as const;
}

async function persistThreadIntake(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  userId: string,
  intake: CoachIntake
) {
  const { error: updateThreadErr } = await supabaseUser
    .from("coach_threads")
    .update({
      intake_json: intake,
      intake_updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", userId);

  if (updateThreadErr) return { error: updateThreadErr.message } as const;
  return { ok: true } as const;
}

async function applyDaysRevisionToThreadIntake(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  userId: string,
  intake: WorkoutIntake,
  daysPerWeek: number
) {
  const nextIntake = normalizeWorkoutIntake({ ...intake, daysPerWeek: clampDays(daysPerWeek) });
  const persistRes = await persistThreadIntake(supabaseUser, threadId, userId, nextIntake);
  if ("error" in persistRes) return { error: persistRes.error } as const;
  return { intake: nextIntake } as const;
}

async function applyGoalRevisionToThreadIntake(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  userId: string,
  intake: WorkoutIntake,
  goal: PlanGoal
) {
  const nextIntake = normalizeWorkoutIntake({ ...intake, goal });
  const persistRes = await persistThreadIntake(supabaseUser, threadId, userId, nextIntake);
  if ("error" in persistRes) return { error: persistRes.error } as const;
  return { intake: nextIntake } as const;
}

async function loadFallbackGoalType(supabaseUser: SupabaseUserClient, userId: string) {
  const { data, error } = await supabaseUser
    .from("goals")
    .select("goal_type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { error: error.message } as const;
  return { goalType: data?.goal_type ?? null } as const;
}

async function loadActiveWorkoutDays(supabaseUser: SupabaseUserClient, userId: string) {
  const { data, error } = await supabaseUser
    .from("coach_plans")
    .select("plan_json")
    .eq("user_id", userId)
    .eq("type", "workout")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message } as const;
  if (!isValidWorkoutPlan(data?.plan_json)) return { daysPerWeek: null } as const;
  return { daysPerWeek: data.plan_json.daysPerWeek } as const;
}

async function callStructuredNutritionPlan(
  openAiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["assistant_text", "plan_json"],
    properties: {
      assistant_text: { type: "string" },
      plan_json: {
        type: "object",
        additionalProperties: false,
        required: ["title", "notes", "meals"],
        properties: {
          title: { type: "string" },
          notes: {
            type: "array",
            items: { type: "string" },
          },
          meals: {
            type: "array",
            minItems: 3,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "targetCalories", "items"],
              properties: {
                name: { type: "string" },
                targetCalories: { type: "integer", minimum: 80 },
                items: {
                  type: "array",
                  minItems: 1,
                  maxItems: 6,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1100,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nutrition_plan_payload",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${errText}`);
  }

  const jsonResp = await resp.json();
  const raw = jsonResp?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    throw new Error("Model did not return structured content.");
  }

  const parsed = JSON.parse(raw) as {
    assistant_text?: string;
    plan_json?: {
      title?: string;
      notes?: string[];
      meals?: NutritionPlan["meals"];
    };
  };
  if (typeof parsed?.assistant_text !== "string" || !parsed.assistant_text.trim()) {
    throw new Error("Missing assistant_text.");
  }
  if (!parsed?.plan_json?.title?.trim()) {
    throw new Error("Missing nutrition plan title.");
  }
  if (!Array.isArray(parsed?.plan_json?.notes)) {
    throw new Error("Missing nutrition plan notes.");
  }
  if (!Array.isArray(parsed?.plan_json?.meals) || !parsed.plan_json.meals.length) {
    throw new Error("Missing nutrition plan meals.");
  }

  return {
    assistantText: parsed.assistant_text.trim(),
    title: parsed.plan_json.title.trim(),
    notes: parsed.plan_json.notes,
    meals: parsed.plan_json.meals,
  };
}

async function generateDraftFromIntake(
  supabaseUser: SupabaseUserClient,
  userId: string,
  threadId: string,
  planType: PlanType,
  intake: CoachIntake,
  openAiKey: string,
  planModel: string,
  systemPrompt: string
) {
  const plansResBefore = await loadPlans(supabaseUser, threadId, planType);
  if ("error" in plansResBefore) return { error: plansResBefore.error } as const;

  let generated:
    | { assistantText: string; plan: WorkoutPlan }
    | { assistantText: string; plan: NutritionPlan };

  if (planType === "workout") {
    const workoutIntake = normalizeWorkoutIntake(intake as WorkoutIntake);
    const prompt = [
      "Create or revise a workout plan from the provided intake.",
      "Return strict JSON with assistant_text and plan_json only.",
      `Intake JSON: ${JSON.stringify(workoutIntake)}`,
      `Current active plan summary: ${summarizePlan(plansResBefore.activePlan, "workout")}`,
      "Ensure plan_json.daysPerWeek matches intake.daysPerWeek exactly.",
      "Use realistic exercise choices and simple progression cues.",
    ].join("\n");

    try {
      generated = await callStructuredPlan(openAiKey, planModel, systemPrompt, prompt);
    } catch (e) {
      return { error: String(e) } as const;
    }
  } else {
    const nutritionIntake = normalizeNutritionIntake(intake as NutritionIntake);
    const fallbackGoalRes = await loadFallbackGoalType(supabaseUser, userId);
    if ("error" in fallbackGoalRes) return { error: fallbackGoalRes.error } as const;
    const workoutDaysRes = await loadActiveWorkoutDays(supabaseUser, userId);
    if ("error" in workoutDaysRes) return { error: workoutDaysRes.error } as const;

    const targets = computeNutritionTargets({
      intake: nutritionIntake,
      fallbackGoalType: fallbackGoalRes.goalType,
      workoutDaysPerWeek: workoutDaysRes.daysPerWeek,
    });

    const prompt = [
      "Create or revise a nutrition plan from the provided intake and targets.",
      "Return strict JSON with assistant_text and plan_json only.",
      "Do not alter the calorie or macro targets.",
      `Intake JSON: ${JSON.stringify(nutritionIntake)}`,
      `Fixed targets JSON: ${JSON.stringify({
        goal: targets.goal,
        dailyCaloriesTarget: targets.dailyCaloriesTarget,
        macros: targets.macros,
      })}`,
      `Current active plan summary: ${summarizePlan(plansResBefore.activePlan, "nutrition")}`,
      "Build a realistic 3-6 meal structure with foods users can buy and prep easily.",
    ].join("\n");

    let generatedNutrition;
    try {
      generatedNutrition = await callStructuredNutritionPlan(
        openAiKey,
        planModel,
        systemPrompt,
        prompt
      );
    } catch (e) {
      return { error: String(e) } as const;
    }

    const normalizedMeals = normalizeMealTargets(
      generatedNutrition.meals,
      targets.dailyCaloriesTarget
    );
    const nutritionPlan: NutritionPlan = {
      title: generatedNutrition.title,
      dailyCaloriesTarget: targets.dailyCaloriesTarget,
      macros: targets.macros,
      meals: normalizedMeals,
      notes: generatedNutrition.notes,
    };

    if (!isValidNutritionPlan(nutritionPlan)) {
      return { error: "Generated nutrition plan failed validation." } as const;
    }

    generated = {
      assistantText: generatedNutrition.assistantText,
      plan: nutritionPlan,
    };
  }

  const draftRes = await upsertDraftPlan(
    supabaseUser,
    userId,
    threadId,
    planType,
    generated.plan
  );
  if ("error" in draftRes) return { error: draftRes.error } as const;

  return {
    assistantText: generated.assistantText,
    plan: generated.plan,
  } as const;
}

async function detectPlanRevisionIntent(
  openAiKey: string,
  model: string,
  message: string,
  lastAssistantMessage: string | null | undefined
) {
  const standaloneDays = extractStandaloneDaysReply(message);
  if (standaloneDays !== null && assistantAskedForDaysTarget(lastAssistantMessage)) {
    return { kind: "revise_days", daysPerWeek: standaloneDays } as const;
  }

  const explicitDays = extractDaysPerWeekFromMessage(message);
  if (explicitDays !== null && hasRevisionInstructionContext(message)) {
    return { kind: "revise_days", daysPerWeek: explicitDays } as const;
  }

  const explicitGoal = extractGoalFromMessage(message);
  if (explicitGoal && hasFocusRevisionCue(message)) {
    return { kind: "revise_focus", goal: explicitGoal } as const;
  }

  if (!hasPlanRevisionCue(message)) {
    return { kind: "none" } as const;
  }

  return classifyPlanRevisionIntent(openAiKey, model, message);
}

function summarizePlan(plan: CoachPlan | null, planType: PlanType) {
  if (!plan) return "No active plan.";
  if (planType === "workout" && isValidWorkoutPlan(plan)) {
    const focuses = plan.schedule.slice(0, 7).map((d) => d.focus).join(" | ");
    return `Active plan: ${plan.title}; ${plan.daysPerWeek} days/week; focuses: ${focuses}`;
  }
  if (planType === "nutrition" && isValidNutritionPlan(plan)) {
    return `Active plan: ${plan.title}; ${plan.dailyCaloriesTarget} kcal/day; macros P${plan.macros.proteinG}/C${plan.macros.carbsG}/F${plan.macros.fatsG}`;
  }
  return "No active plan.";
}

async function loadThreadMessages(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  limit: number
) {
  const { data: rows, error } = await supabaseUser
    .from("coach_messages")
    .select("id, role, content, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message } as const;
  return { messages: (rows ?? []).slice().reverse() as ApiMessage[] } as const;
}

async function loadPlans(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  planType: PlanType
) {
  const { data: rows, error } = await supabaseUser
    .from("coach_plans")
    .select("id, status, title, plan_json, version, updated_at")
    .eq("thread_id", threadId)
    .eq("type", planType)
    .in("status", ["active", "draft"])
    .order("version", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message } as const;

  let activePlan: CoachPlan | null = null;
  let draftPlan: CoachPlan | null = null;
  let activePlanVersion: number | null = null;
  let draftPlanVersion: number | null = null;

  for (const row of rows ?? []) {
    if (!isValidPlanForType(row.plan_json, planType)) continue;
    if (row.status === "active" && !activePlan) {
      activePlan = row.plan_json as CoachPlan;
      activePlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
    }
    if (row.status === "draft" && !draftPlan) {
      draftPlan = row.plan_json as CoachPlan;
      draftPlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
    }
  }

  return { activePlan, draftPlan, activePlanVersion, draftPlanVersion } as const;
}

async function loadActivePlanVersionForUser(
  supabaseUser: SupabaseUserClient,
  userId: string,
  planType: PlanType
) {
  const { data, error } = await supabaseUser
    .from("coach_plans")
    .select("version")
    .eq("user_id", userId)
    .eq("type", planType)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message } as const;
  return {
    version: Number.isFinite(data?.version) ? Number(data?.version) : null,
  } as const;
}

function normalizeWeeklyWeightSnapshot(
  input: unknown,
  preferredUnit: WeightUnit
): WeeklyWeightSnapshot {
  const snapshot = input as Partial<WeeklyWeightSnapshot> | null | undefined;
  const unit = isValidWeightUnit(snapshot?.unit) ? snapshot!.unit : preferredUnit;
  const entries = Number.isFinite(snapshot?.entries) ? Math.max(0, Math.round(snapshot!.entries as number)) : 0;
  const startWeight = Number.isFinite(snapshot?.startWeight as number)
    ? roundWeight(Number(snapshot!.startWeight))
    : null;
  const endWeight = Number.isFinite(snapshot?.endWeight as number)
    ? roundWeight(Number(snapshot!.endWeight))
    : null;
  const delta = Number.isFinite(snapshot?.delta as number)
    ? roundWeight(Number(snapshot!.delta))
    : null;
  const trend: WeightTrend =
    snapshot?.trend === "down" ||
    snapshot?.trend === "flat" ||
    snapshot?.trend === "up" ||
    snapshot?.trend === "no_data"
      ? snapshot.trend
      : "no_data";

  return {
    unit,
    entries,
    startWeight,
    endWeight,
    delta,
    trend,
  };
}

async function buildWeeklyWeightSnapshot(
  supabaseUser: SupabaseUserClient,
  userId: string,
  weekStart: string,
  weekEnd: string,
  preferredUnit: WeightUnit
) {
  const { data: rows, error } = await supabaseUser
    .from("weigh_ins")
    .select("weight, unit, local_date, recorded_at")
    .eq("user_id", userId)
    .gte("local_date", weekStart)
    .lte("local_date", weekEnd)
    .order("local_date", { ascending: true })
    .order("recorded_at", { ascending: true });

  if (error) return { error: error.message } as const;

  const converted = (rows ?? [])
    .map((row) => {
      const rawWeight = Number(row.weight);
      const fromUnit = isValidWeightUnit(row.unit) ? row.unit : preferredUnit;
      if (!Number.isFinite(rawWeight)) return null;
      const convertedWeight = roundWeight(convertWeight(rawWeight, fromUnit, preferredUnit));
      if (!Number.isFinite(convertedWeight)) return null;
      return convertedWeight;
    })
    .filter((weight): weight is number => Number.isFinite(weight));

  const entries = converted.length;
  const startWeight = entries ? converted[0] : null;
  const endWeight = entries ? converted[entries - 1] : null;
  const delta =
    startWeight !== null && endWeight !== null ? roundWeight(endWeight - startWeight) : null;
  const trend: WeightTrend =
    entries < 2 || delta === null
      ? "no_data"
      : delta <= -0.2
        ? "down"
        : delta >= 0.2
          ? "up"
          : "flat";

  return {
    snapshot: {
      unit: preferredUnit,
      entries,
      startWeight,
      endWeight,
      delta,
      trend,
    } satisfies WeeklyWeightSnapshot,
  } as const;
}

function mapWeeklyCheckinRow(
  row: Record<string, unknown>,
  preferredUnit: WeightUnit
): WeeklyCheckinRow {
  const checkinJson =
    row.checkin_json && typeof row.checkin_json === "object"
      ? (row.checkin_json as Record<string, unknown>)
      : null;
  const adjustmentJson =
    row.adjustment_json && typeof row.adjustment_json === "object"
      ? (row.adjustment_json as Record<string, unknown>)
      : null;

  return {
    id: String(row.id ?? ""),
    week_start: String(row.week_start ?? ""),
    week_end: String(row.week_end ?? ""),
    energy: Number(row.energy ?? 0),
    adherence_percent: Number(row.adherence_percent ?? 0),
    blockers: String(row.blockers ?? ""),
    weight_snapshot: normalizeWeeklyWeightSnapshot(row.weight_snapshot, preferredUnit),
    checkin_json: checkinJson,
    adherence_score: Number.isFinite(row.adherence_score) ? Number(row.adherence_score) : null,
    workout_plan_version: Number.isFinite(row.workout_plan_version)
      ? Number(row.workout_plan_version)
      : null,
    nutrition_plan_version: Number.isFinite(row.nutrition_plan_version)
      ? Number(row.nutrition_plan_version)
      : null,
    adjustment_json: adjustmentJson,
    coach_summary: typeof row.coach_summary === "string" ? row.coach_summary : null,
    summary_model: typeof row.summary_model === "string" ? row.summary_model : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

async function loadWeeklyCheckins(
  supabaseUser: SupabaseUserClient,
  userId: string,
  specialization: CoachSpecialization,
  preferredUnit: WeightUnit,
  limit: number
) {
  const { data: rows, error } = await supabaseUser
    .from("coach_weekly_checkins")
    .select(
      "id, week_start, week_end, energy, adherence_percent, blockers, weight_snapshot, checkin_json, adherence_score, workout_plan_version, nutrition_plan_version, adjustment_json, coach_summary, summary_model, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .order("week_start", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message } as const;

  return {
    rows: (rows ?? []).map((row) => mapWeeklyCheckinRow(row as Record<string, unknown>, preferredUnit)),
  } as const;
}

async function loadWeeklyCheckinByWeek(
  supabaseUser: SupabaseUserClient,
  userId: string,
  specialization: CoachSpecialization,
  weekStart: string,
  preferredUnit: WeightUnit
) {
  const { data, error } = await supabaseUser
    .from("coach_weekly_checkins")
    .select(
      "id, week_start, week_end, energy, adherence_percent, blockers, weight_snapshot, checkin_json, adherence_score, workout_plan_version, nutrition_plan_version, adjustment_json, coach_summary, summary_model, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) return { error: error.message } as const;
  if (!data) return { row: null } as const;

  return {
    row: mapWeeklyCheckinRow(data as Record<string, unknown>, preferredUnit),
  } as const;
}

function compactPromptText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trimEnd();
}

function formatWeightForPrompt(value: number | null, unit: WeightUnit) {
  if (!Number.isFinite(value as number)) return "n/a";
  return `${roundWeight(Number(value))} ${unit}`;
}

function formatWeightSnapshotForPrompt(snapshot: WeeklyWeightSnapshot) {
  if (!snapshot.entries) {
    return `No weigh-ins logged this week (${snapshot.unit}).`;
  }

  const deltaText =
    snapshot.delta === null
      ? "n/a"
      : `${snapshot.delta > 0 ? "+" : ""}${roundWeight(snapshot.delta)} ${snapshot.unit}`;

  return [
    `Entries: ${snapshot.entries}`,
    `Start: ${formatWeightForPrompt(snapshot.startWeight, snapshot.unit)}`,
    `End: ${formatWeightForPrompt(snapshot.endWeight, snapshot.unit)}`,
    `Trend: ${snapshot.trend}`,
    `Delta: ${deltaText}`,
  ].join("; ");
}

function summarizeRecentNutritionCheckinsForPrompt(
  rows: WeeklyCheckinRow[],
  currentWeekStart: string
) {
  const recent = rows
    .filter((row) => row.week_start !== currentWeekStart)
    .slice(0, 3)
    .map((row) => {
      const deltaText =
        row.weight_snapshot.delta === null
          ? "n/a"
          : `${row.weight_snapshot.delta > 0 ? "+" : ""}${roundWeight(row.weight_snapshot.delta)} ${row.weight_snapshot.unit}`;
      return `${row.week_start}: energy ${row.energy}/5, adherence ${row.adherence_percent}%, trend ${row.weight_snapshot.trend}, delta ${deltaText}, blockers "${compactPromptText(row.blockers, 140)}"`;
    });

  return recent.length ? recent.join("\n") : "No prior weekly check-ins available.";
}

type CheckinSummaryGenerationFailureCategory = "malformed_output" | "openai" | "timeout";
type CheckinSummaryGenerationError = Error & {
  summary_failure_category?: CheckinSummaryGenerationFailureCategory;
};

function createSummaryGenerationError(
  category: CheckinSummaryGenerationFailureCategory,
  message: string
) {
  const error = new Error(message) as CheckinSummaryGenerationError;
  error.summary_failure_category = category;
  return error;
}

async function generateNutritionWeeklyCoachSummary(args: {
  openAiKey: string;
  models: string[];
  coachName: string;
  coachSystemPrompt: string;
  weekStart: string;
  weekEnd: string;
  checkin: WeeklyCheckinRow;
  weightSnapshot: WeeklyWeightSnapshot;
  preferredUnit: WeightUnit;
  activePlan: CoachPlan | null;
  recentCheckins: WeeklyCheckinRow[];
  timeoutMs: number;
}) {
  const normalizedCheckinArtifact = normalizeWeeklyCheckinArtifact(args.checkin.checkin_json ?? {}, {
    workoutVersion: Number.isFinite(args.checkin.workout_plan_version)
      ? Number(args.checkin.workout_plan_version)
      : null,
    nutritionVersion: Number.isFinite(args.checkin.nutrition_plan_version)
      ? Number(args.checkin.nutrition_plan_version)
      : null,
    computedAdherenceScore: Number.isFinite(args.checkin.adherence_score)
      ? Number(args.checkin.adherence_score)
      : args.checkin.adherence_percent,
  });

  const scheduleNotes = normalizedCheckinArtifact.scheduleConstraintsNextWeek.trim();
  const appetiteNotes = normalizedCheckinArtifact.appetiteCravings.trim();
  const summaryWeightUnit: WeightUnit = args.preferredUnit === "kg" ? "kg" : "lb";
  const latestLoggedWeightInSummaryUnit = Number.isFinite(args.weightSnapshot.endWeight)
    ? Number(
        convertWeight(
          Number(args.weightSnapshot.endWeight),
          args.weightSnapshot.unit,
          summaryWeightUnit
        ).toFixed(1)
      )
    : null;
  const reportedWeightInSummaryUnit = Number(
    convertWeight(
      normalizedCheckinArtifact.currentWeightKg,
      "kg",
      summaryWeightUnit
    ).toFixed(1)
  );
  const reportedWeightDeltaInSummaryUnit = Number.isFinite(latestLoggedWeightInSummaryUnit)
    ? Number((reportedWeightInSummaryUnit - Number(latestLoggedWeightInSummaryUnit)).toFixed(1))
    : null;
  const hasSignificantWeightDelta = Number.isFinite(reportedWeightDeltaInSummaryUnit)
    && Math.abs(Number(reportedWeightDeltaInSummaryUnit)) >= 1;

  const systemPrompt = [
    args.coachSystemPrompt,
    "",
    "Task: write a weekly nutrition check-in summary for this user.",
    "Maintain the same coach persona, voice, and accountability style defined above.",
    "Return plain natural language only.",
    "Keep it concise: 2-4 sentences and at most 120 words.",
    "Mention adherence, energy, blockers, and weight trend if data exists.",
    `Use ${summaryWeightUnit} units for any weight mentions.`,
    hasSignificantWeightDelta
      ? "Explicitly mention the reported check-in weight difference vs latest logged scale weight and tie it to your adjustment rationale."
      : "If reported and logged scale weights differ materially, mention it briefly.",
    "Include one concrete next-week focus action.",
    "No markdown, bullet lists, or JSON.",
  ].join("\n");

  const userPrompt = [
    `Coach: ${args.coachName}`,
    `Week: ${args.weekStart} to ${args.weekEnd}`,
    `Current check-in: energy ${args.checkin.energy}/5, adherence ${args.checkin.adherence_percent}%, blockers "${compactPromptText(args.checkin.blockers, 220) || "none reported"}"`,
    `Reported check-in details: current weight ${reportedWeightInSummaryUnit}${summaryWeightUnit}, training difficulty ${normalizedCheckinArtifact.trainingDifficulty}, recovery ${normalizedCheckinArtifact.recoveryRating}/5, sleep ${normalizedCheckinArtifact.sleepAvgHours}h (${normalizedCheckinArtifact.sleepQuality}/5), stress ${normalizedCheckinArtifact.stressLevel}/5.`,
    `Reported vs latest logged scale: reported ${reportedWeightInSummaryUnit}${summaryWeightUnit}, latest logged ${latestLoggedWeightInSummaryUnit ?? "n/a"}${summaryWeightUnit}, delta ${Number.isFinite(reportedWeightDeltaInSummaryUnit) ? `${reportedWeightDeltaInSummaryUnit > 0 ? "+" : ""}${reportedWeightDeltaInSummaryUnit}${summaryWeightUnit}` : "n/a"}.`,
    `Reported appetite/cravings: ${compactPromptText(appetiteNotes, 180) || "none reported"}`,
    `Upcoming schedule constraints: ${compactPromptText(scheduleNotes, 180) || "none reported"}`,
    `Weight snapshot: ${formatWeightSnapshotForPrompt(args.weightSnapshot)}`,
    `Active nutrition plan: ${summarizePlan(args.activePlan, "nutrition")}`,
    "Recent prior check-ins:",
    summarizeRecentNutritionCheckinsForPrompt(args.recentCheckins, args.weekStart),
    "Write the weekly coach summary now.",
  ].join("\n");

  const modelErrors: string[] = [];
  const failureCategories: CheckinSummaryGenerationFailureCategory[] = [];
  const uniqueModels = Array.from(new Set(args.models.map((model) => model.trim()).filter(Boolean)));

  for (const model of uniqueModels) {
    try {
      const rawSummary = await callChat(
        args.openAiKey,
        model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        0.3,
        220,
        { timeoutMs: args.timeoutMs }
      );
      const summary = compactPromptText(rawSummary, 600);
      if (!summary) {
        modelErrors.push(`${model}: malformed_output(empty)`);
        failureCategories.push("malformed_output");
        continue;
      }
      return { summary, model } as const;
    } catch (error) {
      const raw = String(error);
      modelErrors.push(`${model}: ${raw}`);
      failureCategories.push(raw.toLowerCase().includes("timeout") ? "timeout" : "openai");
    }
  }

  const uniqueCategories = Array.from(new Set(failureCategories));
  if (uniqueCategories.length === 1 && uniqueCategories[0] === "malformed_output") {
    throw createSummaryGenerationError(
      "malformed_output",
      `Summary generation failed with malformed output. ${modelErrors.join(" | ")}`
    );
  }
  if (uniqueCategories.length === 1 && uniqueCategories[0] === "timeout") {
    throw createSummaryGenerationError(
      "timeout",
      `Summary generation timed out. ${modelErrors.join(" | ")}`
    );
  }
  throw createSummaryGenerationError(
    "openai",
    `Summary generation failed for all models. ${modelErrors.join(" | ")}`
  );
}

async function upsertWeeklyCheckin(
  supabaseUser: SupabaseUserClient,
  args: {
    userId: string;
    specialization: CoachSpecialization;
    threadId: string;
    coachProfileId: string;
    weekStart: string;
    weekEnd: string;
    energy: number;
    adherencePercent: number;
    blockers: string;
    weightSnapshot: WeeklyWeightSnapshot;
    checkinJson?: Record<string, unknown> | null;
    adherenceScore?: number | null;
    workoutPlanVersion?: number | null;
    nutritionPlanVersion?: number | null;
    adjustmentJson?: Record<string, unknown> | null;
    coachSummary?: string | null;
    summaryModel?: string | null;
  },
  preferredUnit: WeightUnit
) {
  const { data, error } = await supabaseUser
    .from("coach_weekly_checkins")
    .upsert(
      {
        user_id: args.userId,
        specialization: args.specialization,
        thread_id: args.threadId,
        coach_profile_id: args.coachProfileId,
        week_start: args.weekStart,
        week_end: args.weekEnd,
        energy: args.energy,
        adherence_percent: args.adherencePercent,
        blockers: args.blockers,
        weight_snapshot: args.weightSnapshot,
        checkin_json: args.checkinJson ?? {},
        adherence_score: Number.isFinite(args.adherenceScore) ? args.adherenceScore : args.adherencePercent,
        workout_plan_version: Number.isFinite(args.workoutPlanVersion)
          ? args.workoutPlanVersion
          : null,
        nutrition_plan_version: Number.isFinite(args.nutritionPlanVersion)
          ? args.nutritionPlanVersion
          : null,
        adjustment_json: args.adjustmentJson ?? null,
        coach_summary: typeof args.coachSummary === "string" ? args.coachSummary : null,
        summary_model: typeof args.summaryModel === "string" ? args.summaryModel : null,
      },
      {
        onConflict: "user_id,specialization,week_start",
      }
    )
    .select(
      "id, week_start, week_end, energy, adherence_percent, blockers, weight_snapshot, checkin_json, adherence_score, workout_plan_version, nutrition_plan_version, adjustment_json, coach_summary, summary_model, created_at, updated_at"
    )
    .single();

  if (error) return { error: error.message } as const;

  return {
    row: mapWeeklyCheckinRow(data as Record<string, unknown>, preferredUnit),
  } as const;
}

async function updateWeeklyCheckinSummary(
  supabaseUser: SupabaseUserClient,
  args: {
    checkinId: string;
    userId: string;
    coachSummary: string;
    summaryModel: string;
  },
  preferredUnit: WeightUnit
) {
  const { data, error } = await supabaseUser
    .from("coach_weekly_checkins")
    .update({
      coach_summary: args.coachSummary,
      summary_model: args.summaryModel,
    })
    .eq("id", args.checkinId)
    .eq("user_id", args.userId)
    .select(
      "id, week_start, week_end, energy, adherence_percent, blockers, weight_snapshot, checkin_json, adherence_score, workout_plan_version, nutrition_plan_version, adjustment_json, coach_summary, summary_model, created_at, updated_at"
    )
    .single();

  if (error) return { error: error.message } as const;

  return {
    row: mapWeeklyCheckinRow(data as Record<string, unknown>, preferredUnit),
  } as const;
}

async function upsertDraftPlan(
  supabaseUser: SupabaseUserClient,
  userId: string,
  threadId: string,
  planType: PlanType,
  plan: CoachPlan
) {
  const result = await createDraftPlanVersion(supabaseUser, {
    userId,
    threadId,
    planType,
    title: plan.title,
    planJson: plan as Record<string, unknown>,
  });
  if ("error" in result) return { error: result.error } as const;
  return { ok: true } as const;
}

async function insertMessage(
  supabaseUser: SupabaseUserClient,
  threadId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: { cta?: "review_draft_plan" } | null
) {
  const { data, error } = await supabaseUser
    .from("coach_messages")
    .insert({ thread_id: threadId, role, content, metadata: metadata ?? null })
    .select("id, role, content, metadata, created_at")
    .single();

  if (error) return { error: error.message } as const;
  return { data } as const;
}

async function updateLastMessageAt(supabaseUser: SupabaseUserClient, threadId: string) {
  await supabaseUser
    .from("coach_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);
}

async function callChat(
  openAiKey: string,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.7,
  maxTokens = 300,
  options?: { timeoutMs?: number }
) {
  const timeoutMs = Number.isFinite(options?.timeoutMs) ? Math.max(1000, Number(options?.timeoutMs)) : 0;
  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller?.abort(), timeoutMs)
    : null;

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller?.signal,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new Error(`OpenAI timeout after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${errText}`);
  }

  const jsonResp = await resp.json();
  const text = jsonResp?.choices?.[0]?.message?.content?.trim?.() ?? "";
  return text;
}

async function callStructuredPlan(
  openAiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["assistant_text", "plan_json"],
    properties: {
      assistant_text: { type: "string" },
      plan_json: {
        type: "object",
        additionalProperties: false,
        required: ["title", "daysPerWeek", "notes", "schedule"],
        properties: {
          title: { type: "string" },
          daysPerWeek: { type: "integer", minimum: 1, maximum: 7 },
          notes: { type: "array", items: { type: "string" } },
          schedule: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["dayLabel", "focus", "items"],
              properties: {
                dayLabel: { type: "string" },
                focus: { type: "string" },
                items: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "sets", "reps"],
                    properties: {
                      name: { type: "string" },
                      sets: { type: "string" },
                      reps: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  let parseError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = attempt === 0
      ? userPrompt
      : `${userPrompt}\n\nYour previous output was invalid JSON for this schema. Return only valid JSON matching the schema.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "coach_plan_payload",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${errText}`);
    }

    const jsonResp = await resp.json();
    const raw = jsonResp?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      parseError = "Model did not return structured content.";
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as { assistant_text?: string; plan_json?: unknown };
      if (typeof parsed.assistant_text !== "string" || !parsed.assistant_text.trim()) {
        parseError = "Missing assistant_text.";
        continue;
      }
      if (!isValidWorkoutPlan(parsed.plan_json)) {
        parseError = "Invalid plan_json shape.";
        continue;
      }
      return {
        assistantText: parsed.assistant_text.trim(),
        plan: parsed.plan_json as WorkoutPlan,
      };
    } catch (e) {
      parseError = String(e);
    }
  }

  throw new Error(`Failed to parse structured plan output: ${parseError || "unknown parse error"}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars in function runtime.");
  }
  if (!supabaseServiceRoleKey) {
    return serverError("Missing SUPABASE_SERVICE_ROLE_KEY in function runtime.");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing Authorization bearer token." });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: userErr?.message ?? "Invalid session." });
  }
  const userId = userData.user.id;

  const body = await readJson(req);
  const action = body.action ?? (body.message && body.message.trim() ? "send" : "workspace");
  const limit = Math.max(1, Math.min(52, Math.floor(body.limit ?? 30)));
  const specialization = resolveSpecialization(body);
  const planType: PlanType = body.plan_type ?? specialization;
  if (planType !== specialization) {
    return badRequest("plan_type must match specialization.");
  }

  const { data: profile, error: profileErr } = await supabaseUser
    .from("profiles")
    .select(
      "active_coach_gender, active_coach_personality, membership_tier, timezone, preferred_unit, account_status"
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) return serverError(profileErr.message);
  if (!profile) return badRequest("Profile not found. Complete onboarding first.");
  if (profile.account_status === "pending_deletion") {
    return forbidden("Account is pending deletion.", "ACCOUNT_PENDING_DELETION");
  }
  if (profile.membership_tier !== "pro") {
    return forbidden("Coach access requires Pro.", "TIER_REQUIRES_PRO");
  }
  const profileTimeZone =
    typeof profile.timezone === "string" && profile.timezone.trim().length > 0
      ? profile.timezone
      : "UTC";
  const profilePreferredUnit: WeightUnit = isValidWeightUnit(profile.preferred_unit)
    ? profile.preferred_unit
    : "lb";

  const { data: activeCoachRow, error: activeCoachErr } = await supabaseUser
    .from("active_coaches")
    .select("coach_profile_id")
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .maybeSingle<{ coach_profile_id: string }>();
  if (activeCoachErr) return serverError(activeCoachErr.message);

  let coachProfileId: string | null = activeCoachRow?.coach_profile_id ?? null;
  const hintedCoachGender = isValidCoachGender(body.coach_gender) ? body.coach_gender : null;
  const hintedCoachPersonality = isValidCoachPersonality(body.coach_personality)
    ? body.coach_personality
    : null;

  if (!coachProfileId && hintedCoachGender && hintedCoachPersonality) {
    const { data: hintedCoachProfile, error: hintedCoachProfileErr } = await supabaseAdmin
      .from("coach_profiles")
      .select("id")
      .eq("specialization", specialization)
      .eq("gender", hintedCoachGender)
      .eq("personality", hintedCoachPersonality)
      .maybeSingle<{ id: string }>();

    if (hintedCoachProfileErr) return serverError(hintedCoachProfileErr.message);
    coachProfileId = hintedCoachProfile?.id ?? null;

    // Best-effort self-heal: if active_coaches is missing/stale, repair it.
    if (coachProfileId) {
      await supabaseUser.from("active_coaches").upsert(
        {
          user_id: userId,
          specialization,
          coach_profile_id: coachProfileId,
          selected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,specialization" }
      );
    }
  }

  if (!coachProfileId && specialization === "workout") {
    const gender = profile?.active_coach_gender as string | null | undefined;
    const personality = profile?.active_coach_personality as string | null | undefined;
    if (gender && personality) {
      const { data: legacyCoachProfile, error: legacyCoachProfileErr } = await supabaseAdmin
        .from("coach_profiles")
        .select("id")
        .eq("specialization", "workout")
        .eq("gender", gender)
        .eq("personality", personality)
        .maybeSingle<{ id: string }>();

      if (legacyCoachProfileErr) return serverError(legacyCoachProfileErr.message);
      coachProfileId = legacyCoachProfile?.id ?? null;
    }
  }

  if (!coachProfileId) return badRequest("No active coach selected.");

  const { data: coachProfile, error: coachProfileErr } = await supabaseAdmin
    .from("coach_profiles")
    .select("id, display_name, gender, personality, system_prompt")
    .eq("id", coachProfileId)
    .eq("specialization", specialization)
    .maybeSingle<CoachProfile>();

  if (coachProfileErr) return serverError(coachProfileErr.message);
  if (!coachProfile?.id) return badRequest("Coach profile not found.");
  if (!coachProfile.system_prompt?.trim()) return serverError("Coach system prompt is missing.");

  const { data: existingThread, error: existingThreadErr } = await supabaseUser
    .from("coach_threads")
    .select("id, intake_json")
    .eq("user_id", userId)
    .eq("coach_profile_id", coachProfile.id)
    .eq("specialization", specialization)
    .maybeSingle();

  if (existingThreadErr) return serverError(existingThreadErr.message);

  let threadRow = existingThread as { id: string; intake_json: CoachIntake | null } | null;

  if (!threadRow?.id) {
    const { data: insertedThread, error: insertedThreadErr } = await supabaseUser
      .from("coach_threads")
      .insert({
        user_id: userId,
        coach_profile_id: coachProfile.id,
        specialization,
      })
      .select("id, intake_json")
      .single();

    if (insertedThreadErr) {
      const isDuplicateThreadError =
        String((insertedThreadErr as { code?: string }).code ?? "") === "23505" ||
        insertedThreadErr.message.toLowerCase().includes("duplicate key value violates unique constraint");

      if (!isDuplicateThreadError) {
        return serverError(insertedThreadErr.message);
      }

      const { data: racedThread, error: racedThreadErr } = await supabaseUser
        .from("coach_threads")
        .select("id, intake_json")
        .eq("user_id", userId)
        .eq("coach_profile_id", coachProfile.id)
        .eq("specialization", specialization)
        .maybeSingle();

      if (racedThreadErr) return serverError(racedThreadErr.message);
      threadRow = (racedThread as { id: string; intake_json: CoachIntake | null } | null) ?? null;
    } else {
      threadRow = (insertedThread as { id: string; intake_json: CoachIntake | null } | null) ?? null;
    }
  }

  const threadId = threadRow?.id;
  const threadIntake = threadRow?.intake_json ?? null;
  if (!threadId) return serverError("Failed to load thread.");

  const loadWorkspaceData = async () => {
    const historyRes = await loadThreadMessages(supabaseUser, threadId, limit);
    if ("error" in historyRes) return { error: historyRes.error } as const;

    const plansRes = await loadPlans(supabaseUser, threadId, planType);
    if ("error" in plansRes) return { error: plansRes.error } as const;

    let defaultNutritionGoal: NutritionGoal | null = null;
    if (planType === "nutrition") {
      const fallbackGoalRes = await loadFallbackGoalType(supabaseUser, userId);
      if ("error" in fallbackGoalRes) return { error: fallbackGoalRes.error } as const;
      defaultNutritionGoal = goalFromProfileGoalType(fallbackGoalRes.goalType);
    }

    const intake =
      threadIntake && validateIntakeForType(threadIntake, planType)
        ? normalizeIntakeForType(threadIntake, planType)
        : null;

    return {
      messages: historyRes.messages,
      activePlan: plansRes.activePlan,
      draftPlan: plansRes.draftPlan,
      intake,
      defaultNutritionGoal,
    } as const;
  };

  if (action === "history" || action === "workspace") {
    const res = await loadWorkspaceData();
    if ("error" in res) return serverError(res.error);

    if (action === "history") {
      return json(200, { thread_id: threadId, messages: res.messages });
    }

    return json(200, {
      thread_id: threadId,
      messages: res.messages,
      active_plan: res.activePlan,
      draft_plan: res.draftPlan,
      intake: res.intake,
      default_nutrition_goal: res.defaultNutritionGoal ?? undefined,
    });
  }

  if (action === "dashboard_snapshot") {
    const { data: planRows, error: planErr } = await supabaseUser
      .from("coach_plans")
      .select("id, type, status, title, plan_json, version, updated_at")
      .eq("user_id", userId)
      .in("type", ["workout", "nutrition"])
      .in("status", ["active", "draft"])
      .order("updated_at", { ascending: false });
    if (planErr) return serverError(planErr.message);

    let trainingActivePlan: WorkoutPlan | null = null;
    let trainingActivePlanId: string | null = null;
    let trainingActivePlanVersion: number | null = null;
    let trainingDraftPlan: WorkoutPlan | null = null;
    let trainingDraftPlanId: string | null = null;
    let trainingDraftPlanVersion: number | null = null;
    let nutritionActivePlan: NutritionPlan | null = null;
    let nutritionActivePlanId: string | null = null;
    let nutritionActivePlanVersion: number | null = null;
    let nutritionDraftPlan: NutritionPlan | null = null;
    let nutritionDraftPlanId: string | null = null;
    let nutritionDraftPlanVersion: number | null = null;

    for (const row of planRows ?? []) {
      if (row.type === "workout" && isValidWorkoutPlan(row.plan_json)) {
        if (row.status === "active" && !trainingActivePlan) {
          trainingActivePlan = row.plan_json as WorkoutPlan;
          trainingActivePlanId = String(row.id ?? "");
          trainingActivePlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
        }
        if (row.status === "draft" && !trainingDraftPlan) {
          trainingDraftPlan = row.plan_json as WorkoutPlan;
          trainingDraftPlanId = String(row.id ?? "");
          trainingDraftPlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
        }
      }
      if (row.type === "nutrition" && isValidNutritionPlan(row.plan_json)) {
        if (row.status === "active" && !nutritionActivePlan) {
          nutritionActivePlan = row.plan_json as NutritionPlan;
          nutritionActivePlanId = String(row.id ?? "");
          nutritionActivePlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
        }
        if (row.status === "draft" && !nutritionDraftPlan) {
          nutritionDraftPlan = row.plan_json as NutritionPlan;
          nutritionDraftPlanId = String(row.id ?? "");
          nutritionDraftPlanVersion = Number.isFinite(row.version) ? Number(row.version) : null;
        }
      }
    }

    const trainingPlan = trainingDraftPlan ?? trainingActivePlan;
    const trainingPlanId = trainingDraftPlanId ?? trainingActivePlanId;
    const trainingPlanVersion = trainingDraftPlanVersion ?? trainingActivePlanVersion;
    const nutritionPlan = nutritionDraftPlan ?? nutritionActivePlan;
    const nutritionPlanId = nutritionDraftPlanId ?? nutritionActivePlanId;
    const nutritionPlanVersion = nutritionDraftPlanVersion ?? nutritionActivePlanVersion;
    const nutritionPlanUpdatedForReview = Boolean(nutritionDraftPlan);

    const todayLocal = formatLocalDate(new Date(), profileTimeZone);
    const { weekStart } = getWeekRange(todayLocal);
    const checkinsRes = await loadWeeklyCheckins(
      supabaseUser,
      userId,
      "nutrition",
      profilePreferredUnit,
      26
    );
    if ("error" in checkinsRes) return serverError(checkinsRes.error);

    const historyRows = checkinsRes.rows;
    const hasCurrentWeekCheckin = historyRows.some((row) => row.week_start === weekStart);
    const adherenceScore =
      historyRows[0]?.adherence_score ??
      historyRows[0]?.adherence_percent ??
      0;

    const weekStarts = new Set(historyRows.map((row) => row.week_start));
    const checkinByWeek = new Map(historyRows.map((row) => [row.week_start, row]));
    let streak = 0;
    let cursor = hasCurrentWeekCheckin ? weekStart : shiftIsoDate(weekStart, -7);
    while (weekStarts.has(cursor)) {
      streak += 1;
      cursor = shiftIsoDate(cursor, -7);
    }

    const { data: feedbackRows, error: feedbackErr } = await supabaseUser
      .from("coach_nutrition_plan_feedback")
      .select("week_start, decision, adherence_percent, adherence_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(52);
    if (feedbackErr) return serverError(feedbackErr.message);

    const totalFeedbackCount = feedbackRows?.length ?? 0;
    const acceptedFeedbackCount = (feedbackRows ?? []).filter(
      (row) => row.decision === "accept"
    ).length;
    const acceptedPlanRate = totalFeedbackCount
      ? Math.round((acceptedFeedbackCount / totalFeedbackCount) * 100)
      : null;
    const latestCurrentWeekDecision = (feedbackRows ?? []).find((row) => {
      return typeof row.week_start === "string" && row.week_start === weekStart;
    })?.decision;
    const planAcceptedThisWeek = latestCurrentWeekDecision === "accept"
      ? true
      : latestCurrentWeekDecision === "not_now"
        ? false
        : null;

    const deltaSamples = (feedbackRows ?? [])
      .map((row) => {
        const baseWeekStart = typeof row.week_start === "string" ? row.week_start : "";
        if (!baseWeekStart.length) return null;
        const nextWeekStart = shiftIsoDate(baseWeekStart, 7);
        const nextWeekCheckin = checkinByWeek.get(nextWeekStart);
        if (!nextWeekCheckin) return null;
        const baselineAdherence =
          Number.isFinite(row.adherence_score) ? Number(row.adherence_score) :
          Number.isFinite(row.adherence_percent) ? Number(row.adherence_percent) :
          Number.isFinite(checkinByWeek.get(baseWeekStart)?.adherence_score)
            ? Number(checkinByWeek.get(baseWeekStart)?.adherence_score)
            : Number(checkinByWeek.get(baseWeekStart)?.adherence_percent ?? NaN);
        const nextAdherence =
          Number.isFinite(nextWeekCheckin.adherence_score)
            ? Number(nextWeekCheckin.adherence_score)
            : Number(nextWeekCheckin.adherence_percent);
        if (!Number.isFinite(baselineAdherence) || !Number.isFinite(nextAdherence)) return null;
        return nextAdherence - baselineAdherence;
      })
      .filter((value): value is number => Number.isFinite(value));
    const nextWeekAdherenceDelta = deltaSamples.length
      ? Number((deltaSamples.reduce((sum, value) => sum + value, 0) / deltaSamples.length).toFixed(1))
      : null;

    const nextSession = trainingPlan?.schedule?.[0] ?? null;
    const nextSessionMinutes = nextSession ? Math.max(20, nextSession.items.length * 8) : null;
    const trainingPreview = nextSession
      ? `${nextSession.focus} - ${nextSessionMinutes ?? 45} min`
      : "No training session scheduled";

    const nutritionSummary = nutritionPlan
      ? `P${nutritionPlan.macros.proteinG} C${nutritionPlan.macros.carbsG} F${nutritionPlan.macros.fatsG}`
      : "No nutrition targets set";

    const directive = trainingPlan && nutritionPlan
      ? "Nail today's training and hit your macro anchors. Keep the effort steady and consistent."
      : trainingPlan
        ? "Prioritize your next training session and keep recovery habits tight today."
        : nutritionPlan
          ? "Execute your nutrition targets today and keep meals simple and repeatable."
          : "Start with one action: open chat and set your next training and nutrition targets.";

    const statusIndicators = [
      nextSession
        ? `Workout: ${nextSession.focus}`
        : "Workout: Unscheduled",
      nutritionPlan
        ? `Macros: ${nutritionSummary}`
        : "Macros: Not set",
    ];

    return json(200, {
      dashboard_snapshot: {
        today: {
          directive,
          status_indicators: statusIndicators.slice(0, 2),
          primary_cta: "Chat with Coach",
        },
        training: {
          label: "Training",
          preview: trainingPreview,
          cta: nextSession ? "Start workout" : "View plan",
          plan_id: trainingPlanId,
          plan_version: trainingPlanVersion,
        },
        nutrition: {
          label: "Nutrition",
          targets_summary: nutritionSummary,
          daily_calories_target: nutritionPlan?.dailyCaloriesTarget ?? null,
          cta: nutritionPlanUpdatedForReview
            ? "Review plan"
            : nutritionPlan
              ? "View plan"
              : "Set targets",
          ctas: ["Log meal", "View meal plan", "Adjust targets"],
          plan_id: nutritionPlanId,
          plan_version: nutritionPlanVersion,
          plan_updated_for_review: nutritionPlanUpdatedForReview,
        },
        weekly_checkin: {
          label: "Weekly Check-in",
          next_due_label: "Sunday",
          is_due: !hasCurrentWeekCheckin,
          streak,
          adherence_score: adherenceScore,
          plan_accepted_this_week: planAcceptedThisWeek,
          accepted_plan_rate: acceptedPlanRate,
          next_week_adherence_delta: nextWeekAdherenceDelta,
          cta: !hasCurrentWeekCheckin ? "Do weekly check-in" : "Preview last check-in",
        },
      },
    });
  }

  if (action === "checkin_history" || action === "checkin_submit") {
    if (specialization !== "nutrition") {
      return badRequest("Weekly check-ins are currently only supported for nutrition.");
    }

    const checkinAction = action as CheckinAction;
    const todayLocal = formatLocalDate(new Date(), profileTimeZone);
    const { weekStart, weekEnd } = getWeekRange(todayLocal);
    let checkinId: string | null = null;
    let summaryStatus: CheckinSummaryStatus = "not_requested";
    let idempotent = false;
    let nonFatalFailureCategory: CheckinFailureCategory | null = null;
    let nonFatalFailureReason: string | null = null;
    let summaryModels: string[] = [];
    let invalidSummaryModels: string[] = [];
    let summaryTimeoutMs: number | null = null;
    let summaryTimeoutInputMs: number | null = null;
    let coordinatorOutput: ReturnType<typeof routeCheckinToTracks> | null = null;
    let unifiedCoachMessage: ReturnType<typeof buildUnifiedCoachMessage> | null = null;
    let planUpdatedForReview = false;
    let planUpdateError: string | null = null;
    let nutritionDraftPlanForReview: NutritionPlan | null = null;

    const recordNonFatalFailure = (category: CheckinFailureCategory, reason: string) => {
      if (nonFatalFailureCategory !== null) return;
      nonFatalFailureCategory = category;
      nonFatalFailureReason = reason;
    };

    try {
      const weightSnapshotRes = await buildWeeklyWeightSnapshot(
        supabaseUser,
        userId,
        weekStart,
        weekEnd,
        profilePreferredUnit
      );
      if ("error" in weightSnapshotRes) {
        throw createCheckinOperationError({
          category: "database",
          reason: `Failed to build weekly weight snapshot: ${weightSnapshotRes.error}`,
        });
      }

      const checkinForWeekRes = await loadWeeklyCheckinByWeek(
        supabaseUser,
        userId,
        specialization,
        weekStart,
        profilePreferredUnit
      );
      if ("error" in checkinForWeekRes) {
        throw createCheckinOperationError({
          category: "database",
          reason: `Failed to load current-week check-in: ${checkinForWeekRes.error}`,
        });
      }

      let savedCheckin: WeeklyCheckinRow | null = checkinForWeekRes.row;
      checkinId = savedCheckin?.id ?? null;

      if (checkinAction === "checkin_submit") {
        if (!validateWeeklyCheckinInput(body.checkin)) {
          throw createCheckinOperationError({
            category: "validation",
            reason: "Missing or invalid checkin payload.",
            status: 400,
            userMessage: "Missing or invalid check-in payload.",
          });
        }

        const normalizedCheckin = normalizeWeeklyCheckinInput(body.checkin);
        const workoutVersionRes = await loadActivePlanVersionForUser(supabaseUser, userId, "workout");
        if ("error" in workoutVersionRes) {
          throw createCheckinOperationError({
            category: "database",
            reason: `Failed to load active workout plan version: ${workoutVersionRes.error}`,
          });
        }

        const nutritionVersionRes = await loadActivePlanVersionForUser(supabaseUser, userId, "nutrition");
        if ("error" in nutritionVersionRes) {
          throw createCheckinOperationError({
            category: "database",
            reason: `Failed to load active nutrition plan version: ${nutritionVersionRes.error}`,
          });
        }

        const activeNutritionRes = await loadLatestPlanByType(supabaseUser, {
          threadId,
          planType: "nutrition",
          status: "active",
        });
        if ("error" in activeNutritionRes) {
          throw createCheckinOperationError({
            category: "database",
            reason: `Failed to load active nutrition plan for coordinator: ${activeNutritionRes.error}`,
          });
        }
        const activeNutritionPlan =
          activeNutritionRes.row?.plan_json && isValidNutritionPlan(activeNutritionRes.row.plan_json)
            ? (activeNutritionRes.row.plan_json as NutritionPlan)
            : null;

        const latestScaleWeightKg = Number.isFinite(weightSnapshotRes.snapshot.endWeight)
          ? Number(
              convertWeight(
                Number(weightSnapshotRes.snapshot.endWeight),
                weightSnapshotRes.snapshot.unit,
                "kg"
              ).toFixed(1)
            )
          : null;
        const fallbackWeightKg = latestScaleWeightKg ?? 80;

        const baselineCheckinArtifact = normalizeWeeklyCheckinArtifact({
          ...body.checkin,
          timestamp: new Date().toISOString(),
          linkedPlanVersion: {
            workoutVersion: workoutVersionRes.version,
            nutritionVersion: nutritionVersionRes.version,
          },
          currentWeightKg:
            typeof body.checkin.currentWeightKg === "number"
              ? body.checkin.currentWeightKg
              : fallbackWeightKg,
          nutritionAdherencePercent:
            typeof body.checkin.nutritionAdherencePercent === "number"
              ? body.checkin.nutritionAdherencePercent
              : normalizedCheckin.adherence_percent,
          computedAdherenceScore:
            typeof body.checkin.computedAdherenceScore === "number"
              ? body.checkin.computedAdherenceScore
              : normalizedCheckin.adherence_percent,
          energyRating:
            typeof body.checkin.energyRating === "number"
              ? body.checkin.energyRating
              : normalizedCheckin.energy,
          recoveryRating:
            typeof body.checkin.recoveryRating === "number"
              ? body.checkin.recoveryRating
              : normalizedCheckin.energy,
          sleepAvgHours:
            typeof body.checkin.sleepAvgHours === "number"
              ? body.checkin.sleepAvgHours
              : 7,
          sleepQuality:
            typeof body.checkin.sleepQuality === "number"
              ? body.checkin.sleepQuality
              : 3,
          stressLevel:
            typeof body.checkin.stressLevel === "number"
              ? body.checkin.stressLevel
              : 3,
          progressPhotoPrompted:
            typeof body.checkin.progressPhotoPrompted === "boolean"
              ? body.checkin.progressPhotoPrompted
              : false,
          trainingDifficulty:
            body.checkin.trainingDifficulty === "too_easy" ||
            body.checkin.trainingDifficulty === "too_hard" ||
            body.checkin.trainingDifficulty === "right"
              ? body.checkin.trainingDifficulty
              : "right",
          injuryPain:
            body.checkin.injuryPain && typeof body.checkin.injuryPain === "object"
              ? body.checkin.injuryPain
              : {
                  hasPain: false,
                  details: "",
                  redFlags: false,
                },
          strengthPRs:
            typeof body.checkin.strengthPRs === "string"
              ? body.checkin.strengthPRs
              : "",
          consistencyNotes:
            typeof body.checkin.consistencyNotes === "string"
              ? body.checkin.consistencyNotes
              : normalizedCheckin.blockers,
          bodyCompChanges:
            typeof body.checkin.bodyCompChanges === "string"
              ? body.checkin.bodyCompChanges
              : "",
          appetiteCravings:
            typeof body.checkin.appetiteCravings === "string"
              ? body.checkin.appetiteCravings
              : "",
          scheduleConstraintsNextWeek:
            typeof body.checkin.scheduleConstraintsNextWeek === "string"
              ? body.checkin.scheduleConstraintsNextWeek
              : "",
        });

        coordinatorOutput = routeCheckinToTracks({
          checkin: baselineCheckinArtifact,
          currentDailyCalories: activeNutritionPlan?.dailyCaloriesTarget ?? null,
          currentMacros: activeNutritionPlan?.macros ?? null,
          currentMeals: activeNutritionPlan?.meals?.map((m) => ({
            name: m.name,
            targetCalories: m.targetCalories,
            items: m.items,
          })) ?? null,
          estimatedTdee: null,
          latestScaleWeightKg,
        });
        unifiedCoachMessage = coordinatorOutput.coachMessage;

        if (isIdempotentWeeklyCheckinSubmission({
          existing: savedCheckin,
          normalizedCheckin,
          snapshot: weightSnapshotRes.snapshot,
          nextCheckinArtifact: baselineCheckinArtifact,
        })) {
          idempotent = true;
          summaryStatus = "idempotent_noop";
        } else {
          const upsertRes = await upsertWeeklyCheckin(
            supabaseUser,
            {
              userId,
              specialization,
              threadId,
              coachProfileId: coachProfile.id,
              weekStart,
              weekEnd,
              energy: normalizedCheckin.energy,
              adherencePercent: normalizedCheckin.adherence_percent,
              blockers: normalizedCheckin.blockers,
              weightSnapshot: weightSnapshotRes.snapshot,
              checkinJson: coordinatorOutput.normalizedCheckin as Record<string, unknown>,
              adherenceScore: coordinatorOutput.normalizedCheckin.computedAdherenceScore,
              workoutPlanVersion: coordinatorOutput.normalizedCheckin.linkedPlanVersion.workoutVersion,
              nutritionPlanVersion: coordinatorOutput.normalizedCheckin.linkedPlanVersion.nutritionVersion,
              adjustmentJson: coordinatorOutput.recommendations as Record<string, unknown>,
              coachSummary: coordinatorOutput.coachMessage.summary,
              summaryModel: "coordinator_v1",
            },
            profilePreferredUnit
          );
          if ("error" in upsertRes) {
            throw createCheckinOperationError({
              category: "database",
              reason: `Failed to save weekly check-in: ${upsertRes.error}`,
            });
          }

          savedCheckin = upsertRes.row;
          checkinId = savedCheckin.id;

          const recommendationsRecord =
            coordinatorOutput?.recommendations && typeof coordinatorOutput.recommendations === "object"
              ? (coordinatorOutput.recommendations as Record<string, unknown>)
              : null;
          if (activeNutritionPlan && recommendationsRecord) {
            const createDraftRes = await createNutritionDraftFromCheckinDiff({
              supabaseUser,
              userId,
              threadId,
              activeNutritionPlan,
              recommendations: recommendationsRecord,
            });
            if ("error" in createDraftRes) {
              planUpdateError = createDraftRes.error;
              recordNonFatalFailure(
                "database",
                `Failed to create nutrition draft from weekly check-in diff: ${createDraftRes.error}`
              );
            } else if (createDraftRes.updated) {
              planUpdatedForReview = true;
            }
          }

          const openAiKey = Deno.env.get("OPENAI_API_KEY");
          const summaryModelsRes = normalizeSummaryModelCandidates([
            Deno.env.get("OPENAI_MODEL_CHECKIN_SUMMARY"),
            Deno.env.get("OPENAI_MODEL_CHECKIN_SUMMARY_FALLBACK"),
            Deno.env.get("OPENAI_MODEL_CHAT"),
            Deno.env.get("OPENAI_MODEL"),
            "gpt-4o-mini",
          ]);
          const summaryTimeout = normalizeCheckinSummaryTimeout(
            Deno.env.get("OPENAI_CHECKIN_SUMMARY_TIMEOUT_MS") ?? 9000
          );
          summaryModels = summaryModelsRes.models;
          invalidSummaryModels = summaryModelsRes.invalid;
          summaryTimeoutMs = summaryTimeout.normalized;
          summaryTimeoutInputMs = summaryTimeout.input;

          if (!openAiKey?.trim()) {
            summaryStatus = "skipped_missing_openai_key";
            recordNonFatalFailure("config", "Summary generation skipped: OPENAI_API_KEY is missing.");
          } else if (!summaryModels.length) {
            summaryStatus = "skipped_invalid_models";
            recordNonFatalFailure(
              "config",
              `Summary generation skipped: no valid summary models. invalid=${invalidSummaryModels.join(",") || "none"}`
            );
          } else {
            let recentCheckins: WeeklyCheckinRow[] = [];
            let activePlan: CoachPlan | null = null;

            const recentCheckinsRes = await loadWeeklyCheckins(
              supabaseUser,
              userId,
              specialization,
              profilePreferredUnit,
              6
            );
            if ("error" in recentCheckinsRes) {
              recordNonFatalFailure(
                "database",
                `Summary context load failed (recent check-ins): ${recentCheckinsRes.error}`
              );
            } else {
              recentCheckins = recentCheckinsRes.rows;
            }

            const plansRes = await loadPlans(supabaseUser, threadId, "nutrition");
            if ("error" in plansRes) {
              recordNonFatalFailure(
                "database",
                `Summary context load failed (nutrition plans): ${plansRes.error}`
              );
            } else {
              activePlan = plansRes.activePlan;
            }

            try {
              const generatedSummary = await generateNutritionWeeklyCoachSummary({
                openAiKey,
                models: summaryModels,
                coachName: coachProfile.display_name,
                coachSystemPrompt: coachProfile.system_prompt,
                weekStart,
                weekEnd,
                checkin: savedCheckin,
                weightSnapshot: weightSnapshotRes.snapshot,
                preferredUnit: profilePreferredUnit,
                activePlan,
                recentCheckins,
                timeoutMs: summaryTimeoutMs,
              });

              summaryStatus = "generated";
              const updateSummaryRes = await updateWeeklyCheckinSummary(
                supabaseUser,
                {
                  checkinId: savedCheckin.id,
                  userId,
                  coachSummary: generatedSummary.summary,
                  summaryModel: generatedSummary.model,
                },
                profilePreferredUnit
              );

              if ("error" in updateSummaryRes) {
                summaryStatus = "persist_failed";
                recordNonFatalFailure(
                  "database",
                  `Summary persist failed for check-in ${savedCheckin.id}: ${updateSummaryRes.error}`
                );
              } else {
                savedCheckin = updateSummaryRes.row;
                checkinId = savedCheckin.id;
                unifiedCoachMessage = buildUnifiedCoachMessage({
                  summary: generatedSummary.summary,
                  focusHabits: coordinatorOutput?.coachMessage.focusHabits ?? [],
                  artifactRefs: {
                    adjustmentRecommendationId: coordinatorOutput?.recommendations.id,
                    weeklyCheckinId: savedCheckin.id,
                  },
                });
              }
            } catch (error) {
              const summaryError = error as CheckinSummaryGenerationError;
              if (summaryError.summary_failure_category === "malformed_output") {
                summaryStatus = "malformed_output";
                recordNonFatalFailure("openai", `Summary generation malformed output: ${summaryError.message}`);
              } else if (summaryError.summary_failure_category === "timeout") {
                summaryStatus = "generation_failed";
                recordNonFatalFailure("timeout", `Summary generation timeout: ${summaryError.message}`);
              } else {
                summaryStatus = "generation_failed";
                recordNonFatalFailure("openai", `Summary generation failed: ${summaryError.message}`);
              }
            }
          }
        }
      }

      const historyLimit = Math.max(1, Math.min(52, limit));
      let historyRows: WeeklyCheckinRow[] = [];
      const checkinsRes = await loadWeeklyCheckins(
        supabaseUser,
        userId,
        specialization,
        profilePreferredUnit,
        historyLimit
      );
      if ("error" in checkinsRes) {
        recordNonFatalFailure("database", `Failed to reload check-in history: ${checkinsRes.error}`);
        historyRows = savedCheckin ? [savedCheckin] : [];
      } else {
        historyRows = checkinsRes.rows;
      }

      const currentCheckin =
        historyRows.find((row) => row.week_start === weekStart) ??
        savedCheckin ??
        null;

      const nutritionPlansRes = await loadPlans(supabaseUser, threadId, "nutrition");
      if ("error" in nutritionPlansRes) {
        if (!planUpdateError) {
          planUpdateError = `Failed to resolve nutrition draft state: ${nutritionPlansRes.error}`;
        }
        recordNonFatalFailure(
          "database",
          `Failed to resolve nutrition draft review state: ${nutritionPlansRes.error}`
        );
      } else {
        nutritionDraftPlanForReview =
          nutritionPlansRes.draftPlan && isValidNutritionPlan(nutritionPlansRes.draftPlan)
            ? (nutritionPlansRes.draftPlan as NutritionPlan)
            : null;
        planUpdatedForReview = Boolean(nutritionDraftPlanForReview);
        if (planUpdatedForReview) {
          planUpdateError = null;
        }
      }

      logCheckinActionEvent({
        action: checkinAction,
        specialization,
        week_start: weekStart,
        thread_id: threadId,
        checkin_id: currentCheckin?.id ?? checkinId,
        success: true,
        failure_category: nonFatalFailureCategory,
        failure_reason: nonFatalFailureReason,
        idempotent,
        summary_status: summaryStatus,
        summary_models: summaryModels,
        summary_models_invalid: invalidSummaryModels,
        summary_timeout_input_ms: summaryTimeoutInputMs,
        summary_timeout_ms: summaryTimeoutMs,
        history_count: historyRows.length,
      });

      return json(200, {
        thread_id: threadId,
        checkin_week_start: weekStart,
        checkin_week_end: weekEnd,
        checkin_weight_snapshot: weightSnapshotRes.snapshot,
        checkin_current: currentCheckin,
        checkin_history: historyRows,
        checkin_artifact:
          coordinatorOutput?.normalizedCheckin ??
          currentCheckin?.checkin_json ??
          null,
        adjustment_recommendations:
          coordinatorOutput?.recommendations ??
          currentCheckin?.adjustment_json ??
          null,
        draft_plan: nutritionDraftPlanForReview,
        plan_updated_for_review: planUpdatedForReview,
        plan_update_error: planUpdatedForReview ? null : planUpdateError,
        coach_message:
          unifiedCoachMessage ??
          coordinatorOutput?.coachMessage ??
          null,
        guardrail_notes: coordinatorOutput?.guardrailNotes ?? [],
      });
    } catch (error) {
      const failure = normalizeCheckinFailure(error, checkinAction);
      logCheckinActionEvent({
        action: checkinAction,
        specialization,
        week_start: weekStart,
        thread_id: threadId,
        checkin_id: checkinId,
        success: false,
        failure_category: failure.category,
        failure_reason: failure.reason,
        idempotent,
        summary_status: summaryStatus,
      });
      return json(failure.status, {
        error: failure.userMessage,
        code: `CHECKIN_${failure.category.toUpperCase()}`,
      });
    }
  }

  if (action === "plan_feedback_log") {
    if (specialization !== "nutrition") {
      return badRequest("Nutrition plan feedback is only supported for nutrition.");
    }
    if (!isNutritionPlanFeedbackDecision(body.decision)) {
      return badRequest("Missing or invalid nutrition plan feedback decision.");
    }

    const decision = body.decision as NutritionPlanFeedbackDecision;
    const context = normalizeFeedbackContext(body.context);
    const todayLocal = formatLocalDate(new Date(), profileTimeZone);
    const { weekStart } = getWeekRange(todayLocal);

    const weekCheckinRes = await loadWeeklyCheckinByWeek(
      supabaseUser,
      userId,
      "nutrition",
      weekStart,
      profilePreferredUnit
    );
    if ("error" in weekCheckinRes) {
      logNutritionPlanFeedbackEvent({
        user_id: userId,
        thread_id: threadId,
        week_start: weekStart,
        decision,
        context,
        adherence_percent: null,
        adherence_score: null,
        success: false,
        reason: `Failed to load weekly check-in for feedback logging: ${weekCheckinRes.error}`,
      });
      return serverError(weekCheckinRes.error);
    }

    const adherencePercent = Number.isFinite(weekCheckinRes.row?.adherence_percent)
      ? Number(weekCheckinRes.row?.adherence_percent)
      : null;
    const adherenceScore = Number.isFinite(weekCheckinRes.row?.adherence_score)
      ? Number(weekCheckinRes.row?.adherence_score)
      : null;

    const { error: feedbackInsertErr } = await supabaseUser
      .from("coach_nutrition_plan_feedback")
      .insert({
        user_id: userId,
        thread_id: threadId,
        week_start: weekStart,
        decision,
        context,
        adherence_percent: adherencePercent,
        adherence_score: adherenceScore,
      });
    if (feedbackInsertErr) {
      logNutritionPlanFeedbackEvent({
        user_id: userId,
        thread_id: threadId,
        week_start: weekStart,
        decision,
        context,
        adherence_percent: adherencePercent,
        adherence_score: adherenceScore,
        success: false,
        reason: feedbackInsertErr.message,
      });
      return serverError(feedbackInsertErr.message);
    }

    logNutritionPlanFeedbackEvent({
      user_id: userId,
      thread_id: threadId,
      week_start: weekStart,
      decision,
      context,
      adherence_percent: adherencePercent,
      adherence_score: adherenceScore,
      success: true,
      reason: null,
    });

    return json(200, {
      logged: true,
      week_start: weekStart,
      decision,
      context,
    });
  }

  if (action === "plan_promote_draft") {
    const promoteRes = await promoteDraftPlanVersion(supabaseUser, {
      threadId,
      planType,
    });
    if ("error" in promoteRes) return badRequest(promoteRes.error);

    const assistantText = "Great. I set your new plan as active.";

    const plansRes = await loadPlans(supabaseUser, threadId, planType);
    if ("error" in plansRes) return serverError(plansRes.error);

    return json(200, {
      thread_id: threadId,
      assistant_text: assistantText,
      messages: [],
      active_plan: plansRes.activePlan,
      draft_plan: plansRes.draftPlan,
    });
  }

  if (action === "plan_discard_draft") {
    const discardRes = await discardDraftPlanVersion(supabaseUser, {
      threadId,
      planType,
    });
    if ("error" in discardRes) return badRequest(discardRes.error);

    const assistantText = "Done. I discarded the draft and kept your current active plan.";

    const plansRes = await loadPlans(supabaseUser, threadId, planType);
    if ("error" in plansRes) return serverError(plansRes.error);

    return json(200, {
      thread_id: threadId,
      assistant_text: assistantText,
      messages: [],
      active_plan: plansRes.activePlan,
      draft_plan: plansRes.draftPlan,
    });
  }

  if (action === "plan_generate" || action === "plan_revise_days") {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return openAiNotConfigured();

    const planModel = Deno.env.get("OPENAI_MODEL_PLAN") ?? "gpt-4o-mini";

    let intake: CoachIntake | null = null;
    if (action === "plan_generate") {
      if (!validateIntakeForType(body.intake, planType)) {
        return badRequest("Missing or invalid intake payload.");
      }
      intake = normalizeIntakeForType(body.intake, planType);
    } else {
      if (planType !== "workout") {
        return badRequest("Days/week revision is only supported for workout plans.");
      }
      if (!threadIntake || !validateWorkoutIntake(threadIntake)) {
        return badRequest("No intake found; regenerate your plan from intake first.");
      }
      const nextDaysRaw = body.daysPerWeek;
      if (!Number.isFinite(nextDaysRaw)) return badRequest("Missing daysPerWeek.");
      const nextDays = clampDays(nextDaysRaw as number);
      const nextIntakeRes = await applyDaysRevisionToThreadIntake(
        supabaseUser,
        threadId,
        userId,
        normalizeWorkoutIntake(threadIntake),
        nextDays
      );
      if ("error" in nextIntakeRes) return serverError(nextIntakeRes.error);
      intake = nextIntakeRes.intake;
    }

    if (action === "plan_generate") {
      const persistRes = await persistThreadIntake(supabaseUser, threadId, userId, intake);
      if ("error" in persistRes) return serverError(persistRes.error);
    }

    const generated = await generateDraftFromIntake(
      supabaseUser,
      userId,
      threadId,
      planType,
      intake,
      openAiKey,
      planModel,
      coachProfile.system_prompt
    );
    if ("error" in generated) return serverError(generated.error);

    const plansResAfter = await loadPlans(supabaseUser, threadId, planType);
    if ("error" in plansResAfter) return serverError(plansResAfter.error);

    return json(200, {
      thread_id: threadId,
      assistant_text: generated.assistantText,
      messages: [],
      active_plan: plansResAfter.activePlan,
      draft_plan: plansResAfter.draftPlan,
      intake,
    });
  }

  if (action === "send") {
    const message = body.message?.trim() ?? "";
    if (!message) return badRequest("Missing message.");

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return openAiNotConfigured();

    const chatModel = Deno.env.get("OPENAI_MODEL_CHAT") ?? "gpt-4o-mini";
    const planModel = Deno.env.get("OPENAI_MODEL_PLAN") ?? "gpt-4o-mini";
    const historyRes = await loadThreadMessages(supabaseUser, threadId, limit);
    if ("error" in historyRes) return serverError(historyRes.error);
    const lastAssistantMessage = [...historyRes.messages]
      .reverse()
      .find((m) => m.role === "assistant")?.content;

    let revisionIntent: PlanRevisionIntent = { kind: "none" };
    if (planType === "workout") {
      try {
        revisionIntent = await detectPlanRevisionIntent(openAiKey, chatModel, message, lastAssistantMessage);
      } catch {
        // If intent classification fails, fall back to normal chat behavior.
        revisionIntent = { kind: "none" };
      }
    }

    if (revisionIntent.kind === "revise_days_missing_days") {
      const insertedUser = await insertMessage(supabaseUser, threadId, "user", message);
      if ("error" in insertedUser) return serverError(insertedUser.error);

      const assistantText = "I can revise your plan days/week. Tell me the target, like \"make this 5 days/week.\"";
      const insertedAssistant = await insertMessage(supabaseUser, threadId, "assistant", assistantText);
      if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

      await updateLastMessageAt(supabaseUser, threadId);

      const plansRes = await loadPlans(supabaseUser, threadId, planType);
      if ("error" in plansRes) return serverError(plansRes.error);
      const intake =
        threadIntake && validateIntakeForType(threadIntake, planType)
          ? normalizeIntakeForType(threadIntake, planType)
          : null;

      return json(200, {
        thread_id: threadId,
        assistant_text: assistantText,
        messages: [insertedUser.data, insertedAssistant.data],
        active_plan: plansRes.activePlan,
        draft_plan: plansRes.draftPlan,
        intake,
      });
    }

    if (revisionIntent.kind === "revise_days") {
      const insertedUser = await insertMessage(supabaseUser, threadId, "user", message);
      if ("error" in insertedUser) return serverError(insertedUser.error);

      if (!threadIntake || !validateWorkoutIntake(threadIntake)) {
        const assistantText =
          "I can revise days/week once you generate your first plan. Create a plan from intake, then ask me again.";
        const insertedAssistant = await insertMessage(supabaseUser, threadId, "assistant", assistantText);
        if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

        await updateLastMessageAt(supabaseUser, threadId);

        const plansRes = await loadPlans(supabaseUser, threadId, planType);
        if ("error" in plansRes) return serverError(plansRes.error);

        return json(200, {
          thread_id: threadId,
          assistant_text: assistantText,
          messages: [insertedUser.data, insertedAssistant.data],
          active_plan: plansRes.activePlan,
          draft_plan: plansRes.draftPlan,
          intake: null,
        });
      }

      const revisedIntakeRes = await applyDaysRevisionToThreadIntake(
        supabaseUser,
        threadId,
        userId,
        normalizeWorkoutIntake(threadIntake),
        revisionIntent.daysPerWeek
      );
      if ("error" in revisedIntakeRes) return serverError(revisedIntakeRes.error);

      const generated = await generateDraftFromIntake(
        supabaseUser,
        userId,
        threadId,
        planType,
        revisedIntakeRes.intake,
        openAiKey,
        planModel,
        coachProfile.system_prompt
      );
      if ("error" in generated) return serverError(generated.error);

      const assistantText = `Updated your draft to ${revisedIntakeRes.intake.daysPerWeek} days/week. Review it in Plan and keep or discard it.`;
      const insertedAssistant = await insertMessage(
        supabaseUser,
        threadId,
        "assistant",
        assistantText,
        { cta: "review_draft_plan" }
      );
      if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

      await updateLastMessageAt(supabaseUser, threadId);

      const plansRes = await loadPlans(supabaseUser, threadId, planType);
      if ("error" in plansRes) return serverError(plansRes.error);

      return json(200, {
        thread_id: threadId,
        assistant_text: assistantText,
        messages: [insertedUser.data, insertedAssistant.data],
        active_plan: plansRes.activePlan,
        draft_plan: plansRes.draftPlan,
        intake: revisedIntakeRes.intake,
      });
    }

    if (revisionIntent.kind === "revise_focus") {
      const insertedUser = await insertMessage(supabaseUser, threadId, "user", message);
      if ("error" in insertedUser) return serverError(insertedUser.error);

      if (!threadIntake || !validateWorkoutIntake(threadIntake)) {
        const assistantText =
          "I can shift your plan focus once you generate your first plan. Create a plan from intake, then ask me again.";
        const insertedAssistant = await insertMessage(supabaseUser, threadId, "assistant", assistantText);
        if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

        await updateLastMessageAt(supabaseUser, threadId);

        const plansRes = await loadPlans(supabaseUser, threadId, planType);
        if ("error" in plansRes) return serverError(plansRes.error);

        return json(200, {
          thread_id: threadId,
          assistant_text: assistantText,
          messages: [insertedUser.data, insertedAssistant.data],
          active_plan: plansRes.activePlan,
          draft_plan: plansRes.draftPlan,
          intake: null,
        });
      }

      const revisedIntakeRes = await applyGoalRevisionToThreadIntake(
        supabaseUser,
        threadId,
        userId,
        normalizeWorkoutIntake(threadIntake),
        revisionIntent.goal
      );
      if ("error" in revisedIntakeRes) return serverError(revisedIntakeRes.error);

      const generated = await generateDraftFromIntake(
        supabaseUser,
        userId,
        threadId,
        planType,
        revisedIntakeRes.intake,
        openAiKey,
        planModel,
        coachProfile.system_prompt
      );
      if ("error" in generated) return serverError(generated.error);

      const goalLabel =
        revisedIntakeRes.intake.goal === "fat_loss"
          ? "fat loss"
          : revisedIntakeRes.intake.goal === "recomp"
            ? "recomposition"
            : "strength";
      const assistantText = `Updated your draft focus to ${goalLabel}. Review it in Plan and keep or discard it.`;
      const insertedAssistant = await insertMessage(
        supabaseUser,
        threadId,
        "assistant",
        assistantText,
        { cta: "review_draft_plan" }
      );
      if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

      await updateLastMessageAt(supabaseUser, threadId);

      const plansRes = await loadPlans(supabaseUser, threadId, planType);
      if ("error" in plansRes) return serverError(plansRes.error);

      return json(200, {
        thread_id: threadId,
        assistant_text: assistantText,
        messages: [insertedUser.data, insertedAssistant.data],
        active_plan: plansRes.activePlan,
        draft_plan: plansRes.draftPlan,
        intake: revisedIntakeRes.intake,
      });
    }

    const plansRes = await loadPlans(supabaseUser, threadId, planType);
    if ("error" in plansRes) return serverError(plansRes.error);

    const insertedUser = await insertMessage(supabaseUser, threadId, "user", message);
    if ("error" in insertedUser) return serverError(insertedUser.error);

    const systemPrompt = [
      coachProfile.system_prompt,
      "",
      `Current plan state: active_version=${plansRes.activePlanVersion ?? "none"}, draft_version=${plansRes.draftPlanVersion ?? "none"}`,
      `Current active plan context: ${summarizePlan(plansRes.activePlan, planType)}`,
      `Current draft plan context: ${summarizePlan(plansRes.draftPlan, planType)}`,
      plansRes.draftPlan
        ? "If a draft plan exists, treat draft details as the latest proposed update and compare them against the active plan when answering."
        : "No draft plan exists. Do not reference any prior draft details unless the user explicitly asks about history.",
      "Always resolve plan questions against the current plan state above, even if older chat messages mention outdated plans.",
      "For this chat reply, respond in plain natural language only.",
      "Do not output raw JSON, assistant_text keys, plan_json keys, or schema blocks.",
      planType === "workout"
        ? "If the user asks to revise training days/week or focus, do not draft a full plan in chat; keep it brief and ask for clarification if needed."
        : "If the user asks to revise their nutrition plan, keep chat concise and suggest generating a new draft from the intake form.",
      "Avoid medical claims. If injury/pain is mentioned, recommend professional advice and safer alternatives.",
    ].join("\n");

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...historyRes.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    let assistantText = "";
    try {
      assistantText = await callChat(openAiKey, chatModel, chatMessages, 0.7, 300);
    } catch (e) {
      return serverError(String(e));
    }

    if (!assistantText) assistantText = "I had trouble generating a reply. Try again in a moment.";

    const leakedPayload =
      planType === "workout" ? extractWorkoutPlanPayloadFromText(assistantText) : null;
    const leakedNaturalLanguagePlan =
      planType === "workout" ? looksLikeWorkoutPlanText(assistantText) : false;
    if (leakedPayload || leakedNaturalLanguagePlan) {
      const safeAssistantText =
        "I can revise that directly in your app. Use quick actions below to change days/week or focus, and I'll generate a draft for review.";
      const insertedAssistant = await insertMessage(supabaseUser, threadId, "assistant", safeAssistantText);
      if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

      await updateLastMessageAt(supabaseUser, threadId);

      return json(200, {
        thread_id: threadId,
        assistant_text: safeAssistantText,
        messages: [insertedUser.data, insertedAssistant.data],
        active_plan: plansRes.activePlan,
        draft_plan: plansRes.draftPlan,
        intake:
          threadIntake && validateIntakeForType(threadIntake, planType)
            ? normalizeIntakeForType(threadIntake, planType)
            : null,
      });
    }

    const insertedAssistant = await insertMessage(supabaseUser, threadId, "assistant", assistantText);
    if ("error" in insertedAssistant) return serverError(insertedAssistant.error);

    await updateLastMessageAt(supabaseUser, threadId);

    return json(200, {
      thread_id: threadId,
      assistant_text: assistantText,
      messages: [insertedUser.data, insertedAssistant.data],
      active_plan: plansRes.activePlan,
      draft_plan: plansRes.draftPlan,
    });
  }

  return badRequest("Unsupported action.");
});
