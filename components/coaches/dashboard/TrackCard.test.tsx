import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    className?: string;
    onPress?: () => void;
    accessibilityHint?: string;
    accessibilityRole?: string;
  };

  const createMockComponent = (name: string) => {
    const MockComponent = ({ children, ...props }: MockProps) =>
      ReactModule.createElement(name, props, children);
    MockComponent.displayName = name;
    return MockComponent;
  };

  return {
    ActivityIndicator: createMockComponent("ActivityIndicator"),
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

import TrackCard from "./TrackCard";

function getTextValues(root: ReactTestInstance) {
  return root
    .findAllByType("Text")
    .map((node: ReactTestInstance) => node.children.join(""));
}

describe("TrackCard", () => {
  it("uses a compact open badge instead of a chevron and preserves accessibility hint", () => {
    const onPress = vi.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        React.createElement(TrackCard, {
          title: "Training",
          cta: "View plan",
          stateLabel: "Setup needed",
          icon: "barbell-outline",
          onPress,
        }),
      );
    });

    const textValues = getTextValues(renderer!.root);
    const iconNames = renderer!.root
      .findAllByType("Icon")
      .map((node: ReactTestInstance) => String(node.props.name));
    const button = renderer!.root.findAllByType("TouchableOpacity")[0];

    expect(textValues).toContain("Training");
    expect(textValues).toContain("Coach plan");
    expect(textValues).toContain("Setup needed");
    expect(textValues).toContain("Open");
    expect(iconNames).toContain("barbell-outline");
    expect(iconNames).not.toContain("chevron-forward");
    expect(textValues).not.toContain("Upper A - 45 min");
    expect(button.props.accessibilityHint).toBe("View plan");
    expect(button.props.accessibilityRole).toBe("button");
  });
});
