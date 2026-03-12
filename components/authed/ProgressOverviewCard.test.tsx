import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    testID?: string;
    className?: string;
    onPress?: () => void;
    style?: object;
    visible?: boolean;
  };

  const createMockComponent = (name: string) => {
    const MockComponent = ({ children, ...props }: MockProps) =>
      ReactModule.createElement(name, props, children);
    MockComponent.displayName = name;
    return MockComponent;
  };

  let listenerSequence = 0;

  class AnimatedValue {
    private value: number;

    private listeners: Record<string, (state: { value: number }) => void>;

    constructor(initialValue: number) {
      this.value = initialValue;
      this.listeners = {};
    }

    setValue(nextValue: number) {
      this.value = nextValue;
      Object.values(this.listeners).forEach((listener) => {
        listener({ value: this.value });
      });
    }

    addListener(listener: (state: { value: number }) => void) {
      listenerSequence += 1;
      const id = String(listenerSequence);
      this.listeners[id] = listener;
      return id;
    }

    removeListener(id: string) {
      delete this.listeners[id];
    }
  }

  return {
    Text: createMockComponent("Text"),
    View: createMockComponent("View"),
    TouchableOpacity: createMockComponent("TouchableOpacity"),
    Pressable: createMockComponent("Pressable"),
    Modal: ({ children, visible, ...props }: MockProps) =>
      visible ? ReactModule.createElement("Modal", props, children) : null,
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFillObject: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      hairlineWidth: 1,
    },
    useWindowDimensions: () => ({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 1,
    }),
    Animated: {
      Value: AnimatedValue,
      timing: (animatedValue: AnimatedValue, config: { toValue: number }) => ({
        start: (callback?: () => void) => {
          animatedValue.setValue(config.toValue);
          callback?.();
        },
        stop: () => {},
      }),
    },
    Easing: {
      cubic: (value: number) => value,
      out: (easing: (value: number) => number) => easing,
    },
  };
});

vi.mock("@expo/vector-icons", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    Ionicons: ({ name, ...props }: { name: string }) =>
      ReactModule.createElement("Ionicons", { ...props, name }),
  };
});

vi.mock("react-native-svg", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type SvgProps = {
    children?: ReactNode;
  };

  const Svg = ({ children, ...props }: SvgProps) =>
    ReactModule.createElement("Svg", props, children);
  const Circle = ({ children, ...props }: SvgProps) =>
    ReactModule.createElement("Circle", props, children);

  return {
    default: Svg,
    Circle,
  };
});

vi.mock("../ui/Card", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("Card", props, children),
  };
});

vi.mock("../ui/SectionTitle", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("SectionTitle", props, children),
  };
});

import ProgressOverviewCard, {
  type ProgressOverviewCardProps,
} from "./ProgressOverviewCard";

const CONSISTENCY_OPTIONS = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "1m", label: "1 month", days: 30 },
  { id: "3m", label: "3 months", days: 90 },
];

function getTextValues(root: ReactTestInstance) {
  return root
    .findAllByType("Text")
    .map((node: ReactTestInstance) => node.children.join(""));
}

function press(node: ReactTestInstance) {
  const onPress = node.props.onPress;
  if (typeof onPress !== "function") {
    throw new Error("Expected pressable node.");
  }
  onPress();
}

function renderCard(overrides?: Partial<ProgressOverviewCardProps>) {
  const onSelectConsistencyOption = vi.fn<
    (
      option: {
        id: string;
        label: string;
        days: number;
      },
    ) => void
  >();
  const onPressWeighIn = vi.fn();
  const onLogSession = vi.fn();
  const onSetupGym = vi.fn();
  const onRetry = vi.fn();
  const onRequestValidation = vi.fn();
  const onPressSteps = vi.fn();

  const props: ProgressOverviewCardProps = {
    consistencyOptions: CONSISTENCY_OPTIONS,
    consistencyOption: CONSISTENCY_OPTIONS[0],
    onSelectConsistencyOption,
    consistencyDaysWithWeighIns: 2,
    consistencyTotalDays: 7,
    consistencyPercent: 0.7,
    onPressWeighIn,
    gymCompleted: 2,
    gymTarget: 4,
    onLogSession,
    onSetupGym,
    logSessionEnabled: true,
    onRetry,
    onRequestValidation,
    onPressSteps,
    requestValidationLoading: false,
    validationRequestStatus: null,
    gymLastStatus: "partial",
    gymLastStatusReason: "missing_photo",
    gymLastDistanceMeters: 120,
    preferredUnit: "lb",
    stepSummary: {
      enabled: false,
      loading: false,
      mode: "today",
      steps: null,
      target: 10000,
    },
    ...overrides,
  };

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(ProgressOverviewCard, props));
  });

  return {
    root: renderer!.root,
    props,
    onSelectConsistencyOption,
    onPressWeighIn,
    onLogSession,
    onSetupGym,
    onRetry,
    onRequestValidation,
    onPressSteps,
  };
}

