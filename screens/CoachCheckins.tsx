import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import CoachWorkspaceLocked from "../components/coaches/CoachWorkspaceLocked";
import CheckinHeader from "../components/coaches/checkins/CheckinHeader";
import CurrentWeekCard from "../components/coaches/checkins/CurrentWeekCard";
import CheckinForm from "../components/coaches/checkins/CheckinForm";
import HistoryList from "../components/coaches/checkins/HistoryList";
import CheckinSnapshotDetails from "../components/coaches/checkins/CheckinSnapshotDetails";
import CoachAdjustmentsCard from "../components/coaches/checkins/CoachAdjustmentsCard";
import OptionPill from "../components/ui/OptionPill";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SkeletonBlock from "../components/ui/SkeletonBlock";
import {
  buildCoachFunnelWeeklyIdempotencyKey,
  trackCoachFunnelEvent,
  useCoach,
  useCoachAccessGate,
  useCoachCheckins,
} from "../lib/features/coaches";
import type {
  CoachSpecialization,
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinDifficulty,
  WeeklyCheckinRating,
  WeeklyCheckinTrend,
} from "../lib/features/coaches";
import { formatShortDate } from "../lib/utils/metrics";
import { formatWeight } from "../lib/utils/weight";
import type { RootStackParamList } from "../lib/navigation/types";
import { useCoachRenderDiagnostics } from "../lib/features/coaches";
import AppScreen from "../components/ui/AppScreen";

type ScreenProps = NativeStackScreenProps<RootStackParamList, "CoachCheckins">;
type BannerTone = "info" | "success" | "error";
const FOCUS_REFRESH_STALE_MS = 30_000;

const SINGLE_LINE_INPUT_STYLE = {
  includeFontPadding: false,
  fontSize: 16,
  paddingTop: 0,
  paddingBottom: 0,
  height: 48,
};

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

function clampAdherence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseAdherence(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return clampAdherence(parsed);
}

function optionButtonClass(selected: boolean) {
  return selected
    ? "border-violet-400 bg-violet-500/20"
    : "border-neutral-700 bg-neutral-900";
}

