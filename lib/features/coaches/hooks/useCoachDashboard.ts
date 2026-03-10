import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveCoach } from "../types";
import { hydrateCoachDashboard } from "../services/dashboard";
import { fetchNutritionCheckins } from "../services/checkins";
import { subscribeCoachSyncEvents } from "../services/syncEvents";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof hydrateCoachDashboard>> | null>(null);
  const [optimisticNutritionPendingReview, setOptimisticNutritionPendingReview] = useState<boolean | null>(null);
  const [nutritionSyncing, setNutritionSyncing] = useState(false);
  const [analyticsSource, setAnalyticsSource] = useState<DashboardAnalyticsSource>(
    EMPTY_ANALYTICS_SOURCE
  );
  const refreshRequestIdRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const snapshotSignatureRef = useRef<string | null>(null);
  const analyticsSignatureRef = useRef(EMPTY_ANALYTICS_SIGNATURE);

  const refresh = useCallback(async (mode: "load" | "refresh" = "load") => {
    if (requestInFlightRef.current && mode === "refresh") {
      return;
    }
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
      setError(null);
      setOptimisticNutritionPendingReview(null);
      setNutritionSyncing(false);
      analyticsSignatureRef.current = EMPTY_ANALYTICS_SIGNATURE;
      setAnalyticsSource(EMPTY_ANALYTICS_SOURCE);
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
          specialization: options.specialization ?? "nutrition",
        }),
        fetchNutritionCheckins({
          coach: options.coach,
          limit: 8,
        }).catch(() => null),
      ]);

      if (requestId !== refreshRequestIdRef.current) {
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
      }
      setOptimisticNutritionPendingReview(null);
      setNutritionSyncing(false);

      const nextAnalyticsSource = checkinsResult?.history.length
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
      }

      logCoachRequestDiagnostics({
        scope: "useCoachDashboard",
        requestId,
        phase: "success",
      });
    } catch (err) {
      if (requestId !== refreshRequestIdRef.current) {
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
      if (requestId === refreshRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
        requestInFlightRef.current = false;
      }
    }
  }, [options.coach, options.hydrated, options.specialization]);

  useEffect(() => {
    void refresh("load");
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeCoachSyncEvents((event) => {
      if (!options.hydrated || !options.coach) {
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
  }, [options.coach, options.hydrated, refresh]);

  const effectiveNutritionPendingReview = useMemo(() => {
    if (optimisticNutritionPendingReview !== null) {
      return optimisticNutritionPendingReview;
    }
    return Boolean(snapshot?.nutrition.planUpdatedForReview);
  }, [optimisticNutritionPendingReview, snapshot?.nutrition.planUpdatedForReview]);

  const analytics = useMemo(() => {
    const nowLocal = formatLocalDate(new Date(), getLocalTimeZone());
    const { weekStart } = getWeekRange(nowLocal);

    const streakFromHistory = computeWeeklyCheckinStreak(
      analyticsSource.weekStarts,
      weekStart
    );
    const completion = computeCompletionRate(
      analyticsSource.weekStarts,
      weekStart,
      8
    );
    const adherenceTrend = computeAdherenceTrend(
      analyticsSource.adherenceScores,
      8
    );

    return {
      streak: snapshot?.weeklyCheckin.streak ?? streakFromHistory,
      completionRate: completion.percent,
      adherenceTrend,
      nextWeekAdherenceDelta: snapshot?.weeklyCheckin.nextWeekAdherenceDelta ?? null,
    };
  }, [analyticsSource.adherenceScores, analyticsSource.weekStarts, snapshot]);

  const weeklyRecap = useMemo(() => {
    const trendSummary = computeAdherenceTrendSummary(analyticsSource.adherenceScores);

    return {
      checkinCompleted: snapshot ? !snapshot.weeklyCheckin.isDue : false,
      planAcceptedThisWeek: snapshot?.weeklyCheckin.planAcceptedThisWeek ?? null,
      adherenceTrendDirection: trendSummary.direction,
      adherenceTrendDelta: trendSummary.delta,
      cta: snapshot?.weeklyCheckin.cta ?? "Do weekly check-in",
      nextDueLabel: snapshot?.weeklyCheckin.nextDueLabel ?? "Sunday",
    };
  }, [analyticsSource.adherenceScores, snapshot]);

  const loadingState = deriveSurfaceLoadState({
    blockingLoad: loading && !snapshot,
    hydrated: options.hydrated,
    refreshing: refreshing && Boolean(snapshot),
    hasUsableSnapshot: Boolean(snapshot),
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
    snapshot,
    analytics,
    weeklyRecap,
    refresh,
    optimisticNutritionPendingReview,
    effectiveNutritionPendingReview,
    nutritionSyncing,
  };
}
