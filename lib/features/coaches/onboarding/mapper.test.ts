import { describe, expect, it } from "vitest";
import { createInitialCoachOnboardingDraft } from "./models";
import {
  mapCoachUserProfileJsonToDraft,
  mapDraftToCoachUserProfileJson,
  mapDraftToNutritionIntake,
} from "./mapper";

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

  it("rebuilds onboarding draft state from saved profile json and persona overrides", () => {
    const mapped = mapCoachUserProfileJsonToDraft(
      {
        goals: {
          primary: "lose",
          targetRatePctPerWeek: 0.8,
          targetDate: "2026-06-01",
        },
        experienceLevel: "advanced",
        heightCm: 182,
        weightKg: 92,
        age: 36,
        sex: "male",
        equipmentAccess: "home_gym",
        dietaryPreferences: ["high_protein", "meal_prep"],
        dietaryRestrictions: ["gluten_free"],
        injuriesLimitations: ["right knee"],
        scheduleConstraints: {
          trainingDaysPerWeek: 5,
          sessionMinutes: 60,
          notes: "Travel on Thursdays",
        },
        trainingNotes: "Avoid deep knee flexion",
      },
      {
        gender: "man",
        personality: "analyst",
        planStart: "nutrition",
      },
    );

    expect(mapped.goal).toEqual({
      primary: "lose",
      targetRatePctPerWeek: 0.8,
      targetDate: "2026-06-01",
    });
    expect(mapped.experienceLevel).toBe("advanced");
    expect(mapped.body).toEqual({
      weightKg: 92,
      heightCm: 182,
      age: 36,
      sex: "male",
    });
    expect(mapped.training).toEqual({
      daysPerWeek: 5,
      sessionMinutes: 60,
      equipmentAccess: "home_gym",
      notes: "Avoid deep knee flexion",
    });
    expect(mapped.nutrition).toEqual({
      dietaryPreferences: ["high_protein", "meal_prep"],
      dietaryRestrictions: ["gluten_free"],
    });
    expect(mapped.constraints).toEqual({
      injuriesLimitations: ["right knee"],
      scheduleConstraintsNote: "Travel on Thursdays",
    });
    expect(mapped.persona).toEqual({
      gender: "man",
      personality: "analyst",
    });
    expect(mapped.planStart).toBe("nutrition");
  });

  it("stores schedule and training notes separately so rebuild flows do not lose either field", () => {
    const draft = createInitialCoachOnboardingDraft();
    draft.constraints.scheduleConstraintsNote = "Travel Tuesdays";
    draft.training.notes = "Left shoulder prefers neutral-grip presses";

    const profile = mapDraftToCoachUserProfileJson(draft);

    expect(profile.scheduleConstraints).toMatchObject({
      notes: "Travel Tuesdays",
    });
    expect(profile.trainingNotes).toBe("Left shoulder prefers neutral-grip presses");
  });
});
