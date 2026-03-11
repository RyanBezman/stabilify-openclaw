import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    className?: string;
    onPress?: () => void;
  };

  const createMockComponent = (name: string) => {
    const MockComponent = ({ children, ...props }: MockProps) =>
      ReactModule.createElement(name, props, children);
    MockComponent.displayName = name;
    return MockComponent;
  };

  return {
    Alert: {
      alert: vi.fn(),
    },
    KeyboardAvoidingView: createMockComponent("KeyboardAvoidingView"),
    Platform: { OS: "ios" },
    ScrollView: createMockComponent("ScrollView"),
    Text: createMockComponent("Text"),
    TouchableOpacity: createMockComponent("TouchableOpacity"),
    View: createMockComponent("View"),
  };
});

vi.mock("@expo/vector-icons", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    Ionicons: ({ name }: { name: string }) => ReactModule.createElement("Icon", { name }),
  };
});

vi.mock("../components/ui/Card", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Card", props, children),
  };
});

vi.mock("../components/ui/Button", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, title, ...props }: { children?: ReactNode; title?: string }) =>
      ReactModule.createElement("Button", props, title ?? children),
  };
});

vi.mock("../components/ui/Input", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Input", props, children),
  };
});

vi.mock("../components/ui/OptionPill", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ label, ...props }: { label: string }) =>
      ReactModule.createElement("OptionPill", props, label),
  };
});

vi.mock("../components/ui/SectionTitle", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", props, children),
  };
});

vi.mock("../components/ui/LoadingOverlay", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("LoadingOverlay", props, children),
  };
});

vi.mock("../components/coaches/CoachAvatar", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("CoachAvatar", props, children),
  };
});

vi.mock("../components/coaches/CoachWorkspaceLocked", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("CoachWorkspaceLocked", props, children),
  };
});

vi.mock("../components/coaches/CoachWorkspaceSkeleton", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("CoachWorkspaceSkeleton", props, children),
  };
});

vi.mock("../components/coaches/PlanGenerationOverlay", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("PlanGenerationOverlay", props, children),
  };
});

vi.mock("../components/coaches/workspace/WorkspaceHeader", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("WorkspaceHeader", props, children),
  };
});

vi.mock("../components/coaches/workspace/PlanPane", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("PlanPane", props, children),
  };
});

vi.mock("../components/coaches/workspace/ChatPane", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("ChatPane", props, children),
  };
});

vi.mock("../components/coaches/workspace/PlanSurface", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("PlanSurface", props, children),
  };
});

vi.mock("../components/coaches/nutrition/NutritionIntakeCard", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("NutritionIntakeCard", props, children),
  };
});

vi.mock("../components/coaches/nutrition/NutritionPlanCard", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("NutritionPlanCard", props, children),
  };
});

vi.mock("../components/ui/AppScreen", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("AppScreen", props, children),
  };
});

vi.mock("../lib/features/coaches", () => ({
  useCoach: vi.fn(),
  useCoachAccessGate: vi.fn(),
  useCoachWorkspace: vi.fn(),
  useCoachRenderDiagnostics: vi.fn(),
  clearUnifiedCoachOnServer: vi.fn(),
  fetchCoachOnboardingStatus: vi.fn(),
  getWorkoutPlanViewKey: vi.fn((plan: WorkoutPlan | null) => (plan ? JSON.stringify(plan) : "none")),
}));

vi.mock("../lib/features/coaches/hooks/coachSurfaceLoading", () => ({
  resolveCoachWorkspaceEntryState: vi.fn(),
  shouldShowCoachWorkspaceBlockingSkeleton: vi.fn(),
}));

vi.mock("../lib/features/auth", () => ({
  fetchCurrentUserId: vi.fn(),
}));

import { CoachWorkspaceView } from "./CoachWorkspace";
import { useCoachWorkspace } from "../lib/features/coaches";
import type { WorkoutPlan } from "../lib/features/coaches/types/workspaceTypes";

const workoutPlan: WorkoutPlan = {
  title: "4-Day Strength",
  daysPerWeek: 4,
  notes: ["Warm up before every lift."],
  schedule: [
    {
      dayLabel: "Day 1",
      focus: "Upper",
      items: [{ name: "Bench Press", sets: "4", reps: "6" }],
    },
  ],
};

function getTextValues(root: ReactTestInstance) {
  return root.findAllByType("Text").map((node: ReactTestInstance) => node.children.join(""));
}

function getNodeText(node: ReactTestInstance) {
  return node.findAllByType("Text").map((textNode: ReactTestInstance) => textNode.children.join("")).join(" ");
}

function press(node: ReactTestInstance) {
  const onPress = node.props.onPress;
  if (typeof onPress !== "function") {
    throw new Error("Expected pressable node.");
  }
  onPress();
}

function findTouchable(root: ReactTestInstance, label: string) {
  const match = root
    .findAllByType("TouchableOpacity")
    .find((node: ReactTestInstance) => getNodeText(node).includes(label));

  if (!match) {
    throw new Error(`Unable to find touchable containing "${label}".`);
  }

  return match;
}

