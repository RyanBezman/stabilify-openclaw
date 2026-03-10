import type { WeightUnit } from "../../../data/types";
import { formatWeight } from "../../../utils/weight";
import type { WeeklyCheckinAdherenceSubjective } from "../types/checkinsTypes";
import type { WeeklyCheckinV2Form } from "./checkinForm";
import {
  CURRENT_WEIGHT_INPUT_UNIT,
  MAX_CURRENT_WEIGHT_KG,
  MAX_CURRENT_WEIGHT_LB,
  MIN_CURRENT_WEIGHT_KG,
  MIN_CURRENT_WEIGHT_LB,
} from "./checkinForm";

export type CoachCheckinStepId =
  | "body_metrics"
  | "training_recap"
  | "nutrition_recap"
  | "recovery"
  | "next_week"
  | "pain_safety"
  | "review";

export type CoachCheckinFlowMode = "overview" | "wizard";

export type CoachCheckinFlowSnapshot = {
  energy: number;
  adherencePercent: string;
  blockers: string;
  currentWeightInputUnit: WeightUnit;
  v2Form: WeeklyCheckinV2Form;
};

export type CoachCheckinReviewRow = {
  label: string;
  value: string;
};

export type CoachCheckinReviewSection = {
  stepId: Exclude<CoachCheckinStepId, "review">;
  title: string;
  rows: CoachCheckinReviewRow[];
};

type CoachCheckinStepDefinition = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
};

export const COACH_CHECKIN_STEPS: CoachCheckinStepId[] = [
  "body_metrics",
  "training_recap",
  "nutrition_recap",
  "recovery",
  "next_week",
  "pain_safety",
  "review",
];

const COACH_CHECKIN_STEP_DEFINITIONS: Record<
  CoachCheckinStepId,
  CoachCheckinStepDefinition
