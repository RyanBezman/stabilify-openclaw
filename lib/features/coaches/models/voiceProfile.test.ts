import { describe, expect, it } from "vitest";
import { coachFromSelection } from "./catalog";
import { resolveCoachVoiceProfile } from "./voiceProfile";

describe("resolveCoachVoiceProfile", () => {
  it("returns a populated profile for every seeded coach", () => {
    const genders = ["woman", "man"] as const;
    const personalities = [
      "strict",
      "sweet",
      "relaxed",
      "bubbly",
      "hype",
      "analyst",
    ] as const;

    for (const gender of genders) {
      for (const personality of personalities) {
        const coach = coachFromSelection("workout", gender, personality);
        const profile = resolveCoachVoiceProfile(coach);
        expect(profile.voice).toMatch(/^(alloy|echo|fable|nova|onyx|shimmer)$/);
        expect(profile.instructions.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("falls back for unknown coach names", () => {
    const fallback = resolveCoachVoiceProfile({
      specialization: "workout",
      gender: "woman",
      personality: "strict",
      displayName: "Unknown",
      tagline: "Fallback",
    });

    expect(fallback.voice).toBe("alloy");
    expect(fallback.instructions).toContain("concise coaching tone");
  });
});

