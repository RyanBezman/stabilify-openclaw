import { shiftIsoDate } from "../../../utils/metrics";

export type AdherenceTrendDirection = "up" | "down" | "flat" | "no_data";

export function computeWeeklyCheckinStreak(weekStarts: string[], currentWeekStart: string) {
  const set = new Set(weekStarts);
  let streak = 0;
  let cursor = set.has(currentWeekStart) ? currentWeekStart : shiftIsoDate(currentWeekStart, -7);
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftIsoDate(cursor, -7);
  }
  return streak;
}

export function computeCompletionRate(weekStarts: string[], currentWeekStart: string, windowWeeks = 8) {
  const set = new Set(weekStarts);
  let completed = 0;
  let cursor = currentWeekStart;
  for (let i = 0; i < windowWeeks; i += 1) {
    if (set.has(cursor)) completed += 1;
    cursor = shiftIsoDate(cursor, -7);
  }
  return {
    completed,
    total: windowWeeks,
    percent: Math.round((completed / windowWeeks) * 100),
  };
}

export function computeAdherenceTrend(adherenceScores: number[], maxPoints = 8) {
  return adherenceScores
    .slice(0, maxPoints)
    .reverse()
    .map((score, index) => ({
      index,
      score: Math.max(0, Math.min(100, Math.round(score))),
    }));
}

export function computeAdherenceTrendSummary(adherenceScores: number[]) {
  const latest = adherenceScores[0];
  const previous = adherenceScores[1];

  if (!Number.isFinite(latest) || !Number.isFinite(previous)) {
    return {
      direction: "no_data" as AdherenceTrendDirection,
      delta: null as number | null,
    };
  }

  const delta = Number((Number(latest) - Number(previous)).toFixed(1));
  if (delta >= 1) {
    return {
      direction: "up" as AdherenceTrendDirection,
      delta,
    };
  }

  if (delta <= -1) {
    return {
      direction: "down" as AdherenceTrendDirection,
      delta,
    };
  }

  return {
    direction: "flat" as AdherenceTrendDirection,
    delta,
  };
}
