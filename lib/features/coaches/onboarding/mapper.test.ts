import { describe, expect, it } from "vitest";
import { createInitialCoachOnboardingDraft } from "./models";
import { mapDraftToCoachUserProfileJson, mapDraftToNutritionIntake } from "./mapper";

describe("coach onboarding mapper", () => {
  it("preserves sex across profile + nutrition mapping", () => {
    const sexes: Array<"male" | "female" | "other"> = ["male", "female", "other"];

    for (const sex of sexes) {
      const draft = createInitialCoachOnboardingDraft();
      draft.body.sex = sex;

      const profile = mapDraftToCoachUserProfileJson(draft);
      const nutrition = mapDraftToNutritionIntake(draft);

      expect(profile.sex).toBe(sex);
      expect(nutrition.sex).toBe(sex);
    }
  });
});
