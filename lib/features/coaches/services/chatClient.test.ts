import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("../../../supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

import { invokeCoachChat, isTierRestrictedCoachError, mapCoachMessages } from "./chatClient";

describe("chatClient service", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.refreshSession.mockReset();
    mocks.invoke.mockReset();

    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-123",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps coach chat rows into UI-safe messages", () => {
    const mapped = mapCoachMessages([
      {
        id: "m1",
        role: "user",
        content: "hello",
        created_at: "2026-02-24T10:00:00.000Z",
      },
      {
        id: "m2",
        role: "assistant",
        content: "draft ready",
        metadata: { cta: "review_draft_plan" },
        created_at: "2026-02-24T10:01:00.000Z",
      },
      {
        id: "m3",
        role: "system",
        content: "ignored",
        created_at: "2026-02-24T10:02:00.000Z",
      },
    ]);

    expect(mapped).toEqual([
      {
        id: "m1",
        role: "user",
        content: "hello",
        cta: undefined,
        createdAt: "2026-02-24T10:00:00.000Z",
      },
      {
        id: "m2",
        role: "assistant",
        content: "draft ready",
        cta: "review_draft_plan",
        createdAt: "2026-02-24T10:01:00.000Z",
      },
    ]);
  });

  it("normalizes function invoke errors with HTTP metadata and parsed code", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        message: "coach-chat failed",
        context: {
          status: 403,
          text: async () => JSON.stringify({ code: "TIER_REQUIRES_PRO", reason: "upgrade" }),
        },
      },
    });

    let thrown: unknown;
    try {
      await invokeCoachChat({ prompt: "hello" });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).toMatchObject({
      status: 403,
      code: "TIER_REQUIRES_PRO",
      details: expect.stringContaining("TIER_REQUIRES_PRO"),
      message: expect.stringContaining("coach-chat failed (HTTP 403)"),
    });
    expect(isTierRestrictedCoachError(thrown)).toBe(true);
  });

  it("does not classify non-tier 403 codes as tier restricted", () => {
    expect(
      isTierRestrictedCoachError({
        status: 403,
        details: JSON.stringify({ code: "NOT_TIER" }),
      }),
    ).toBe(false);

    expect(isTierRestrictedCoachError({ status: 500, details: "internal" })).toBe(false);
  });
});
