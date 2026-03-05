import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../supabase", () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

import {
  allowAutoSupportWithConsent,
  deferSupportNudge,
  setPhoneNudgesEnabled,
  setAutoSupportEnabled,
} from "./supportAutomation";

describe("supportAutomation data", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.getUser.mockReset();
    mocks.from.mockReset();
  });

  it("maps allow_auto_support_with_consent RPC payload", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          auto_support_enabled: true,
          auto_support_consent_at: "2026-03-03T16:00:00.000Z",
          changed_enabled: true,
          changed_consent: true,
        },
      ],
      error: null,
    });

    const result = await allowAutoSupportWithConsent();

    expect(mocks.rpc).toHaveBeenCalledWith("allow_auto_support_with_consent");
    expect(result).toEqual({
      data: {
        autoSupportEnabled: true,
        autoSupportConsentedAt: "2026-03-03T16:00:00.000Z",
        changedEnabled: true,
        changedConsent: true,
      },
    });
  });

  it("returns error when allow_auto_support_with_consent fails or returns malformed data", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });

    const rpcErrorResult = await allowAutoSupportWithConsent();
    expect(rpcErrorResult.error).toBe("rpc failed");

    mocks.rpc.mockResolvedValueOnce({
      data: [{ auto_support_enabled: false, auto_support_consent_at: null }],
      error: null,
    });

    const malformedResult = await allowAutoSupportWithConsent();
    expect(malformedResult.error).toBe("Couldn't update support automation consent.");
  });

  it("validates blank requestId for deferSupportNudge", async () => {
    const result = await deferSupportNudge({ requestId: "   " });

    expect(result).toEqual({
      error: "Support request ID is required.",
      code: "VALIDATION",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("maps defer_support_nudge payload and defaults surface to home", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          request_id: "request-1",
          nudge_deferred_until_local_date: "2026-03-04",
        },
      ],
      error: null,
    });

    const result = await deferSupportNudge({ requestId: " request-1 " });

    expect(mocks.rpc).toHaveBeenCalledWith("defer_support_nudge", {
      p_request_id: "request-1",
      p_surface: "home",
    });
    expect(result).toEqual({
      data: {
        requestId: "request-1",
        deferredUntilLocalDate: "2026-03-04",
      },
    });
  });

  it("keeps setAutoSupportEnabled response mapping unchanged", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ auto_support_enabled: true, changed: false }],
      error: null,
    });

    const result = await setAutoSupportEnabled(true);

    expect(mocks.rpc).toHaveBeenCalledWith("set_auto_support_enabled", { enabled: true });
    expect(result).toEqual({
      data: {
        autoSupportEnabled: true,
        changed: false,
      },
    });
  });

  it("maps set_phone_nudges_enabled RPC payload", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ enabled: false, changed: true, active_device_count: 0 }],
      error: null,
    });

    const result = await setPhoneNudgesEnabled(false);

    expect(mocks.rpc).toHaveBeenCalledWith("set_phone_nudges_enabled", {
      p_enabled: false,
    });
    expect(result).toEqual({
      data: {
        enabled: false,
        changed: true,
        activeDeviceCount: 0,
      },
    });
  });

  it("retries set_phone_nudges_enabled with enabled payload for legacy arg-name signatures", async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          message:
            "Could not find the function public.set_phone_nudges_enabled(p_enabled) in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: [{ enabled: false, changed: true, active_device_count: 0 }],
        error: null,
      });

    const result = await setPhoneNudgesEnabled(false);

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "set_phone_nudges_enabled", {
      p_enabled: false,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "set_phone_nudges_enabled", {
      enabled: false,
    });
    expect(result).toEqual({
      data: {
        enabled: false,
        changed: true,
        activeDeviceCount: 0,
      },
    });
  });

  it("returns error when set_phone_nudges_enabled fails or returns malformed data", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed" },
    });

    const rpcErrorResult = await setPhoneNudgesEnabled(false);
    expect(rpcErrorResult.error).toBe("rpc failed");

    mocks.rpc.mockResolvedValueOnce({
      data: [{ enabled: true, changed: false, active_device_count: "1" }],
      error: null,
    });

    const malformedResult = await setPhoneNudgesEnabled(true);
    expect(malformedResult.error).toBe("Couldn't update phone nudges setting.");
  });
});
