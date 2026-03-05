const INCHES_PER_FOOT = 12;
const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.2046226218;

export const MIN_HEIGHT_CM = 120;
export const MAX_HEIGHT_CM = 230;
export const MIN_WEIGHT_KG = 35;
export const MAX_WEIGHT_KG = 250;
export const MIN_AGE_YEARS = 16;
export const MAX_AGE_YEARS = 85;

const MIN_HEIGHT_INCHES = Math.ceil(MIN_HEIGHT_CM / CM_PER_INCH);
const MAX_HEIGHT_INCHES = Math.floor(MAX_HEIGHT_CM / CM_PER_INCH);
const MIN_WEIGHT_LB = Math.ceil(MIN_WEIGHT_KG * LB_PER_KG);
const MAX_WEIGHT_LB = Math.floor(MAX_WEIGHT_KG * LB_PER_KG);

export type FeetInches = {
  feet: number;
  inches: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampHeightCm(value: number) {
  return clamp(Math.round(value), MIN_HEIGHT_CM, MAX_HEIGHT_CM);
}

export function clampWeightKg(value: number) {
  return clamp(Math.round(value * 10) / 10, MIN_WEIGHT_KG, MAX_WEIGHT_KG);
}

export function clampWeightLb(value: number) {
  return clamp(Math.round(value), MIN_WEIGHT_LB, MAX_WEIGHT_LB);
}

export function clampAgeYears(value: number) {
  return clamp(Math.round(value), MIN_AGE_YEARS, MAX_AGE_YEARS);
}

export function cmToFeetInches(heightCm: number): FeetInches {
  const clampedCm = clampHeightCm(heightCm);
  const totalInches = Math.round(clampedCm / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

export function feetInchesToCm(feet: number, inches: number) {
  const normalizedFeet = Math.max(0, Math.round(feet));
  const normalizedInches = clamp(Math.round(inches), 0, 11);
  const totalInches = normalizedFeet * INCHES_PER_FOOT + normalizedInches;
  return clampHeightCm(Math.round(totalInches * CM_PER_INCH));
}

export function kgToLb(weightKg: number) {
  return clampWeightLb(Math.round(clampWeightKg(weightKg) * LB_PER_KG));
}

export function lbToKg(weightLb: number) {
  const clampedLb = clampWeightLb(weightLb);
  return clampWeightKg(clampedLb / LB_PER_KG);
}

export function heightFeetOptions() {
  const feet = new Set<number>();
  for (let totalInches = MIN_HEIGHT_INCHES; totalInches <= MAX_HEIGHT_INCHES; totalInches += 1) {
    feet.add(Math.floor(totalInches / INCHES_PER_FOOT));
  }
  return Array.from(feet).sort((a, b) => a - b);
}

export function heightInchesOptionsForFeet(feet: number) {
  const normalizedFeet = Math.max(0, Math.round(feet));
  const options: number[] = [];
  for (let inches = 0; inches <= 11; inches += 1) {
    const totalInches = normalizedFeet * INCHES_PER_FOOT + inches;
    if (totalInches < MIN_HEIGHT_INCHES || totalInches > MAX_HEIGHT_INCHES) continue;
    options.push(inches);
  }
  return options;
}

export function weightLbOptions() {
  return Array.from({ length: MAX_WEIGHT_LB - MIN_WEIGHT_LB + 1 }, (_, i) => MIN_WEIGHT_LB + i);
}

export function ageOptions() {
  return Array.from({ length: MAX_AGE_YEARS - MIN_AGE_YEARS + 1 }, (_, i) => MIN_AGE_YEARS + i);
}
