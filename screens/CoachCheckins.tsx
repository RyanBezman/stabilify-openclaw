import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CoachFlowProgressOverlay from "../components/coaches/flow/CoachFlowProgressOverlay";
import CoachFlowTopBar from "../components/coaches/flow/CoachFlowTopBar";
import CheckinWizardStepContent from "../components/coaches/checkins/CheckinWizardStepContent";
import CoachWorkspaceLocked from "../components/coaches/CoachWorkspaceLocked";
import CheckinHeader from "../components/coaches/checkins/CheckinHeader";
import CurrentWeekCard from "../components/coaches/checkins/CurrentWeekCard";
import HistoryList from "../components/coaches/checkins/HistoryList";
import CheckinSnapshotDetails from "../components/coaches/checkins/CheckinSnapshotDetails";
import CoachAdjustmentsCard from "../components/coaches/checkins/CoachAdjustmentsCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SkeletonBlock from "../components/ui/SkeletonBlock";
import {
  buildCoachFunnelWeeklyIdempotencyKey,
  trackCoachFunnelEvent,
  useCoach,
  useCoachAccessGate,
  useCoachCheckins,
  useCoachRenderDiagnostics,
} from "../lib/features/coaches";
import { useCoachCheckinFlow } from "../lib/features/coaches/hooks/useCoachCheckinFlow";
import type { WeightUnit } from "../lib/data/types";
import type { CoachSpecialization, WeeklyCheckinTrend } from "../lib/features/coaches";
import { formatShortDate } from "../lib/utils/metrics";
import { formatWeight } from "../lib/utils/weight";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";

type ScreenProps = NativeStackScreenProps<RootStackParamList, "CoachCheckins">;
type BannerTone = "info" | "success" | "error";

const FOCUS_REFRESH_STALE_MS = 30_000;
const CHECKIN_SUBMIT_PHASES = [
  "Saving your weekly check-in",
  "Reviewing coach adjustments",
  "Refreshing your latest summary",
] as const;
const CHECKIN_LOADING_TIPS = [
  "We’re turning this week’s answers into a tighter coaching recap.",
  "Your coach is checking whether the nutrition draft needs an update.",
  "Finalizing your latest weekly summary and review state.",
] as const;
const CHECKIN_SUBMIT_PROGRESS_TARGETS = [28, 61, 92] as const;

function weekRangeLabel(weekStart: string, weekEnd: string) {
  if (!weekStart || !weekEnd) return "This week";
  return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
}

function trendLabel(trend: WeeklyCheckinTrend) {
  if (trend === "down") return "Down";
  if (trend === "up") return "Up";
  if (trend === "flat") return "Flat";
  return "No data";
}

function trendColorClass(trend: WeeklyCheckinTrend) {
  if (trend === "down") return "text-emerald-300";
  if (trend === "up") return "text-amber-300";
  if (trend === "flat") return "text-neutral-200";
  return "text-neutral-400";
}

function formatUpdatedAt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

