import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileSettingsValues } from "./data";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: vi.fn().mockReturnValue({
      upsert: mocks.upsert,
    }),
    rpc: mocks.rpc,
  },
}));

import { saveProfileSettingsValues } from "./data";

function buildValues(overrides?: Partial<ProfileSettingsValues>): ProfileSettingsValues {
  return {
    displayName: "User One",
    username: "userone",
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

describe("profile settings save consent gating", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.upsert.mockReset();
    mocks.rpc.mockReset();

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: { full_name: "User One" },
        },
      },
      error: null,
    });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it("blocks enabling auto support when consent has not been granted", async () => {
    const result = await saveProfileSettingsValues(
      buildValues({
        autoSupportEnabled: true,
        autoSupportConsentedAt: null,
      }),
    );

    expect(result).toEqual({
      error: "Consent is required before enabling auto support.",
      code: "VALIDATION",
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("uses set_auto_support_enabled for existing consented users", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ auto_support_enabled: true, changed: true }],
      error: null,
    });

    const result = await saveProfileSettingsValues(
      buildValues({
        autoSupportEnabled: true,
        autoSupportConsentedAt: "2026-03-03T18:00:00.000Z",
      }),
    );

    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        daily_step_goal: 10000,
      }),
      { onConflict: "id" },
    );
    expect(mocks.rpc).toHaveBeenCalledWith("set_auto_support_enabled", {
      enabled: true,
    });
    expect(result).toEqual({
      data: {
        ok: true,
        autoSupportConsentedAt: "2026-03-03T18:00:00.000Z",
      },
    });
  });

  it("uses set_auto_support_enabled when disabling", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ auto_support_enabled: false, changed: true }],
      error: null,
    });

    const result = await saveProfileSettingsValues(
      buildValues({
        autoSupportEnabled: false,
        autoSupportConsentedAt: "2026-03-03T18:00:00.000Z",
      }),
    );

    expect(mocks.rpc).toHaveBeenCalledWith("set_auto_support_enabled", {
      enabled: false,
    });
    expect(result).toEqual({
      data: {
        ok: true,
        autoSupportConsentedAt: "2026-03-03T18:00:00.000Z",
      },
    });
  });

  it("clamps custom daily step goals before saving", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ auto_support_enabled: false, changed: true }],
      error: null,
    });

    await saveProfileSettingsValues(
      buildValues({
        dailyStepGoal: 999999,
      }),
    );

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        daily_step_goal: 50000,
      }),
      { onConflict: "id" },
    );
  });
});
