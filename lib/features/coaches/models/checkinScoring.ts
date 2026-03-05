import type { WeeklyCheckinAdherenceSubjective } from "../types/checkinsTypes";

function clampWholeNumber(value: unknown, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function normalizeRating(value: unknown, fallback: number) {
  return clampWholeNumber(value, 1, 5, fallback);
}

export function computeAdherenceScore(input: {
  adherencePercent?: number | null;
  subjective?: WeeklyCheckinAdherenceSubjective | null;
  energyRating?: number | null;
  recoveryRating?: number | null;
  sleepAvgHours?: number | null;
  sleepQuality?: number | null;
  stressLevel?: number | null;
}) {
  const adherencePercent =
    Number.isFinite(input.adherencePercent)
      ? clampWholeNumber(input.adherencePercent, 0, 100, 0)
      : null;
  const subjectiveBase =
    input.subjective === "high"
      ? 85
      : input.subjective === "medium"
        ? 65
        : input.subjective === "low"
          ? 45
          : null;
  const nutritionScore = adherencePercent ?? subjectiveBase ?? 0;
  const energyScore = normalizeRating(input.energyRating, 3) * 20;
  const recoveryScore = normalizeRating(input.recoveryRating, 3) * 20;
  const sleepHoursScore = clampWholeNumber((Number(input.sleepAvgHours) / 8) * 100, 0, 100, 0);
  const sleepQualityScore = normalizeRating(input.sleepQuality, 3) * 20;
  const stressScore = (6 - normalizeRating(input.stressLevel, 3)) * 20;

  return clampWholeNumber(
    Math.round(
      nutritionScore * 0.45
      + energyScore * 0.15
      + recoveryScore * 0.15
      + sleepHoursScore * 0.1
      + sleepQualityScore * 0.1
      + stressScore * 0.05
    ),
    0,
    100,
    0
  );
}
