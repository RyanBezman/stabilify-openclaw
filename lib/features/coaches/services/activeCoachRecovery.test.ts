import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

const mocks = vi.hoisted(() => ({
  setActiveCoachOnServer: vi.fn(),
}));

vi.mock("./api", () => ({
  setActiveCoachOnServer: mocks.setActiveCoachOnServer,
}));

import {
  hasNoActiveCoachSelectedError,
  invokeCoachChatWithActiveCoachRecovery,
} from "./activeCoachRecovery";

const coach: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct and clear",
};

describe("activeCoachRecovery", () => {
  beforeEach(() => {
    mocks.setActiveCoachOnServer.mockReset();
    mocks.setActiveCoachOnServer.mockResolvedValue({ data: { ok: true } });
  });

  it("repairs the missing active coach using the request auth user id", async () => {
    const invokeCoachChat = vi
      .fn<(body: Record<string, unknown>) => Promise<{ ok: true }>>()
      .mockRejectedValueOnce(new Error("No active coach selected."))
      .mockResolvedValueOnce({ ok: true });

    const result = await invokeCoachChatWithActiveCoachRecovery({
      authUserId: "user-1",
      body: { action: "workspace" },
      coach,
      invokeCoachChat,
      repairFailureMessage: "Couldn't repair active coach.",
      specialization: "nutrition",
      unresolvedCoachMessage: "No active coach could be resolved.",
    });

    expect(result).toEqual({ ok: true });
    expect(invokeCoachChat).toHaveBeenCalledTimes(2);
    expect(mocks.setActiveCoachOnServer).toHaveBeenCalledWith("user-1", "nutrition", coach);
  });

  it("does not repair against a different current session when no request auth user id exists", async () => {
    const missingCoachError = new Error("No active coach selected.");
    const invokeCoachChat = vi
      .fn<(body: Record<string, unknown>) => Promise<{ ok: true }>>()
      .mockRejectedValueOnce(missingCoachError);

    await expect(
      invokeCoachChatWithActiveCoachRecovery({
        authUserId: null,
        body: { action: "workspace" },
        coach,
        invokeCoachChat,
        repairFailureMessage: "Couldn't repair active coach.",
        specialization: "nutrition",
        unresolvedCoachMessage: "No active coach could be resolved.",
      })
    ).rejects.toBe(missingCoachError);

    expect(mocks.setActiveCoachOnServer).not.toHaveBeenCalled();
  });

  it("matches only the expected missing-coach error", () => {
    expect(hasNoActiveCoachSelectedError(new Error("No active coach selected."))).toBe(true);
    expect(hasNoActiveCoachSelectedError(new Error("Different failure"))).toBe(false);
  });
});
