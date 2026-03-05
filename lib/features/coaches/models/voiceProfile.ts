import type { ActiveCoach } from "../types";

export type CoachVoiceName = "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer";

export type CoachVoiceProfile = {
  voice: CoachVoiceName;
  instructions: string;
};

const fallbackCoachVoiceProfile: CoachVoiceProfile = {
  voice: "alloy",
  instructions:
    "Speak naturally with a concise coaching tone. Keep pacing steady and clear.",
};

const coachVoiceProfileByDisplayName: Record<string, CoachVoiceProfile> = {
  Cindy: {
    voice: "nova",
    instructions:
      "Energetic and upbeat. Keep momentum high, use short punchy sentences, and end with an action cue.",
  },
  Ruth: {
    voice: "onyx",
    instructions:
      "Direct and structured. Speak firmly with no fluff and prioritize clear accountability language.",
  },
  Mia: {
    voice: "shimmer",
    instructions:
      "Warm and supportive. Keep tone kind, reassuring, and practical with gentle encouragement.",
  },
  Nora: {
    voice: "fable",
    instructions:
      "Calm and low-pressure. Speak with relaxed pacing and emphasize simple sustainable steps.",
  },
  Zoe: {
    voice: "nova",
    instructions:
      "Friendly and bubbly. Keep tone bright and positive while staying practical and specific.",
  },
  Iris: {
    voice: "alloy",
    instructions:
      "Analytical and concise. Speak clearly, with brief rationale and data-minded language.",
  },
  Dante: {
    voice: "echo",
    instructions:
      "High-energy and motivating. Keep pace brisk and confident with strong action language.",
  },
  Viktor: {
    voice: "onyx",
    instructions:
      "Disciplined and no-nonsense. Speak with authority, clear expectations, and tight phrasing.",
  },
  Eli: {
    voice: "shimmer",
    instructions:
      "Steady and supportive. Keep tone calm, encouraging, and focused on consistent execution.",
  },
  Sam: {
    voice: "fable",
    instructions:
      "Pragmatic and low-pressure. Speak simply, avoid hype, and focus on repeatable habits.",
  },
  Leo: {
    voice: "echo",
    instructions:
      "Upbeat and playful. Keep tone lively and positive while delivering practical next steps.",
  },
  Noah: {
    voice: "alloy",
    instructions:
      "Structured and analytical. Keep delivery crisp, measured, and focused on measurable progress.",
  },
};

export function resolveCoachVoiceProfile(
  coach: ActiveCoach | null | undefined
): CoachVoiceProfile {
  if (!coach) return fallbackCoachVoiceProfile;
  return coachVoiceProfileByDisplayName[coach.displayName] ?? fallbackCoachVoiceProfile;
}

