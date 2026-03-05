export type WeighInLike = {
  localDate: string;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const formatLocalDate = (date: Date, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return toIsoDate(date);
  }
};

export const shiftIsoDate = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
};

export const getWeekRange = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = shiftIsoDate(isoDate, offsetToMonday);
  const weekEnd = shiftIsoDate(weekStart, 6);
  return { weekStart, weekEnd };
};

export const getCurrentStreak = (
  weighIns: WeighInLike[],
  timeZone: string
) => {
  const dates = weighIns.map((entry) => entry.localDate);
  return getCurrentDateStreak(dates, timeZone);
};

export const getCurrentDateStreak = (
  dates: string[],
  timeZone: string
) => {
  if (!dates.length) return 0;
  const dateSet = new Set(dates);
  const today = formatLocalDate(new Date(), timeZone);
  if (!dateSet.has(today)) return 0;

  let streak = 0;
  let cursor = today;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftIsoDate(cursor, -1);
  }
  return streak;
};

export const getConsistencyWindow = (
  weighIns: WeighInLike[],
  timeZone: string,
  days: number
) => {
  if (days <= 0) {
    return { daysWithWeighIns: 0, totalDays: 0, percent: 0 };
  }
  const dateSet = new Set(weighIns.map((entry) => entry.localDate));
  const today = formatLocalDate(new Date(), timeZone);
  let count = 0;
  let cursor = today;
  for (let i = 0; i < days; i += 1) {
    if (dateSet.has(cursor)) count += 1;
    cursor = shiftIsoDate(cursor, -1);
  }
  const percent = count / days;
  return { daysWithWeighIns: count, totalDays: days, percent };
};

export const formatShortDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      // Treat incoming YYYY-MM-DD values as calendar dates, not local timestamps.
      timeZone: "UTC",
    }).format(date);
  } catch {
    return isoDate;
  }
};

type GymSessionLike = {
  sessionDate: string;
  status: "verified" | "partial" | "provisional";
};

const getWeeklyWorkoutStreak = (
  gymSessions: GymSessionLike[],
  timeZone: string
) => {
  if (!gymSessions.length) return 0;

  const verifiedWeekStarts = new Set(
    gymSessions
      .filter((session) => session.status === "verified")
      .map((session) => getWeekRange(session.sessionDate).weekStart)
  );

  if (!verifiedWeekStarts.size) return 0;

  const today = formatLocalDate(new Date(), timeZone);
  let cursorWeekStart = getWeekRange(today).weekStart;
  let streak = 0;

  while (verifiedWeekStarts.has(cursorWeekStart)) {
    streak += 1;
    cursorWeekStart = shiftIsoDate(cursorWeekStart, -7);
  }

  return streak;
};
