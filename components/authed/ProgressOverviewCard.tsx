import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native";
import type {
  HomeConsistencyOption,
  StepSummary,
} from "../../lib/features/dashboard";
import type {
  GymSessionStatus,
  GymSessionStatusReason,
  GymSessionValidationRequestStatus,
} from "../../lib/data/types";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import CircularProgressRing, { type CircularProgressRingTone } from "./CircularProgressRing";

export type ProgressOverviewCardProps = {
  consistencyOptions: HomeConsistencyOption[];
  consistencyOption: HomeConsistencyOption;
  onSelectConsistencyOption: (option: HomeConsistencyOption) => void;
  consistencyDaysWithWeighIns: number;
  consistencyTotalDays: number;
  consistencyPercent: number;
  onPressWeighIn: () => void;
  gymCompleted: number;
  gymTarget: number;
  onLogSession?: () => void;
  onSetupGym?: () => void;
  logSessionEnabled?: boolean;
  onRetry?: () => void;
  onRequestValidation?: () => void;
  requestValidationLoading?: boolean;
  validationRequestStatus?: GymSessionValidationRequestStatus | null;
  gymLastStatus?: GymSessionStatus;
  gymLastStatusReason?: GymSessionStatusReason | null;
  gymLastDistanceMeters?: number | null;
  preferredUnit?: "lb" | "kg";
  stepSummary: StepSummary;
  onPressSteps?: () => void;
};

const CONSISTENCY_MENU_WIDTH = 248;
const CONSISTENCY_MENU_SCREEN_PADDING = 16;
const CONSISTENCY_MENU_VERTICAL_OFFSET = 10;
const CONSISTENCY_MENU_ROW_HEIGHT = 56;

