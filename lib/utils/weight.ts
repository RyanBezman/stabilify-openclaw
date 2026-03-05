import type { WeightUnit } from "../data/types";

export const parseWeight = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeWeightInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  const before = cleaned.slice(0, firstDot + 1);
  const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
  return before + after;
};

export const sanitizeWholeNumberInput = (value: string) => {
  return value.replace(/[^0-9]/g, "");
};

export const formatWeight = (value: number, unit: WeightUnit) => {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${formatted} ${unit}`;
};