describe("ProgressOverviewCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders progress values for consistency and gym", () => {
    const { root } = renderCard();
    const textValues = getTextValues(root);

    expect(textValues).toContain("70%");
    expect(textValues).toContain("50%");
    expect(textValues).toContain("2/4");
    expect(textValues).toContain("Weigh-ins");
    expect(textValues).toContain("Gym sessions");
    expect(textValues).toContain("2/7");
    expect(textValues).not.toContain("Mar 2");
  });

  it("opens the consistency menu and forwards option selection", () => {
    const { root, onSelectConsistencyOption } = renderCard();

    act(() => {
      press(root.findByProps({ testID: "progress-overview-consistency-selector" }));
    });

    expect(root.findByProps({ testID: "progress-overview-consistency-backdrop" })).toBeTruthy();

    act(() => {
      press(root.findByProps({ testID: "progress-overview-consistency-option-1m" }));
    });

    expect(onSelectConsistencyOption).toHaveBeenCalledWith(CONSISTENCY_OPTIONS[1]);
  });

  it("keeps the selected period label and menu options", () => {
    const { root } = renderCard();

    act(() => {
      press(root.findByProps({ testID: "progress-overview-consistency-selector" }));
    });

    const textValues = getTextValues(root);

    expect(textValues).toContain("7 days");
    expect(textValues).toContain("1 month");
    expect(textValues).toContain("3 months");
    expect(textValues).not.toContain("Time range");
  });

  it("renders tap-to-enable copy for disabled steps and forwards presses", () => {
    const { root, onPressSteps } = renderCard({
      stepSummary: {
        enabled: false,
        loading: false,
        mode: "today",
        steps: null,
        target: 10000,
      },
    });
    const textValues = getTextValues(root);

    expect(textValues).toContain("Off");
    expect(textValues).toContain("Enable");

    act(() => {
      press(root.findByProps({ testID: "progress-overview-steps-ring" }));
    });

    expect(onPressSteps).toHaveBeenCalledTimes(1);
  });

  it("renders the configured step target when enabled", () => {
    const { root } = renderCard({
      stepSummary: {
        enabled: true,
        loading: false,
        mode: "today",
        steps: 8400,
        target: 12000,
      },
    });
    const textValues = getTextValues(root);

    expect(textValues).toContain("8400");
    expect(textValues).toContain("8400/12000");
    const circleStrokes = root
      .findAllByType("Circle")
      .map((node: ReactTestInstance) => String(node.props.stroke));
    expect(circleStrokes).toContain("#AFCBFF");
  });

  it("shows average-daily copy for non-default step summaries", () => {
    const { root } = renderCard({
      stepSummary: {
        enabled: true,
        loading: false,
        mode: "average",
        steps: 8400,
        target: 12000,
      },
    });
    const textValues = getTextValues(root);

    expect(textValues).toContain("8400");
    expect(textValues).toContain("Avg/day");
  });

  it("keeps the previous step value visible while a new filtered summary is loading", () => {
    const { root } = renderCard({
      stepSummary: {
        enabled: true,
        loading: true,
        mode: "average",
        steps: 2800,
        target: 12000,
      },
    });
    const textValues = getTextValues(root);

    expect(textValues).toContain("2800");
    expect(textValues).toContain("Avg/day");
    expect(textValues).not.toContain("...");
  });
});
