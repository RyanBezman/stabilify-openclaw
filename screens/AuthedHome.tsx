import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  type LayoutChangeEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthedHeader from "../components/authed/AuthedHeader";
import ProfileSummaryCard from "../components/authed/ProfileSummaryCard";
import InfoBanner from "../components/authed/InfoBanner";
import TrendCard from "../components/authed/TrendCard";
import ProgressOverviewCard from "../components/authed/ProgressOverviewCard";
import SupportNudgeCard from "../components/authed/SupportNudgeCard";
import RecentWeighInsCard from "../components/authed/RecentWeighInsCard";
import DashboardSkeleton from "../components/authed/DashboardSkeleton";
import InlineGymSessionCaptureCard from "../components/authed/InlineGymSessionCaptureCard";
import GymSessionAnalyzingCard from "../components/authed/GymSessionAnalyzingCard";
import GymValidationNoteModal from "../components/authed/GymValidationNoteModal";
import Card from "../components/ui/Card";
import {
  useAuthedHome,
  useAuthedHomeGymFlow,
  type AuthedHomeUser,
} from "../lib/features/dashboard";
import type { AuthedTabParamList, RootStackParamList } from "../lib/navigation/types";
import {
  FLOATING_TAB_SCREEN_SAFE_AREA_EDGES,
  useFloatingTabBarLayout,
} from "../lib/navigation/useFloatingTabBarLayout";
import AppScreen from "../components/ui/AppScreen";

const GYM_FLOW_HEIGHT_RATIO = 0.42;
const GYM_FLOW_MIN_HEIGHT = 300;
const GYM_FLOW_MAX_HEIGHT = 360;

