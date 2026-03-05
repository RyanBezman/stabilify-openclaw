import type { WeightUnit } from "../../../data/types";
import type {
  ArtifactAdjustmentRecommendations,
  ArtifactCoachMessage,
} from "./artifacts";

export type WeeklyCheckinTrend = "down" | "flat" | "up" | "no_data";
export type WeeklyCheckinDifficulty = "too_easy" | "right" | "too_hard";
export type WeeklyCheckinAdherenceSubjective = "low" | "medium" | "high";
export type WeeklyCheckinRating = 1 | 2 | 3 | 4 | 5;

export type WeeklyWeightSnapshot = {
  unit: WeightUnit;
  entries: number;
  startWeight: number | null;
  endWeight: number | null;
  delta: number | null;
  trend: WeeklyCheckinTrend;
};

export type WeeklyCheckinLinkedPlanVersion = {
  workoutVersion: number | null;
  nutritionVersion: number | null;
};

export type WeeklyCheckinInjuryPain = {
  hasPain: boolean;
  details: string;
  redFlags: boolean;
};

export type WeeklyCheckinArtifact = {
  timestamp: string;
  linkedPlanVersion: WeeklyCheckinLinkedPlanVersion;
  currentWeightKg: number;
  waistCm?: number | null;
  progressPhotoPrompted: boolean;
  strengthPRs: string;
  consistencyNotes: string;
  bodyCompChanges: string;
  trainingDifficulty: WeeklyCheckinDifficulty;
  nutritionAdherencePercent?: number | null;
  nutritionAdherenceSubjective?: WeeklyCheckinAdherenceSubjective | null;
  appetiteCravings: string;
  energyRating: WeeklyCheckinRating;
  recoveryRating: WeeklyCheckinRating;
  sleepAvgHours: number;
  sleepQuality: WeeklyCheckinRating;
  stressLevel: WeeklyCheckinRating;
  scheduleConstraintsNextWeek: string;
  injuryPain: WeeklyCheckinInjuryPain;
  computedAdherenceScore: number;
};

export type WeeklyCheckin = {
  id: string;
  weekStart: string;
  weekEnd: string;
  energy: number;
  adherencePercent: number;
  blockers: string;
  weightSnapshot: WeeklyWeightSnapshot;
  coachSummary: string | null;
  summaryModel: string | null;
  adherenceScore?: number | null;
  workoutPlanVersion?: number | null;
  nutritionPlanVersion?: number | null;
  checkinArtifact?: WeeklyCheckinArtifact | null;
  adjustmentRecommendations?: ArtifactAdjustmentRecommendations | null;
  coachMessage?: ArtifactCoachMessage | null;
  guardrailNotes?: string[];
  createdAt: string;
  updatedAt: string;
};

export type WeeklyCheckinInput = {
  energy: number;
  adherencePercent: number;
  blockers: string;
  currentWeightKg?: number;
  waistCm?: number | null;
  progressPhotoPrompted?: boolean;
  strengthPRs?: string;
  consistencyNotes?: string;
  bodyCompChanges?: string;
  trainingDifficulty?: WeeklyCheckinDifficulty;
  nutritionAdherencePercent?: number | null;
  nutritionAdherenceSubjective?: WeeklyCheckinAdherenceSubjective | null;
  appetiteCravings?: string;
  energyRating?: WeeklyCheckinRating;
  recoveryRating?: WeeklyCheckinRating;
  sleepAvgHours?: number;
  sleepQuality?: WeeklyCheckinRating;
  stressLevel?: WeeklyCheckinRating;
  scheduleConstraintsNextWeek?: string;
  injuryPain?: Partial<WeeklyCheckinInjuryPain>;
  computedAdherenceScore?: number;
  linkedPlanVersion?: Partial<WeeklyCheckinLinkedPlanVersion>;
};

export type CoachCheckinsPayload = {
  threadId: string | null;
  weekStart: string;
  weekEnd: string;
  weightSnapshot: WeeklyWeightSnapshot;
  currentCheckin: WeeklyCheckin | null;
  history: WeeklyCheckin[];
  planUpdatedForReview?: boolean;
  planUpdateError?: string;
  checkinArtifact?: WeeklyCheckinArtifact | null;
  adjustmentRecommendations?: ArtifactAdjustmentRecommendations | null;
  coachMessage?: ArtifactCoachMessage | null;
  guardrailNotes?: string[];
};
