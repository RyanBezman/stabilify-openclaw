import type { WeightUnit } from "../../../data/types";
import { computeAdherenceScore } from "./checkinScoring";
import type {
  WeeklyCheckin,
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinDifficulty,
  WeeklyCheckinInput,
  WeeklyCheckinRating,
} from "../types/checkinsTypes";

export type WeeklyCheckinLegacyFormValues = {
  energy: number;
  adherencePercent: string;
  blockers: string;
};

export type WeeklyCheckinV2Form = {
  currentWeight: string;
  waistCm: string;
  progressPhotoPrompted: boolean;
  strengthPRs: string;
  consistencyNotes: string;
  bodyCompChanges: string;
  trainingDifficulty: WeeklyCheckinDifficulty;
  nutritionAdherenceSubjective: WeeklyCheckinAdherenceSubjective | null;
  appetiteCravings: string;
  recoveryRating: WeeklyCheckinRating;
  sleepAvgHours: string;
  sleepQuality: WeeklyCheckinRating;
  stressLevel: WeeklyCheckinRating;
  scheduleConstraintsNextWeek: string;
  injuryHasPain: boolean;
  injuryDetails: string;
  injuryRedFlags: boolean;
};

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.2046226218;

export const CURRENT_WEIGHT_INPUT_UNIT: WeightUnit = "lb";
export const MIN_CURRENT_WEIGHT_KG = 30;
export const MAX_CURRENT_WEIGHT_KG = 350;
export const MIN_CURRENT_WEIGHT_LB = Number(
  (MIN_CURRENT_WEIGHT_KG * LB_PER_KG).toFixed(1),
);
export const MAX_CURRENT_WEIGHT_LB = Number(
  (MAX_CURRENT_WEIGHT_KG * LB_PER_KG).toFixed(1),
);

export const CHECKINS_DEFAULT_ENERGY = 3;
export const CHECKINS_DEFAULT_ADHERENCE = "100";
export const CHECKINS_DEFAULT_V2_FORM: WeeklyCheckinV2Form = {
  currentWeight: "176.4",
  waistCm: "",
  progressPhotoPrompted: false,
  strengthPRs: "",
  consistencyNotes: "",
  bodyCompChanges: "",
  trainingDifficulty: "right",
  nutritionAdherenceSubjective: null,
  appetiteCravings: "",
  recoveryRating: 3,
  sleepAvgHours: "7",
  sleepQuality: 3,
  stressLevel: 3,
  scheduleConstraintsNextWeek: "",
  injuryHasPain: false,
  injuryDetails: "",
  injuryRedFlags: false,
};

export function clampWholeNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function kgToLb(valueKg: number) {
  return Number((valueKg * LB_PER_KG).toFixed(1));
}

function lbToKg(valueLb: number) {
  return Number((valueLb * KG_PER_LB).toFixed(1));
}

export function toCurrentWeightInputValue(weightKg: number) {
  if (CURRENT_WEIGHT_INPUT_UNIT === "lb") {
    return String(kgToLb(weightKg));
  }
  return String(Number(weightKg.toFixed(1)));
}

function toCurrentWeightKg(inputWeight: number) {
  if (CURRENT_WEIGHT_INPUT_UNIT === "lb") {
    return lbToKg(inputWeight);
  }
  return Number(inputWeight.toFixed(1));
}

export function deriveLegacyCheckinFormValues(
  checkin: WeeklyCheckin | null,
): WeeklyCheckinLegacyFormValues {
  if (!checkin) {
    return {
      energy: CHECKINS_DEFAULT_ENERGY,
      adherencePercent: CHECKINS_DEFAULT_ADHERENCE,
      blockers: "",
    };
  }

  return {
    energy: clampWholeNumber(checkin.energy, 1, 5, CHECKINS_DEFAULT_ENERGY),
    adherencePercent: String(
      clampWholeNumber(checkin.adherencePercent, 0, 100, 0),
    ),
    blockers: checkin.blockers,
  };
}

export function deriveV2CheckinFormValues(
  checkin: WeeklyCheckin | null,
): WeeklyCheckinV2Form {
  const artifact = checkin?.checkinArtifact;
  if (!artifact) {
    return {
      ...CHECKINS_DEFAULT_V2_FORM,
      consistencyNotes: checkin?.blockers ?? "",
      recoveryRating: clampWholeNumber(
        checkin?.energy ?? CHECKINS_DEFAULT_V2_FORM.recoveryRating,
        1,
        5,
        CHECKINS_DEFAULT_V2_FORM.recoveryRating,
      ) as WeeklyCheckinRating,
    };
  }

  return {
    currentWeight: toCurrentWeightInputValue(artifact.currentWeightKg),
    waistCm:
      artifact.waistCm === null || artifact.waistCm === undefined
        ? ""
        : String(artifact.waistCm),
    progressPhotoPrompted: artifact.progressPhotoPrompted,
    strengthPRs: artifact.strengthPRs,
    consistencyNotes: artifact.consistencyNotes,
    bodyCompChanges: artifact.bodyCompChanges,
    trainingDifficulty: artifact.trainingDifficulty,
    nutritionAdherenceSubjective:
      artifact.nutritionAdherenceSubjective ?? null,
    appetiteCravings: artifact.appetiteCravings,
    recoveryRating: artifact.recoveryRating,
    sleepAvgHours: String(artifact.sleepAvgHours),
    sleepQuality: artifact.sleepQuality,
    stressLevel: artifact.stressLevel,
    scheduleConstraintsNextWeek: artifact.scheduleConstraintsNextWeek,
    injuryHasPain: artifact.injuryPain.hasPain,
    injuryDetails: artifact.injuryPain.details,
    injuryRedFlags: artifact.injuryPain.redFlags,
  };
}

