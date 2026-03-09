import { describe, expect, it } from "vitest";
import type { ProfileSettingsValues } from "./data";
import { profileSettingsEditableFields } from "./editableFields";

function buildValues(overrides?: Partial<ProfileSettingsValues>): ProfileSettingsValues {
  return {
    displayName: "Jordan Example",
    username: "jordan_example",
    bio: "",
    avatarPath: null,
    preferredUnit: "lb",
    timezone: "America/New_York",
    accountVisibility: "private",
    progressVisibility: "public",
    socialEnabled: false,
    weighInShareVisibility: "private",
    gymEventShareVisibility: "private",
    postShareVisibility: "private",
    autoSupportEnabled: false,
    autoSupportConsentedAt: null,
    appleHealthStepsEnabled: false,
    dailyStepGoal: 10000,
    ...overrides,
  };
}

describe("profile settings editable field metadata", () => {
  it("sanitizes username drafts before building next values", () => {
    const values = buildValues();
    const nextValues = profileSettingsEditableFields.username.buildNextValues(
      values,
      "@Jordan Fit!!",
    );

    expect(nextValues.username).toBe("jordanfit");
  });

  it("falls back daily step goal drafts to the default goal when blank", () => {
    const values = buildValues({ dailyStepGoal: 14000 });
    const nextValues = profileSettingsEditableFields.dailyStepGoal.buildNextValues(
      values,
      "",
    );

    expect(nextValues.dailyStepGoal).toBe(10000);
  });

  it("reports bio length through helper text", () => {
    expect(profileSettingsEditableFields.bio.helperText?.("abc")).toBe("3/160 characters");
  });
});