function truncatePreviewText(value: string | null, maxLength = 120) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function StatusBanner({
  tone,
  message,
  className = "",
  loading = false,
}: {
  tone: BannerTone;
  message: string;
  className?: string;
  loading?: boolean;
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-500/35 bg-rose-950/30"
      : tone === "success"
        ? "border-emerald-500/35 bg-emerald-950/35"
        : "border-neutral-700 bg-neutral-900/70";
  const textColor =
    tone === "error"
      ? "#fda4af"
      : tone === "success"
        ? "#86efac"
        : "#d4d4d4";
  const iconName: keyof typeof Ionicons.glyphMap =
    tone === "error"
      ? "alert-circle"
      : tone === "success"
        ? "checkmark-circle"
        : "information-circle";

  return (
    <View className={`rounded-xl border px-3 py-3 ${toneClasses} ${className}`}>
      <View className="flex-row items-start gap-2">
        {loading ? (
          <ActivityIndicator size="small" color={textColor} className="mt-0.5" />
        ) : (
          <Ionicons name={iconName} size={16} color={textColor} style={{ marginTop: 2 }} />
        )}
        <Text className="flex-1 text-sm font-semibold" style={{ color: textColor }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function CurrentWeekSkeleton() {
  return (
    <Card variant="subtle" className="p-5">
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="h-4 w-20 rounded-full" />
        <SkeletonBlock className="h-4 w-28 rounded-full" />
      </View>
      <SkeletonBlock className="mt-2 h-3 w-5/6 rounded-full" />

      <View className="mt-4 flex-row gap-3">
        <SkeletonBlock className="h-16 flex-1 rounded-2xl" />
        <SkeletonBlock className="h-16 flex-1 rounded-2xl" />
      </View>

      <SkeletonBlock className="mt-4 h-16 rounded-2xl" />
    </Card>
  );
}

function CurrentWeekEntryCard({
  weekStart,
  weekEnd,
  weightSnapshot,
  onOpenWizard,
  disabled,
}: {
  weekStart: string;
  weekEnd: string;
  weightSnapshot: {
    startWeight: number | null;
    endWeight: number | null;
    unit: WeightUnit;
    trend: WeeklyCheckinTrend;
  };
  onOpenWizard: () => void;
  disabled: boolean;
}) {
  return (
    <Card variant="subtle" className="p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
            Weekly window
          </Text>
          <Text className="mt-1 text-base font-semibold text-white">
            {weekRangeLabel(weekStart, weekEnd)}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-neutral-300">
            Short guided flow. One step at a time, then a final review before you submit.
          </Text>
        </View>
        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-neutral-300">
            3-5 min
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row flex-wrap gap-2">
        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2">
          <Text className="text-xs text-neutral-300">
            Trend{" "}
            <Text className={`font-semibold ${trendColorClass(weightSnapshot.trend)}`}>
              {trendLabel(weightSnapshot.trend)}
            </Text>
          </Text>
        </View>
        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2">
          <Text className="text-xs text-neutral-300">
            Start{" "}
            <Text className="font-semibold text-neutral-100">
              {weightSnapshot.startWeight === null
                ? "-"
                : formatWeight(weightSnapshot.startWeight, weightSnapshot.unit)}
            </Text>
          </Text>
        </View>
        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2">
          <Text className="text-xs text-neutral-300">
            End{" "}
            <Text className="font-semibold text-neutral-100">
              {weightSnapshot.endWeight === null
                ? "-"
                : formatWeight(weightSnapshot.endWeight, weightSnapshot.unit)}
            </Text>
          </Text>
        </View>
      </View>

      <Button
        className="mt-5"
        title="Open weekly check-in"
        onPress={onOpenWizard}
        disabled={disabled}
      />
    </Card>
  );
}

export default function CoachCheckins({ navigation, route }: ScreenProps) {
  const specialization: CoachSpecialization =
    route.params?.specialization ?? "nutrition";
  const scrollRef = useRef<ScrollView | null>(null);
  const lastFocusRefreshAtRef = useRef(0);
  const trackedOpenedWeekRef = useRef<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;
  const [submittingIndex, setSubmittingIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [submitSeconds, setSubmitSeconds] = useState(0);

  const { getActiveCoach, hydrated } = useCoach();
  const coach = getActiveCoach("nutrition");
  const {
    isPro,
    membershipTier,
    tierError,
    viewState,
    refreshMembershipTier,
    lockToFreeTier,
  } = useCoachAccessGate();

  const {
    historyLoading,
    refreshing,
    saving,
    syncError,
    saveError,
    validationMessage,
    saveSuccessMessage,
    weekStart,
    weekEnd,
    weightSnapshot,
    currentCheckin,
    history,
    planUpdatedForReview,
    planUpdateError,
    adherencePercent,
    setAdherencePercent,
    blockers,
    currentWeightInputUnit,
    v2Form,
    updateV2Field,
    adjustmentRecommendations,
    coachMessage,
    guardrailNotes,
    energy,
    setEnergy,
    hydrateCheckins,
    submitCheckin,
    clearSaveSuccessMessage,
  } = useCoachCheckins({
    coach,
    hydrated: isPro ? hydrated : false,
    userTier: membershipTier,
    onTierRequired: lockToFreeTier,
  });
  const [isCurrentWeekDetailsOpen, setIsCurrentWeekDetailsOpen] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  const flow = useCoachCheckinFlow({
    snapshot: {
      energy,
      adherencePercent,
      blockers,
      currentWeightInputUnit,
      v2Form,
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (!isPro) return;
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < FOCUS_REFRESH_STALE_MS) return;
      lastFocusRefreshAtRef.current = now;
      void hydrateCheckins();
    }, [hydrateCheckins, isPro])
  );

  useEffect(() => {
    if (!isPro || !coach || !weekStart) return;
    const idempotencyKey = buildCoachFunnelWeeklyIdempotencyKey({
      eventName: "checkin_opened",
      coach,
      weekStart,
    });
    if (!idempotencyKey || trackedOpenedWeekRef.current === idempotencyKey) return;
    trackedOpenedWeekRef.current = idempotencyKey;
    void trackCoachFunnelEvent({
      eventName: "checkin_opened",
      coach,
      userTier: membershipTier,
      weekStart,
      idempotencyKey,
      metadata: {
        screen: "CoachCheckins",
      },
    });
  }, [coach, isPro, membershipTier, weekStart]);

  useEffect(() => {
    if (flow.mode !== "wizard") return;
    fade.setValue(0);
    slide.setValue(18);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        stiffness: 180,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, flow.currentStep, flow.mode, scale, slide]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: flow.progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [flow.progress, progressAnim]);

  useEffect(() => {
    if (!(flow.mode === "wizard" && saving)) {
      setSubmittingIndex(0);
      setTipIndex(0);
      setSubmitSeconds(0);
      return;
    }

    const phaseInterval = setInterval(() => {
      setSubmittingIndex((current) =>
        current < CHECKIN_SUBMIT_PHASES.length - 1 ? current + 1 : current
      );
    }, 900);
    const tipInterval = setInterval(() => {
      setTipIndex((current) => (current + 1) % CHECKIN_LOADING_TIPS.length);
    }, 2400);
    const secondsInterval = setInterval(() => {
      setSubmitSeconds((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(tipInterval);
      clearInterval(secondsInterval);
    };
  }, [flow.mode, saving]);

  useEffect(() => {
    if (!(flow.mode === "wizard" && saving)) {
      loadingPulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      loadingPulse.setValue(0);
    };
  }, [flow.mode, loadingPulse, saving]);

  const currentWeekCheckin = useMemo(
    () =>
      currentCheckin && currentCheckin.weekStart === weekStart
        ? currentCheckin
        : history.find((item) => item.weekStart === weekStart) ?? null,
    [currentCheckin, history, weekStart]
  );
  const currentWeekAdjustmentRecommendations = useMemo(
    () => currentWeekCheckin?.adjustmentRecommendations ?? adjustmentRecommendations ?? null,
    [adjustmentRecommendations, currentWeekCheckin]
  );
  const currentWeekGuardrailNotes = useMemo(
    () =>
      currentWeekCheckin?.guardrailNotes?.length
        ? currentWeekCheckin.guardrailNotes
        : guardrailNotes,
    [currentWeekCheckin, guardrailNotes]
  );
  const currentWeekSummary = useMemo(() => {
    const summaryFromRow = currentWeekCheckin?.coachSummary?.trim();
    if (summaryFromRow) return summaryFromRow;
    const summaryFromItemMessage = currentWeekCheckin?.coachMessage?.summary?.trim();
    if (summaryFromItemMessage) return summaryFromItemMessage;
    const summaryFromPayloadMessage = coachMessage?.summary?.trim();
    return summaryFromPayloadMessage || null;
  }, [coachMessage, currentWeekCheckin]);
  const currentWeekSummaryPreview = useMemo(
    () => truncatePreviewText(currentWeekSummary, 120),
    [currentWeekSummary]
  );
  const pastHistory = useMemo(
    () => history.filter((item) => item.weekStart !== weekStart),
    [history, weekStart]
  );
  const showReviewUpdatedPlanCta = Boolean(planUpdatedForReview);
  const showCurrentWeekSkeleton = historyLoading && !(
    weekStart.length ||
    weekEnd.length ||
    currentCheckin ||
    history.length
  );
  const loadingProgressPct = Math.round(
    CHECKIN_SUBMIT_PROGRESS_TARGETS[submittingIndex]
      ?? CHECKIN_SUBMIT_PROGRESS_TARGETS[CHECKIN_SUBMIT_PROGRESS_TARGETS.length - 1]
  );
  const wizardSubmitTitle = currentWeekCheckin
    ? "Update weekly check-in"
    : "Submit weekly check-in";

  const openWizard = useCallback(() => {
      setIsCurrentWeekDetailsOpen(false);
      flow.openWizard();
    }, [flow]);

  const onReviewUpdatedPlan = useCallback(() => {
    if (coach) {
      const idempotencyKey = buildCoachFunnelWeeklyIdempotencyKey({
        eventName: "plan_review_opened",
        coach,
        weekStart,
      });
      void trackCoachFunnelEvent({
        eventName: "plan_review_opened",
        coach,
        userTier: membershipTier,
        weekStart,
        idempotencyKey,
        metadata: {
          source: "checkin_review_cta",
        },
      });
    }
    navigation.push("CoachWorkspace", {
      specialization: "nutrition",
      tab: "plan",
      openDraft: true,
      requirePlanFeedbackChoice: true,
      feedbackContext: "checkin_review_updated_plan",
    });
  }, [coach, membershipTier, navigation, weekStart]);

  const toggleHistoryCard = useCallback((id: string) => {
    setExpandedHistoryIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }, []);

  const handleWizardSubmit = useCallback(() => {
    void (async () => {
      const result = await submitCheckin();
      if (!result.saved) return;
      flow.resetAfterSuccessfulSubmit();
      setIsCurrentWeekDetailsOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
      });
    })();
  }, [flow, submitCheckin]);

  const handleWizardInputFocus = useCallback((target: number) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        target,
        180,
        true,
      );
    });
  }, []);

  useCoachRenderDiagnostics("CoachCheckinsScreen", {
    specialization,
    coach: coach ? `${coach.gender}:${coach.personality}` : "none",
    historyLoading,
    refreshing,
    saving,
    history: history.length,
    mode: flow.mode,
    step: flow.currentStep,
  });

  if (viewState === "gating") {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={840}>
        <CheckinHeader
          onBack={() => navigation.goBack()}
          title="Weekly check-in"
          subtitle={coach?.displayName}
        />
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color="#a3a3a3" />
          <Text className="mt-3 text-sm text-neutral-400">Loading weekly check-ins...</Text>
        </View>
      </AppScreen>
    );
  }

  if (viewState === "locked") {
    return (
      <CoachWorkspaceLocked
        coachName={coach?.displayName ?? null}
        error={tierError}
        onRetry={() => void refreshMembershipTier({ blocking: true })}
        onUpgrade={() => navigation.navigate("BillingPlans")}
        onBack={() => navigation.goBack()}
        onBrowseCoaches={() =>
          navigation.navigate("Authed", {
            screen: "Coaches",
            params: { specialization },
          })
        }
      />
    );
  }

  if (!coach) {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={840}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-neutral-200">
            Select a nutrition coach to start weekly check-ins.
          </Text>
          <Button
            className="mt-4"
            title="Back to Coaches"
            onPress={() =>
              navigation.navigate("Authed", {
                screen: "Coaches",
                params: { specialization: "nutrition" },
              })
            }
          />
        </View>
      </AppScreen>
    );
  }

  if (flow.mode === "wizard" && saving) {
    return (
      <AppScreen className="flex-1 bg-neutral-950 px-6" maxContentWidth={720}>
        <CoachFlowProgressOverlay
          title="Submitting your weekly check-in"
          subtitle="We’re saving this week’s recap and refreshing your latest coach summary."
          elapsedSeconds={submitSeconds}
          progressPct={loadingProgressPct}
          phases={CHECKIN_SUBMIT_PHASES}
          activePhaseIndex={submittingIndex}
          tips={CHECKIN_LOADING_TIPS}
          activeTipIndex={tipIndex}
          loadingPulse={loadingPulse}
        />
      </AppScreen>
    );
  }

  if (flow.mode === "wizard") {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <CoachFlowTopBar
            stepIndex={flow.stepIndex}
            totalSteps={flow.totalSteps}
            progressAnim={progressAnim}
            currentStepLabel={flow.isReviewStep ? "Review" : "Weekly check-in"}
            onBack={flow.back}
          />

          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 220,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{ opacity: fade, transform: [{ translateX: slide }, { scale }] }}
            >
              <View className="border-b border-neutral-900 pb-5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-neutral-500">
                  {flow.isReviewStep ? "Final step" : `Step ${flow.stepIndex + 1}`}
                </Text>
                <Text className="mt-2 text-[28px] font-bold tracking-tight text-white">
                  {flow.stepDefinition.title}
                </Text>
                {flow.stepDefinition.subtitle ? (
                  <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
                    {flow.stepDefinition.subtitle}
                  </Text>
                ) : null}
              </View>

              <View className="pt-6">
                <CheckinWizardStepContent
                  currentStep={flow.currentStep}
                  currentWeightInputUnit={currentWeightInputUnit}
                  energy={energy}
                  setEnergy={setEnergy}
                  adherencePercent={adherencePercent}
                  setAdherencePercent={setAdherencePercent}
                  v2Form={v2Form}
                  updateV2Field={updateV2Field}
                  saving={saving}
                  reviewSections={flow.reviewSections}
                  onEditStep={flow.goToStep}
                  onInputFocus={handleWizardInputFocus}
                />
              </View>

              {flow.validationError ? (
                <Text className="mt-3 text-sm font-semibold text-rose-300">
                  {flow.validationError}
                </Text>
              ) : null}
              {flow.isReviewStep && validationMessage ? (
                <StatusBanner tone="error" message={validationMessage} className="mt-4" />
              ) : null}
              {flow.isReviewStep && saveError ? (
                <StatusBanner tone="error" message={saveError} className="mt-3" />
              ) : null}
            </Animated.View>
          </ScrollView>

          <View className="border-t border-neutral-900 bg-neutral-950 px-5 pb-6 pt-4">
            <Button
              title={flow.isReviewStep ? wizardSubmitTitle : "Continue"}
              onPress={() => (flow.isReviewStep ? handleWizardSubmit() : flow.next())}
              disabled={!flow.canContinue || saving}
            />
          </View>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={840}>
      <CheckinHeader
        onBack={() => navigation.goBack()}
        title="Weekly check-in"
        subtitle={coach.displayName}
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-5 pb-40 pt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {syncError ? (
          <StatusBanner tone="error" message={syncError} className="mb-4" />
        ) : null}
        {refreshing && !historyLoading ? (
          <StatusBanner tone="info" message="Refreshing latest check-in..." className="mb-4" />
        ) : null}
        {saveSuccessMessage ? (
          <StatusBanner tone="success" message={saveSuccessMessage} className="mb-4" />
        ) : null}
        {planUpdateError ? (
          <StatusBanner
            tone="error"
            message={`Couldn't create an updated nutrition draft from this check-in. ${planUpdateError}`}
            className="mb-4"
          />
        ) : null}

        <CurrentWeekCard title="This week" helper="Your latest submission">
          {showCurrentWeekSkeleton ? (
            <CurrentWeekSkeleton />
          ) : currentWeekCheckin ? (
            <Card variant="subtle" className="overflow-hidden">
              <View className="px-5 py-5">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                      Current check-in
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-white">
                      {weekRangeLabel(currentWeekCheckin.weekStart, currentWeekCheckin.weekEnd)}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Ionicons name="time-outline" size={12} color="#737373" />
                      <Text className="text-sm text-neutral-500">
                        Updated {formatUpdatedAt(currentWeekCheckin.updatedAt)}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end gap-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-emerald-300">
                      Completed
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() =>
                          setIsCurrentWeekDetailsOpen((current) => !current)
                        }
                        activeOpacity={0.85}
                        className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5"
                      >
                        <Text className="text-sm font-semibold text-neutral-200">
                          {isCurrentWeekDetailsOpen ? "Hide details" : "View details"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openWizard()}
                        activeOpacity={0.85}
                        className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5"
                      >
                        <Text className="text-sm font-semibold text-violet-300">Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {!isCurrentWeekDetailsOpen && currentWeekSummaryPreview ? (
                <View className="border-t border-neutral-900 px-5 py-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                    Coach summary
                  </Text>
                  <Text className="mt-2 text-sm leading-relaxed text-neutral-200">
                    {currentWeekSummaryPreview}
                  </Text>
                </View>
              ) : null}

              {showReviewUpdatedPlanCta ? (
                <View className="border-t border-neutral-900 px-5 py-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-fuchsia-200">
                        Updated plan pending approval
                      </Text>
                      <Text className="mt-1 text-sm text-neutral-200">
                        Review your nutrition draft from this check-in.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onReviewUpdatedPlan}
                      activeOpacity={0.85}
                      className="py-1"
                    >
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm font-semibold text-fuchsia-200">Review</Text>
                        <Ionicons name="arrow-forward" size={14} color="#f5d0fe" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {isCurrentWeekDetailsOpen ? (
                <>
                  <CheckinSnapshotDetails
                    checkin={currentWeekCheckin}
                    summaryOverride={currentWeekSummary}
                  />

                  <CoachAdjustmentsCard
                    recommendations={currentWeekAdjustmentRecommendations}
                    guardrailNotes={currentWeekGuardrailNotes}
                  />
                </>
              ) : null}
            </Card>
          ) : (
            <CurrentWeekEntryCard
              weekStart={weekStart}
              weekEnd={weekEnd}
              weightSnapshot={weightSnapshot}
              onOpenWizard={() => openWizard()}
              disabled={saving}
            />
          )}
        </CurrentWeekCard>

        <HistoryList empty={!pastHistory.length}>
          {pastHistory.map((item) => {
            const isExpanded = Boolean(expandedHistoryIds[item.id]);
            const summaryPreview = truncatePreviewText(
              item.coachSummary?.trim() ?? null,
              100
            );
            const entryClassName = "overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/70";

            if (!isExpanded) {
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleHistoryCard(item.id)}
                  activeOpacity={0.9}
                  className={entryClassName}
                >
                  <View className="px-5 py-5">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                          Past check-in
                        </Text>
                        <Text className="mt-1 text-base font-semibold text-white">
                          {weekRangeLabel(item.weekStart, item.weekEnd)}
                        </Text>
                        <View className="mt-1 flex-row items-center gap-1.5">
                          <Ionicons name="time-outline" size={12} color="#737373" />
                          <Text className="text-sm text-neutral-500">
                            Updated {formatUpdatedAt(item.updatedAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5">
                        <Text className="text-sm font-semibold text-violet-300">
                          View details
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row gap-3">
                      <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                        <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                          Adherence
                        </Text>
                        <Text className="mt-1 text-lg font-semibold text-white">
                          {item.adherencePercent}%
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                        <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                          Score
                        </Text>
                        <Text className="mt-1 text-lg font-semibold text-violet-300">
                          {item.adherenceScore ?? item.adherencePercent}
                        </Text>
                      </View>
                    </View>

                    {summaryPreview ? (
                      <View className="mt-4 border-t border-neutral-900 pt-4">
                        <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                          Coach summary
                        </Text>
                        <Text className="mt-2 text-sm leading-relaxed text-neutral-200">
                          {summaryPreview}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <View key={item.id} className={`${entryClassName} border-violet-500/20`}>
                <View className="px-5 py-5">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                        Past check-in
                      </Text>
                      <Text className="mt-1 text-base font-semibold text-white">
                        {weekRangeLabel(item.weekStart, item.weekEnd)}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={12} color="#737373" />
                        <Text className="text-sm text-neutral-500">
                          Updated {formatUpdatedAt(item.updatedAt)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleHistoryCard(item.id)}
                      activeOpacity={0.85}
                      className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5"
                    >
                      <Text className="text-sm font-semibold text-violet-300">
                        Hide details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <CheckinSnapshotDetails checkin={item} />
              </View>
            );
          })}
        </HistoryList>

        {saveSuccessMessage ? (
          <TouchableOpacity
            onPress={clearSaveSuccessMessage}
            activeOpacity={0.8}
            className="mt-5 self-center"
          >
            <Text className="text-xs font-semibold text-neutral-400">
              Dismiss success message
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
