import { describe, expect, it } from "vitest";
import { coachPersonalityCopy } from "../models/personalityCopy";
import { createInitialCoachOnboardingDraft } from "./models";
import { validateCoachOnboardingStep } from "./validation";

describe("validateCoachOnboardingStep", () => {
  it("allows untouched default height and weight values", () => {
    const draft = createInitialCoachOnboardingDraft();
    draft.body.sex = "male";

    expect(validateCoachOnboardingStep("weight", draft)).toBeNull();
    expect(validateCoachOnboardingStep("height", draft)).toBeNull();
  });

  it("requires sex selection before continuing the sex step", () => {
    const draft = createInitialCoachOnboardingDraft();
    draft.body.sex = null;

    expect(validateCoachOnboardingStep("sex", draft)).toBe(
      "Select your sex to calibrate your nutrition plan.",
    );

    draft.body.sex = "other";
    expect(validateCoachOnboardingStep("sex", draft)).toBeNull();
  });

  it("accepts every shipped coach personality", () => {
    const personalities = Object.keys(
      coachPersonalityCopy,
    ) as Array<keyof typeof coachPersonalityCopy>;

    for (const personality of personalities) {
      const draft = createInitialCoachOnboardingDraft();
      draft.persona.personality = personality;

      expect(validateCoachOnboardingStep("persona", draft)).toBeNull();
    }
  });
});
