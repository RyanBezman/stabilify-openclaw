import { describe, expect, it } from "vitest";
import { buildCoachGreeting } from "./chatGreeting";

describe("buildCoachGreeting", () => {
  it("uses nutrition onboarding greeting when no active nutrition plan exists", () => {
    const result = buildCoachGreeting({
      specialization: "nutrition",
      coachName: "Cindy",
      hasActivePlan: false,
    });

    expect(result).toBe("I'm Cindy. Share your nutrition goal and we can build your meal plan.");
  });

  it("uses nutrition adjustment greeting when active nutrition plan exists", () => {
    const result = buildCoachGreeting({
      specialization: "nutrition",
      coachName: "Cindy",
      hasActivePlan: true,
    });

    expect(result).toBe(
      "I'm Cindy. Your nutrition plan is active. Tell me what you want to adjust and we'll update it together."
    );
  });

  it("uses workout greeting for workout specialization", () => {
    const result = buildCoachGreeting({
      specialization: "workout",
      coachName: "Cindy",
      hasActivePlan: true,
    });

    expect(result).toBe(
      "I'm Cindy. Tell me your goal and schedule, and we'll build your workout plan. I can also revise it in chat (for example: make this 5 days/week)."
    );
  });
});
