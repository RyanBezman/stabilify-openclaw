import type { GymSessionData, WeighInData } from "../../../data/dashboard";
import type { WeightUnit } from "../../../data/types";

export type ProgressTrendPoint = {
  weight: number;
  localDate: string;
};

export type ProgressAccolade = {
  key: string;
  icon: string;
  label: string;
  active: boolean;
};

export type ProgressModel = {
  unit: WeightUnit;
  timeZone: string;
  streakDays: number;
  consistencyPercent: number;
  consistencyDays: number;
  consistencyTotalDays: number;
  trendPoints: ProgressTrendPoint[];
  weeklyGymTarget: number;
  verifiedGymSessions: number;
  gymWeekLabel: string;
  todayGymSession: Pick<GymSessionData, "status" | "statusReason" | "distanceMeters"> | null;
  accolades: ProgressAccolade[];
  weighIns: WeighInData[];
  gymSessions: GymSessionData[];
};
