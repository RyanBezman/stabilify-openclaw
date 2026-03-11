import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  coachProfilesMaybeSingle: vi.fn(),
  activeCoachesMaybeSingle: vi.fn(),
  activeCoachesUpsert: vi.fn(),
  activeCoachesDelete: vi.fn(),
  profilesLegacyMaybeSingle: vi.fn(),
  profilesUpdateMaybeSingle: vi.fn(),
}));

vi.mock("../../../supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "coach_profiles") {
        return {
          select: () => {
            const chain = {
              eq: vi.fn(() => chain),
              maybeSingle: mocks.coachProfilesMaybeSingle,
            };
            return chain;
          },
        };
      }

      if (table === "active_coaches") {
        return {
          upsert: mocks.activeCoachesUpsert,
          select: () => {
            const chain = {
              eq: vi.fn(() => chain),
              maybeSingle: mocks.activeCoachesMaybeSingle,
            };
            return chain;
          },
          delete: () => ({
            eq: (column: string, value: string) => ({
              eq: (nextColumn: string, nextValue: string) =>
                mocks.activeCoachesDelete(column, value, nextColumn, nextValue),
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.profilesLegacyMaybeSingle,
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: mocks.profilesUpdateMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    }),
  },
}));

import { clearUnifiedCoachOnServer, setUnifiedCoachOnServer } from "./api";

describe("coach api", () => {
  beforeEach(() => {
    mocks.coachProfilesMaybeSingle.mockReset();
    mocks.activeCoachesMaybeSingle.mockReset();
    mocks.activeCoachesUpsert.mockReset();
    mocks.activeCoachesDelete.mockReset();
    mocks.profilesLegacyMaybeSingle.mockReset();
    mocks.profilesUpdateMaybeSingle.mockReset();

    mocks.activeCoachesUpsert.mockResolvedValue({ error: null });
    mocks.activeCoachesDelete.mockResolvedValue({ error: null });
    mocks.profilesLegacyMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    mocks.profilesUpdateMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
      },
      error: null,
    });
  });

  it("clears the stale nutrition selection if nutrition linking fails after workout saves", async () => {
    mocks.coachProfilesMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "workout-profile-id",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "nutrition-profile-id",
        },
        error: null,
      });
    mocks.activeCoachesUpsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        error: {
          message: "Nutrition link failed.",
        },
      });

    const result = await setUnifiedCoachOnServer("user-1", "woman", "strict");

    expect(result).toEqual({
      data: {
        ok: true,
        nutritionLinked: false,
        warning: "Nutrition link failed.",
      },
    });
    expect(mocks.activeCoachesUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        user_id: "user-1",
        specialization: "workout",
        coach_profile_id: "workout-profile-id",
      }),
      {
        onConflict: "user_id,specialization",
      },
    );
    expect(mocks.activeCoachesUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: "user-1",
        specialization: "nutrition",
        coach_profile_id: "nutrition-profile-id",
      }),
      {
        onConflict: "user_id,specialization",
      },
    );
    expect(mocks.activeCoachesDelete).toHaveBeenCalledWith(
      "user_id",
      "user-1",
      "specialization",
      "nutrition",
    );
  });

  it("restores the previous workout coach if nutrition removal fails", async () => {
    mocks.activeCoachesMaybeSingle
      .mockResolvedValueOnce({
        data: { coach_profile_id: "workout-current-profile-id" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { coach_profile_id: "nutrition-current-profile-id" },
        error: null,
      });
    mocks.coachProfilesMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "workout-current-profile-id",
          gender: "woman",
          personality: "strict",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "nutrition-current-profile-id",
          gender: "woman",
          personality: "strict",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "workout-restore-profile-id",
        },
        error: null,
      });
    mocks.activeCoachesDelete.mockImplementation(
      async (_column: string, _value: string, _nextColumn: string, nextValue: string) => ({
        error: nextValue === "nutrition" ? { message: "Nutrition clear failed." } : null,
      }),
    );

    const result = await clearUnifiedCoachOnServer("user-1");

    expect(result).toEqual({
      error: "Nutrition clear failed. Restored previous coach selection.",
    });
    expect(mocks.activeCoachesUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.activeCoachesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        specialization: "workout",
        coach_profile_id: "workout-restore-profile-id",
      }),
      {
        onConflict: "user_id,specialization",
      },
    );
  });

  it("restores both previous coaches if workout removal fails after nutrition clears", async () => {
    mocks.activeCoachesMaybeSingle
      .mockResolvedValueOnce({
        data: { coach_profile_id: "workout-current-profile-id" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { coach_profile_id: "nutrition-current-profile-id" },
        error: null,
      });
    mocks.coachProfilesMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "workout-current-profile-id",
          gender: "woman",
          personality: "strict",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "nutrition-current-profile-id",
          gender: "woman",
          personality: "strict",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "workout-restore-profile-id",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "nutrition-restore-profile-id",
        },
        error: null,
      });
    mocks.profilesUpdateMaybeSingle
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Workout legacy sync failed.",
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "user-1",
        },
        error: null,
      });

    const result = await clearUnifiedCoachOnServer("user-1");

    expect(result).toEqual({
      error: "Workout legacy sync failed. Restored previous coach selection.",
    });
    expect(mocks.activeCoachesUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.activeCoachesUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        user_id: "user-1",
        specialization: "workout",
        coach_profile_id: "workout-restore-profile-id",
      }),
      {
        onConflict: "user_id,specialization",
      },
    );
    expect(mocks.activeCoachesUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: "user-1",
        specialization: "nutrition",
        coach_profile_id: "nutrition-restore-profile-id",
      }),
      {
        onConflict: "user_id,specialization",
      },
    );
  });
});
