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
  };
});

vi.mock("@expo/vector-icons", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    Ionicons: ({ name }: { name: string }) => ReactModule.createElement("Icon", { name }),
  };
});

vi.mock("../../ui/SectionTitle", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Text", props, children),
  };
});

import CoachTodayCard from "./CoachTodayCard";

function getTextValues(root: ReactTestInstance) {
  return root
    .findAllByType("Text")
    .map((node: ReactTestInstance) => node.children.join(""));
}

describe("CoachTodayCard", () => {
  it("renders a compact daily snapshot instead of detailed macro rows", () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(CoachTodayCard, {
          directive: "Lift first",
          statusIndicators: ["Workout: Upper A - 45 min", "Macros: 1900 kcal • P160 C220 F65"],
        }),
      );
    });

    const textValues = getTextValues(renderer!.root);

    expect(textValues).toContain("Today");
    expect(textValues).toContain("Workout");
    expect(textValues).toContain("Upper A - 45 min");
    expect(textValues).toContain("Macros");
    expect(textValues).toContain("1900 kcal • 160P • 220C • 65F");
    expect(textValues).not.toContain("Quick snapshot");
    expect(textValues).not.toContain("Lift first");
    expect(textValues).not.toContain("Protein");
    expect(textValues).not.toContain("Carbs");
    expect(textValues).not.toContain("Fat");
  });
});
