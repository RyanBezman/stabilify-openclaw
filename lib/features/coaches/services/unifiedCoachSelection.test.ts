import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

const mocks = vi.hoisted(() => ({
  setUnifiedCoachOnServer: vi.fn(),
  setActiveCoachOnServer: vi.fn(),
  clearActiveCoachOnServer: vi.fn(),
  preserveUnifiedCoachSetupOnServer: vi.fn(),
}));

vi.mock("./api", () => ({
  setUnifiedCoachOnServer: mocks.setUnifiedCoachOnServer,
  setActiveCoachOnServer: mocks.setActiveCoachOnServer,
  clearActiveCoachOnServer: mocks.clearActiveCoachOnServer,
}));

vi.mock("./preserveSetup", () => ({
  preserveUnifiedCoachSetupOnServer: mocks.preserveUnifiedCoachSetupOnServer,
}));

import { persistUnifiedCoachSelectionOnServer } from "./unifiedCoachSelection";

function buildCoach(
  specialization: "workout" | "nutrition",
  personality: "strict" | "sweet" = "sweet",
): ActiveCoach {
  return {
    specialization,
    gender: "woman",
    personality,
    displayName: specialization === "workout" ? "Workout Coach" : "Nutrition Coach",
    tagline: "Coach",
  };
}

describe("persistUnifiedCoachSelectionOnServer", () => {
  beforeEach(() => {
    mocks.setUnifiedCoachOnServer.mockReset();
    mocks.setActiveCoachOnServer.mockReset();
    mocks.clearActiveCoachOnServer.mockReset();
    mocks.preserveUnifiedCoachSetupOnServer.mockReset();

    mocks.setUnifiedCoachOnServer.mockResolvedValue({
      data: {
        ok: true,
        nutritionLinked: true,
      },
    });
    mocks.setActiveCoachOnServer.mockResolvedValue({ data: { ok: true } });
    mocks.clearActiveCoachOnServer.mockResolvedValue({ data: { ok: true } });
    mocks.preserveUnifiedCoachSetupOnServer.mockResolvedValue({
      data: { ok: true },
    });
  });

  it("switches the active coach before preserving server-side setup", async () => {
    const callOrder: string[] = [];
    mocks.setUnifiedCoachOnServer.mockImplementation(async () => {
      callOrder.push("set");
      return {
        data: {
          ok: true,
          nutritionLinked: true,
        },
      };
    });
    mocks.preserveUnifiedCoachSetupOnServer.mockImplementation(async () => {
      callOrder.push("preserve");
      return {
        data: { ok: true },
      };
    });

    const result = await persistUnifiedCoachSelectionOnServer({
      userId: "user-1",
      targetCoach: buildCoach("workout", "sweet"),
      currentSelection: {
        workout: buildCoach("workout", "strict"),
        nutrition: buildCoach("nutrition", "strict"),
      },
      preservePrograms: true,
    });

    expect(result.error).toBeUndefined();
    expect(callOrder).toEqual(["set", "preserve"]);
  });

  it("preserves only the linked tracks when nutrition linking fails", async () => {
    mocks.setUnifiedCoachOnServer.mockResolvedValue({
      data: {
        ok: true,
        nutritionLinked: false,
        warning: "Nutrition coach is unavailable.",
      },
    });

    const result = await persistUnifiedCoachSelectionOnServer({
      userId: "user-1",
      targetCoach: buildCoach("workout", "sweet"),
      currentSelection: {
        workout: buildCoach("workout", "strict"),
        nutrition: buildCoach("nutrition", "strict"),
      },
      preservePrograms: true,
    });

    expect(result.error).toBeUndefined();
    expect(mocks.preserveUnifiedCoachSetupOnServer).toHaveBeenCalledWith({
      userId: "user-1",
      sourceSelection: {
        workout: buildCoach("workout", "strict"),
        nutrition: buildCoach("nutrition", "strict"),
      },
      targetSelection: {
        workout: expect.objectContaining({
          specialization: "workout",
          personality: "sweet",
        }),
        nutrition: null,
      },
    });
    expect(result.data).toMatchObject({
      warning: "Nutrition coach is unavailable.",
      nutritionCoach: null,
    });
  });

  it("restores the prior selection if preserve fails after switching", async () => {
    mocks.preserveUnifiedCoachSetupOnServer.mockResolvedValue({
      error: "Couldn't keep your current coaching setup.",
    });

    const result = await persistUnifiedCoachSelectionOnServer({
      userId: "user-1",
      targetCoach: buildCoach("workout", "sweet"),
      currentSelection: {
        workout: buildCoach("workout", "strict"),
        nutrition: null,
      },
      preservePrograms: true,
    });

    expect(result.error).toBe("Couldn't keep your current coaching setup.");
    expect(mocks.setActiveCoachOnServer).toHaveBeenCalledWith(
      "user-1",
      "workout",
      expect.objectContaining({
        specialization: "workout",
        personality: "strict",
      }),
    );
    expect(mocks.clearActiveCoachOnServer).toHaveBeenCalledWith(
      "user-1",
      "nutrition",
    );
  });
});
