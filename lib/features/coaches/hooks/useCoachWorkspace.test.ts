// @ts-nocheck
import { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";
import { renderTestHook } from "../../../../test/utils/renderHook";

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

const mocks = vi.hoisted(() => ({
  useCoach: vi.fn(),
  useAssistantReveal: vi.fn(),
  hydrateCoachWorkspaceWorkflow: vi.fn(),
  generatePlanWorkflow: vi.fn(),
  revisePlanWorkflow: vi.fn(),
  promoteDraftWorkflow: vi.fn(),
  discardDraftWorkflow: vi.fn(),
  sendCoachMessageWorkflow: vi.fn(),
  saveCoachState: vi.fn(),
  publishCoachSyncEvent: vi.fn(),
}));

vi.mock("../../../../components/chat/useAssistantReveal", () => ({
  default: mocks.useAssistantReveal,
}));

vi.mock("./CoachContext", () => ({
  useCoach: mocks.useCoach,
}));

vi.mock("../workflows", () => ({
  hydrateCoachWorkspaceWorkflow: mocks.hydrateCoachWorkspaceWorkflow,
  generatePlanWorkflow: mocks.generatePlanWorkflow,
  revisePlanWorkflow: mocks.revisePlanWorkflow,
  promoteDraftWorkflow: mocks.promoteDraftWorkflow,
  discardDraftWorkflow: mocks.discardDraftWorkflow,
  sendCoachMessageWorkflow: mocks.sendCoachMessageWorkflow,
}));

vi.mock("../services/storage", () => ({
  saveCoachState: mocks.saveCoachState,
}));

vi.mock("../services/syncEvents", () => ({
  coachSyncIdentityKey: (coach: ActiveCoach | null | undefined) =>
    coach ? `${coach.specialization}:${coach.gender}:${coach.personality}` : null,
  publishCoachSyncEvent: mocks.publishCoachSyncEvent,
}));

import { useCoachWorkspace } from "./useCoachWorkspace";

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve(value: T) {
      if (!resolve) {
        throw new Error("Deferred promise already settled.");
      }
      resolve(value);
    },
  };
}

async function flushAsyncWork(ticks = 4) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

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
  tagline: "Supportive and calm",
};

