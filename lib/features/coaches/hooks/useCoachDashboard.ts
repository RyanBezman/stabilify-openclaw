import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoach } from "./CoachContext";
import type { ActiveCoach } from "../types";
import { hydrateCoachDashboard } from "../services/dashboard";
import { fetchNutritionCheckins } from "../services/checkins";
import {
  coachSyncIdentityKey,
  subscribeCoachSyncEvents,
} from "../services/syncEvents";
import {
  computeAdherenceTrend,
  computeAdherenceTrendSummary,
  computeCompletionRate,
  computeWeeklyCheckinStreak,
} from "../services/analytics";
import { formatLocalDate, getWeekRange } from "../../../utils/metrics";
import { getLocalTimeZone } from "../../../utils/time";
import { logCoachRequestDiagnostics } from "../models/devDiagnostics";
import { deriveSurfaceLoadState } from "../../shared";

type DashboardAnalyticsSource = {
  weekStarts: string[];
  adherenceScores: number[];
};

const EMPTY_ANALYTICS_SOURCE: DashboardAnalyticsSource = {
  weekStarts: [],
  adherenceScores: [],
};
const EMPTY_ANALYTICS_SIGNATURE = JSON.stringify(EMPTY_ANALYTICS_SOURCE);

function getSignature(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function useCoachDashboard(options: {
  coach: ActiveCoach | null;
  hydrated: boolean;
  specialization?: "workout" | "nutrition";
}) {
  const { authUserId } = useCoach();
  const surfaceSpecialization = options.specialization ?? options.coach?.specialization ?? "nutrition";
  const surfaceCoachKey = useMemo(() => {
    if (!options.coach) {
      return `${surfaceSpecialization}:none`;
    }
    return `${surfaceSpecialization}:${options.coach.gender}:${options.coach.personality}`;
  }, [
    options.coach?.gender,
    options.coach?.personality,
    options.coach,
    surfaceSpecialization,
  ]);
  const surfaceIdentityKey = `${authUserId ?? "guest"}:${surfaceCoachKey}`;
  const syncEventCoachKey = useMemo(
    () =>
      options.coach
        ? coachSyncIdentityKey({
            specialization: surfaceSpecialization,
            gender: options.coach.gender,
            personality: options.coach.personality,
          })
        : null,
    [options.coach, options.coach?.gender, options.coach?.personality, surfaceSpecialization]
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof hydrateCoachDashboard>> | null>(null);
  const [snapshotOwnerKey, setSnapshotOwnerKey] = useState<string | null>(null);
  const [optimisticNutritionPendingReview, setOptimisticNutritionPendingReview] = useState<boolean | null>(null);
  const [nutritionSyncing, setNutritionSyncing] = useState(false);
  const [analyticsSource, setAnalyticsSource] = useState<DashboardAnalyticsSource>(
    EMPTY_ANALYTICS_SOURCE
  );
  const [analyticsOwnerKey, setAnalyticsOwnerKey] = useState<string | null>(null);
  const refreshRequestIdRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const surfaceIdentityRef = useRef(surfaceIdentityKey);
  const snapshotSignatureRef = useRef<string | null>(null);
  const analyticsSignatureRef = useRef(EMPTY_ANALYTICS_SIGNATURE);

  const refresh = useCallback(async (mode: "load" | "refresh" = "load") => {
    if (requestInFlightRef.current && mode === "refresh") {
      return;
    }
    const requestIdentity = surfaceIdentityKey;
    const requestId = refreshRequestIdRef.current + 1;
    refreshRequestIdRef.current = requestId;
    requestInFlightRef.current = true;
    logCoachRequestDiagnostics({
      scope: "useCoachDashboard",
      requestId,
      phase: "start",
      details: {
        mode,
        hydrated: options.hydrated,
        hasCoach: Boolean(options.coach),
      },
    });

    if (!options.hydrated || !options.coach) {
      snapshotSignatureRef.current = null;
      setSnapshot(null);
      setSnapshotOwnerKey(null);
      setError(null);
      setOptimisticNutritionPendingReview(null);
      setNutritionSyncing(false);
      analyticsSignatureRef.current = EMPTY_ANALYTICS_SIGNATURE;
      setAnalyticsSource(EMPTY_ANALYTICS_SOURCE);
      setAnalyticsOwnerKey(null);
      setLoading(false);
      setRefreshing(false);
      requestInFlightRef.current = false;
      logCoachRequestDiagnostics({
        scope: "useCoachDashboard",
        requestId,
        phase: "skip",
      });
      return;
    }

    if (mode === "load") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [nextSnapshot, checkinsResult] = await Promise.all([
        hydrateCoachDashboard({
          coach: options.coach,
          specialization: surfaceSpecialization,
        }),
        fetchNutritionCheckins({
          authUserId,
          coach: options.coach,
          limit: 8,
        }).catch(() => null),
      ]);

      if (
        requestId !== refreshRequestIdRef.current
        || surfaceIdentityRef.current !== requestIdentity
      ) {
        logCoachRequestDiagnostics({
          scope: "useCoachDashboard",
          requestId,
          phase: "stale",
        });
        return;
      }

      const nextSnapshotSignature = getSignature(nextSnapshot);
      if (nextSnapshotSignature !== snapshotSignatureRef.current) {
        snapshotSignatureRef.current = nextSnapshotSignature;
        setSnapshot(nextSnapshot);
        setSnapshotOwnerKey(surfaceIdentityKey);
      }
      setOptimisticNutritionPendingReview(null);
      setNutritionSyncing(false);

      if (checkinsResult) {
        const nextAnalyticsSource = checkinsResult.history.length
          ? {
              weekStarts: checkinsResult.history.map((entry) => entry.weekStart),
              adherenceScores: checkinsResult.history.map(
                (entry) => entry.adherenceScore ?? entry.adherencePercent
              ),
            }
          : EMPTY_ANALYTICS_SOURCE;
        const nextAnalyticsSignature = getSignature(nextAnalyticsSource);
        if (nextAnalyticsSignature !== analyticsSignatureRef.current) {
          analyticsSignatureRef.current = nextAnalyticsSignature;
          setAnalyticsSource(nextAnalyticsSource);
          setAnalyticsOwnerKey(surfaceIdentityKey);
        }
      }

      logCoachRequestDiagnostics({
        scope: "useCoachDashboard",
        requestId,
        phase: "success",
      });
    } catch (err) {
      if (
        requestId !== refreshRequestIdRef.current
        || surfaceIdentityRef.current !== requestIdentity
      ) {
        logCoachRequestDiagnostics({
          scope: "useCoachDashboard",
          requestId,
          phase: "stale",
        });
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't load dashboard.");
      setNutritionSyncing(false);
      logCoachRequestDiagnostics({
        scope: "useCoachDashboard",
        requestId,
        phase: "error",
        details: {
          message: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      if (
        requestId === refreshRequestIdRef.current
        && surfaceIdentityRef.current === requestIdentity
      ) {
        setLoading(false);
        setRefreshing(false);
        requestInFlightRef.current = false;
      }
    }
  }, [authUserId, options.coach, options.hydrated, surfaceIdentityKey, surfaceSpecialization]);

  useEffect(() => {
    surfaceIdentityRef.current = surfaceIdentityKey;
    refreshRequestIdRef.current += 1;
    requestInFlightRef.current = false;
    snapshotSignatureRef.current = null;
    analyticsSignatureRef.current = EMPTY_ANALYTICS_SIGNATURE;
    setSnapshot(null);
    setSnapshotOwnerKey(null);
    setError(null);
    setOptimisticNutritionPendingReview(null);
    setNutritionSyncing(false);
    setAnalyticsSource(EMPTY_ANALYTICS_SOURCE);
    setAnalyticsOwnerKey(null);
  }, [surfaceIdentityKey]);

  useEffect(() => {
    void refresh("load");
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeCoachSyncEvents((event) => {
      if (!options.hydrated || !options.coach) {
        return;
      }
      if (event.authUserId !== authUserId) {
        return;
      }
      if (!syncEventCoachKey || event.coachIdentityKey !== syncEventCoachKey) {
        return;
      }

      if (event.type === "checkin_submitted" && event.specialization === "nutrition") {
        setOptimisticNutritionPendingReview(event.planUpdatedForReview);
        setNutritionSyncing(true);
        void refresh("refresh");
        return;
      }

      if (event.type === "nutrition_draft_resolved") {
        setOptimisticNutritionPendingReview(false);
        setNutritionSyncing(true);
        void refresh("refresh");
      }
    });

    return unsubscribe;
  }, [authUserId, options.coach, options.hydrated, refresh, syncEventCoachKey]);

  const currentSnapshot = snapshotOwnerKey === surfaceIdentityKey ? snapshot : null;
  const currentAnalyticsSource = analyticsOwnerKey === surfaceIdentityKey
    ? analyticsSource
    : EMPTY_ANALYTICS_SOURCE;

  const effectiveNutritionPendingReview = useMemo(() => {
    if (optimisticNutritionPendingReview !== null) {
      return optimisticNutritionPendingReview;
    }
    return Boolean(currentSnapshot?.nutrition.planUpdatedForReview);
  }, [currentSnapshot?.nutrition.planUpdatedForReview, optimisticNutritionPendingReview]);

  const analytics = useMemo(() => {
    const nowLocal = formatLocalDate(new Date(), getLocalTimeZone());
    const { weekStart } = getWeekRange(nowLocal);

    const streakFromHistory = computeWeeklyCheckinStreak(
      currentAnalyticsSource.weekStarts,
      weekStart
    );
    const completion = computeCompletionRate(
      currentAnalyticsSource.weekStarts,
      weekStart,
      8
    );
    const adherenceTrend = computeAdherenceTrend(
      currentAnalyticsSource.adherenceScores,
      8
    );

    return {
      streak: currentSnapshot?.weeklyCheckin.streak ?? streakFromHistory,
      completionRate: completion.percent,
      adherenceTrend,
      nextWeekAdherenceDelta: currentSnapshot?.weeklyCheckin.nextWeekAdherenceDelta ?? null,
    };
  }, [currentAnalyticsSource.adherenceScores, currentAnalyticsSource.weekStarts, currentSnapshot]);

  const weeklyRecap = useMemo(() => {
    const trendSummary = computeAdherenceTrendSummary(currentAnalyticsSource.adherenceScores);

    return {
      checkinCompleted: currentSnapshot ? !currentSnapshot.weeklyCheckin.isDue : false,
      planAcceptedThisWeek: currentSnapshot?.weeklyCheckin.planAcceptedThisWeek ?? null,
      adherenceTrendDirection: trendSummary.direction,
      adherenceTrendDelta: trendSummary.delta,
      cta: currentSnapshot?.weeklyCheckin.cta ?? "Do weekly check-in",
      nextDueLabel: currentSnapshot?.weeklyCheckin.nextDueLabel ?? "Sunday",
    };
  }, [currentAnalyticsSource.adherenceScores, currentSnapshot]);

  const loadingState = deriveSurfaceLoadState({
    blockingLoad: loading && !currentSnapshot,
    hydrated: options.hydrated,
    refreshing: refreshing && Boolean(currentSnapshot),
    hasUsableSnapshot: Boolean(currentSnapshot),
    mutating: false,
  });

  return {
    loading,
    refreshing,
    blockingLoad: loadingState.blockingLoad,
    hydrated: loadingState.hydrated,
    hasUsableSnapshot: loadingState.hasUsableSnapshot,
    mutating: loadingState.mutating,
    error,
    snapshot: currentSnapshot,
    analytics,
    weeklyRecap,
    refresh,
    optimisticNutritionPendingReview,
    effectiveNutritionPendingReview,
    nutritionSyncing,
  };
}