> = {
  body_metrics: {
    title: "How did your body respond this week?",
    subtitle: "Capture the key numbers and physical changes before your recap.",
  },
  training_recap: {
    title: "How did training actually feel?",
    subtitle: "Note the effort, wins, and consistency that shaped the week.",
  },
  nutrition_recap: {
    title: "How well did nutrition stick?",
    subtitle: "Share adherence and appetite signals so the next plan stays realistic.",
  },
  recovery: {
    title: "How recovered did you feel?",
    subtitle: "Energy, sleep, and stress help your coach read the whole picture.",
  },
  next_week: {
    title: "What does next week look like?",
    subtitle: "Flag schedule friction early so your adjustments stay usable.",
  },
  pain_safety: {
    title: "Any pain or red flags to account for?",
    subtitle: "We use this to route safety guidance before normal adjustments.",
  },
  review: {
    title: "Review your weekly check-in",
    subtitle: "Make sure everything looks right before you send it to your coach.",
    badgeLabel: "ready to submit",
  },
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((segment) =>
      segment ? segment[0].toUpperCase() + segment.slice(1) : segment,
    )
    .join(" ");
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

function formatOptionalText(
  value: string,
  fallback = "None noted",
) {
  const normalized = value.trim();
  return normalized.length ? normalized : fallback;
}

function formatSubjectiveAdherence(
  value: WeeklyCheckinAdherenceSubjective | null,
) {
  if (!value) return "Not set";
  return titleCase(value);
}

function formatTrainingDifficulty(value: WeeklyCheckinV2Form["trainingDifficulty"]) {
  if (value === "too_easy") return "Too easy";
  if (value === "too_hard") return "Too hard";
  return "Right";
}

function formatRating(value: number) {
  return `${value}/5`;
}

function currentWeightRangeLabel(unit: WeightUnit) {
  if (unit === "lb") {
    return `${MIN_CURRENT_WEIGHT_LB} and ${MAX_CURRENT_WEIGHT_LB} lb`;
  }
  return `${MIN_CURRENT_WEIGHT_KG} and ${MAX_CURRENT_WEIGHT_KG} kg`;
}

export function getCoachCheckinStepDefinition(stepId: CoachCheckinStepId) {
  return COACH_CHECKIN_STEP_DEFINITIONS[stepId];
}

export function validateCoachCheckinStep(
  stepId: CoachCheckinStepId,
  snapshot: CoachCheckinFlowSnapshot,
) {
  if (stepId === "body_metrics") {
    const parsedCurrentWeight = Number(snapshot.v2Form.currentWeight);
    const minCurrentWeight =
      snapshot.currentWeightInputUnit === "lb"
        ? MIN_CURRENT_WEIGHT_LB
        : MIN_CURRENT_WEIGHT_KG;
    const maxCurrentWeight =
      snapshot.currentWeightInputUnit === "lb"
        ? MAX_CURRENT_WEIGHT_LB
        : MAX_CURRENT_WEIGHT_KG;

    if (
      !Number.isFinite(parsedCurrentWeight)
      || parsedCurrentWeight < minCurrentWeight
      || parsedCurrentWeight > maxCurrentWeight
    ) {
      return `Current weight must be between ${currentWeightRangeLabel(snapshot.currentWeightInputUnit)}.`;
    }
    return null;
  }

  if (stepId === "nutrition_recap") {
    const adherence = Number(snapshot.adherencePercent);
    if (!Number.isFinite(adherence) || adherence < 0 || adherence > 100) {
      return "Nutrition adherence must be between 0 and 100.";
    }
    return null;
  }

  if (stepId === "recovery") {
    const roundedEnergy = Math.round(snapshot.energy);
    if (
      !Number.isFinite(roundedEnergy)
      || roundedEnergy < 1
      || roundedEnergy > 5
    ) {
      return "Energy must be a whole number from 1 to 5.";
    }

    const parsedSleepAvgHours = Number(snapshot.v2Form.sleepAvgHours);
    if (
      !Number.isFinite(parsedSleepAvgHours)
      || parsedSleepAvgHours < 0
      || parsedSleepAvgHours > 24
    ) {
      return "Sleep average hours must be between 0 and 24.";
    }
    return null;
  }

  if (stepId === "pain_safety") {
    if (
      snapshot.v2Form.injuryHasPain
      && !snapshot.v2Form.injuryDetails.trim().length
    ) {
      return "Add a short note about where or when the pain shows up.";
    }
    return null;
  }

  return null;
}

export function buildCoachCheckinSummaryChips(
  snapshot: CoachCheckinFlowSnapshot,
) {
  const chips: string[] = [];
  const parsedCurrentWeight = Number(snapshot.v2Form.currentWeight);
  if (Number.isFinite(parsedCurrentWeight)) {
    chips.push(`${parsedCurrentWeight} ${snapshot.currentWeightInputUnit}`);
  }

  const adherence = Number(snapshot.adherencePercent);
  if (Number.isFinite(adherence)) {
    chips.push(`${Math.round(adherence)}% adherence`);
  }

  chips.push(formatTrainingDifficulty(snapshot.v2Form.trainingDifficulty));

  return chips.slice(0, 3);
}

export function buildCoachCheckinReviewSections(
  snapshot: CoachCheckinFlowSnapshot,
) {
  const unit = snapshot.currentWeightInputUnit || CURRENT_WEIGHT_INPUT_UNIT;
  const parsedCurrentWeight = Number(snapshot.v2Form.currentWeight);
  const formattedCurrentWeight = Number.isFinite(parsedCurrentWeight)
    ? formatWeight(parsedCurrentWeight, unit)
    : "Not set";

  const sections: CoachCheckinReviewSection[] = [
    {
      stepId: "body_metrics",
      title: "Body metrics",
      rows: [
        { label: "Current weight", value: formattedCurrentWeight },
        {
          label: "Waist",
          value: snapshot.v2Form.waistCm.trim().length
            ? `${snapshot.v2Form.waistCm.trim()} cm`
            : "Not added",
        },
        {
          label: "Body comp changes",
          value: formatOptionalText(snapshot.v2Form.bodyCompChanges),
        },
      ],
    },
    {
      stepId: "training_recap",
      title: "Training recap",
      rows: [
        {
          label: "Progress photo prompted",
          value: formatBoolean(snapshot.v2Form.progressPhotoPrompted),
        },
        {
          label: "Training difficulty",
          value: formatTrainingDifficulty(snapshot.v2Form.trainingDifficulty),
        },
        {
          label: "Goal progress / PRs",
          value: formatOptionalText(snapshot.v2Form.strengthPRs),
        },
        {
          label: "Consistency notes",
          value: formatOptionalText(snapshot.v2Form.consistencyNotes),
        },
      ],
    },
    {
      stepId: "nutrition_recap",
      title: "Nutrition recap",
      rows: [
        {
          label: "Adherence",
          value: `${snapshot.adherencePercent}%`,
        },
        {
          label: "Subjective adherence",
          value: formatSubjectiveAdherence(
            snapshot.v2Form.nutritionAdherenceSubjective,
          ),
        },
        {
          label: "Appetite / cravings",
          value: formatOptionalText(snapshot.v2Form.appetiteCravings),
        },
      ],
    },
    {
      stepId: "recovery",
      title: "Recovery",
      rows: [
        { label: "Energy", value: formatRating(snapshot.energy) },
        {
          label: "Recovery",
          value: formatRating(snapshot.v2Form.recoveryRating),
        },
        {
          label: "Sleep average",
          value: `${snapshot.v2Form.sleepAvgHours.trim() || "0"} hours`,
        },
        {
          label: "Sleep quality",
          value: formatRating(snapshot.v2Form.sleepQuality),
        },
        {
          label: "Stress",
          value: formatRating(snapshot.v2Form.stressLevel),
        },
      ],
    },
    {
      stepId: "next_week",
      title: "Next week",
      rows: [
        {
          label: "Schedule constraints",
          value: formatOptionalText(snapshot.v2Form.scheduleConstraintsNextWeek),
        },
        {
          label: "Other blockers",
          value: formatOptionalText(snapshot.blockers),
        },
      ],
    },
    {
      stepId: "pain_safety",
      title: "Pain / safety",
      rows: [
        {
          label: "Pain or injury",
          value: formatBoolean(snapshot.v2Form.injuryHasPain),
        },
        {
          label: "Pain details",
          value: snapshot.v2Form.injuryHasPain
            ? formatOptionalText(snapshot.v2Form.injuryDetails)
            : "No pain reported",
        },
        {
          label: "Red-flag symptoms",
          value: formatBoolean(snapshot.v2Form.injuryRedFlags),
        },
      ],
    },
  ];

  return sections;
}
