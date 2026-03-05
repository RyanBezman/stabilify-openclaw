import type { GoalType, WeighInCadence, WeightUnit } from "../../data/types";

export type GymOption = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

export type OnboardingState = {
  displayName: string;
  username: string;
  preferredUnit: WeightUnit;
  goalType: GoalType;
  currentWeight: string;
  targetMin: string;
  targetMax: string;
  targetWeight: string;
  weighInCadence: WeighInCadence | "";
  customCadence: string;
  reminderTime: string;
  timezone: string;
  gymProofEnabled: boolean;
  gymName: string;
  gymSessionsTarget: string;
  gymPlaceName: string;
  gymPlaceAddress: string;
  gymLat: number | null;
  gymLng: number | null;
  gymRadiusM: string;
  gymOptions: GymOption[];
  loadingGyms: boolean;
  gymError: string | null;
  gymSearch: string;
  gymSelectedId: string;
  showGymList: boolean;
};

export type OnboardingStep = {
  title: string;
  subtitle: string;
};
