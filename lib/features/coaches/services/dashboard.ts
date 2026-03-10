import { formatLocalDate, getWeekRange } from "../../../utils/metrics";
import { getLocalTimeZone } from "../../../utils/time";
import type { ActiveCoach } from "../types";
import { invokeCoachChat } from "./chatClient";

export type CoachTodayCard = {
  directive: string;
  statusIndicators: string[];
  primaryCta: string;
};

export type CoachTrackCard = {
  label: "Training" | "Nutrition";
  preview: string;
  cta: string;
  planId: string | null;
  planVersion: number | null;
};

export type CoachNutritionCard = CoachTrackCard & {
  targetsSummary: string;
  caloriesTarget: number | null;
  ctas: string[];
  planUpdatedForReview: boolean;
};

export type CoachWeeklyCheckinCard = {
  label: "Weekly Check-in";
  nextDueLabel: string;
  isDue: boolean;
  streak: number;
  adherenceScore: number;
  planAcceptedThisWeek: boolean | null;
  nextWeekAdherenceDelta: number | null;
  cta: string;
};

export type CoachDashboardSnapshot = {
  today: CoachTodayCard;
  training: CoachTrackCard;
  nutrition: CoachNutritionCard;
  weeklyCheckin: CoachWeeklyCheckinCard;
};

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asFiniteNumber(value: unknown, fallback: number | null = null) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function asBooleanOrNull(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function coachIdentityPayload(coach?: ActiveCoach | null) {
  if (!coach) return {};
  return {
    coach_gender: coach.gender,
    coach_personality: coach.personality,
  };
}

export function computeNextCheckinDueLabel(options?: {
  explicitLabel?: string | null;
  now?: Date;
  timeZone?: string;
}) {
  const explicit = normalizeText(options?.explicitLabel, "");
  if (explicit.length) return explicit;

  const zone = options?.timeZone ?? getLocalTimeZone();
  const nowLocal = formatLocalDate(options?.now ?? new Date(), zone);
  const { weekEnd } = getWeekRange(nowLocal);
  const weekEndDate = new Date(`${weekEnd}T00:00:00Z`);

  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(weekEndDate);
  } catch {
    return "Sunday";
  }
}

export function buildTodayStatusIndicators(args: {
  provided: string[];
  trainingPreview: string;
  nutritionSummary: string;
}) {
  const normalizedProvided = args.provided
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);

  if (normalizedProvided.length > 0) {
    return normalizedProvided.slice(0, 2).map((entry) => {
      const [rawLabel, ...rest] = entry.split(":");
      const value = rest.join(":").trim();
      if (!rawLabel?.trim().length || !value.length) {
        return entry;
      }

      const label = rawLabel.trim().toLowerCase();
      if (
        label === "nutrition" ||
        label === "macro target" ||
        label === "macros"
      ) {
        return `Macros: ${value}`;
      }
      if (
        label === "workout" ||
        label === "workout scheduled" ||
        label === "workout status"
      ) {
        return `Workout: ${value}`;
      }

      return entry;
    });
  }

  const fallback = [
    `Workout: ${args.trainingPreview}`,
    `Macros: ${args.nutritionSummary}`,
  ];

  return fallback.slice(0, 2);
}

export async function hydrateCoachDashboard(options?: {
  coach?: ActiveCoach | null;
  specialization?: "workout" | "nutrition";
}): Promise<CoachDashboardSnapshot> {
  const data = await invokeCoachChat({
    action: "dashboard_snapshot",
    specialization: options?.specialization ?? "nutrition",
    ...coachIdentityPayload(options?.coach),
  });

  const root = asRecord(data.dashboard_snapshot);
  const today = asRecord(root.today);
  const training = asRecord(root.training);
  const nutrition = asRecord(root.nutrition);
  const weeklyCheckin = asRecord(root.weekly_checkin);

  const trainingPreview = normalizeText(training.preview, "No training plan set");
  const nutritionSummary = normalizeText(nutrition.targets_summary, "No nutrition targets set");

  return {
    today: {
      directive: normalizeText(
        today.directive,
        "Start with one high-impact action today, then check in with your coach."
      ),
      statusIndicators: buildTodayStatusIndicators({
        provided: normalizeStringList(today.status_indicators),
        trainingPreview,
        nutritionSummary,
      }),
      primaryCta: normalizeText(today.primary_cta, "Chat with Coach"),
    },
    training: {
      label: "Training",
      preview: trainingPreview,
      cta: normalizeText(training.cta, "View plan"),
      planId: normalizeText(training.plan_id, "") || null,
      planVersion: asFiniteNumber(training.plan_version),
    },
    nutrition: {
      label: "Nutrition",
      preview: nutritionSummary,
      targetsSummary: nutritionSummary,
      caloriesTarget: asFiniteNumber(nutrition.daily_calories_target),
      cta: normalizeText(nutrition.cta, "View meal plan"),
      ctas: normalizeStringList(nutrition.ctas),
      planId: normalizeText(nutrition.plan_id, "") || null,
      planVersion: asFiniteNumber(nutrition.plan_version),
      planUpdatedForReview: Boolean(nutrition.plan_updated_for_review),
    },
    weeklyCheckin: {
      label: "Weekly Check-in",
      nextDueLabel: computeNextCheckinDueLabel({
        explicitLabel: normalizeText(weeklyCheckin.next_due_label, ""),
      }),
      isDue: Boolean(weeklyCheckin.is_due),
      streak: asFiniteNumber(weeklyCheckin.streak, 0) ?? 0,
      adherenceScore: asFiniteNumber(weeklyCheckin.adherence_score, 0) ?? 0,
      planAcceptedThisWeek: asBooleanOrNull(weeklyCheckin.plan_accepted_this_week),
      nextWeekAdherenceDelta: asFiniteNumber(weeklyCheckin.next_week_adherence_delta),
      cta: normalizeText(weeklyCheckin.cta, "Do weekly check-in"),
    },
  };
}