function createWorkspaceState(overrides?: Partial<ReturnType<typeof useCoachWorkspace>>) {
  return {
    tab: "plan",
    setTab: vi.fn(),
    activePlan: workoutPlan,
    draftPlan: null,
    showDraftInPlan: false,
    setShowDraftInPlan: vi.fn(),
    showIntake: false,
    setShowIntake: vi.fn(),
    requiresPlanFeedbackChoice: false,
    feedbackLogging: false,
    showDaysRevision: false,
    setShowDaysRevision: vi.fn(),
    pendingDaysPerWeek: 4,
    setPendingDaysPerWeek: vi.fn(),
    intakeStep: 1,
    setIntakeStep: vi.fn(),
    messages: [],
    workspaceLoading: false,
    workspaceSkeletonVisible: false,
    blockingLoad: false,
    refreshingWorkspace: false,
    hasUsableSnapshot: true,
    mutating: false,
    hydrated: true,
    workspaceStatus: "idle",
    syncError: null,
    sendError: null,
    setSendError: vi.fn(),
    sendStatus: "idle",
    planError: null,
    planStatus: "idle",
    planApiUnavailable: false,
    sending: false,
    planLoadingVisible: false,
    planStage: "idle",
    planLoadingAction: null,
    planSuccessChip: null,
    composerHeight: 0,
    setComposerHeight: vi.fn(),
    showScrollToBottom: false,
    setShowScrollToBottom: vi.fn(),
    draft: "",
    setDraft: vi.fn(),
    chatScrollRef: { current: null },
    composerRef: { current: null },
    isAtBottomRef: { current: true },
    headerTitle: "Marcus",
    isWorkout: true,
    displayedPlanKind: "current",
    planBadge: "active",
    hasAnyPlan: true,
    hasToggle: false,
    displayedWorkoutPlan: workoutPlan,
    displayedNutritionPlan: null,
    workoutActivePlan: workoutPlan,
    workoutDraftPlan: null,
    nutritionActivePlan: null,
    nutritionDraftPlan: null,
    workoutIntake: {
      goal: "strength",
      experience: "beginner",
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: "full_gym",
      injuryNotes: "",
    },
    nutritionIntake: {
      heightCm: 180,
      weightKg: 80,
      ageYears: 30,
      sex: "male",
      goal: "maintain",
    },
    revealingMessageId: null,
    revealedChars: 0,
    cursorOpacity: 1,
    finishReveal: vi.fn(),
    assistantBusy: false,
    planBusy: false,
    inlinePlanLoadingAction: null,
    showInlinePlanLoading: false,
    clampDays: (value: number) => value,
    openPlanIntake: vi.fn(),
    hydrateWorkspace: vi.fn(),
    updateWorkoutIntake: vi.fn(),
    updateNutritionIntake: vi.fn(),
    generatePlan: vi.fn(),
    revisePlanDays: vi.fn(),
    promoteDraftPlan: vi.fn(),
    discardDraftPlan: vi.fn(),
    handleAcceptUpdatedNutritionPlan: vi.fn(),
    handleNotNowUpdatedNutritionPlan: vi.fn(),
    handleAskCoachAboutUpdatedNutritionPlan: vi.fn(),
    handleGeneratePlanFromIntake: vi.fn(),
    handleReviseDaysPerWeek: vi.fn(),
    handleKeepNewPlan: vi.fn(),
    handleDiscardNewPlan: vi.fn(),
    sendMessage: vi.fn(),
    handleSend: vi.fn(),
    scrollToBottom: vi.fn(),
    handleScrollDistanceFromBottomChange: vi.fn(),
    handleChatContentSizeChange: vi.fn(),
    retryLastSend: vi.fn(),
    openDaysRevision: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCoachWorkspace>;
}

describe("CoachWorkspaceView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCoachWorkspace).mockReturnValue(createWorkspaceState());
  });

  it("keeps workout plan sections hidden by default", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(CoachWorkspaceView, {
          coach: {
            specialization: "workout",
            gender: "man",
            personality: "analyst",
            displayName: "Marcus",
            tagline: "Direct and clear",
          },
          specialization: "workout",
          hydrated: true,
        }),
      );
    });

    const textValues = getTextValues(renderer!.root);

    expect(textValues).toContain("Weekly schedule");
    expect(textValues).toContain("Notes");
    expect(textValues).toContain("Show");
    expect(textValues).not.toContain("Day 1");
    expect(textValues).not.toContain("Bench Press");
    expect(textValues).not.toContain("Warm up before every lift.");
  });

  it("preserves opened workout sections when the plan content is unchanged", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(CoachWorkspaceView, {
          coach: {
            specialization: "workout",
            gender: "man",
            personality: "analyst",
            displayName: "Marcus",
            tagline: "Direct and clear",
          },
          specialization: "workout",
          hydrated: true,
        }),
      );
    });

    act(() => {
      press(findTouchable(renderer!.root, "Weekly schedule"));
    });

    let textValues = getTextValues(renderer!.root);
    expect(textValues).toContain("Day 1");
    expect(textValues).not.toContain("Bench Press");

    act(() => {
      press(findTouchable(renderer!.root, "Day 1"));
    });

    textValues = getTextValues(renderer!.root);
    expect(textValues).toContain("Bench Press");

    const equivalentPlan: WorkoutPlan = {
      title: "4-Day Strength",
      daysPerWeek: 4,
      notes: ["Warm up before every lift."],
      schedule: [
        {
          dayLabel: "Day 1",
          focus: "Upper",
          items: [{ name: "Bench Press", sets: "4", reps: "6" }],
        },
      ],
    };

    vi.mocked(useCoachWorkspace).mockReturnValue(
      createWorkspaceState({
        activePlan: equivalentPlan,
        displayedWorkoutPlan: equivalentPlan,
        workoutActivePlan: equivalentPlan,
      }),
    );

    act(() => {
      renderer!.update(
        React.createElement(CoachWorkspaceView, {
          coach: {
            specialization: "workout",
            gender: "man",
            personality: "analyst",
            displayName: "Marcus",
            tagline: "Direct and clear",
          },
          specialization: "workout",
          hydrated: true,
        }),
      );
    });

    textValues = getTextValues(renderer!.root);
    expect(textValues).toContain("Day 1");
    expect(textValues).toContain("Bench Press");
  });
});
