export type CoachSpecialization = "workout" | "nutrition";

export type CoachGender = "woman" | "man";

export type CoachPersonality =
  | "strict"
  | "sweet"
  | "relaxed"
  | "bubbly"
  | "hype"
  | "analyst";

export type ActiveCoach = {
  specialization: CoachSpecialization;
  gender: CoachGender;
  personality: CoachPersonality;
  displayName: string;
  tagline: string;
};