describe("useCoachWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    mocks.useCoach.mockReset();
    mocks.useAssistantReveal.mockReset();
    mocks.hydrateCoachWorkspaceWorkflow.mockReset();
    mocks.generatePlanWorkflow.mockReset();
    mocks.revisePlanWorkflow.mockReset();
    mocks.promoteDraftWorkflow.mockReset();
    mocks.discardDraftWorkflow.mockReset();
    mocks.sendCoachMessageWorkflow.mockReset();
    mocks.saveCoachState.mockReset();
    mocks.publishCoachSyncEvent.mockReset();

    mocks.useCoach.mockReturnValue({ authUserId: "user-1" });
    mocks.useAssistantReveal.mockReturnValue({
      revealingMessageId: null,
      revealedChars: 0,
      cursorOpacity: 1,
      finishReveal: vi.fn(),
      markAssistantSeen: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears the previous coach workspace and starts a fresh hydrate on coach switch", async () => {
    const firstHydrate = createDeferred<{
      status: "success";
      payload: {
        remote: {
          defaultNutritionGoal: null;
          hasActivePlan: false;
          activePlan: null;
          hasDraftPlan: false;
          draftPlan: null;
          hasIntake: false;
          intake: null;
          threadId: null;
          messages: [];
        };
      };
    }>();
    const secondHydrate = createDeferred<{
      status: "success";
      payload: {
        remote: {
          defaultNutritionGoal: null;
          hasActivePlan: false;
          activePlan: null;
          hasDraftPlan: false;
          draftPlan: null;
          hasIntake: false;
          intake: null;
          threadId: null;
          messages: [];
        };
      };
    }>();

    mocks.hydrateCoachWorkspaceWorkflow
      .mockImplementationOnce(async (args) => {
        args.onCachedState?.({
          activePlan: { id: "plan-a", version: 1 },
          draftPlan: null,
          intake: { goal: "maintain" },
          messages: [
            {
              id: "message-a",
              role: "assistant",
              content: "Coach A thread",
            },
          ],
        });
        return await firstHydrate.promise;
      })
      .mockImplementationOnce(async () => await secondHydrate.promise);

    const hook = renderTestHook(
      (props: { coach: ActiveCoach | null }) =>
        useCoachWorkspace({
          coach: props.coach,
          specialization: "nutrition",
          hydrated: true,
        }),
      {
        initialProps: {
          coach: coachA,
        },
      }
    );

    await flushAsyncWork();

    expect(hook.result.current.messages).toEqual([
      {
        id: "message-a",
        role: "assistant",
        content: "Coach A thread",
      },
    ]);
    expect(hook.result.current.activePlan).toEqual({ id: "plan-a", version: 1 });
    expect(hook.result.current.hasUsableSnapshot).toBe(true);
    expect(hook.result.current.workspaceSkeletonVisible).toBe(false);
    expect(mocks.hydrateCoachWorkspaceWorkflow).toHaveBeenCalledTimes(1);

    hook.rerender({ coach: coachB });
    await flushAsyncWork();

    expect(mocks.hydrateCoachWorkspaceWorkflow).toHaveBeenCalledTimes(2);
    expect(hook.result.current.messages).toEqual([]);
    expect(hook.result.current.activePlan).toBeNull();
    expect(hook.result.current.hasUsableSnapshot).toBe(false);
    expect(hook.result.current.workspaceSkeletonVisible).toBe(true);

    hook.unmount();
  });

  it("ignores stale send-message results after the coach changes", async () => {
    const sendMessageDeferred = createDeferred<{
      status: "success";
      payload: {
        defaultNutritionGoal: null;
        hasActivePlan: false;
        activePlan: null;
        hasDraftPlan: false;
        draftPlan: null;
        hasIntake: false;
        intake: null;
        threadId: "thread-a";
        messages: [
          {
            id: "reply-a";
            role: "assistant";
            content: "Old coach reply";
          },
        ];
      };
    }>();

    mocks.hydrateCoachWorkspaceWorkflow.mockResolvedValue({
      status: "success",
      payload: {
        remote: {
          defaultNutritionGoal: null,
          hasActivePlan: false,
          activePlan: null,
          hasDraftPlan: false,
          draftPlan: null,
          hasIntake: false,
          intake: null,
          threadId: null,
          messages: [],
        },
      },
    });
    mocks.sendCoachMessageWorkflow.mockImplementation(async () => await sendMessageDeferred.promise);

    const hook = renderTestHook(
      (props: { coach: ActiveCoach | null }) =>
        useCoachWorkspace({
          coach: props.coach,
          specialization: "nutrition",
          hydrated: true,
        }),
      {
        initialProps: {
          coach: coachA,
        },
      }
    );

    await flushAsyncWork();

    expect(hook.result.current.messages).toEqual([
      {
        id: "coach-greeting",
        role: "assistant",
        content: "I'm Ruth. Tell me your nutrition goal, and we'll build your meal plan.",
      },
    ]);

    act(() => {
      void hook.result.current.sendMessage("Need a new macro split", false);
    });
    await flushAsyncWork(1);

    hook.rerender({ coach: coachB });
    await flushAsyncWork();

    expect(hook.result.current.messages).toEqual([
      {
        id: "coach-greeting",
        role: "assistant",
        content: "I'm Lena. Tell me your nutrition goal, and we'll build your meal plan.",
      },
    ]);

    await act(async () => {
      sendMessageDeferred.resolve({
        status: "success",
        payload: {
          defaultNutritionGoal: null,
          hasActivePlan: false,
          activePlan: null,
          hasDraftPlan: false,
          draftPlan: null,
          hasIntake: false,
          intake: null,
          threadId: "thread-a",
          messages: [
            {
              id: "reply-a",
              role: "assistant",
              content: "Old coach reply",
            },
          ],
        },
      });
      await Promise.resolve();
    });

    expect(hook.result.current.messages).toEqual([
      {
        id: "coach-greeting",
        role: "assistant",
        content: "I'm Lena. Tell me your nutrition goal, and we'll build your meal plan.",
      },
    ]);

    hook.unmount();
  });
});
