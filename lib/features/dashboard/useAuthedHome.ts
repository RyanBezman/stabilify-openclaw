import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Platform } from "react-native";
import {
  fetchAppleHealthDailyStepAverage,
  fetchAppleHealthTodayStepCount,
} from "../../data/appleHealth";
import { fetchDashboardData } from "../../data/dashboard";
import { fetchActionableNotificationCount } from "../../data/notifications";
import {
  fetchGymSessionValidationRequestForSession,
  requestGymSessionValidation,
  type GymSessionValidationRequest,
} from "../../data/gymSessionValidation";
import { getProfilePhotoSignedUrl } from "../profile";
import { getLocalTimeZone } from "../../utils/time";
import { signOutCurrentUser } from "../auth";
import {
  formatLocalDate,
  formatShortDate,
  getConsistencyWindow,
  getCurrentStreak,
} from "../../utils/metrics";
import type { ProfileSummary } from "../profile";
import {
  allowAutoSupportWithConsent,
  deferSupportNudge,
  fetchCurrentWeekSupportRequest,
  fetchHasActivePushNotificationDevice,
  markSupportNudgeOpened,
  setAutoSupportEnabled,
  type CurrentWeekSupportRequest,
} from "../../data/supportAutomation";
import {
  deriveSurfaceLoadState,
  registerCurrentPushDevice,
} from "../shared";
import {
  createStepSummary,
  resolveStepSummaryMode,
  type StepSummary,
} from "./models/stepSummary";

export type HomeConsistencyOption = {
  id: string;
  label: string;
  days: number;
};

const CONSISTENCY_OPTIONS: HomeConsistencyOption[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "1m", label: "Last month", days: 30 },
  { id: "3m", label: "Last 3 months", days: 90 },
  { id: "6m", label: "Last 6 months", days: 180 },
  { id: "1y", label: "Last year", days: 365 },
];
const DEFAULT_DAILY_STEP_TARGET = 10000;

type DashboardState = Awaited<ReturnType<typeof fetchDashboardData>>["data"] | null;

export type AuthedHomeUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
};

type SupportActionResult = {
  success: boolean;
  error?: string;
};

export type SupportNudgeDisplayVariant =
  | "suppressed_prompt"
  | "suppressed_acknowledged"
  | "disabled"
  | "published";

