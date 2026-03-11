// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  loadCoachState: vi.fn(),
  saveCoachState: vi.fn(),
  fetchActiveCoachFromServer: vi.fn(),
  invokeCoachChat: vi.fn(),
  mapCoachMessages: vi.fn(),
}));

vi.mock("../services/storage", () => ({
  loadCoachState: mocks.loadCoachState,
  saveCoachState: mocks.saveCoachState,
}));

vi.mock("../services/api", () => ({
  fetchActiveCoachFromServer: mocks.fetchActiveCoachFromServer,
}));

vi.mock("../services/chatClient", () => ({
  invokeCoachChat: mocks.invokeCoachChat,
  mapCoachMessages: mocks.mapCoachMessages,
}));

import { CoachProvider, useCoach } from "./CoachContext";

const coachA: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct and clear",
};

const coachB: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "sweet",
  displayName: "Lena",
  tagline: "Calm and supportive",
};

const activePlan = { id: "plan-1", version: 3 };
const intake = { goal: "lose" };

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve: (value: T) => {
      if (!resolve) {
        throw new Error("Deferred promise already settled.");
      }
      resolve(value);
    },
  };
}

async function flushAsyncWork(ticks = 6) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("CoachProvider", () => {
  beforeEach(() => {
    mocks.loadCoachState.mockReset();
    mocks.saveCoachState.mockReset();
    mocks.fetchActiveCoachFromServer.mockReset();
    mocks.invokeCoachChat.mockReset();
    mocks.mapCoachMessages.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("preserves accepted plan state when switching coaches in keep-current-setup mode", async () => {
    const persistedState = {
      workout: {
        activeCoach: null,
        activePlan: null,
        draftPlan: null,
        messages: [],
        intake: null,
        updatedAt: 1,
      },
      nutrition: {
        activeCoach: coachA,
        activePlan,
        draftPlan: { id: "draft-1", version: 4 },
        messages: [
          {
            id: "message-a",
            role: "assistant",
            content: "Current coach thread",
          },
        ],
        intake,
        updatedAt: 1,
      },
    };

    mocks.loadCoachState.mockImplementation(
      async (specialization: "workout" | "nutrition") => persistedState[specialization]
    );
    mocks.saveCoachState.mockImplementation(
      async (
        partial: Record<string, unknown>,
        specialization: "workout" | "nutrition"
      ) => {
        persistedState[specialization] = {
          ...persistedState[specialization],
          ...partial,
          updatedAt: persistedState[specialization].updatedAt + 1,
        };
      }
    );
    mocks.fetchActiveCoachFromServer.mockImplementation(
      async (_userId: string, specialization: "workout" | "nutrition") => ({
        data: { coach: persistedState[specialization].activeCoach },
      })
    );

    let coachContext: ReturnType<typeof useCoach> | null = null;

    function Harness() {
      coachContext = useCoach();
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          CoachProvider,
          { authUserId: "user-1" },
          React.createElement(Harness)
        )
      );
    });

    await flushAsyncWork();

    await act(async () => {
      coachContext?.setActiveCoach("nutrition", coachB, {
        preserveWorkspace: "keep_active_plan",
      });
    });
    await flushAsyncWork();

    expect(persistedState.nutrition.activeCoach).toEqual(coachB);
    expect(persistedState.nutrition.activePlan).toEqual(activePlan);
    expect(persistedState.nutrition.draftPlan).toBeNull();
    expect(persistedState.nutrition.intake).toEqual(intake);
    expect(persistedState.nutrition.messages).toEqual([]);

    act(() => {
      renderer.unmount();
    });
  });

  it("keeps saved plan state available when detaching the active coach", async () => {
    const persistedState = {
      workout: {
        activeCoach: null,
        activePlan: null,
        draftPlan: null,
        messages: [],
        intake: null,
        updatedAt: 1,
      },
      nutrition: {
        activeCoach: coachA,
        activePlan,
        draftPlan: { id: "draft-1", version: 4 },
        messages: [
          {
            id: "message-a",
            role: "assistant",
            content: "Current coach thread",
          },
        ],
        intake,
        updatedAt: 1,
      },
    };

    mocks.loadCoachState.mockImplementation(
      async (specialization: "workout" | "nutrition") => persistedState[specialization]
    );
    mocks.saveCoachState.mockImplementation(
      async (
        partial: Record<string, unknown>,
        specialization: "workout" | "nutrition"
      ) => {
        persistedState[specialization] = {
          ...persistedState[specialization],
          ...partial,
          updatedAt: persistedState[specialization].updatedAt + 1,
        };
      }
    );
    mocks.fetchActiveCoachFromServer.mockImplementation(
      async (_userId: string, specialization: "workout" | "nutrition") => ({
        data: { coach: persistedState[specialization].activeCoach },
      })
    );

    let coachContext: ReturnType<typeof useCoach> | null = null;

    function Harness() {
      coachContext = useCoach();
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          CoachProvider,
          { authUserId: "user-1" },
          React.createElement(Harness)
        )
      );
    });

    await flushAsyncWork();

    await act(async () => {
      coachContext?.setActiveCoach("nutrition", null, {
        preserveWorkspace: "keep_active_plan",
      });
    });
    await flushAsyncWork();

    expect(persistedState.nutrition.activeCoach).toBeNull();
    expect(persistedState.nutrition.activePlan).toEqual(activePlan);
    expect(persistedState.nutrition.draftPlan).toBeNull();
    expect(persistedState.nutrition.intake).toEqual(intake);
    expect(persistedState.nutrition.messages).toEqual([]);

    act(() => {
      renderer.unmount();
    });
  });

  it("ignores stale prefetch responses after the user switches coaches", async () => {
    const persistedState = {
      workout: {
        activeCoach: null,
        activePlan: null,
        draftPlan: null,
        messages: [],
        intake: null,
        updatedAt: 1,
      },
      nutrition: {
        activeCoach: coachA,
        activePlan: null,
        draftPlan: null,
        messages: [],
        intake: null,
        updatedAt: 1,
      },
    };

    mocks.loadCoachState.mockImplementation(
      async (specialization: "workout" | "nutrition") => persistedState[specialization]
    );
    mocks.saveCoachState.mockImplementation(
      async (
        partial: Record<string, unknown>,
        specialization: "workout" | "nutrition"
      ) => {
        persistedState[specialization] = {
          ...persistedState[specialization],
          ...partial,
          updatedAt: persistedState[specialization].updatedAt + 1,
        };
      }
    );
    mocks.fetchActiveCoachFromServer.mockImplementation(
      async (_userId: string, specialization: "workout" | "nutrition") => ({
        data: { coach: persistedState[specialization].activeCoach },
      })
    );
    mocks.mapCoachMessages.mockReturnValue([
      {
        id: "message-a",
        role: "assistant",
        content: "Stale coach thread",
      },
    ]);

    const stalePrefetch = createDeferred<{
      messages: Array<{
        id: string;
        role: "assistant";
        content: string;
        created_at: string;
      }>;
      active_plan: { id: string; version: number };
      draft_plan: null;
      intake: { goal: string };
    }>();
    const nextPrefetch = createDeferred<{
      messages: [];
      active_plan: null;
      draft_plan: null;
      intake: null;
    }>();

    mocks.invokeCoachChat
      .mockReturnValueOnce(stalePrefetch.promise)
      .mockReturnValueOnce(nextPrefetch.promise);

    let coachContext: ReturnType<typeof useCoach> | null = null;

    function Harness() {
      coachContext = useCoach();
      return null;
    }

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          CoachProvider,
          { authUserId: "user-1" },
          React.createElement(Harness)
        )
      );
    });

    await flushAsyncWork();

    expect(mocks.invokeCoachChat).toHaveBeenCalledTimes(1);
    expect(mocks.invokeCoachChat).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        specialization: "nutrition",
        coach_gender: coachA.gender,
        coach_personality: coachA.personality,
      })
    );

    await act(async () => {
      coachContext?.setActiveCoach("nutrition", coachB);
    });
    await flushAsyncWork();

    expect(persistedState.nutrition.activeCoach).toEqual(coachB);
    expect(persistedState.nutrition.messages).toEqual([]);

    await act(async () => {
      stalePrefetch.resolve({
        messages: [
          {
            id: "message-a",
            role: "assistant",
            content: "Stale coach thread",
            created_at: "2026-03-10T15:00:00.000Z",
          },
        ],
        active_plan: { id: "plan-a", version: 1 },
        draft_plan: null,
        intake: { goal: "lose" },
      });
      await Promise.resolve();
    });
    await flushAsyncWork();

    expect(persistedState.nutrition.activeCoach).toEqual(coachB);
    expect(persistedState.nutrition.messages).toEqual([]);
    expect(persistedState.nutrition.activePlan).toBeNull();
    expect(persistedState.nutrition.intake).toBeNull();

    act(() => {
      renderer.unmount();
    });
  });
});
