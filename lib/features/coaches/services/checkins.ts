import type { ActiveCoach } from "../types";
import type {
  CoachCheckinsPayload,
  WeeklyCheckin,
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinArtifact,
  WeeklyCheckinDifficulty,
  WeeklyCheckinInput,
  WeeklyCheckinRating,
  WeeklyCheckinTrend,
  WeeklyWeightSnapshot,
} from "../types/checkinsTypes";
import {
  invokeCoachChat,
  type CoachWorkspaceResponse,
} from "./chatClient";
import { fetchCurrentUserId } from "../../auth";
import { setActiveCoachOnServer } from "./api";
import { computeAdherenceScore } from "../models/checkinScoring";
import type {
  ArtifactAdjustmentRecommendations,
  ArtifactCoachMessage,
} from "../types/artifacts";

export { computeAdherenceScore };

const KG_PER_LB = 0.45359237;
const MAX_BLOCKERS_LENGTH = 500;
const MAX_TEXT_LENGTH = 1000;

const FALLBACK_WEIGHT_SNAPSHOT: WeeklyWeightSnapshot = {
  unit: "lb",
  entries: 0,
  startWeight: null,
  endWeight: null,
  delta: null,
  trend: "no_data",
};

const DEFAULT_LINKED_PLAN_VERSION = {
  workoutVersion: null,
  nutritionVersion: null,
} as const;

const DEFAULT_CHECKIN_ARTIFACT: Omit<WeeklyCheckinArtifact, "timestamp" | "currentWeightKg"> = {
  linkedPlanVersion: DEFAULT_LINKED_PLAN_VERSION,
  progressPhotoPrompted: false,
  strengthPRs: "",
  consistencyNotes: "",
  bodyCompChanges: "",
  trainingDifficulty: "right",
  nutritionAdherencePercent: null,
  nutritionAdherenceSubjective: null,
  appetiteCravings: "",
  energyRating: 3,
  recoveryRating: 3,
  sleepAvgHours: 7,
  sleepQuality: 3,
  stressLevel: 3,
  scheduleConstraintsNextWeek: "",
  injuryPain: {
    hasPain: false,
    details: "",
    redFlags: false,
  },
  computedAdherenceScore: 0,
};

type CheckinsRequestOptions = {
  limit?: number;
  coach?: ActiveCoach | null;
};

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function clampDecimal(value: unknown, min: number, max: number, fallback: number, decimals = 1) {
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.max(min, Math.min(max, Number(value)));
  return Number(clamped.toFixed(decimals));
}

function normalizeText(value: unknown, options?: { maxLength?: number }) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized.length) return "";
  if (!options?.maxLength || normalized.length <= options.maxLength) return normalized;
  return normalized.slice(0, options.maxLength).trimEnd();
}

function normalizeOptionalText(value: unknown, maxLength = 600): string | null {
  const normalized = normalizeText(value, { maxLength });
  return normalized.length ? normalized : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isFinite(value)) return null;
  return Number(value);
}

function normalizeBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeTimestamp(value: unknown) {
  const normalized = normalizeText(value, { maxLength: 80 });
  if (!normalized.length) return new Date().toISOString();
  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeDifficulty(value: unknown): WeeklyCheckinDifficulty {
  return value === "too_easy" || value === "too_hard" || value === "right"
    ? value
    : "right";
}

function normalizeSubjectiveAdherence(value: unknown): WeeklyCheckinAdherenceSubjective | null {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : null;
}

function normalizeRating(value: unknown, fallback: WeeklyCheckinRating): WeeklyCheckinRating {
  return clampWholeNumber(value, 1, 5, fallback) as WeeklyCheckinRating;
}

function normalizeWeightSnapshot(input: unknown): WeeklyWeightSnapshot {
  const snapshot = input as Partial<WeeklyWeightSnapshot> | null | undefined;
  const unit = snapshot?.unit === "kg" || snapshot?.unit === "lb" ? snapshot.unit : "lb";
  const entries = Number.isFinite(snapshot?.entries)
    ? Math.max(0, Math.round(snapshot?.entries ?? 0))
    : 0;
  const startWeight = Number.isFinite(snapshot?.startWeight)
    ? Number(snapshot?.startWeight)
    : null;
  const endWeight = Number.isFinite(snapshot?.endWeight)
    ? Number(snapshot?.endWeight)
    : null;
  const delta = Number.isFinite(snapshot?.delta) ? Number(snapshot?.delta) : null;
  const trend =
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

function toRowRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function hasAnyKeys(value: unknown) {
  const record = toRowRecord(value);
  return record ? Object.keys(record).length > 0 : false;
}

function toWeightKg(value: number | null, unit: WeeklyWeightSnapshot["unit"]) {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return Number(value);
  return Number((Number(value) * KG_PER_LB).toFixed(1));
}

function parseAdjustmentRecommendations(
  value: unknown
): ArtifactAdjustmentRecommendations | null {
  const record = toRowRecord(value);
  if (!record || !Object.keys(record).length) return null;

  const toDiff = (raw: unknown) => {
    if (!Array.isArray(raw)) return [] as ArtifactAdjustmentRecommendations["workoutDiff"];
    return raw
      .map((entry) => {
        const row = toRowRecord(entry);
        if (!row) return null;
        const op = row.op === "add" || row.op === "remove" || row.op === "replace"
          ? row.op
          : "replace";
        const path = normalizeText(row.path, { maxLength: 240 });
        if (!path) return null;
        return {
          op,
          path,
          ...(Object.prototype.hasOwnProperty.call(row, "value")
            ? { value: row.value }
            : {}),
        };
      })
      .filter(
        (
          diff
        ): diff is ArtifactAdjustmentRecommendations["workoutDiff"][number] => Boolean(diff)
      );
  };

  const rationale = toRowRecord(record.rationale);

  return {
    id: normalizeText(record.id, { maxLength: 80 }) || `adj-${Date.now()}`,
    workoutDiff: toDiff(record.workoutDiff),
    nutritionDiff: toDiff(record.nutritionDiff),
    mealPlanDiff: toDiff(record.mealPlanDiff),
    rationale: {
      training: normalizeText(rationale?.training, { maxLength: 1200 }),
      nutrition: normalizeText(rationale?.nutrition, { maxLength: 1200 }),
      coordination: normalizeText(rationale?.coordination, { maxLength: 1200 }),
    },
  };
}

function parseCoachMessage(value: unknown): ArtifactCoachMessage | null {
  const record = toRowRecord(value);
  if (!record || !Object.keys(record).length) return null;

  const focusHabits = Array.isArray(record.focusHabits)
    ? record.focusHabits
      .map((entry) => normalizeText(entry, { maxLength: 180 }))
      .filter((entry) => entry.length > 0)
      .slice(0, 3)
    : [];
  const refs = toRowRecord(record.artifactRefs);

  return {
    id: normalizeText(record.id, { maxLength: 80 }) || `coach-message-${Date.now()}`,
    voice: "unified_primary_coach",
    summary: normalizeText(record.summary, { maxLength: 1500 }) || "Keep showing up this week.",
    focusHabits: (
      focusHabits.length
        ? focusHabits
        : ["Keep your plan simple and consistent."]
    ) as [string] | [string, string] | [string, string, string],
    artifactRefs: {
      workoutPlanId: normalizeOptionalText(refs?.workoutPlanId, 80) ?? undefined,
      nutritionTargetsId: normalizeOptionalText(refs?.nutritionTargetsId, 80) ?? undefined,
      mealPlanId: normalizeOptionalText(refs?.mealPlanId, 80) ?? undefined,
      adjustmentRecommendationId: normalizeOptionalText(refs?.adjustmentRecommendationId, 80) ?? undefined,
      weeklyCheckinId: normalizeOptionalText(refs?.weeklyCheckinId, 80) ?? undefined,
    },
    createdAt: normalizeTimestamp(record.createdAt),
  };
}

function createFallbackArtifact(args: {
  energy: number;
  adherencePercent: number;
  blockers: string;
  weightSnapshot: WeeklyWeightSnapshot;
  adherenceScore: number | null;
  workoutPlanVersion: number | null;
  nutritionPlanVersion: number | null;
  createdAt: string;
}): WeeklyCheckinArtifact {
  return {
    timestamp: normalizeTimestamp(args.createdAt),
    linkedPlanVersion: {
      workoutVersion: args.workoutPlanVersion,
      nutritionVersion: args.nutritionPlanVersion,
    },
    currentWeightKg: toWeightKg(args.weightSnapshot.endWeight, args.weightSnapshot.unit) ?? 80,
    progressPhotoPrompted: false,
    strengthPRs: "",
    consistencyNotes: args.blockers,
    bodyCompChanges: "",
    trainingDifficulty: "right",
    nutritionAdherencePercent: args.adherencePercent,
    nutritionAdherenceSubjective: null,
    appetiteCravings: "",
    energyRating: normalizeRating(args.energy, 3),
    recoveryRating: normalizeRating(args.energy, 3),
    sleepAvgHours: 7,
    sleepQuality: 3,
    stressLevel: 3,
    scheduleConstraintsNextWeek: "",
    injuryPain: {
      hasPain: false,
      details: "",
      redFlags: false,
    },
    computedAdherenceScore:
      Number.isFinite(args.adherenceScore) ? Number(args.adherenceScore) : args.adherencePercent,
  };
}

function parseCheckinArtifact(
  value: unknown,
  fallback: WeeklyCheckinArtifact
): WeeklyCheckinArtifact {
  const record = toRowRecord(value);
  if (!record || !Object.keys(record).length) {
    return fallback;
  }

  const linkedPlanVersion = toRowRecord(record.linkedPlanVersion);
  const injuryPain = toRowRecord(record.injuryPain);

  return {
    timestamp: normalizeTimestamp(record.timestamp ?? fallback.timestamp),
    linkedPlanVersion: {
      workoutVersion:
        normalizeOptionalNumber(linkedPlanVersion?.workoutVersion)
          ?? fallback.linkedPlanVersion.workoutVersion,
      nutritionVersion:
        normalizeOptionalNumber(linkedPlanVersion?.nutritionVersion)
          ?? fallback.linkedPlanVersion.nutritionVersion,
    },
    currentWeightKg: clampDecimal(
      record.currentWeightKg,
      30,
      350,
      fallback.currentWeightKg,
      1
    ),
    waistCm: normalizeOptionalNumber(record.waistCm),
    progressPhotoPrompted: normalizeBool(
      record.progressPhotoPrompted,
      fallback.progressPhotoPrompted
    ),
    strengthPRs: normalizeText(record.strengthPRs, { maxLength: MAX_TEXT_LENGTH }),
    consistencyNotes: normalizeText(record.consistencyNotes, { maxLength: MAX_TEXT_LENGTH }),
    bodyCompChanges: normalizeText(record.bodyCompChanges, { maxLength: MAX_TEXT_LENGTH }),
    trainingDifficulty: normalizeDifficulty(record.trainingDifficulty),
    nutritionAdherencePercent: normalizeOptionalNumber(record.nutritionAdherencePercent),
    nutritionAdherenceSubjective: normalizeSubjectiveAdherence(record.nutritionAdherenceSubjective),
    appetiteCravings: normalizeText(record.appetiteCravings, { maxLength: MAX_TEXT_LENGTH }),
    energyRating: normalizeRating(record.energyRating, fallback.energyRating),
    recoveryRating: normalizeRating(record.recoveryRating, fallback.recoveryRating),
    sleepAvgHours: clampDecimal(record.sleepAvgHours, 0, 24, fallback.sleepAvgHours, 1),
    sleepQuality: normalizeRating(record.sleepQuality, fallback.sleepQuality),
    stressLevel: normalizeRating(record.stressLevel, fallback.stressLevel),
    scheduleConstraintsNextWeek: normalizeText(record.scheduleConstraintsNextWeek, {
      maxLength: MAX_TEXT_LENGTH,
    }),
    injuryPain: {
      hasPain: normalizeBool(injuryPain?.hasPain, false),
      details: normalizeText(injuryPain?.details, { maxLength: MAX_TEXT_LENGTH }),
      redFlags: normalizeBool(injuryPain?.redFlags, false),
    },
    computedAdherenceScore: clampWholeNumber(
      record.computedAdherenceScore,
      0,
      100,
      fallback.computedAdherenceScore
    ),
  };
}

function mapCheckinRow(
  input: unknown,
  fallbackId: string,
  payloadCoachMessage: ArtifactCoachMessage | null,
  payloadGuardrailNotes: string[]
): WeeklyCheckin | null {
  const row = toRowRecord(input);
  if (!row) return null;

  const id = normalizeText(row.id, { maxLength: 80 }) || fallbackId;
  const weekStart = normalizeText(row.week_start, { maxLength: 40 });
  const weekEnd = normalizeText(row.week_end, { maxLength: 40 });
  const blockers = normalizeText(row.blockers, { maxLength: MAX_BLOCKERS_LENGTH });
  const weightSnapshot = normalizeWeightSnapshot(row.weight_snapshot);
  const adherenceScore = normalizeOptionalNumber(row.adherence_score);
  const workoutPlanVersion = normalizeOptionalNumber(row.workout_plan_version);
  const nutritionPlanVersion = normalizeOptionalNumber(row.nutrition_plan_version);
  const createdAt = normalizeText(row.created_at, { maxLength: 80 });
  const updatedAt = normalizeText(row.updated_at, { maxLength: 80 });

  const fallbackArtifact = createFallbackArtifact({
    energy: clampWholeNumber(row.energy, 1, 5, 3),
    adherencePercent: clampWholeNumber(row.adherence_percent, 0, 100, 0),
    blockers,
    weightSnapshot,
    adherenceScore,
    workoutPlanVersion,
    nutritionPlanVersion,
    createdAt,
  });

  const parsedCheckinArtifact = parseCheckinArtifact(row.checkin_json, fallbackArtifact);
  const parsedAdjustmentRecommendations = parseAdjustmentRecommendations(row.adjustment_json);
  const hasAdherenceScore = Object.prototype.hasOwnProperty.call(row, "adherence_score");
  const hasWorkoutPlanVersion = Object.prototype.hasOwnProperty.call(row, "workout_plan_version");
  const hasNutritionPlanVersion = Object.prototype.hasOwnProperty.call(row, "nutrition_plan_version");
  const hasCheckinJson = hasAnyKeys(row.checkin_json);

  return {
    id,
    weekStart,
    weekEnd,
    energy: clampWholeNumber(row.energy, 1, 5, 3),
    adherencePercent: clampWholeNumber(row.adherence_percent, 0, 100, 0),
    blockers,
    weightSnapshot,
    coachSummary: normalizeOptionalText(row.coach_summary),
    summaryModel: normalizeOptionalText(row.summary_model),
    ...(hasAdherenceScore
      ? {
        adherenceScore:
          adherenceScore !== null
            ? clampWholeNumber(adherenceScore, 0, 100, 0)
            : null,
      }
      : {}),
    ...(hasWorkoutPlanVersion
      ? {
        workoutPlanVersion:
          workoutPlanVersion !== null
            ? Math.max(1, Math.round(workoutPlanVersion))
            : null,
      }
      : {}),
    ...(hasNutritionPlanVersion
      ? {
        nutritionPlanVersion:
          nutritionPlanVersion !== null
            ? Math.max(1, Math.round(nutritionPlanVersion))
            : null,
      }
      : {}),
    ...(hasCheckinJson ? { checkinArtifact: parsedCheckinArtifact } : {}),
    ...(parsedAdjustmentRecommendations
      ? { adjustmentRecommendations: parsedAdjustmentRecommendations }
      : {}),
    ...(payloadCoachMessage ? { coachMessage: payloadCoachMessage } : {}),
    ...(payloadGuardrailNotes.length ? { guardrailNotes: payloadGuardrailNotes } : {}),
    createdAt,
    updatedAt,
  };
}

function mapCheckinsPayload(data: CoachWorkspaceResponse): CoachCheckinsPayload {
  const payloadCoachMessage = parseCoachMessage(data.coach_message);
  const payloadGuardrailNotes = Array.isArray(data.guardrail_notes)
    ? data.guardrail_notes
      .map((entry) => normalizeText(entry, { maxLength: 240 }))
      .filter((entry) => entry.length > 0)
    : [];

  const rawHistory = Array.isArray(data.checkin_history) ? data.checkin_history : [];
  const history = rawHistory
    .map((entry, index) =>
      mapCheckinRow(entry, `checkin-history-${index}`, payloadCoachMessage, payloadGuardrailNotes)
    )
    .filter((entry): entry is WeeklyCheckin => Boolean(entry));
  const currentCheckin = mapCheckinRow(
    data.checkin_current,
    "checkin-current",
    payloadCoachMessage,
    payloadGuardrailNotes
  );

  const weekStart =
    data.checkin_week_start ??
    currentCheckin?.weekStart ??
    history[0]?.weekStart ??
    "";
  const weekEnd =
    data.checkin_week_end ??
    currentCheckin?.weekEnd ??
    history[0]?.weekEnd ??
    "";

  const checkinArtifact =
    hasAnyKeys(data.checkin_artifact)
      ? parseCheckinArtifact(
        data.checkin_artifact,
        currentCheckin?.checkinArtifact
          ?? createFallbackArtifact({
            energy: currentCheckin?.energy ?? 3,
            adherencePercent: currentCheckin?.adherencePercent ?? 0,
            blockers: currentCheckin?.blockers ?? "",
            weightSnapshot: currentCheckin?.weightSnapshot ?? FALLBACK_WEIGHT_SNAPSHOT,
            adherenceScore: currentCheckin?.adherenceScore ?? null,
            workoutPlanVersion: currentCheckin?.workoutPlanVersion ?? null,
            nutritionPlanVersion: currentCheckin?.nutritionPlanVersion ?? null,
            createdAt: currentCheckin?.createdAt ?? new Date().toISOString(),
          })
      )
      : currentCheckin?.checkinArtifact ?? null;

  const adjustmentRecommendations =
    parseAdjustmentRecommendations(data.adjustment_recommendations)
    ?? currentCheckin?.adjustmentRecommendations
    ?? null;
  const hasDraftPlanSignal = Object.prototype.hasOwnProperty.call(data, "draft_plan");
  const hasDraftPlan = Boolean(toRowRecord(data.draft_plan));
  const planUpdatedForReview = hasDraftPlanSignal
    ? hasDraftPlan
    : data.plan_updated_for_review === true;
  const upstreamPlanUpdateError = normalizeOptionalText(data.plan_update_error, 400);
  const planUpdateError = !planUpdatedForReview
    ? upstreamPlanUpdateError ??
      (
        hasDraftPlanSignal && data.plan_updated_for_review === true
          ? "No nutrition draft was returned for review."
          : null
      )
    : null;
  const coachMessage = payloadCoachMessage ?? currentCheckin?.coachMessage ?? null;
  const guardrailNotes =
    payloadGuardrailNotes.length
      ? payloadGuardrailNotes
      : (currentCheckin?.guardrailNotes ?? []);

  return {
    threadId: data.thread_id ?? null,
    weekStart,
    weekEnd,
    weightSnapshot: data.checkin_weight_snapshot
      ? normalizeWeightSnapshot(data.checkin_weight_snapshot)
      : FALLBACK_WEIGHT_SNAPSHOT,
    currentCheckin,
    history,
    ...(planUpdatedForReview ? { planUpdatedForReview: true } : {}),
    ...(planUpdateError && !planUpdatedForReview ? { planUpdateError } : {}),
    ...(checkinArtifact ? { checkinArtifact } : {}),
    ...(adjustmentRecommendations ? { adjustmentRecommendations } : {}),
    ...(coachMessage ? { coachMessage } : {}),
    ...(guardrailNotes.length ? { guardrailNotes } : {}),
  };
}

function coachIdentityPayload(coach?: ActiveCoach | null) {
  if (!coach) return {};
  return {
    coach_gender: coach.gender,
    coach_personality: coach.personality,
  };
}

function hasNoActiveCoachSelectedError(error: unknown) {
  const raw = String((error as Error)?.message ?? error);
  return raw.includes("No active coach selected");
}

async function invokeCheckinsWithCoachRecovery(
  body: Record<string, unknown>,
  coach?: ActiveCoach | null
) {
  try {
    return await invokeCoachChat(body);
  } catch (error) {
    if (!coach || !hasNoActiveCoachSelectedError(error)) {
      throw error;
    }

    const authResult = await fetchCurrentUserId();
    const userId = authResult.data?.userId;
    if (authResult.error || !userId) {
      throw error;
    }

    const repair = await setActiveCoachOnServer(userId, "nutrition", coach);
    if (repair.error) {
      throw new Error(repair.error ?? "Couldn't repair active nutrition coach.");
    }

    try {
      return await invokeCoachChat(body);
    } catch (retryError) {
      if (!hasNoActiveCoachSelectedError(retryError)) {
        throw retryError;
      }
      throw new Error(
        "No active nutrition coach could be resolved after re-saving your selection. Please re-select a coach and try again."
      );
    }
  }
}

function hasExtendedCheckinInput(input: WeeklyCheckinInput) {
  return (
    Object.prototype.hasOwnProperty.call(input, "currentWeightKg")
    || Object.prototype.hasOwnProperty.call(input, "waistCm")
    || Object.prototype.hasOwnProperty.call(input, "progressPhotoPrompted")
    || Object.prototype.hasOwnProperty.call(input, "strengthPRs")
    || Object.prototype.hasOwnProperty.call(input, "consistencyNotes")
    || Object.prototype.hasOwnProperty.call(input, "bodyCompChanges")
    || Object.prototype.hasOwnProperty.call(input, "trainingDifficulty")
    || Object.prototype.hasOwnProperty.call(input, "nutritionAdherencePercent")
    || Object.prototype.hasOwnProperty.call(input, "nutritionAdherenceSubjective")
    || Object.prototype.hasOwnProperty.call(input, "appetiteCravings")
    || Object.prototype.hasOwnProperty.call(input, "energyRating")
    || Object.prototype.hasOwnProperty.call(input, "recoveryRating")
    || Object.prototype.hasOwnProperty.call(input, "sleepAvgHours")
    || Object.prototype.hasOwnProperty.call(input, "sleepQuality")
    || Object.prototype.hasOwnProperty.call(input, "stressLevel")
    || Object.prototype.hasOwnProperty.call(input, "scheduleConstraintsNextWeek")
    || Object.prototype.hasOwnProperty.call(input, "injuryPain")
    || Object.prototype.hasOwnProperty.call(input, "computedAdherenceScore")
    || Object.prototype.hasOwnProperty.call(input, "linkedPlanVersion")
  );
}

export function normalizeWeeklyCheckinInputV2(input: WeeklyCheckinInput): WeeklyCheckinInput {
  const normalizedEnergy = clampWholeNumber(input.energy, 1, 5, 3);
  const normalizedAdherence = clampWholeNumber(input.adherencePercent, 0, 100, 0);
  const normalizedBlockers = normalizeText(input.blockers, { maxLength: MAX_BLOCKERS_LENGTH });
  const normalizedSubjective = normalizeSubjectiveAdherence(input.nutritionAdherenceSubjective);
  const normalizedNutritionPercent = normalizeOptionalNumber(input.nutritionAdherencePercent);
  const computedAdherenceScore = clampWholeNumber(
    input.computedAdherenceScore,
    0,
    100,
    computeAdherenceScore({
      adherencePercent: normalizedNutritionPercent ?? normalizedAdherence,
      subjective: normalizedSubjective,
      energyRating: input.energyRating ?? normalizedEnergy,
      recoveryRating: input.recoveryRating ?? normalizedEnergy,
      sleepAvgHours: input.sleepAvgHours ?? 7,
      sleepQuality: input.sleepQuality ?? 3,
      stressLevel: input.stressLevel ?? 3,
    })
  );

  return {
    energy: normalizedEnergy,
    adherencePercent: normalizedAdherence,
    blockers: normalizedBlockers,
    ...(hasExtendedCheckinInput(input)
      ? {
        currentWeightKg: clampDecimal(input.currentWeightKg, 30, 350, 80, 1),
        waistCm: normalizeOptionalNumber(input.waistCm),
        progressPhotoPrompted: normalizeBool(input.progressPhotoPrompted),
        strengthPRs: normalizeText(input.strengthPRs, { maxLength: MAX_TEXT_LENGTH }),
        consistencyNotes: normalizeText(
          input.consistencyNotes ?? normalizedBlockers,
          { maxLength: MAX_TEXT_LENGTH }
        ),
        bodyCompChanges: normalizeText(input.bodyCompChanges, { maxLength: MAX_TEXT_LENGTH }),
        trainingDifficulty: normalizeDifficulty(input.trainingDifficulty),
        nutritionAdherencePercent: normalizedNutritionPercent,
        nutritionAdherenceSubjective: normalizedSubjective,
        appetiteCravings: normalizeText(input.appetiteCravings, { maxLength: MAX_TEXT_LENGTH }),
        energyRating: normalizeRating(input.energyRating, normalizedEnergy as WeeklyCheckinRating),
        recoveryRating: normalizeRating(
          input.recoveryRating,
          normalizedEnergy as WeeklyCheckinRating
        ),
        sleepAvgHours: clampDecimal(input.sleepAvgHours, 0, 24, 7, 1),
        sleepQuality: normalizeRating(input.sleepQuality, 3),
        stressLevel: normalizeRating(input.stressLevel, 3),
        scheduleConstraintsNextWeek: normalizeText(input.scheduleConstraintsNextWeek, {
          maxLength: MAX_TEXT_LENGTH,
        }),
        injuryPain: {
          hasPain: normalizeBool(input.injuryPain?.hasPain, false),
          details: normalizeText(input.injuryPain?.details, { maxLength: MAX_TEXT_LENGTH }),
          redFlags: normalizeBool(input.injuryPain?.redFlags, false),
        },
        computedAdherenceScore,
        linkedPlanVersion: {
          workoutVersion: normalizeOptionalNumber(input.linkedPlanVersion?.workoutVersion),
          nutritionVersion: normalizeOptionalNumber(input.linkedPlanVersion?.nutritionVersion),
        },
      }
      : {}),
  };
}

export async function fetchNutritionCheckins(
  options?: CheckinsRequestOptions
): Promise<CoachCheckinsPayload> {
  const data = await invokeCheckinsWithCoachRecovery({
    action: "checkin_history",
    specialization: "nutrition",
    limit: options?.limit ?? 26,
    ...coachIdentityPayload(options?.coach),
  }, options?.coach);

  return mapCheckinsPayload(data);
}

export async function submitWeeklyCheckinV2(
  input: WeeklyCheckinInput,
  options?: CheckinsRequestOptions
): Promise<CoachCheckinsPayload> {
  const normalized = normalizeWeeklyCheckinInputV2(input);
  const includeExtendedFields = hasExtendedCheckinInput(input);

  const checkinPayload: Record<string, unknown> = {
    energy: normalized.energy,
    adherence_percent: normalized.adherencePercent,
    blockers: normalized.blockers,
  };

  if (includeExtendedFields) {
    checkinPayload.timestamp = new Date().toISOString();
    checkinPayload.currentWeightKg = normalized.currentWeightKg;
    checkinPayload.waistCm = normalized.waistCm ?? null;
    checkinPayload.progressPhotoPrompted = normalized.progressPhotoPrompted ?? false;
    checkinPayload.strengthPRs = normalized.strengthPRs ?? "";
    checkinPayload.consistencyNotes = normalized.consistencyNotes ?? normalized.blockers;
    checkinPayload.bodyCompChanges = normalized.bodyCompChanges ?? "";
    checkinPayload.trainingDifficulty = normalized.trainingDifficulty ?? "right";
    checkinPayload.nutritionAdherencePercent =
      normalized.nutritionAdherencePercent ?? normalized.adherencePercent;
    checkinPayload.nutritionAdherenceSubjective =
      normalized.nutritionAdherenceSubjective ?? null;
    checkinPayload.appetiteCravings = normalized.appetiteCravings ?? "";
    checkinPayload.energyRating = normalized.energyRating ?? normalized.energy;
    checkinPayload.recoveryRating = normalized.recoveryRating ?? normalized.energy;
    checkinPayload.sleepAvgHours = normalized.sleepAvgHours ?? 7;
    checkinPayload.sleepQuality = normalized.sleepQuality ?? 3;
    checkinPayload.stressLevel = normalized.stressLevel ?? 3;
    checkinPayload.scheduleConstraintsNextWeek = normalized.scheduleConstraintsNextWeek ?? "";
    checkinPayload.injuryPain = {
      hasPain: normalized.injuryPain?.hasPain ?? false,
      details: normalized.injuryPain?.details ?? "",
      redFlags: normalized.injuryPain?.redFlags ?? false,
    };
    checkinPayload.computedAdherenceScore =
      normalized.computedAdherenceScore
      ?? normalized.nutritionAdherencePercent
      ?? normalized.adherencePercent;
    checkinPayload.linkedPlanVersion = {
      workoutVersion: normalized.linkedPlanVersion?.workoutVersion ?? null,
      nutritionVersion: normalized.linkedPlanVersion?.nutritionVersion ?? null,
    };
  }

  const data = await invokeCheckinsWithCoachRecovery({
    action: "checkin_submit",
    specialization: "nutrition",
    limit: options?.limit ?? 26,
    checkin: checkinPayload,
    ...coachIdentityPayload(options?.coach),
  }, options?.coach);

  return mapCheckinsPayload(data);
}

export async function submitNutritionCheckin(
  input: WeeklyCheckinInput,
  options?: CheckinsRequestOptions
): Promise<CoachCheckinsPayload> {
  return submitWeeklyCheckinV2(input, options);
}
