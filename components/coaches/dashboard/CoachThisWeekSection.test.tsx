import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    testID?: string;
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
    Text: createMockComponent("Text"),
    View: createMockComponent("View"),
    TouchableOpacity: createMockComponent("TouchableOpacity"),
  };
});

vi.mock("../../authed/CircularProgressRing", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({
      label,
      valueText,
      subText,
    }: {
      label: string;
      valueText: string;
      subText: string;
    }) =>
      ReactModule.createElement(
        "View",
        null,
        ReactModule.createElement("Text", null, `${label}:${valueText}`),
        ReactModule.createElement("Text", null, subText),
      ),
  };
});

vi.mock("../../ui/SectionTitle", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", props, children),
  };
});

import CoachThisWeekSection from "./CoachThisWeekSection";

function getTextValues(root: ReactTestInstance) {
  return root
    .findAllByType("Text")
    .map((node: ReactTestInstance) => node.children.join(""));
}

describe("CoachThisWeekSection", () => {
  it("renders a single grouped this week section without legacy headings", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(CoachThisWeekSection, {
          adherenceScore: 82,
          completionRate: 64,
          streak: 3,
          caloriesTarget: 2200,
          nextDueLabel: "Sunday",
          checkinCompleted: true,
          planAcceptedThisWeek: false,
          adherenceTrendDirection: "up",
          adherenceTrendDelta: 2,
          cta: "Preview last check-in",
          onPress: vi.fn(),
        }),
      );
    });

    const textValues = getTextValues(renderer!.root);
    const dueLabels = textValues.filter((value) => value === "Due Sunday");

    expect(textValues).toContain("This week");
    expect(textValues).toContain("Weekly check-in");
    expect(textValues).toContain("Adherence:82%");
    expect(textValues).toContain("8wk completion:64%");
    expect(textValues).toContain("Active streak");
    expect(textValues).toContain("Nutrition target");
    expect(textValues).toContain("Preview last check-in");
    expect(textValues).not.toContain("Performance");
    expect(textValues).not.toContain("Weekly recap");
    expect(dueLabels).toHaveLength(1);
  });
});