function SectionTitle({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) {
  return (
    <View>
      <Text className="text-sm font-semibold text-neutral-200">{title}</Text>
      {helper ? <Text className="mt-1 text-xs text-neutral-500">{helper}</Text> : null}
    </View>
  );
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

function CheckinOpenSkeleton() {
  return (
    <Card className="p-5">
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="h-4 w-20 rounded-full" />
        <SkeletonBlock className="h-4 w-28 rounded-full" />
      </View>
      <SkeletonBlock className="mt-2 h-3 w-5/6 rounded-full" />

      <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
        <SkeletonBlock className="h-3 w-20 rounded-full" />
        <View className="mt-2 flex-row gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </View>
      </View>

      <View className="mt-5">
        <SkeletonBlock className="h-3 w-36 rounded-full" />
        <SkeletonBlock className="mt-3 h-12 w-full rounded-xl" />
      </View>

      <View className="mt-4">
        <SkeletonBlock className="h-3 w-28 rounded-full" />
        <SkeletonBlock className="mt-3 h-12 w-full rounded-xl" />
      </View>

      <View className="mt-5">
        <SkeletonBlock className="h-3 w-32 rounded-full" />
        <View className="mt-3 flex-row gap-2">
          <SkeletonBlock className="h-10 flex-1 rounded-xl" />
          <SkeletonBlock className="h-10 flex-1 rounded-xl" />
          <SkeletonBlock className="h-10 flex-1 rounded-xl" />
        </View>
      </View>

      <SkeletonBlock className="mt-5 h-12 w-full rounded-xl" />
    </Card>
  );
}

function CheckinClosedSkeleton() {
  return (
    <Card className="p-5">
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="h-4 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-28 rounded-full" />
      </View>
      <SkeletonBlock className="mt-2 h-3 w-5/6 rounded-full" />

      <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
        <SkeletonBlock className="h-3 w-20 rounded-full" />
        <View className="mt-2 flex-row gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </View>
      </View>

      <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3">
        <SkeletonBlock className="h-3 w-2/3 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-1/2 rounded-full" />
      </View>
    </Card>
  );
}

function RatingPicker({
  value,
  onChange,
  labels,
  disabled = false,
}: {
  value: WeeklyCheckinRating;
  onChange: (next: WeeklyCheckinRating) => void;
  labels: [string, string, string, string, string];
  disabled?: boolean;
}) {
  const values: WeeklyCheckinRating[] = [1, 2, 3, 4, 5];
  const { width } = useWindowDimensions();
  const compactLayout = width < 390;

  return (
    <View className="mt-3 flex-row flex-wrap justify-between gap-2">
      {values.map((entry, index) => {
        const selected = value === entry;
        return (
          <TouchableOpacity
            key={`${entry}-${labels[index]}`}
            activeOpacity={0.85}
            onPress={() => {
              if (disabled) return;
              onChange(entry);
            }}
            className={`h-12 items-center justify-center rounded-xl border px-2 ${optionButtonClass(selected)} ${
              disabled ? "opacity-60" : ""
            }`}
            style={{ width: compactLayout ? "31.5%" : "19%" }}
          >
            <Text
              className={`text-[11px] font-semibold ${
                selected ? "text-violet-100" : "text-neutral-300"
              }`}
            >
              {labels[index]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function YesNoPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="mt-3 flex-row gap-2">
      <TouchableOpacity
        disabled={disabled}
        activeOpacity={0.85}
        onPress={() => onChange(true)}
        className={`flex-1 rounded-xl border px-3 py-3 ${optionButtonClass(value)} ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <Text className={`text-center text-sm font-semibold ${value ? "text-violet-100" : "text-neutral-300"}`}>
          Yes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        activeOpacity={0.85}
        onPress={() => onChange(false)}
        className={`flex-1 rounded-xl border px-3 py-3 ${optionButtonClass(!value)} ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <Text className={`text-center text-sm font-semibold ${!value ? "text-violet-100" : "text-neutral-300"}`}>
          No
        </Text>
      </TouchableOpacity>
    </View>
  );
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

export default function CoachCheckins({ navigation, route }: ScreenProps) {
  const specialization: CoachSpecialization =
    route.params?.specialization ?? "nutrition";
  const scrollRef = useRef<ScrollView | null>(null);
  const lastFocusRefreshAtRef = useRef(0);
  const trackedOpenedWeekRef = useRef<string | null>(null);

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
    energy,
    setEnergy,
    adherencePercent,
    setAdherencePercent,
    blockers,
    setBlockers,
    currentWeightInputUnit,
    v2Form,
    updateV2Field,
    adjustmentRecommendations,
    coachMessage,
    guardrailNotes,
    isEditingCurrentWeek,
    hydrateCheckins,
    submitCheckin,
    clearSaveSuccessMessage,
  } = useCoachCheckins({
    coach,
    hydrated: isPro ? hydrated : false,
    userTier: membershipTier,
    onTierRequired: lockToFreeTier,
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCurrentWeekDetailsOpen, setIsCurrentWeekDetailsOpen] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

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

  const hasCurrentWeekCheckin = useMemo(
    () => Boolean(isEditingCurrentWeek || history.some((item) => item.weekStart === weekStart)),
    [history, isEditingCurrentWeek, weekStart]
  );
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
  const onToggleForm = useCallback(() => {
    setIsFormOpen((current) => !current);
  }, []);
  const onOpenForm = useCallback(() => {
    setIsFormOpen(true);
    setIsCurrentWeekDetailsOpen(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, []);
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

  useCoachRenderDiagnostics("CoachCheckinsScreen", {
    specialization,
    coach: coach ? `${coach.gender}:${coach.personality}` : "none",
    historyLoading,
    refreshing,
    saving,
    history: history.length,
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

  const adherenceValue = parseAdherence(adherencePercent);
  const hasLoadedSnapshot = Boolean(
    weekStart.length ||
    weekEnd.length ||
    currentCheckin ||
    history.length
  );
  const showCheckinAreaSkeleton = historyLoading && !hasLoadedSnapshot;
  const showOpenSkeleton = isFormOpen;
  const showSavedCheckinPreview = !isFormOpen && Boolean(currentWeekCheckin);
  const showReviewUpdatedPlanCta = Boolean(planUpdatedForReview);
  const formToggleLabel = isFormOpen
    ? "Hide form"
    : hasCurrentWeekCheckin
      ? "Edit check-in"
      : "Open form";
  const showHeaderToggle = isFormOpen || !hasCurrentWeekCheckin;

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
        {planUpdateError ? (
          <StatusBanner
            tone="error"
            message={`Couldn't create an updated nutrition draft from this check-in. ${planUpdateError}`}
            className="mb-4"
          />
        ) : null}
        <CurrentWeekCard title="This week">
        {showCheckinAreaSkeleton ? (
          showOpenSkeleton ? <CheckinOpenSkeleton /> : <CheckinClosedSkeleton />
        ) : showSavedCheckinPreview && currentWeekCheckin ? (
          <Card className="overflow-hidden border-neutral-700 p-0">
            <View className="h-1 bg-violet-400/70" />
            <View className="p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                    Last weekly check-in
                  </Text>
                  <Text className="text-sm font-semibold text-white">
                    {weekRangeLabel(currentWeekCheckin.weekStart, currentWeekCheckin.weekEnd)}
                  </Text>
                  <View className="mt-0.5 flex-row items-center gap-1.5">
                    <Ionicons name="time-outline" size={12} color="#737373" />
                    <Text className="text-xs text-neutral-500">
                      Updated {formatUpdatedAt(currentWeekCheckin.updatedAt)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-emerald-200">
                      Completed
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsCurrentWeekDetailsOpen((current) => !current)}
                    disabled={saving}
                    activeOpacity={0.85}
                    className={`rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 ${
                      saving ? "opacity-60" : ""
                    }`}
                  >
                    <Text className="text-[11px] font-semibold text-neutral-200">
                      {isCurrentWeekDetailsOpen ? "Hide details" : "View details"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onOpenForm}
                    disabled={saving}
                    activeOpacity={0.85}
                    className={`rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 ${
                      saving ? "opacity-60" : ""
                    }`}
                  >
                    <Text className="text-[11px] font-semibold text-neutral-200">Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!isCurrentWeekDetailsOpen && currentWeekSummaryPreview ? (
                <View className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5">
                  <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-violet-200">
                    Coach summary
                  </Text>
                  <Text className="mt-1 text-xs leading-relaxed text-violet-100/95">
                    {currentWeekSummaryPreview}
                  </Text>
                </View>
              ) : null}

              {showReviewUpdatedPlanCta ? (
                <View className="mt-3 rounded-xl border border-fuchsia-400/60 bg-fuchsia-500/20 px-3 py-2.5">
                  <View className="flex-row items-center justify-between gap-2">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-1.5 w-1.5 rounded-full bg-fuchsia-200" />
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-fuchsia-100">
                          Updated plan pending approval
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-xs text-fuchsia-50">
                        Review your nutrition draft from this check-in.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onReviewUpdatedPlan}
                      activeOpacity={0.85}
                      className="rounded-full border border-fuchsia-200/70 bg-fuchsia-400/35 px-2.5 py-1"
                    >
                      <View className="flex-row items-center gap-1">
                        <Text className="text-[11px] font-semibold text-white">Review</Text>
                        <Ionicons name="arrow-forward" size={12} color="#ffffff" />
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
            </View>
          </Card>
        ) : (
          <CheckinForm>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-sm font-semibold text-neutral-400">This week</Text>
                <Text className="text-xs font-semibold text-neutral-500">
                  {weekRangeLabel(weekStart, weekEnd)}
                </Text>
              </View>
            </View>
            {showHeaderToggle ? (
              <TouchableOpacity
                onPress={onToggleForm}
                disabled={saving}
                activeOpacity={0.85}
                className={`rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 ${
                  saving ? "opacity-60" : ""
                }`}
              >
                <Text className="text-xs font-semibold text-neutral-200">{formToggleLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditingCurrentWeek && isFormOpen ? (
            <View className="mt-3 self-start rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-violet-200">
                Editing saved check-in
              </Text>
            </View>
          ) : null}

          <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                Weight trend
              </Text>
              <Text className={`text-xs font-semibold ${trendColorClass(weightSnapshot.trend)}`}>
                {trendLabel(weightSnapshot.trend)}
              </Text>
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              <View className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1">
                <Text className="text-xs text-neutral-300">
                  Start{" "}
                  <Text className="font-semibold text-neutral-100">
                    {weightSnapshot.startWeight === null
                      ? "-"
                      : formatWeight(weightSnapshot.startWeight, weightSnapshot.unit)}
                  </Text>
                </Text>
              </View>
              <View className="rounded-full border border-neutral-700 bg-neutral-950 px-2.5 py-1">
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
          </View>

          {isFormOpen ? (
            <>
              <View className="mt-5">
            <SectionTitle title={`Current weight (${currentWeightInputUnit})`} />
            <TextInput
              className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
              value={v2Form.currentWeight}
              onChangeText={(value) => updateV2Field("currentWeight", value)}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              style={SINGLE_LINE_INPUT_STYLE}
              editable={!saving}
              placeholder="180"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Waist (cm, optional)" />
            <TextInput
              className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
              value={v2Form.waistCm}
              onChangeText={(value) => updateV2Field("waistCm", value)}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              style={SINGLE_LINE_INPUT_STYLE}
              editable={!saving}
              placeholder="Optional"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Progress photo prompted this week?" />
            <YesNoPicker
              value={v2Form.progressPhotoPrompted}
              onChange={(value) => updateV2Field("progressPhotoPrompted", value)}
              disabled={saving}
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Training difficulty" />
            <View className="mt-3 flex-row gap-2">
              {([
                ["too_easy", "Too easy"],
                ["right", "Right"],
                ["too_hard", "Too hard"],
              ] as [WeeklyCheckinDifficulty, string][]).map(([value, label]) => (
                <OptionPill
                  key={value}
                  label={label}
                  selected={v2Form.trainingDifficulty === value}
                  onPress={() => {
                    if (!saving) updateV2Field("trainingDifficulty", value);
                  }}
                />
              ))}
            </View>
              </View>

              <View className="mt-5">
            <SectionTitle title="Energy (1-5)" />
            <RatingPicker
              value={energy as WeeklyCheckinRating}
              onChange={(value) => setEnergy(value)}
              labels={["1", "2", "3", "4", "5"]}
              disabled={saving}
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Recovery (1-5)" />
            <RatingPicker
              value={v2Form.recoveryRating}
              onChange={(value) => updateV2Field("recoveryRating", value)}
              labels={["1", "2", "3", "4", "5"]}
              disabled={saving}
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Nutrition adherence (%)" />
            <View className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-neutral-100">Adherence</Text>
                <Text className="text-sm font-semibold text-neutral-100">{adherenceValue}%</Text>
              </View>
              <Slider
                style={{ marginTop: 8 }}
                value={adherenceValue}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onValueChange={(value) => setAdherencePercent(String(clampAdherence(value)))}
                minimumTrackTintColor="#a78bfa"
                maximumTrackTintColor="#404040"
                thumbTintColor="#c4b5fd"
                disabled={saving}
              />
            </View>
            <View className="mt-3 flex-row gap-2">
              {([
                ["low", "Low"],
                ["medium", "Medium"],
                ["high", "High"],
              ] as [WeeklyCheckinAdherenceSubjective, string][]).map(([value, label]) => (
                <OptionPill
                  key={value}
                  label={label}
                  selected={v2Form.nutritionAdherenceSubjective === value}
                  onPress={() => {
                    if (!saving) updateV2Field("nutritionAdherenceSubjective", value);
                  }}
                />
              ))}
            </View>
              </View>

              <View className="mt-5">
            <SectionTitle title="Sleep average hours" />
            <TextInput
              className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
              value={v2Form.sleepAvgHours}
              onChangeText={(value) => updateV2Field("sleepAvgHours", value)}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              style={SINGLE_LINE_INPUT_STYLE}
              editable={!saving}
              placeholder="7"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Sleep quality (1-5)" />
            <RatingPicker
              value={v2Form.sleepQuality}
              onChange={(value) => updateV2Field("sleepQuality", value)}
              labels={["1", "2", "3", "4", "5"]}
              disabled={saving}
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Stress level (1-5)" />
            <RatingPicker
              value={v2Form.stressLevel}
              onChange={(value) => updateV2Field("stressLevel", value)}
              labels={["1", "2", "3", "4", "5"]}
              disabled={saving}
            />
              </View>

              <View className="mt-5">
            <SectionTitle title="Goal progress / Strength PRs" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={v2Form.strengthPRs}
              onChangeText={(value) => updateV2Field("strengthPRs", value)}
              multiline
              editable={!saving}
              placeholder="How did goal progress look this week?"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Consistency notes" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={v2Form.consistencyNotes}
              onChangeText={(value) => updateV2Field("consistencyNotes", value)}
              multiline
              editable={!saving}
              placeholder="How consistent were you?"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Body composition changes" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={v2Form.bodyCompChanges}
              onChangeText={(value) => updateV2Field("bodyCompChanges", value)}
              multiline
              editable={!saving}
              placeholder="Optional changes you noticed"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Appetite and cravings" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={v2Form.appetiteCravings}
              onChangeText={(value) => updateV2Field("appetiteCravings", value)}
              multiline
              editable={!saving}
              placeholder="How were cravings/appetite?"
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Schedule constraints next week" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={v2Form.scheduleConstraintsNextWeek}
              onChangeText={(value) => updateV2Field("scheduleConstraintsNextWeek", value)}
              multiline
              editable={!saving}
              placeholder="Travel, work, events, etc."
              placeholderTextColor="#525252"
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Any pain or injury concerns?" />
            <YesNoPicker
              value={v2Form.injuryHasPain}
              onChange={(value) => updateV2Field("injuryHasPain", value)}
              disabled={saving}
            />
            {v2Form.injuryHasPain ? (
              <TextInput
                className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
                value={v2Form.injuryDetails}
                onChangeText={(value) => updateV2Field("injuryDetails", value)}
                multiline
                editable={!saving}
                placeholder="Where and when does it hurt?"
                placeholderTextColor="#525252"
              />
            ) : null}
              </View>

              <View className="mt-4">
            <SectionTitle title="Any red-flag pain symptoms?" helper="Sharp worsening pain, numbness, or concerning symptoms." />
            <YesNoPicker
              value={v2Form.injuryRedFlags}
              onChange={(value) => updateV2Field("injuryRedFlags", value)}
              disabled={saving}
            />
              </View>

              <View className="mt-4">
            <SectionTitle title="Other blockers (optional)" />
            <TextInput
              className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
              value={blockers}
              onChangeText={setBlockers}
              multiline
              editable={!saving}
              placeholder="Anything else to flag for this week"
              placeholderTextColor="#525252"
              maxLength={500}
            />
              </View>

              {saveSuccessMessage ? (
                <>
                  <StatusBanner tone="success" message={saveSuccessMessage} className="mt-4" />
                  {showReviewUpdatedPlanCta ? (
                    <TouchableOpacity
                      onPress={onReviewUpdatedPlan}
                      activeOpacity={0.85}
                      className="mt-3 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-violet-100">
                          Review updated nutrition plan
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#ddd6fe" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                      <Text className="text-xs text-neutral-400">
                        No new nutrition draft was created from this check-in edit.
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
              {validationMessage ? (
            <StatusBanner tone="error" message={validationMessage} className="mt-3" />
              ) : null}
              {saveError ? (
            <StatusBanner tone="error" message={saveError} className="mt-2" />
              ) : null}

              <Button
            className="mt-5"
            title={saving ? "Saving..." : isEditingCurrentWeek ? "Update weekly check-in" : "Save weekly check-in"}
            loading={saving}
            disabled={saving}
            onPress={() => {
              void (async () => {
                const result = await submitCheckin();
                if (result.saved) {
                  setIsFormOpen(false);
                  setIsCurrentWeekDetailsOpen(false);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollTo({ y: 0, animated: true });
                    });
                  });
                }
              })();
            }}
              />

              {saveSuccessMessage ? (
            <TouchableOpacity
              onPress={clearSaveSuccessMessage}
              activeOpacity={0.8}
              className="mt-3 self-center"
            >
              <Text className="text-xs font-semibold text-neutral-400">Dismiss success message</Text>
            </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3">
              <Text className="text-sm font-semibold text-neutral-200">
                Weekly check-in form is collapsed.
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">
                Open the form when you are ready to submit this week’s check-in.
              </Text>
            </View>
          )}
          </CheckinForm>
        )}
        </CurrentWeekCard>

        <HistoryList
          refreshing={refreshing}
          onRefresh={() => {
            if (!saving) void hydrateCheckins();
          }}
          disabled={saving}
          empty={!pastHistory.length}
        >
          {pastHistory.map((item) => {
            const isExpanded = Boolean(expandedHistoryIds[item.id]);
            const summaryPreview = truncatePreviewText(item.coachSummary?.trim() ?? null, 100);

            if (!isExpanded) {
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleHistoryCard(item.id)}
                  activeOpacity={0.9}
                >
                  <Card className="mb-3 overflow-hidden border-neutral-700 p-0">
                    <View className="h-1 bg-neutral-700" />
                    <View className="p-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-white">
                            {weekRangeLabel(item.weekStart, item.weekEnd)}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-1.5">
                            <Ionicons name="time-outline" size={12} color="#737373" />
                            <Text className="text-xs text-neutral-500">
                              Updated {formatUpdatedAt(item.updatedAt)}
                            </Text>
                          </View>
                        </View>
                        <View className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2.5 py-1">
                          <Text className="text-[11px] font-semibold text-violet-100">
                            View details
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1">
                          <Text className="text-[11px] text-neutral-300">
                            Adherence{" "}
                            <Text className="font-semibold text-neutral-100">{item.adherencePercent}%</Text>
                          </Text>
                        </View>
                        <View className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1">
                          <Text className="text-[11px] text-neutral-300">
                            Score{" "}
                            <Text className="font-semibold text-neutral-100">
                              {item.adherenceScore ?? item.adherencePercent}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      {summaryPreview ? (
                        <View className="mt-2.5 rounded-xl border border-violet-500/20 bg-violet-500/8 px-3 py-2.5">
                          <Text className="text-[10px] font-semibold uppercase tracking-[0.8px] text-violet-200">
                            Coach summary
                          </Text>
                          <Text className="mt-1 text-xs leading-relaxed text-violet-100/90">
                            {summaryPreview}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }

            return (
              <Card key={item.id} className="mb-3 overflow-hidden border-neutral-700 p-0">
                <View className="h-1 bg-violet-400/70" />
                <View className="p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white">
                        {weekRangeLabel(item.weekStart, item.weekEnd)}
                      </Text>
                      <View className="mt-0.5 flex-row items-center gap-1.5">
                        <Ionicons name="time-outline" size={12} color="#737373" />
                        <Text className="text-xs text-neutral-500">
                          Updated {formatUpdatedAt(item.updatedAt)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleHistoryCard(item.id)}
                      activeOpacity={0.85}
                      className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2.5 py-1"
                    >
                      <Text className="text-[11px] font-semibold text-violet-100">
                        Hide details
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <CheckinSnapshotDetails checkin={item} />
                </View>
              </Card>
            );
          })}
        </HistoryList>
      </ScrollView>
    </AppScreen>
  );
}