function clamp(value: number, minimum: number, maximum: number) {
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function resolveMenuPosition(
  anchor: LayoutRectangle | null,
  screenWidth: number,
  screenHeight: number,
  optionCount: number,
) {
  const fallbackLeft = Math.max(
    CONSISTENCY_MENU_SCREEN_PADDING,
    screenWidth - CONSISTENCY_MENU_WIDTH - CONSISTENCY_MENU_SCREEN_PADDING,
  );
  const estimatedMenuHeight =
    optionCount * CONSISTENCY_MENU_ROW_HEIGHT + 16;

  if (!anchor) {
    return {
      left: fallbackLeft,
      top: CONSISTENCY_MENU_SCREEN_PADDING * 3,
    };
  }

  const preferredLeft = anchor.x + anchor.width - CONSISTENCY_MENU_WIDTH;
  const left = clamp(
    preferredLeft,
    CONSISTENCY_MENU_SCREEN_PADDING,
    Math.max(
      CONSISTENCY_MENU_SCREEN_PADDING,
      screenWidth - CONSISTENCY_MENU_WIDTH - CONSISTENCY_MENU_SCREEN_PADDING,
    ),
  );

  const preferredTop = anchor.y + anchor.height + CONSISTENCY_MENU_VERTICAL_OFFSET;
  const maxBottom = screenHeight - CONSISTENCY_MENU_SCREEN_PADDING;
  const shouldOpenAbove = preferredTop + estimatedMenuHeight > maxBottom;
  const top = shouldOpenAbove
    ? Math.max(
        CONSISTENCY_MENU_SCREEN_PADDING,
        anchor.y - estimatedMenuHeight - CONSISTENCY_MENU_VERTICAL_OFFSET,
      )
    : preferredTop;

  return { left, top };
}

function resolveGymRingTone(status?: GymSessionStatus): CircularProgressRingTone {
  if (status === "verified") {
    return "emerald";
  }
  if (status === "partial") {
    return "amber";
  }
  if (status === "provisional") {
    return "rose";
  }
  return "emerald";
}

function formatStepValue(value: number): string {
  return value.toString();
}

export default function ProgressOverviewCard({
  consistencyOptions,
  consistencyOption,
  onSelectConsistencyOption,
  consistencyDaysWithWeighIns,
  consistencyTotalDays,
  consistencyPercent,
  gymCompleted,
  gymTarget,
  gymLastStatus,
  stepSummary,
  onPressSteps,
}: ProgressOverviewCardProps) {
  const triggerContainerRef = useRef<React.ElementRef<typeof View> | null>(null);
  const [showConsistencyMenu, setShowConsistencyMenu] = useState(false);
  const [consistencyMenuAnchor, setConsistencyMenuAnchor] = useState<LayoutRectangle | null>(null);
  const previousScreenRef = useRef<{ width: number; height: number } | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const consistencyProgress = clampProgress(consistencyPercent);
  const consistencyPercentLabel = Math.round(consistencyProgress * 100);
  const hasGymTarget = gymTarget > 0;
  const safeCompleted = hasGymTarget ? Math.min(gymCompleted, gymTarget) : 0;
  const gymProgress = hasGymTarget ? clampProgress(safeCompleted / gymTarget) : 0;
  const resolvedStatus = hasGymTarget ? gymLastStatus : undefined;
  const hasStepTarget = stepSummary.target > 0;
  const resolvedStepValue = stepSummary.steps ?? 0;
  const clampedSteps = Math.max(0, resolvedStepValue);
  const hasStepValue = stepSummary.steps !== null;
  const stepsProgress =
    stepSummary.enabled && hasStepTarget && hasStepValue
      ? clampProgress(clampedSteps / stepSummary.target)
      : 0;
  const stepsValueText = !stepSummary.enabled
    ? "Off"
    : stepSummary.loading && !hasStepValue
      ? "..."
      : !hasStepValue
        ? "—"
        : formatStepValue(clampedSteps);
  const stepsSubText = !stepSummary.enabled
    ? "Enable"
    : stepSummary.mode === "average"
      ? "Avg/day"
      : hasStepTarget
        ? `${formatStepValue(clampedSteps)}/${formatStepValue(stepSummary.target)}`
        : "No goal";
  const consistencyMenuPosition = useMemo(
    () =>
      resolveMenuPosition(
        consistencyMenuAnchor,
        screenWidth,
        screenHeight,
        consistencyOptions.length,
      ),
    [consistencyMenuAnchor, consistencyOptions.length, screenHeight, screenWidth],
  );

  const closeConsistencyMenu = useCallback(() => {
    setShowConsistencyMenu(false);
  }, []);

  const openConsistencyMenu = useCallback(() => {
    const trigger = triggerContainerRef.current;
    if (!trigger?.measureInWindow) {
      setConsistencyMenuAnchor(null);
      setShowConsistencyMenu(true);
      return;
    }

    trigger.measureInWindow((x, y, width, height) => {
      setConsistencyMenuAnchor({ x, y, width, height });
      setShowConsistencyMenu(true);
    });
  }, []);

  const toggleConsistencyMenu = useCallback(() => {
    if (showConsistencyMenu) {
      closeConsistencyMenu();
      return;
    }

    openConsistencyMenu();
  }, [closeConsistencyMenu, openConsistencyMenu, showConsistencyMenu]);

  const handleSelectConsistencyOption = useCallback(
    (option: HomeConsistencyOption) => {
      onSelectConsistencyOption(option);
      closeConsistencyMenu();
    },
    [closeConsistencyMenu, onSelectConsistencyOption],
  );

  useEffect(() => {
    const previousScreen = previousScreenRef.current;
    const screenDidChange =
      previousScreen !== null
      && (previousScreen.width !== screenWidth || previousScreen.height !== screenHeight);
    if (showConsistencyMenu && screenDidChange) {
      closeConsistencyMenu();
    }
    previousScreenRef.current = { width: screenWidth, height: screenHeight };
  }, [closeConsistencyMenu, screenHeight, screenWidth, showConsistencyMenu]);

  return (
    <Card className="mb-6 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <SectionTitle>Progress</SectionTitle>
        <View ref={triggerContainerRef} collapsable={false}>
          <TouchableOpacity
            testID="progress-overview-consistency-selector"
            activeOpacity={0.86}
            onPress={toggleConsistencyMenu}
            accessibilityRole="button"
            accessibilityLabel={`Change progress filter. Current selection ${consistencyOption.label}.`}
            accessibilityHint="Shows progress filter options."
            accessibilityState={{ expanded: showConsistencyMenu }}
            className={`flex-row items-center rounded-full border px-3 py-2 ${
              showConsistencyMenu
                ? "border-neutral-600 bg-neutral-900"
                : "border-neutral-700/80 bg-neutral-900/85"
            }`}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={showConsistencyMenu ? "#f5f5f5" : "#a3a3a3"}
            />
            <Text className="ml-2 text-sm font-medium text-neutral-100">
              {consistencyOption.label}
            </Text>
            <Ionicons
              name={showConsistencyMenu ? "chevron-up" : "chevron-down"}
              size={14}
              color={showConsistencyMenu ? "#f5f5f5" : "#737373"}
              style={styles.triggerChevron}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-start gap-1">
        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Weigh-ins"
            value={consistencyProgress}
            valueText={`${consistencyPercentLabel}%`}
            subText={`${consistencyDaysWithWeighIns}/${consistencyTotalDays}`}
            tone="violet"
            size={90}
            strokeWidth={7}
            animateOnMount
          />
        </View>

        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Gym sessions"
            value={gymProgress}
            valueText={hasGymTarget ? `${Math.round(gymProgress * 100)}%` : "—"}
            subText={hasGymTarget ? `${safeCompleted}/${gymTarget}` : "No goal"}
            tone={resolveGymRingTone(resolvedStatus)}
            size={90}
            strokeWidth={7}
            animateOnMount
          />
        </View>

        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Steps"
            value={stepsProgress}
            valueText={stepsValueText}
            subText={stepsSubText}
            tone="blue"
            progressColor="#AFCBFF"
            size={90}
            strokeWidth={7}
            animateOnMount
            onPress={!stepSummary.enabled ? onPressSteps : undefined}
            testID={!stepSummary.enabled ? "progress-overview-steps-ring" : undefined}
          />
        </View>
      </View>

      <Modal
        visible={showConsistencyMenu}
        transparent
        animationType="fade"
        onRequestClose={closeConsistencyMenu}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={StyleSheet.absoluteFillObject}>
          <Pressable
            testID="progress-overview-consistency-backdrop"
            onPress={closeConsistencyMenu}
            style={StyleSheet.absoluteFillObject}
            className="bg-black/24"
          />

          <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
            <View
              style={[
                styles.consistencyMenuPanel,
                {
                  left: consistencyMenuPosition.left,
                  top: consistencyMenuPosition.top,
                  width: CONSISTENCY_MENU_WIDTH,
                },
              ]}
            >
              <View className="px-2 py-2">
                {consistencyOptions.map((option) => {
                  const isActive = option.id === consistencyOption.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      testID={`progress-overview-consistency-option-${option.id}`}
                      activeOpacity={0.86}
                      onPress={() => handleSelectConsistencyOption(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className={`mb-1 rounded-2xl border px-3 py-3 ${
                        isActive
                          ? "border-white/10 bg-white/5"
                          : "border-transparent bg-transparent"
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`flex-1 pr-3 text-sm font-semibold ${
                            isActive ? "text-white" : "text-neutral-200"
                          }`}
                        >
                          {option.label}
                        </Text>

                        <View
                          className={`h-8 w-8 items-center justify-center rounded-full border ${
                            isActive
                              ? "border-white/10 bg-white/10"
                              : "border-neutral-700 bg-neutral-900/90"
                          }`}
                        >
                          <Ionicons
                            name={isActive ? "checkmark" : "time-outline"}
                            size={14}
                            color={isActive ? "#fafafa" : "#737373"}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  triggerChevron: {
    marginLeft: 8,
  },
  consistencyMenuPanel: {
    position: "absolute",
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#27272a",
    backgroundColor: "#0d0f12",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.38,
    shadowRadius: 32,
    elevation: 18,
  },
});
