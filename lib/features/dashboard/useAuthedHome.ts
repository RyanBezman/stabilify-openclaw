import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { kgToLb, lbToKg } from "../../utils/bodyMetrics";
import type { ProfileSummary } from "../profile";
import {
  fetchCurrentWeekSupportRequest,
  fetchHasActivePushNotificationDevice,
  markSupportNudgeOpened,
  type CurrentWeekSupportRequest,
} from "../../data/supportAutomation";
import { deriveSurfaceLoadState } from "../shared";
import {
  resolveStepSummaryMode,
} from "./models/stepSummary";
import {
  useAuthedHomeSupportAutomation,
  type SupportNudgeDisplayVariant,
} from "./useAuthedHomeSupportAutomation";
import { useAuthedHomeStepSummary } from "./useAuthedHomeStepSummary";

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
function convertWeightToPreferredUnit(
  value: number,
  sourceUnit: "lb" | "kg",
  targetUnit: "lb" | "kg",
) {
  if (sourceUnit === targetUnit) {
    return value;
  }

  return sourceUnit === "kg" ? kgToLb(value) : lbToKg(value);
}

type DashboardState = Awaited<ReturnType<typeof fetchDashboardData>>["data"] | null;

export type AuthedHomeUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
};

export type { SupportNudgeDisplayVariant } from "./useAuthedHomeSupportAutomation";

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
  const [consistencyOption, setConsistencyOption] = useState(
    CONSISTENCY_OPTIONS[0],
  );
  const [showConsistencyMenu, setShowConsistencyMenu] = useState(false);
  const hasUsableSnapshot = dashboard !== null;
  const loadRequestIdRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const focusRefreshRef = useRef<() => Promise<void>>(async () => {});

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

  const startWeight = goal?.startWeight ?? null;
  const targetMin = goal?.targetMin ?? null;
  const targetMax = goal?.targetMax ?? null;
  const targetWeight = goal?.targetWeight ?? null;
  const hasLoggedWeighIn = weighIns.length > 0;
  const currentWeight = useMemo(() => {
    const latestWeighIn = weighIns[0];
    if (!latestWeighIn) {
      return startWeight;
    }

    return convertWeightToPreferredUnit(latestWeighIn.weight, latestWeighIn.unit, unit);
  }, [startWeight, unit, weighIns]);

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
  const stepSummary = useAuthedHomeStepSummary({
    appleHealthStepsEnabled,
    consistencyDays: consistencyOption.days,
    dailyStepGoal: dashboard?.profile?.dailyStepGoal,
    stepSummaryMode,
  });

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

  const updateDashboardAutoSupportState = useCallback(
    (next: { autoSupportConsentedAt: string | null; autoSupportEnabled: boolean }) => {
      setDashboard((previous) => {
        if (!previous?.profile) {
          return previous;
        }

        return {
          ...previous,
          profile: {
            ...previous.profile,
            autoSupportEnabled: next.autoSupportEnabled,
            autoSupportConsentAt: next.autoSupportConsentedAt,
          },
        };
      });
    },
    [],
  );
  const {
    allowAutoSupportFromNudge,
    deferAutoSupportFromNudge,
    enablePhoneNudges,
    enablingPhoneNudges,
    reEnableAutoSupportFromNudge,
    supportActionBusy,
    supportNudgeVariant,
  } = useAuthedHomeSupportAutomation({
    profileAutoSupportConsentAt: dashboard?.profile?.autoSupportConsentAt,
    profileAutoSupportEnabled: dashboard?.profile?.autoSupportEnabled,
    setPhoneNudgesEnabled,
    setSupportRequest,
    supportRequest,
    updateDashboardAutoSupportState,
    userId: user?.id,
  });

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

  const profileStartWeightLabel = hasLoggedWeighIn ? "Latest weigh-in" : "Starting weight";
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
      startWeightLabel: profileStartWeightLabel,
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
      hasLoggedWeighIn,
      initial,
      maintainStatusClassName,
      profilePhotoUrl,
      profileStartWeightLabel,
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