function clamp(value: number, minimum: number, maximum: number) {
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

type AuthedHomeProps = CompositeScreenProps<
  BottomTabScreenProps<AuthedTabParamList, "Today">,
  NativeStackScreenProps<RootStackParamList>
> & {
  user?: AuthedHomeUser | null;
};

export default function AuthedHome({ navigation, route, user }: AuthedHomeProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { contentBottomPadding } = useFloatingTabBarLayout();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const gymFlowCardYRef = useRef<number | null>(null);
  const previousGymFlowActiveRef = useRef(false);
  const [shouldAutoScrollGymFlow, setShouldAutoScrollGymFlow] = useState(false);
  const {
    dashboardError,
    showSkeleton,
    profileSummary,
    notificationCount,
    supportRequest,
    supportNudgeVariant,
    phoneNudgesEnabled,
    supportActionBusy,
    enablingPhoneNudges,
    verifiedGymSessions,
    weeklyGymTarget,
    hasGymLocation,
    todayGymSession,
    todayGymValidationStatus,
    requestingGymValidation,
    unit,
    stepSummary,
    consistencyOptions,
    consistencyOption,
    consistency,
    trendPoints,
    recentWeighIns,
    cadenceSummary,
    reminderSummary,
    selectConsistencyOption,
    requestGymValidationForToday,
    allowAutoSupportFromNudge,
    deferAutoSupportFromNudge,
    reEnableAutoSupportFromNudge,
    enablePhoneNudges,
    refreshDashboard,
  } = useAuthedHome(user);
  const gymFlow = useAuthedHomeGymFlow({
    analyzeRequest: route.params?.gymSessionAnalyze,
    clearAnalyzeRequest: () => navigation.setParams({ gymSessionAnalyze: undefined }),
    hasGymLocation,
    refreshDashboard,
    requestGymValidationForToday,
    todayGymSession,
    unit,
    userId: user?.id,
  });
  const gymFlowCardHeight = clamp(
    Math.round(windowHeight * GYM_FLOW_HEIGHT_RATIO),
    GYM_FLOW_MIN_HEIGHT,
    GYM_FLOW_MAX_HEIGHT,
  );
  const isGymFlowActive = gymFlow.isGymFlowActive;
  const scrollToGymFlowCard = useCallback(() => {
    if (gymFlowCardYRef.current === null) {
      return false;
    }

    scrollViewRef.current?.scrollTo({
      y: Math.max(0, gymFlowCardYRef.current - 12),
      animated: true,
    });
    return true;
  }, []);

  useEffect(() => {
    if (isGymFlowActive && !previousGymFlowActiveRef.current) {
      setShouldAutoScrollGymFlow(true);
    }
    previousGymFlowActiveRef.current = isGymFlowActive;
  }, [isGymFlowActive]);

  useEffect(() => {
    if (!shouldAutoScrollGymFlow) {
      return;
    }
    if (!scrollToGymFlowCard()) {
      return;
    }
    setShouldAutoScrollGymFlow(false);
  }, [scrollToGymFlowCard, shouldAutoScrollGymFlow]);

  const handleGymFlowCardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      gymFlowCardYRef.current = event.nativeEvent.layout.y;
      if (!shouldAutoScrollGymFlow) {
        return;
      }
      if (!scrollToGymFlowCard()) {
        return;
      }
      setShouldAutoScrollGymFlow(false);
    },
    [scrollToGymFlowCard, shouldAutoScrollGymFlow],
  );

  const handleRequestGymValidation = async () => {
    const result = await gymFlow.submitGymValidationRequest();
    if (result.error) {
      Alert.alert("Couldn't request validation", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert(
      "Validation requested",
      "Your close friends can now review this provisional session.",
    );
  };

  const handleCloseGymSessionAnalysisCard = useCallback(async () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    const result = await gymFlow.closeGymSessionAnalysisCard();
    if (!result?.error) {
      return;
    }
    Alert.alert("Couldn't refresh progress", result.error);
  }, [gymFlow]);

  const handleRequestCloseFriendValidationFromCard = useCallback(async () => {
    const result = await gymFlow.requestCloseFriendValidationFromAnalysis();
    if (result.success || !result.error) {
      return;
    }

    Alert.alert("Couldn't request validation", result.error);
  }, [gymFlow]);

  const handleAllowAutoSupport = async () => {
    const result = await allowAutoSupportFromNudge();
    if (!result.success && result.error) {
      Alert.alert("Couldn't save consent", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert(
      "Consent saved",
      "Private auto-support is on for future behind-goal triggers. This week's request stays suppressed and won't backfill.",
    );
  };

  const handleReEnableAutoSupport = async () => {
    const result = await reEnableAutoSupportFromNudge();
    if (!result.success && result.error) {
      Alert.alert("Couldn't enable auto support", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert("Auto support enabled", "We'll publish support posts when future triggers fire.");
  };

  const handleEnablePhoneNudges = async () => {
    const result = await enablePhoneNudges();
    if (!result.success && result.error) {
      Alert.alert("Couldn't enable phone notifications", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert("Phone notifications enabled", "You'll receive private behind-goal reminders.");
  };

  const handleNotNowAutoSupport = async () => {
    const result = await deferAutoSupportFromNudge();
    if (!result.success && result.error) {
      Alert.alert("Couldn't defer support nudge", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert("Nudge snoozed", "We'll remind you again tomorrow.");
  };

  return (
    <AppScreen
      className="flex-1 bg-neutral-950"
      edges={FLOATING_TAB_SCREEN_SAFE_AREA_EDGES}
      maxContentWidth={820}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="px-5 pt-4"
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {dashboardError ? (
          <Card className="mb-6 border-rose-500/40 bg-rose-500/10 p-5">
            <Text className="text-sm font-semibold text-rose-200">
              Couldn&apos;t load your stats
            </Text>
            <Text className="mt-2 text-sm text-rose-200/70">{dashboardError}</Text>
          </Card>
        ) : null}
        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <>
            <AuthedHeader
              notificationCount={notificationCount}
              onOpenNotifications={() => navigation.navigate("FollowRequests")}
            />

            <ProfileSummaryCard
              summary={profileSummary}
            />

            {supportRequest ? (
              <SupportNudgeCard
                request={supportRequest}
                variant={supportNudgeVariant ?? "suppressed_prompt"}
                phoneNudgesEnabled={phoneNudgesEnabled}
                actionBusy={supportActionBusy}
                enablePhoneNudgesBusy={enablingPhoneNudges}
                onAllowAutoSupport={() => void handleAllowAutoSupport()}
                onNotNow={() => void handleNotNowAutoSupport()}
                onReEnableAutoSupport={() => void handleReEnableAutoSupport()}
                onEnablePhoneNudges={() => void handleEnablePhoneNudges()}
              />
            ) : null}

            <ProgressOverviewCard
              consistencyOptions={consistencyOptions}
              consistencyOption={consistencyOption}
              onSelectConsistencyOption={selectConsistencyOption}
              consistencyDaysWithWeighIns={consistency.daysWithWeighIns}
              consistencyTotalDays={consistency.totalDays}
              consistencyPercent={consistency.percent}
              onPressWeighIn={() => navigation.navigate("LogWeighIn")}
              gymCompleted={verifiedGymSessions}
              gymTarget={weeklyGymTarget}
              onLogSession={() => {
                if (!gymFlow.canStartGymSessionCapture) {
                  return;
                }
                gymFlow.openInlineGymCapture();
              }}
              onSetupGym={() => navigation.navigate("GymSettings")}
              logSessionEnabled={gymFlow.canStartGymSessionCapture}
              gymLastStatus={todayGymSession?.status}
              gymLastStatusReason={todayGymSession?.statusReason ?? null}
              validationRequestStatus={todayGymValidationStatus}
              requestValidationLoading={requestingGymValidation}
              gymLastDistanceMeters={todayGymSession?.distanceMeters ?? null}
              preferredUnit={unit}
              stepSummary={stepSummary}
              onPressSteps={!stepSummary.enabled ? () => navigation.navigate("ProfileSettings") : undefined}
              onRequestValidation={
                todayGymSession?.status === "provisional"
                  ? gymFlow.openValidationNoteModal
                  : undefined
              }
              onRetry={
                todayGymSession?.status === "provisional"
                  ? gymFlow.openInlineGymCapture
                  : undefined
              }
            />

            <View className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate("LogWeighIn")}
                className="flex-row items-center px-4 py-4"
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">Log weight</Text>
                </View>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-neutral-800">
                  <Ionicons name="add" size={16} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {!isGymFlowActive ? (
                <>
                  <View className="mx-4 border-t border-neutral-800" />

                  <TouchableOpacity
                    activeOpacity={gymFlow.canStartGymSessionCapture || !hasGymLocation ? 0.8 : 1}
                    onPress={() =>
                      !hasGymLocation
                        ? navigation.navigate("GymSettings")
                        : gymFlow.canStartGymSessionCapture
                          ? gymFlow.openInlineGymCapture()
                          : undefined
                    }
                    disabled={hasGymLocation && !gymFlow.canStartGymSessionCapture}
                    className="flex-row items-center px-4 py-4"
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          hasGymLocation && !gymFlow.canStartGymSessionCapture
                            ? "text-neutral-500"
                            : "text-white"
                        }`}
                      >
                        {!hasGymLocation
                          ? "Set gym location"
                          : gymFlow.canStartGymSessionCapture
                            ? "Add gym session"
                            : "Gym session logged"}
                      </Text>
                    </View>
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        hasGymLocation && !gymFlow.canStartGymSessionCapture
                          ? "bg-neutral-900"
                          : "bg-neutral-800"
                      }`}
                    >
                      <Ionicons
                        name={hasGymLocation && !gymFlow.canStartGymSessionCapture ? "checkmark" : "add"}
                        size={16}
                        color={hasGymLocation && !gymFlow.canStartGymSessionCapture ? "#a3a3a3" : "#ffffff"}
                      />
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            {isGymFlowActive ? (
              <View onLayout={handleGymFlowCardLayout}>
                {gymFlow.showInlineGymCapture ? (
                  <InlineGymSessionCaptureCard
                    cardHeight={gymFlowCardHeight}
                    onCancel={() => gymFlow.setShowInlineGymCapture(false)}
                    onSaved={({ photoUri }) => {
                      gymFlow.setShowInlineGymCapture(false);
                      gymFlow.startGymSessionAnalysis(photoUri);
                    }}
                    onSaveFailed={() => {
                      gymFlow.setShowInlineGymCapture(true);
                    }}
                    onSaveResolved={({ sessionId, status, statusReason, distanceMeters }) => {
                      gymFlow.resolveGymSessionAnalysis(
                        sessionId,
                        status,
                        statusReason,
                        distanceMeters,
                      );
                    }}
                  />
                ) : null}

                {!gymFlow.showInlineGymCapture && gymFlow.gymSessionAnalysis ? (
                  <GymSessionAnalyzingCard
                    cardHeight={gymFlowCardHeight}
                    photoUri={gymFlow.gymSessionAnalysis.photoUri}
                    progress={gymFlow.gymSessionAnalysis.progress}
                    phase={gymFlow.gymSessionAnalysis.result?.phase ?? "analyzing"}
                    reason={gymFlow.gymSessionAnalysis.result?.reason ?? null}
                    showCloseFriendValidation={
                      gymFlow.gymSessionAnalysis.result?.canRequestCloseFriendValidation ?? false
                    }
                    validationRequesting={gymFlow.requestingCloseFriendValidation}
                    validationRequested={gymFlow.gymSessionAnalysis.result?.validationRequested ?? false}
                    onRequestCloseFriendValidation={() =>
                      void handleRequestCloseFriendValidationFromCard()
                    }
                    onClose={() => void handleCloseGymSessionAnalysisCard()}
                  />
                ) : null}
              </View>
            ) : null}

            <TrendCard points={trendPoints} unit={unit} />

            <RecentWeighInsCard weighIns={recentWeighIns} unit={unit} />

            <InfoBanner
              cadenceSummary={cadenceSummary}
              reminderSummary={reminderSummary}
            />
          </>
        )}
      </ScrollView>

      <GymValidationNoteModal
        visible={gymFlow.showValidationNoteModal}
        note={gymFlow.validationNote}
        requesting={requestingGymValidation}
        onClose={gymFlow.closeValidationNoteModal}
        onChangeNote={gymFlow.setValidationNote}
        onSubmit={handleRequestGymValidation}
      />
    </AppScreen>
  );
}