export function useAuthedHome(user?: AuthedHomeUser | null) {
  const [blockingLoad, setBlockingLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [todayGymValidationRequest, setTodayGymValidationRequest] =
    useState<GymSessionValidationRequest | null>(null);
  const [requestingGymValidation, setRequestingGymValidation] = useState(false);
  const [supportRequest, setSupportRequest] = useState<CurrentWeekSupportRequest | null>(null);
  const [phoneNudgesEnabled, setPhoneNudgesEnabled] = useState(false);
  const [supportActionBusy, setSupportActionBusy] = useState(false);
  const [enablingPhoneNudges, setEnablingPhoneNudges] = useState(false);
  const supportActionBusyRef = useRef(false);
  const [consistencyOption, setConsistencyOption] = useState(
    CONSISTENCY_OPTIONS[0],
  );
  const [showConsistencyMenu, setShowConsistencyMenu] = useState(false);
  const [stepValue, setStepValue] = useState<number | null>(null);
  const [loadingStepSummary, setLoadingStepSummary] = useState(false);
  const hasUsableSnapshot = dashboard !== null;
  const loadRequestIdRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const focusRefreshRef = useRef<() => Promise<void>>(async () => {});
  const stepRequestIdRef = useRef(0);

  const loadDashboardSurface = useCallback(
    async (options?: {
      mode?: "blocking" | "refresh";
      preserveOnError?: boolean;
    }): Promise<{ error?: string }> => {
      const mode = options?.mode ?? (hasUsableSnapshot ? "refresh" : "blocking");
      if (loadInFlightRef.current && mode === "refresh") {
        return {};
      }

      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      loadInFlightRef.current = true;
      if (mode === "blocking" || !hasUsableSnapshot) {
        setBlockingLoad(true);
        setRefreshing(false);
      } else {
        setRefreshing(true);
      }
      try {
        const [dashboardResult, notificationCountResult, supportResult, pushDeviceResult] =
          await Promise.all([
            fetchDashboardData(user?.id),
            fetchActionableNotificationCount(user?.id),
            fetchCurrentWeekSupportRequest(),
            fetchHasActivePushNotificationDevice(user?.id),
          ]);

        if (requestId !== loadRequestIdRef.current) {
          return {};
        }

        if (!notificationCountResult?.error) {
          setNotificationCount(notificationCountResult?.data?.count ?? 0);
        } else if (!hasUsableSnapshot) {
          setNotificationCount(0);
        }

        if (!supportResult?.error) {
          setSupportRequest(supportResult?.data ?? null);
        } else if (!hasUsableSnapshot) {
          setSupportRequest(null);
        }

        if (!pushDeviceResult?.error) {
          setPhoneNudgesEnabled(pushDeviceResult?.data?.hasActiveDevice ?? false);
        } else if (!hasUsableSnapshot) {
          setPhoneNudgesEnabled(false);
        }

        const { data, error } = dashboardResult;
        if (error) {
          setDashboardError(error);
          if (!options?.preserveOnError && !hasUsableSnapshot) {
            setDashboard(null);
            setProfilePhotoUrl(null);
            setTodayGymValidationRequest(null);
          }
          return { error };
        }

        setDashboardError(null);
        const nextDashboard = data ?? null;
        setDashboard(nextDashboard);

        const avatarPath = nextDashboard?.profile?.avatarPath ?? null;
        if (!avatarPath) {
          setProfilePhotoUrl(null);
        } else {
          const signedRes = await getProfilePhotoSignedUrl(avatarPath);
          if (requestId !== loadRequestIdRef.current) {
            return {};
          }
          setProfilePhotoUrl(
            signedRes.error || !signedRes.data?.signedUrl ? null : signedRes.data.signedUrl,
          );
        }

        const timeZoneForToday = nextDashboard?.profile?.timezone ?? getLocalTimeZone();
        const todaySessionDate = formatLocalDate(new Date(), timeZoneForToday);
        const todaySession = nextDashboard?.gymSessions.find(
          (session) => session.sessionDate === todaySessionDate,
        );

        if (todaySession?.status === "provisional") {
          const validationRequestResult = await fetchGymSessionValidationRequestForSession(
            todaySession.id,
            user?.id,
          );
          if (requestId !== loadRequestIdRef.current) {
            return {};
          }
          if (validationRequestResult.error) {
            setTodayGymValidationRequest(null);
          } else {
            setTodayGymValidationRequest(validationRequestResult.data ?? null);
          }
        } else {
          setTodayGymValidationRequest(null);
        }

        if (supportResult?.data?.id && !supportResult.data.nudgeOpenedAt) {
          const openedResult = await markSupportNudgeOpened({
            requestId: supportResult.data.id,
            surface: "home",
          });
          if (requestId !== loadRequestIdRef.current) {
            return {};
          }

          if (!openedResult.error && openedResult.data) {
            setSupportRequest((previous) => {
              if (!previous || previous.id !== supportResult.data?.id) {
                return previous;
              }

              return {
                ...previous,
                nudgeOpenedAt: openedResult.data.nudgeOpenedAt,
                nudgeOpenedSurface: openedResult.data.nudgeOpenedSurface,
              };
            });
          }
        }

        return {};
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setBlockingLoad(false);
          setRefreshing(false);
          setHydrated(true);
          loadInFlightRef.current = false;
        }
      }
    },
    [hasUsableSnapshot, user?.id],
  );

  useEffect(() => {
    focusRefreshRef.current = async () => {
      const nextMode = hasUsableSnapshot ? "refresh" : "blocking";
      await loadDashboardSurface({ mode: nextMode, preserveOnError: hasUsableSnapshot });
    };
  }, [hasUsableSnapshot, loadDashboardSurface]);

  useFocusEffect(
    useCallback(() => {
      void focusRefreshRef.current();
    }, [user?.id]),
  );

  const fallbackName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "User";

  const displayName = dashboard?.profile?.displayName ?? fallbackName;
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() ?? "U";
  const greetingName = displayName?.split(" ")?.[0] ?? "there";
  const unit = dashboard?.profile?.preferredUnit ?? "lb";
  const timeZone = dashboard?.profile?.timezone ?? getLocalTimeZone();

  const goal = dashboard?.goal;
  const routine = dashboard?.routine;
  const weighIns = dashboard?.weighIns ?? [];
  const gymSessions = dashboard?.gymSessions ?? [];

  const goalType = goal?.goalType ?? "maintain";
  const goalLabel =
    goalType === "maintain" ? "Maintain" : goalType === "lose" ? "Lose" : "Gain";

  const currentWeight = goal?.startWeight ?? null;
  const targetMin = goal?.targetMin ?? null;
  const targetMax = goal?.targetMax ?? null;
  const targetWeight = goal?.targetWeight ?? null;

  const formatWeight = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined) return "—";
      const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
      return `${formatted} ${unit}`;
    },
    [unit],
  );

  const goalSummary = useMemo(() => {
    if (!goal) return "No goal yet";
    if (goalType === "maintain") {
      if (targetMin === null || targetMax === null) return "Range not set";
      return `${targetMin}-${targetMax} ${unit}`;
    }
    if (targetWeight === null) return "Target not set";
    return `${targetWeight} ${unit}`;
  }, [goal, goalType, targetMax, targetMin, targetWeight, unit]);

  const cadenceSummary = useMemo(() => {
    if (!routine) return "Cadence not set";
    if (routine.weighInCadence === "daily") return "Daily";
    if (routine.weighInCadence === "three_per_week") return "3x / week";
    if (routine.weighInCadence === "custom") {
      return routine.customCadence ? `${routine.customCadence}x / week` : "Custom cadence";
    }
    return "Cadence not set";
  }, [routine]);

  const reminderSummary = routine?.reminderTime
    ? `Reminds at ${routine.reminderTime}`
    : "No reminder";
  const appleHealthStepsEnabled = dashboard?.profile?.appleHealthStepsEnabled ?? false;
  const stepSummaryMode = resolveStepSummaryMode(consistencyOption.id);

  useEffect(() => {
    if (!appleHealthStepsEnabled || Platform.OS !== "ios") {
      stepRequestIdRef.current += 1;
      setStepValue(null);
      setLoadingStepSummary(false);
      return;
    }

    const requestId = stepRequestIdRef.current + 1;
    stepRequestIdRef.current = requestId;
    setLoadingStepSummary(true);

    const loadStepSummary = async () => {
      if (stepSummaryMode === "today") {
        const stepResult = await fetchAppleHealthTodayStepCount();
        if (requestId !== stepRequestIdRef.current) {
          return;
        }

        setStepValue(stepResult.error || !stepResult.data ? null : stepResult.data.steps);
        setLoadingStepSummary(false);
        return;
      }

      const stepResult = await fetchAppleHealthDailyStepAverage(consistencyOption.days);
      if (requestId !== stepRequestIdRef.current) {
        return;
      }

      setStepValue(
        stepResult.error || !stepResult.data ? null : stepResult.data.averageDailySteps,
      );
      setLoadingStepSummary(false);
    };

    void loadStepSummary();
  }, [appleHealthStepsEnabled, consistencyOption.days, stepSummaryMode]);

  const loadingState = deriveSurfaceLoadState({
    blockingLoad,
    hydrated,
    refreshing,
    hasUsableSnapshot,
    mutating:
      supportActionBusy ||
      enablingPhoneNudges ||
      requestingGymValidation ||
      signingOut,
  });
  const showSkeleton = loadingState.blockingLoad;

  const streakDays = useMemo(
    () => getCurrentStreak(weighIns, timeZone),
    [timeZone, weighIns],
  );

  const weightDelta = useMemo(() => {
    if (currentWeight === null || currentWeight === undefined) return null;
    if (goalType === "maintain") {
      if (targetMin === null || targetMax === null) return null;
      if (currentWeight < targetMin) return targetMin - currentWeight;
      if (currentWeight > targetMax) return currentWeight - targetMax;
      return 0;
    }
    if (targetWeight === null) return null;
    if (goalType === "lose") {
      return currentWeight > targetWeight ? currentWeight - targetWeight : 0;
    }
    return currentWeight < targetWeight ? targetWeight - currentWeight : 0;
  }, [currentWeight, goalType, targetMax, targetMin, targetWeight]);

  const maintainStatus = useMemo(() => {
    if (currentWeight === null || currentWeight === undefined) return "—";
    if (targetMin === null || targetMax === null) return "—";
    if (currentWeight < targetMin) return "Below";
    if (currentWeight > targetMax) return "Above";
    return "In range";
  }, [currentWeight, targetMax, targetMin]);

  const maintainStatusClassName = useMemo(() => {
    if (maintainStatus === "In range") return "text-emerald-400";
    if (maintainStatus === "Above" || maintainStatus === "Below") {
      return "text-rose-400";
    }
    return "text-neutral-400";
  }, [maintainStatus]);

  const profileStartWeightValue = formatWeight(currentWeight);
  const profileTargetLabel = goalType === "maintain" ? "Status" : "To target";
  const profileTargetValue =
    goalType === "maintain"
      ? maintainStatus
      : weightDelta === null
        ? "—"
        : formatWeight(weightDelta);
  const profileSummary = useMemo<ProfileSummary>(
    () => ({
      displayName,
      initial,
      photoUrl: profilePhotoUrl,
      goalLabel,
      goalSummary,
      startWeightLabel: "Starting weight",
      startWeightValue: profileStartWeightValue,
      targetLabel: profileTargetLabel,
      targetValue: profileTargetValue,
      targetValueClassName: goalLabel === "Maintain" ? maintainStatusClassName : undefined,
      streakDays,
    }),
    [
      displayName,
      goalLabel,
      goalSummary,
      initial,
      maintainStatusClassName,
      profilePhotoUrl,
      profileStartWeightValue,
      profileTargetLabel,
      profileTargetValue,
      streakDays,
    ],
  );

  const consistency = useMemo(
    () => getConsistencyWindow(weighIns, timeZone, consistencyOption.days),
    [consistencyOption.days, timeZone, weighIns],
  );

  const weeklyGymTarget = routine?.gymSessionsTarget ?? 0;
  const hasGymLocation = Boolean(routine?.gymLat && routine?.gymLng);
  const weekGymSessions = useMemo(() => {
    if (!dashboard?.gymWeekStart || !dashboard?.gymWeekEnd) return [];
    return gymSessions.filter(
      (session) =>
        session.sessionDate >= dashboard.gymWeekStart &&
        session.sessionDate <= dashboard.gymWeekEnd
    );
  }, [dashboard?.gymWeekEnd, dashboard?.gymWeekStart, gymSessions]);
  const verifiedGymSessions = useMemo(
    () => weekGymSessions.filter((session) => session.status === "verified").length,
    [weekGymSessions],
  );

  const todayLocal = formatLocalDate(new Date(), timeZone);
  const todayGymSession = weekGymSessions.find(
    (session) => session.sessionDate === todayLocal,
  );
  const todayGymValidationStatus =
    todayGymSession && todayGymValidationRequest?.sessionId === todayGymSession.id
      ? todayGymValidationRequest.status
      : null;
  const gymWeekLabel = dashboard?.gymWeekStart
    ? `Week of ${formatShortDate(dashboard.gymWeekStart)}`
    : "This week";

  const trendPoints = useMemo(() => {
    if (!weighIns.length) return [];
    const sorted = [...weighIns].sort((a, b) => a.localDate.localeCompare(b.localDate));
    return sorted.slice(-14).map((entry) => ({
      weight: entry.weight,
      localDate: entry.localDate,
    }));
  }, [weighIns]);

  const recentWeighIns = useMemo(
    () =>
      weighIns.slice(0, 5).map((entry) => ({
        weight: entry.weight,
        localDate: entry.localDate,
      })),
    [weighIns],
  );

  const selectConsistencyOption = useCallback((option: HomeConsistencyOption) => {
    setConsistencyOption(option);
    setShowConsistencyMenu(false);
  }, []);

  const toggleConsistencyMenu = useCallback(() => {
    setShowConsistencyMenu((prev) => !prev);
  }, []);

  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (signingOut) return { success: false };

    setSigningOut(true);
    const result = await signOutCurrentUser();

    if (result.error) {
      setSigningOut(false);
      return { success: false, error: result.error };
    }

    return { success: true };
  }, [signingOut]);

  const requestGymValidationForToday =
    useCallback(async (message?: string | null): Promise<{ success: boolean; error?: string }> => {
      if (requestingGymValidation) {
        return { success: false };
      }

      if (!todayGymSession || todayGymSession.status !== "provisional") {
        return {
          success: false,
          error: "Only provisional sessions can request close-friend validation.",
        };
      }

      setRequestingGymValidation(true);
      const result = await requestGymSessionValidation(todayGymSession.id, {
        message,
        userId: user?.id,
      });
      setRequestingGymValidation(false);

      if (result.error || !result.data) {
        return {
          success: false,
          error: result.error ?? "Couldn't request close-friend validation.",
        };
      }

      setTodayGymValidationRequest(result.data);
      return { success: true };
    }, [requestingGymValidation, todayGymSession, user?.id]);

  const refreshSupportAutomation = useCallback(async () => {
    const [supportResult, pushDeviceResult] = await Promise.all([
      fetchCurrentWeekSupportRequest(),
      fetchHasActivePushNotificationDevice(user?.id),
    ]);

    if (!supportResult.error) {
      setSupportRequest(supportResult.data ?? null);
    }

    if (!pushDeviceResult.error) {
      setPhoneNudgesEnabled(pushDeviceResult.data?.hasActiveDevice ?? false);
    }
  }, [user?.id]);

  const startSupportAction = useCallback(() => {
    if (supportActionBusyRef.current) {
      return false;
    }

    supportActionBusyRef.current = true;
    setSupportActionBusy(true);
    return true;
  }, []);

  const finishSupportAction = useCallback(() => {
    supportActionBusyRef.current = false;
    setSupportActionBusy(false);
  }, []);

  const allowAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const result = await allowAutoSupportWithConsent();
      if (result.error || !result.data) {
        return {
          success: false,
          error: result.error ?? "Couldn't update support consent.",
        };
      }

      setDashboard((previous) => {
        if (!previous?.profile) {
          return previous;
        }
        return {
          ...previous,
          profile: {
            ...previous.profile,
            autoSupportEnabled: result.data.autoSupportEnabled,
            autoSupportConsentAt: result.data.autoSupportConsentedAt,
          },
        };
      });

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [finishSupportAction, refreshSupportAutomation, startSupportAction]);

  const reEnableAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const result = await setAutoSupportEnabled(true);
      if (result.error) {
        return { success: false, error: result.error };
      }

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [finishSupportAction, refreshSupportAutomation, startSupportAction]);

  const deferAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const requestId = supportRequest?.id?.trim() ?? "";
      if (!requestId) {
        return { success: false, error: "No support nudge is available to defer." };
      }

      const result = await deferSupportNudge({
        requestId,
        surface: "home",
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [finishSupportAction, refreshSupportAutomation, startSupportAction, supportRequest?.id]);

  const supportNudgeVariant = useMemo<SupportNudgeDisplayVariant | null>(() => {
    if (!supportRequest) {
      return null;
    }

    if (supportRequest.status === "suppressed_no_consent") {
      const consentedAtRaw = dashboard?.profile?.autoSupportConsentAt;
      const consentedAtMs = consentedAtRaw ? Date.parse(consentedAtRaw) : Number.NaN;
      const requestCreatedAtMs = Date.parse(supportRequest.createdAt);
      const hasPersistedAcknowledgedConsent =
        dashboard?.profile?.autoSupportEnabled === true &&
        !Number.isNaN(consentedAtMs) &&
        !Number.isNaN(requestCreatedAtMs) &&
        consentedAtMs >= requestCreatedAtMs;

      if (hasPersistedAcknowledgedConsent) {
        return "suppressed_acknowledged";
      }
      return "suppressed_prompt";
    }

    if (supportRequest.status === "disabled") {
      return "disabled";
    }

    return "published";
  }, [dashboard?.profile?.autoSupportConsentAt, dashboard?.profile?.autoSupportEnabled, supportRequest]);

  const enablePhoneNudges = useCallback(async (): Promise<SupportActionResult> => {
    if (enablingPhoneNudges) {
      return { success: false };
    }

    setEnablingPhoneNudges(true);
    const registrationResult = await registerCurrentPushDevice(user?.id);
    if (registrationResult.error) {
      setEnablingPhoneNudges(false);
      return {
        success: false,
        error: registrationResult.error,
      };
    }
    setEnablingPhoneNudges(false);

    await refreshSupportAutomation();
    return { success: true };
  }, [enablingPhoneNudges, refreshSupportAutomation]);

  const refreshDashboard = useCallback(
    async (options?: {
      preserveOnError?: boolean;
      blocking?: boolean;
    }): Promise<{ error?: string }> => {
      return loadDashboardSurface({
        mode: options?.blocking ? "blocking" : hasUsableSnapshot ? "refresh" : "blocking",
        preserveOnError: options?.preserveOnError ?? hasUsableSnapshot,
      });
    },
    [hasUsableSnapshot, loadDashboardSurface],
  );

  const stepSummary = useMemo<StepSummary>(
    () =>
      createStepSummary({
        enabled: appleHealthStepsEnabled,
        loading: loadingStepSummary,
        mode: stepSummaryMode,
        steps: stepValue,
        target: dashboard?.profile?.dailyStepGoal ?? DEFAULT_DAILY_STEP_TARGET,
      }),
    [
      appleHealthStepsEnabled,
      dashboard?.profile?.dailyStepGoal,
      loadingStepSummary,
      stepSummaryMode,
      stepValue,
    ],
  );

  return {
    blockingLoad: loadingState.blockingLoad,
    hydrated: loadingState.hydrated,
    refreshing: loadingState.refreshing,
    hasUsableSnapshot: loadingState.hasUsableSnapshot,
    mutating: loadingState.mutating,
    signingOut,
    dashboardError,
    showSkeleton,
    greetingName,
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
    stepSummary,
    appleHealthStepsEnabled,
    consistencyOptions: CONSISTENCY_OPTIONS,
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
    signOut,
  };
}