export function buildWeeklyCheckinSubmitInput(args: {
  energy: number;
  adherencePercent: string;
  blockers: string;
  v2Form: WeeklyCheckinV2Form;
}): { input: WeeklyCheckinInput | null; validationMessage: string | null } {
  const normalizedEnergy = Math.round(args.energy);
  const parsedAdherence = Number(args.adherencePercent);
  const normalizedBlockers = args.blockers.trim();

  if (
    !Number.isFinite(normalizedEnergy)
    || normalizedEnergy < 1
    || normalizedEnergy > 5
  ) {
    return {
      input: null,
      validationMessage: "Energy must be a whole number from 1 to 5.",
    };
  }

  if (
    !Number.isFinite(parsedAdherence)
    || parsedAdherence < 0
    || parsedAdherence > 100
  ) {
    return {
      input: null,
      validationMessage: "Adherence must be a whole number from 0 to 100.",
    };
  }

  const parsedCurrentWeight = Number(args.v2Form.currentWeight);
  const minCurrentWeight =
    CURRENT_WEIGHT_INPUT_UNIT === "lb"
      ? MIN_CURRENT_WEIGHT_LB
      : MIN_CURRENT_WEIGHT_KG;
  const maxCurrentWeight =
    CURRENT_WEIGHT_INPUT_UNIT === "lb"
      ? MAX_CURRENT_WEIGHT_LB
      : MAX_CURRENT_WEIGHT_KG;
  if (
    !Number.isFinite(parsedCurrentWeight)
    || parsedCurrentWeight < minCurrentWeight
    || parsedCurrentWeight > maxCurrentWeight
  ) {
    return {
      input: null,
      validationMessage: `Current weight must be between ${minCurrentWeight} and ${maxCurrentWeight} ${CURRENT_WEIGHT_INPUT_UNIT}.`,
    };
  }

  const parsedSleepAvgHours = Number(args.v2Form.sleepAvgHours);
  if (
    !Number.isFinite(parsedSleepAvgHours)
    || parsedSleepAvgHours < 0
    || parsedSleepAvgHours > 24
  ) {
    return {
      input: null,
      validationMessage: "Sleep average hours must be between 0 and 24.",
    };
  }

  const parsedWaist = parseNullableNumber(args.v2Form.waistCm);
  const injuryHasPain =
    args.v2Form.injuryHasPain || args.v2Form.injuryRedFlags;
  const computedAdherenceScore = computeAdherenceScore({
    adherencePercent: parsedAdherence,
    subjective: args.v2Form.nutritionAdherenceSubjective,
    energyRating: normalizedEnergy,
    recoveryRating: args.v2Form.recoveryRating,
    sleepAvgHours: parsedSleepAvgHours,
    sleepQuality: args.v2Form.sleepQuality,
    stressLevel: args.v2Form.stressLevel,
  });

  return {
    input: {
      energy: normalizedEnergy,
      adherencePercent: clampWholeNumber(parsedAdherence, 0, 100, 0),
      blockers: normalizedBlockers,
      currentWeightKg: toCurrentWeightKg(parsedCurrentWeight),
      waistCm: parsedWaist === null ? null : Number(parsedWaist.toFixed(1)),
      progressPhotoPrompted: args.v2Form.progressPhotoPrompted,
      strengthPRs: args.v2Form.strengthPRs.trim(),
      consistencyNotes:
        args.v2Form.consistencyNotes.trim() || normalizedBlockers,
      bodyCompChanges: args.v2Form.bodyCompChanges.trim(),
      trainingDifficulty: args.v2Form.trainingDifficulty,
      nutritionAdherencePercent: clampWholeNumber(parsedAdherence, 0, 100, 0),
      nutritionAdherenceSubjective:
        args.v2Form.nutritionAdherenceSubjective,
      appetiteCravings: args.v2Form.appetiteCravings.trim(),
      energyRating: normalizedEnergy as WeeklyCheckinRating,
      recoveryRating: args.v2Form.recoveryRating,
      sleepAvgHours: Number(parsedSleepAvgHours.toFixed(1)),
      sleepQuality: args.v2Form.sleepQuality,
      stressLevel: args.v2Form.stressLevel,
      scheduleConstraintsNextWeek:
        args.v2Form.scheduleConstraintsNextWeek.trim(),
      injuryPain: {
        hasPain: injuryHasPain,
        details: args.v2Form.injuryDetails.trim(),
        redFlags: args.v2Form.injuryRedFlags,
      },
      computedAdherenceScore,
    },
    validationMessage: null,
  };
}
