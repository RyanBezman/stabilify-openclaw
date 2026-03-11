import { describe, expect, it } from "vitest";
import type { ProfileSettingsValues } from "./data";
import {
  buildAccountVisibilityPatch,
  buildEditableFieldRows,
  buildShareVisibilityPatch,
  isPhoneNudgesPermissionError,
} from "./screenHelpers";

function buildSettingsValues(
  overrides: Partial<ProfileSettingsValues> = {},
): ProfileSettingsValues {
  return {
    displayName: "User One",
    username: "user_one",
    bio: "Training hard",
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

describe("screenHelpers", () => {
  it("builds editable field rows with placeholders and formatted step goals", () => {
    const rows = buildEditableFieldRows(
      buildSettingsValues({
        displayName: "",
        username: "",
        bio: "",
        timezone: "",
        dailyStepGoal: 12500,
      }),
    );

    expect(rows).toEqual([
      {
        fieldKey: "displayName",
        label: "Name",
        value: "Add your name",
        usesPlaceholder: true,
      },
      {
        fieldKey: "username",
        label: "Username",
        value: "Add a username",
        usesPlaceholder: true,
      },
      {
        fieldKey: "bio",
        label: "Bio",
        value: "Add a short bio",
        usesPlaceholder: true,
      },
      {
        fieldKey: "timezone",
        label: "Timezone",
        value: "Add your timezone",
        usesPlaceholder: true,
      },
      {
        fieldKey: "dailyStepGoal",
        label: "Steps",
        value: "12,500",
        usesPlaceholder: false,
      },
    ]);
  });

  it("builds the dependent privacy patch for public and private profiles", () => {
    expect(buildAccountVisibilityPatch("public")).toEqual({
      accountVisibility: "public",
      socialEnabled: true,
      weighInShareVisibility: "followers",
      gymEventShareVisibility: "followers",
      postShareVisibility: "followers",
    });

    expect(buildAccountVisibilityPatch("private")).toEqual({
      accountVisibility: "private",
      socialEnabled: false,
      weighInShareVisibility: "private",
      gymEventShareVisibility: "private",
      postShareVisibility: "private",
    });
  });

  it("builds share-visibility patches and detects notification permission errors", () => {
    expect(buildShareVisibilityPatch("gymEventShareVisibility", true)).toEqual({
      gymEventShareVisibility: "followers",
    });
    expect(buildShareVisibilityPatch("postShareVisibility", false)).toEqual({
      postShareVisibility: "private",
    });
    expect(
      isPhoneNudgesPermissionError("Notification permission is required before registering."),
    ).toBe(true);
    expect(isPhoneNudgesPermissionError("Request timed out")).toBe(false);
  });
});
