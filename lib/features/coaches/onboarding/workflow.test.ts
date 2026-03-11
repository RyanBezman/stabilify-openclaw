import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCurrentAuthUser: vi.fn(),
  invokeCoachChat: vi.fn(),
  ensureCoachSelectionProfile: vi.fn(),
  setUnifiedCoachOnServer: vi.fn(),
  upsertCoachUserProfileJson: vi.fn(),
}));

vi.mock("../../auth", () => ({
  fetchCurrentAuthUser: mocks.fetchCurrentAuthUser,
}));

vi.mock("../services/chatClient", () => ({
  invokeCoachChat: mocks.invokeCoachChat,
}));

vi.mock("../services/api", () => ({
  ensureCoachSelectionProfile: mocks.ensureCoachSelectionProfile,
  setUnifiedCoachOnServer: mocks.setUnifiedCoachOnServer,
  upsertCoachUserProfileJson: mocks.upsertCoachUserProfileJson,
}));

import { createInitialCoachOnboardingDraft } from "./models";
import { submitCoachOnboardingWorkflow } from "./workflow";

describe("submitCoachOnboardingWorkflow", () => {
  beforeEach(() => {
    mocks.fetchCurrentAuthUser.mockReset();
    mocks.invokeCoachChat.mockReset();
    mocks.ensureCoachSelectionProfile.mockReset();
    mocks.setUnifiedCoachOnServer.mockReset();
    mocks.upsertCoachUserProfileJson.mockReset();

    mocks.fetchCurrentAuthUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: {},
        },
      },
    });
    mocks.ensureCoachSelectionProfile.mockResolvedValue({ data: { ok: true } });
    mocks.upsertCoachUserProfileJson.mockResolvedValue({ data: { ok: true } });
    mocks.invokeCoachChat.mockResolvedValue({});
    mocks.setUnifiedCoachOnServer.mockResolvedValue({
      data: {
        ok: true,
        nutritionLinked: true,
      },
    });
  });

  it("returns unified-coach linking status so callers do not assume nutrition is active", async () => {
    mocks.setUnifiedCoachOnServer.mockResolvedValue({
      data: {
        ok: true,
        nutritionLinked: false,
        warning: "Workout coach saved, but nutrition coach could not be linked yet.",
      },
    });

    const draft = createInitialCoachOnboardingDraft();
    draft.body.sex = "female";
    draft.planStart = "workout";

    const result = await submitCoachOnboardingWorkflow(draft);

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      ok: true,
      generatedTracks: {
        workout: true,
        nutrition: false,
      },
      nutritionLinked: false,
      warning: "Workout coach saved, but nutrition coach could not be linked yet.",
    });
  });

  it("surfaces partial plan generation as a warning instead of failing onboarding", async () => {
    mocks.invokeCoachChat
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Temporary nutrition failure."));
    mocks.setUnifiedCoachOnServer.mockResolvedValue({
      data: {
        ok: true,
        nutritionLinked: true,
      },
    });

    const draft = createInitialCoachOnboardingDraft();
    draft.body.sex = "female";
    draft.planStart = "both";

    const result = await submitCoachOnboardingWorkflow(draft);

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      ok: true,
      nutritionLinked: true,
      generatedTracks: {
        workout: true,
        nutrition: false,
      },
      warning:
        "Your coaching profile was saved, but we couldn't generate your nutrition plan yet. Open Nutrition to retry.",
    });
  });

  it("does not switch the active coach when saving the onboarding profile fails", async () => {
    mocks.upsertCoachUserProfileJson.mockResolvedValue({
      error: "Couldn't save coaching profile.",
    });

    const draft = createInitialCoachOnboardingDraft();
    draft.body.sex = "female";

    const result = await submitCoachOnboardingWorkflow(draft);

    expect(result.error).toBe("Couldn't save coaching profile.");
    expect(mocks.setUnifiedCoachOnServer).not.toHaveBeenCalled();
  });
});
