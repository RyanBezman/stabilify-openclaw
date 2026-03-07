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
import { getGymSessionStatusReasonCopy } from "../lib/data/gymSessionStatusReason";
import type { GymSessionStatus, GymSessionStatusReason } from "../lib/data/types";
import { requestGymSessionValidation } from "../lib/data/gymSessionValidation";
import { formatDistance } from "../lib/utils/distance";
import { useAuthedHome, type AuthedHomeUser } from "../lib/features/dashboard";
import type { AuthedTabParamList, RootStackParamList } from "../lib/navigation/types";
import {
  FLOATING_TAB_SCREEN_SAFE_AREA_EDGES,
  useFloatingTabBarLayout,
} from "../lib/navigation/useFloatingTabBarLayout";
import AppScreen from "../components/ui/AppScreen";

const ANALYSIS_INITIAL_PROGRESS = 0.17;
const ANALYSIS_PENDING_CAP = 0.92;
const ANALYSIS_RAMP_MS = 3200;
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

type GymSessionAnalysisState = {
  photoUri: string;
  startedAtMs: number;
  progress: number;
  result:
    | {
        phase: "verified" | "rejected";
        reason: string;
        sessionId: string | null;
        canRequestCloseFriendValidation: boolean;
        validationRequested: boolean;
      }
    | null;
};

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
  const [showValidationNoteModal, setShowValidationNoteModal] = useState(false);
  const [validationNote, setValidationNote] = useState("");
  const [showInlineGymCapture, setShowInlineGymCapture] = useState(false);
  const [shouldAutoScrollGymFlow, setShouldAutoScrollGymFlow] = useState(false);
  const [requestingCloseFriendValidation, setRequestingCloseFriendValidation] = useState(false);
  const [gymSessionAnalysis, setGymSessionAnalysis] = useState<GymSessionAnalysisState | null>(
    null,
  );
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
    gymWeekLabel,
    hasGymLocation,
    todayGymSession,
    todayGymValidationStatus,
    requestingGymValidation,
    unit,
    consistencyOptions,
    consistencyOption,
    showConsistencyMenu,
    consistency,
    trendPoints,
    recentWeighIns,
    cadenceSummary,
    reminderSummary,
    selectConsistencyOption,
    toggleConsistencyMenu,
    requestGymValidationForToday,
    allowAutoSupportFromNudge,
    deferAutoSupportFromNudge,
    reEnableAutoSupportFromNudge,
    enablePhoneNudges,
    refreshDashboard,
  } = useAuthedHome(user);
  const gymFlowCardHeight = clamp(
    Math.round(windowHeight * GYM_FLOW_HEIGHT_RATIO),
    GYM_FLOW_MIN_HEIGHT,
    GYM_FLOW_MAX_HEIGHT,
  );
  const hasVerifiedGymSessionToday = todayGymSession?.status === "verified";
  const canStartGymSessionCapture = hasGymLocation && !hasVerifiedGymSessionToday;
  const isGymFlowActive = showInlineGymCapture || Boolean(gymSessionAnalysis);
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
  const gymSessionAnalyzeParam = route.params?.gymSessionAnalyze;
  const startGymSessionAnalysis = useCallback((
    photoUri: string,
    startedAtMs?: number,
  ) => {
    setGymSessionAnalysis({
      photoUri,
      startedAtMs: startedAtMs ?? Date.now(),
      progress: ANALYSIS_INITIAL_PROGRESS,
      result: null,
    });
  }, []);

  const resolveGymSessionAnalysis = useCallback(
    (
      sessionId: string,
      status: GymSessionStatus,
      statusReason: GymSessionStatusReason | null,
      distanceMeters: number | null,
    ) => {
      const reasonCopy = getGymSessionStatusReasonCopy(statusReason);
      const reason =
        status === "verified"
          ? "Your session is verified and counts toward your weekly progress."
          : statusReason === "outside_radius" && distanceMeters !== null
            ? `You're ${formatDistance(distanceMeters, unit)} from your gym. Ask close friends to validate or retry at your gym location.`
            : reasonCopy?.actionText
            ? `${reasonCopy.reasonText} ${reasonCopy.actionText}`
            : reasonCopy?.reasonText ?? "We couldn't verify this session.";

      setGymSessionAnalysis((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          progress: 1,
          result: {
            phase: status === "verified" ? "verified" : "rejected",
            reason,
            sessionId,
            canRequestCloseFriendValidation: status === "provisional",
            validationRequested: false,
          },
        };
      });
    },
    [unit],
  );

  const handleRequestCloseFriendValidationFromCard = useCallback(async () => {
    if (requestingCloseFriendValidation) {
      return;
    }

    const sessionId = gymSessionAnalysis?.result?.sessionId;
    if (!sessionId) {
      return;
    }

    setRequestingCloseFriendValidation(true);
    const result = await requestGymSessionValidation(sessionId, { userId: user?.id });
    setRequestingCloseFriendValidation(false);

    if (result.error) {
      Alert.alert("Couldn't request validation", result.error);
      return;
    }

    setGymSessionAnalysis((previous) => {
      if (!previous?.result) {
        return previous;
      }

      return {
        ...previous,
        result: {
          ...previous.result,
          validationRequested: true,
          canRequestCloseFriendValidation: false,
        },
      };
    });
  }, [gymSessionAnalysis?.result?.sessionId, requestingCloseFriendValidation, user?.id]);

  useEffect(() => {
    if (!gymSessionAnalyzeParam?.photoUri) {
      return;
    }

    const parsedStartedAt = Date.parse(gymSessionAnalyzeParam.startedAt);
    const startedAtMs = Number.isNaN(parsedStartedAt) ? undefined : parsedStartedAt;
    startGymSessionAnalysis(gymSessionAnalyzeParam.photoUri, startedAtMs);
    navigation.setParams({ gymSessionAnalyze: undefined });
  }, [gymSessionAnalyzeParam, navigation, startGymSessionAnalysis]);

  useEffect(() => {
    if (!gymSessionAnalysis || gymSessionAnalysis.result) {
      return;
    }

    const intervalId = setInterval(() => {
      setGymSessionAnalysis((previous) => {
        if (!previous) {
          return previous;
        }

        const elapsedMs = Math.max(0, Date.now() - previous.startedAtMs);
        const projectedProgress =
          ANALYSIS_INITIAL_PROGRESS +
          (elapsedMs / ANALYSIS_RAMP_MS) *
            (ANALYSIS_PENDING_CAP - ANALYSIS_INITIAL_PROGRESS);
        const nextProgress = Math.min(
          ANALYSIS_PENDING_CAP,
          Math.max(previous.progress, projectedProgress),
        );

        if (nextProgress === previous.progress) {
          return previous;
        }

        return {
          ...previous,
          progress: nextProgress,
        };
      });
    }, 250);

    return () => clearInterval(intervalId);
  }, [gymSessionAnalysis?.result, gymSessionAnalysis?.startedAtMs]);

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

  const handleGymFlowCardLayout = useCallback((event: LayoutChangeEvent) => {
    gymFlowCardYRef.current = event.nativeEvent.layout.y;
    if (!shouldAutoScrollGymFlow) {
      return;
    }
    if (!scrollToGymFlowCard()) {
      return;
    }
    setShouldAutoScrollGymFlow(false);
  }, [scrollToGymFlowCard, shouldAutoScrollGymFlow]);

  const handleRequestGymValidation = async () => {
    const result = await requestGymValidationForToday(validationNote);
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
    setShowValidationNoteModal(false);
    setValidationNote("");
  };

  const handleCloseGymSessionAnalysisCard = useCallback(async () => {
    const shouldRefreshProgress = Boolean(gymSessionAnalysis?.result);
    setGymSessionAnalysis(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    if (!shouldRefreshProgress) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 220);
    });
    await refreshDashboard({ preserveOnError: true });
  }, [gymSessionAnalysis?.result, refreshDashboard]);

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
      "Auto-support is enabled for future trigger evaluations. This week's request remains suppressed and will not backfill.",
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
      Alert.alert("Couldn't enable phone nudges", result.error);
      return;
    }
    if (!result.success) {
      return;
    }

    Alert.alert("Phone nudges enabled", "You'll receive private behind-goal reminders.");
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
              showConsistencyMenu={showConsistencyMenu}
              onToggleConsistencyMenu={toggleConsistencyMenu}
              consistencyDaysWithWeighIns={consistency.daysWithWeighIns}
              consistencyTotalDays={consistency.totalDays}
              consistencyPercent={consistency.percent}
              onPressWeighIn={() => navigation.navigate("LogWeighIn")}
              gymCompleted={verifiedGymSessions}
              gymTarget={weeklyGymTarget}
              gymWeekLabel={gymWeekLabel}
              onLogSession={() => {
                if (!canStartGymSessionCapture) {
                  return;
                }
                setShowInlineGymCapture(true);
              }}
              onSetupGym={() => navigation.navigate("GymSettings")}
              logSessionEnabled={canStartGymSessionCapture}
              gymLastStatus={todayGymSession?.status}
              gymLastStatusReason={todayGymSession?.statusReason ?? null}
              validationRequestStatus={todayGymValidationStatus}
              requestValidationLoading={requestingGymValidation}
              gymLastDistanceMeters={todayGymSession?.distanceMeters ?? null}
              preferredUnit={unit}
              onRequestValidation={
                todayGymSession?.status === "provisional"
                  ? () => setShowValidationNoteModal(true)
                  : undefined
              }
              onRetry={
                todayGymSession?.status === "provisional"
                  ? () => setShowInlineGymCapture(true)
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
                    activeOpacity={canStartGymSessionCapture || !hasGymLocation ? 0.8 : 1}
                    onPress={() =>
                      !hasGymLocation
                        ? navigation.navigate("GymSettings")
                        : canStartGymSessionCapture
                        ? setShowInlineGymCapture(true)
                        : undefined
                    }
                    disabled={hasGymLocation && !canStartGymSessionCapture}
                    className="flex-row items-center px-4 py-4"
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          hasGymLocation && !canStartGymSessionCapture
                            ? "text-neutral-500"
                            : "text-white"
                        }`}
                      >
                        {!hasGymLocation
                          ? "Set gym location"
                          : canStartGymSessionCapture
                            ? "Add gym session"
                            : "Gym session logged"}
                      </Text>
                    </View>
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        hasGymLocation && !canStartGymSessionCapture
                          ? "bg-neutral-900"
                          : "bg-neutral-800"
                      }`}
                    >
                      <Ionicons
                        name={hasGymLocation && !canStartGymSessionCapture ? "checkmark" : "add"}
                        size={16}
                        color={hasGymLocation && !canStartGymSessionCapture ? "#a3a3a3" : "#ffffff"}
                      />
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            {isGymFlowActive ? (
              <View onLayout={handleGymFlowCardLayout}>
                {showInlineGymCapture ? (
                  <InlineGymSessionCaptureCard
                    cardHeight={gymFlowCardHeight}
                    onCancel={() => setShowInlineGymCapture(false)}
                    onSaved={({ photoUri }) => {
                      setShowInlineGymCapture(false);
                      startGymSessionAnalysis(photoUri);
                    }}
                    onSaveFailed={() => {
                      setGymSessionAnalysis(null);
                      setShowInlineGymCapture(true);
                    }}
                    onSaveResolved={({ sessionId, status, statusReason, distanceMeters }) => {
                      resolveGymSessionAnalysis(
                        sessionId,
                        status,
                        statusReason,
                        distanceMeters,
                      );
                    }}
                  />
                ) : null}

                {!showInlineGymCapture && gymSessionAnalysis ? (
                  <GymSessionAnalyzingCard
                    cardHeight={gymFlowCardHeight}
                    photoUri={gymSessionAnalysis.photoUri}
                    progress={gymSessionAnalysis.progress}
                    phase={gymSessionAnalysis.result?.phase ?? "analyzing"}
                    reason={gymSessionAnalysis.result?.reason ?? null}
                    showCloseFriendValidation={
                      gymSessionAnalysis.result?.canRequestCloseFriendValidation ?? false
                    }
                    validationRequesting={requestingCloseFriendValidation}
                    validationRequested={gymSessionAnalysis.result?.validationRequested ?? false}
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
        visible={showValidationNoteModal}
        note={validationNote}
        requesting={requestingGymValidation}
        onClose={() => setShowValidationNoteModal(false)}
        onChangeNote={setValidationNote}
        onSubmit={handleRequestGymValidation}
      />
    </AppScreen>
  );
}
