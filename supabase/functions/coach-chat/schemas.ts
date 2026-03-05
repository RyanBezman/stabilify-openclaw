export type ArtifactDiffOp = "add" | "remove" | "replace";

export type ArtifactDiffPatch = {
  op: ArtifactDiffOp;
  path: string;
  value?: unknown;
};

export type ArtifactWeeklyCheckinInputV2 = {
  timestamp: string;
  linkedPlanVersion: {
    workoutVersion: number | null;
    nutritionVersion: number | null;
  };
  currentWeightKg: number;
  waistCm?: number | null;
  progressPhotoPrompted: boolean;
  strengthPRs: string;
  consistencyNotes: string;
  bodyCompChanges: string;
  trainingDifficulty: "too_easy" | "right" | "too_hard";
  nutritionAdherencePercent?: number | null;
  nutritionAdherenceSubjective?: "low" | "medium" | "high" | null;
  appetiteCravings: string;
  energyRating: 1 | 2 | 3 | 4 | 5;
  recoveryRating: 1 | 2 | 3 | 4 | 5;
  sleepAvgHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  scheduleConstraintsNextWeek: string;
  injuryPain: {
    hasPain: boolean;
    details: string;
    redFlags: boolean;
  };
  computedAdherenceScore: number;
};

export type ArtifactAdjustmentRecommendations = {
  id: string;
  workoutDiff: ArtifactDiffPatch[];
  nutritionDiff: ArtifactDiffPatch[];
  mealPlanDiff: ArtifactDiffPatch[];
  rationale: {
    training: string;
    nutrition: string;
    coordination: string;
  };
};

export type ArtifactCoachMessage = {
  id: string;
  voice: "unified_primary_coach";
  summary: string;
  focusHabits: [string] | [string, string] | [string, string, string];
  artifactRefs: {
    workoutPlanId?: string;
    nutritionTargetsId?: string;
    mealPlanId?: string;
    adjustmentRecommendationId?: string;
    weeklyCheckinId?: string;
  };
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Number(value);
}

function asInt(value: unknown, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asText(value: unknown, fallback = "", max = 800) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isFinite(value)) return null;
  return Number(value);
}

function asNullableText(value: unknown, max = 1200) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, max);
  return normalized.length ? normalized : null;
}

