import type { DashboardData, WeighInData } from "../../../data/dashboard";
import {
  formatLocalDate,
  formatShortDate,
  getConsistencyWindow,
  getCurrentStreak,
} from "../../../utils/metrics";
import { getLocalTimeZone } from "../../../utils/time";
import type {
  ProgressAccolade,
  ProgressModel,
} from "./progressTypes";

type DashboardLike = DashboardData | null;

function buildTrendPoints(weighIns: WeighInData[]) {
  if (!weighIns.length) return [];
  const sorted = [...weighIns].sort((a, b) => a.localDate.localeCompare(b.localDate));
  return sorted.slice(-14).map((entry) => ({
    weight: entry.weight,
    localDate: entry.localDate,
  }));
}

export function buildProfileProgressModel(dashboard: DashboardLike): ProgressModel {
  const unit = dashboard?.profile?.preferredUnit ?? "lb";
  const timeZone = dashboard?.profile?.timezone ?? getLocalTimeZone();
  const weighIns = dashboard?.weighIns ?? [];
  const gymSessions = dashboard?.gymSessions ?? [];

  const streakDays = getCurrentStreak(weighIns, timeZone);
  const consistencyWindow = getConsistencyWindow(weighIns, timeZone, 30);
  const trendPoints = buildTrendPoints(weighIns);

  const weeklyGymTarget = dashboard?.routine?.gymSessionsTarget ?? 0;
  const weekGymSessions =
    dashboard?.gymWeekStart && dashboard?.gymWeekEnd
      ? gymSessions.filter(
          (session) =>
            session.sessionDate >= dashboard.gymWeekStart &&
            session.sessionDate <= dashboard.gymWeekEnd
        )
      : [];
  const verifiedGymSessions = weekGymSessions.filter(
    (session) => session.status === "verified"
  ).length;

  const todayLocal = formatLocalDate(new Date(), timeZone);
  const todayGymSession = weekGymSessions.find(
    (session) => session.sessionDate === todayLocal
  );
  const gymWeekLabel = dashboard?.gymWeekStart
    ? `Week of ${formatShortDate(dashboard.gymWeekStart)}`
    : "This week";

  const accolades: ProgressAccolade[] = [
    {
      key: "streak",
      icon: "🔥",
      label: "7-day streak",
      active: streakDays >= 7,
    },
    {
      key: "consistency",
      icon: "📊",
      label: "70% consistency",
      active: consistencyWindow.percent >= 0.7,
    },
    {
      key: "gym",
      icon: "🏋️",
      label: "Weekly gym goal",
      active: weeklyGymTarget > 0 && verifiedGymSessions >= weeklyGymTarget,
    },
    {
      key: "trend",
      icon: "📈",
      label: "Trend builder",
      active: trendPoints.length >= 7,
    },
  ];

  return {
    unit,
    timeZone,
    streakDays,
    consistencyPercent: consistencyWindow.percent,
    consistencyDays: consistencyWindow.daysWithWeighIns,
    consistencyTotalDays: consistencyWindow.totalDays,
    trendPoints,
    weeklyGymTarget,
    verifiedGymSessions,
    gymWeekLabel,
    todayGymSession: todayGymSession
      ? {
          status: todayGymSession.status,
          statusReason: todayGymSession.statusReason ?? null,
          distanceMeters: todayGymSession.distanceMeters ?? null,
        }
      : null,
    accolades,
    weighIns,
    gymSessions,
  };
}

export type {
  ProgressAccolade,
  ProgressModel,
  ProgressTrendPoint,
} from "./progressTypes";
