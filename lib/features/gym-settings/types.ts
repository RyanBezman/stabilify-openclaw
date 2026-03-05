import type { NearbyGym } from "../../data/gyms";

export const DEFAULT_GYM_RADIUS_METERS = 150;

export type GymOption = Pick<NearbyGym, "id" | "name" | "address" | "lat" | "lng">;

export type GymSettingsValues = {
  gymProofEnabled: boolean;
  gymName: string;
  gymPlaceName: string;
  gymPlaceAddress: string;
  gymLat: number | null;
  gymLng: number | null;
  gymRadiusM: string;
};
