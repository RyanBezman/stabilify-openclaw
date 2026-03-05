import type {
  ActiveCoach,
  CoachGender,
  CoachPersonality,
  CoachSpecialization,
} from "../types";

const coachNames: Record<CoachGender, Record<CoachPersonality, string>> = {
  woman: {
    hype: "Cindy",
    strict: "Ruth",
    sweet: "Mia",
    relaxed: "Nora",
    bubbly: "Zoe",
    analyst: "Iris",
  },
  man: {
    hype: "Dante",
    strict: "Viktor",
    sweet: "Eli",
    relaxed: "Sam",
    bubbly: "Leo",
    analyst: "Noah",
  },
};

const coachTaglinesBySpecialization: Record<
  CoachSpecialization,
  Record<CoachPersonality, string>
> = {
  workout: {
    strict: "Direct, structured, and uncompromising on consistency.",
    sweet: "Supportive, kind, and steady progress over perfection.",
    relaxed: "Low pressure. Sustainable habits. Calm consistency.",
    bubbly: "Cheerful momentum with a positive, friendly vibe.",
    hype: "High energy. Quick wins. Keeps you moving forward.",
    analyst: "Data-driven and clear about the why behind the plan.",
  },
  nutrition: {
    strict: "Clear structure and disciplined nutrition execution.",
    sweet: "Supportive nutrition guidance you can sustain.",
    relaxed: "Simple food structure without pressure.",
    bubbly: "Positive energy with practical meal planning.",
    hype: "Action-first nutrition habits and momentum.",
    analyst: "Data-driven nutrition with clear rationale.",
  },
};

export function coachFromSelection(
  gender: CoachGender,
  personality: CoachPersonality
): ActiveCoach;
export function coachFromSelection(
  specialization: CoachSpecialization,
  gender: CoachGender,
  personality: CoachPersonality
): ActiveCoach;
export function coachFromSelection(
  specializationOrGender: CoachSpecialization | CoachGender,
  genderOrPersonality: CoachGender | CoachPersonality,
  maybePersonality?: CoachPersonality
): ActiveCoach {
  const specialization: CoachSpecialization =
    maybePersonality === undefined ? "workout" : (specializationOrGender as CoachSpecialization);
  const gender: CoachGender =
    maybePersonality === undefined
      ? (specializationOrGender as CoachGender)
      : (genderOrPersonality as CoachGender);
  const personality: CoachPersonality =
    maybePersonality === undefined
      ? (genderOrPersonality as CoachPersonality)
      : maybePersonality;

  return {
    specialization,
    gender,
    personality,
    displayName: coachNames[gender][personality],
    tagline: coachTaglinesBySpecialization[specialization][personality],
  };
}
