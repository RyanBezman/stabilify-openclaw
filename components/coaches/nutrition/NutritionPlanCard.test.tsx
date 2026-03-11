import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import NutritionPlanCard from "./NutritionPlanCard";
import type { NutritionPlan } from "../../../lib/features/coaches";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    className?: string;
    onPress?: () => void;
    testID?: string;
  };

  const createMockComponent = (name: string) => {
    const MockComponent = ({ children, ...props }: MockProps) =>
      ReactModule.createElement(name, props, children);
    MockComponent.displayName = name;
    return MockComponent;
  };

  return {
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

vi.mock("../../ui/Button", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({ children, title, ...props }: { children?: ReactNode; title?: string }) =>
      ReactModule.createElement("Button", props, title ?? children),
  };
});

vi.mock("../../ui/OptionPill", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({ label, ...props }: { label: string }) =>
      ReactModule.createElement("OptionPill", props, label),
  };
});

vi.mock("../workspace/PlanSurface", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("PlanSurface", props, children),
  };
});

const nutritionPlan: NutritionPlan = {
  title: "Cut Plan",
  dailyCaloriesTarget: 2100,
  macros: {
    proteinG: 180,
    carbsG: 200,
    fatsG: 60,
  },
  meals: [
    {
      name: "Breakfast",
      targetCalories: 500,
      items: ["Eggs", "Oats"],
    },
  ],
  notes: ["Hit protein first."],
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

function renderCard(plan: NutritionPlan = nutritionPlan) {
  let renderer: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      React.createElement(NutritionPlanCard, {
        plan,
        activePlan: plan,
        draftPlan: null,
        showDraftInPlan: false,
        onToggleDraft: vi.fn(),
        onOpenIntake: vi.fn(),
        onKeepDraft: vi.fn(),
        onDiscardDraft: vi.fn(),
        planBusy: false,
        planApiUnavailable: false,
      }),
    );
  });

  return renderer!;
}

describe("NutritionPlanCard", () => {
  it("keeps all collapsible sections hidden by default", () => {
    const renderer = renderCard();
    const textValues = getTextValues(renderer.root);

    expect(textValues).toContain("Meal structure");
    expect(textValues).toContain("Notes");
    expect(textValues).toContain("Show");
    expect(textValues).not.toContain("Breakfast");
    expect(textValues).not.toContain("Eggs");
    expect(textValues).not.toContain("Hit protein first.");
  });

  it("preserves opened sections when the plan content is unchanged", () => {
    const renderer = renderCard();

    act(() => {
      press(findTouchable(renderer.root, "Meal structure"));
    });

    let textValues = getTextValues(renderer.root);
    expect(textValues).toContain("Breakfast");
    expect(textValues).not.toContain("Eggs");

    act(() => {
      press(findTouchable(renderer.root, "Breakfast"));
    });

    textValues = getTextValues(renderer.root);
    expect(textValues.some((value) => value.includes("Eggs"))).toBe(true);

    const equivalentPlan: NutritionPlan = {
      title: "Cut Plan",
      dailyCaloriesTarget: 2100,
      macros: {
        proteinG: 180,
        carbsG: 200,
        fatsG: 60,
      },
      meals: [
        {
          name: "Breakfast",
          targetCalories: 500,
          items: ["Eggs", "Oats"],
        },
      ],
      notes: ["Hit protein first."],
    };

    act(() => {
      renderer.update(
        React.createElement(NutritionPlanCard, {
          plan: equivalentPlan,
          activePlan: equivalentPlan,
          draftPlan: null,
          showDraftInPlan: false,
          onToggleDraft: vi.fn(),
          onOpenIntake: vi.fn(),
          onKeepDraft: vi.fn(),
          onDiscardDraft: vi.fn(),
          planBusy: false,
          planApiUnavailable: false,
        }),
      );
    });

    textValues = getTextValues(renderer.root);
    expect(textValues).toContain("Breakfast");
    expect(textValues.some((value) => value.includes("Eggs"))).toBe(true);
  });
});