function safeIsoTimestamp(value: unknown) {
  const text = asText(value, "");
  if (!text) return new Date().toISOString();
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function normalizeWeeklyCheckinArtifact(
  raw: unknown,
  defaults?: {
    workoutVersion?: number | null;
    nutritionVersion?: number | null;
    computedAdherenceScore?: number;
  }
): ArtifactWeeklyCheckinInputV2 {
  const record = asRecord(raw) ?? {};
  const linkedPlanVersion = asRecord(record.linkedPlanVersion) ?? {};
  const injuryPain = asRecord(record.injuryPain) ?? {};

  const nutritionSubjectiveRaw = asText(record.nutritionAdherenceSubjective, "", 16);
  const nutritionAdherenceSubjective =
    nutritionSubjectiveRaw === "low" ||
    nutritionSubjectiveRaw === "medium" ||
    nutritionSubjectiveRaw === "high"
      ? nutritionSubjectiveRaw
      : null;

  const difficultyRaw = asText(record.trainingDifficulty, "right", 16);
  const trainingDifficulty =
    difficultyRaw === "too_easy" || difficultyRaw === "too_hard" || difficultyRaw === "right"
      ? difficultyRaw
      : "right";

  return {
    timestamp: safeIsoTimestamp(record.timestamp),
    linkedPlanVersion: {
      workoutVersion: asNullableNumber(linkedPlanVersion.workoutVersion) ?? defaults?.workoutVersion ?? null,
      nutritionVersion:
        asNullableNumber(linkedPlanVersion.nutritionVersion) ?? defaults?.nutritionVersion ?? null,
    },
    currentWeightKg: Number(Math.max(30, Math.min(350, asNumber(record.currentWeightKg, 80))).toFixed(1)),
    waistCm: asNullableNumber(record.waistCm),
    progressPhotoPrompted: asBool(record.progressPhotoPrompted),
    strengthPRs: asText(record.strengthPRs, "", 1000),
    consistencyNotes: asText(record.consistencyNotes, "", 1000),
    bodyCompChanges: asText(record.bodyCompChanges, "", 1000),
    trainingDifficulty,
    nutritionAdherencePercent: asNullableNumber(record.nutritionAdherencePercent),
    nutritionAdherenceSubjective,
    appetiteCravings: asText(record.appetiteCravings, "", 1000),
    energyRating: asInt(record.energyRating, 1, 5, 3) as 1 | 2 | 3 | 4 | 5,
    recoveryRating: asInt(record.recoveryRating, 1, 5, 3) as 1 | 2 | 3 | 4 | 5,
    sleepAvgHours: Number(Math.max(0, Math.min(24, asNumber(record.sleepAvgHours, 7))).toFixed(1)),
    sleepQuality: asInt(record.sleepQuality, 1, 5, 3) as 1 | 2 | 3 | 4 | 5,
    stressLevel: asInt(record.stressLevel, 1, 5, 3) as 1 | 2 | 3 | 4 | 5,
    scheduleConstraintsNextWeek: asText(record.scheduleConstraintsNextWeek, "", 1000),
    injuryPain: {
      hasPain: asBool(injuryPain.hasPain),
      details: asText(injuryPain.details, "", 1000),
      redFlags: asBool(injuryPain.redFlags),
    },
    computedAdherenceScore: asInt(
      record.computedAdherenceScore,
      0,
      100,
      defaults?.computedAdherenceScore ?? 0
    ),
  };
}

export function normalizeAdjustmentRecommendations(
  raw: unknown
): ArtifactAdjustmentRecommendations {
  const record = asRecord(raw) ?? {};
  const rationale = asRecord(record.rationale) ?? {};

  const normalizeDiff = (input: unknown): ArtifactDiffPatch[] => {
    if (!Array.isArray(input)) return [];
    return input
      .map((entry) => {
        const row = asRecord(entry);
        if (!row) return null;
        const opRaw = asText(row.op, "replace", 16);
        const op: ArtifactDiffOp =
          opRaw === "add" || opRaw === "remove" || opRaw === "replace" ? opRaw : "replace";
        const path = asText(row.path, "");
        if (!path) return null;
        return {
          op,
          path,
          ...(Object.prototype.hasOwnProperty.call(row, "value") ? { value: row.value } : {}),
        };
      })
      .filter((entry): entry is ArtifactDiffPatch => Boolean(entry));
  };

  return {
    id: asText(record.id, crypto.randomUUID(), 80),
    workoutDiff: normalizeDiff(record.workoutDiff),
    nutritionDiff: normalizeDiff(record.nutritionDiff),
    mealPlanDiff: normalizeDiff(record.mealPlanDiff),
    rationale: {
      training: asText(rationale.training, "No training rationale provided.", 1200),
      nutrition: asText(rationale.nutrition, "No nutrition rationale provided.", 1200),
      coordination: asText(rationale.coordination, "No coordination rationale provided.", 1200),
    },
  };
}

export function normalizeCoachMessageArtifact(raw: unknown): ArtifactCoachMessage {
  const record = asRecord(raw) ?? {};
  const refs = asRecord(record.artifactRefs) ?? {};
  const focusHabitsRaw = Array.isArray(record.focusHabits)
    ? record.focusHabits.map((entry) => asText(entry, "", 180)).filter((entry) => entry.length > 0)
    : [];

  const focusHabits = (focusHabitsRaw.length
    ? focusHabitsRaw.slice(0, 3)
    : ["Follow your plan with consistency this week."]
  ) as [string] | [string, string] | [string, string, string];

  return {
    id: asText(record.id, crypto.randomUUID(), 80),
    voice: "unified_primary_coach",
    summary: asText(record.summary, "Keep showing up and we'll keep adjusting together.", 1400),
    focusHabits,
    artifactRefs: {
      workoutPlanId: asNullableText(refs.workoutPlanId, 80) ?? undefined,
      nutritionTargetsId: asNullableText(refs.nutritionTargetsId, 80) ?? undefined,
      mealPlanId: asNullableText(refs.mealPlanId, 80) ?? undefined,
      adjustmentRecommendationId: asNullableText(refs.adjustmentRecommendationId, 80) ?? undefined,
      weeklyCheckinId: asNullableText(refs.weeklyCheckinId, 80) ?? undefined,
    },
    createdAt: safeIsoTimestamp(record.createdAt),
  };
}
