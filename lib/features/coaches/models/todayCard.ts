export type TodayIndicator = {
  label: string;
  value: string;
};

export type MacroTargetKey = "protein" | "carbs" | "fat";

export type MacroTargetRow = {
  key: MacroTargetKey;
  label: "Protein" | "Carbs" | "Fat";
  grams: number;
};

export type ParsedMacroSummary = {
  summary: string;
  calories: number | null;
  rows: [MacroTargetRow, MacroTargetRow, MacroTargetRow];
};

const MACRO_PATTERNS: Record<MacroTargetKey, RegExp[]> = {
  protein: [
    /\bprotein(?:\s*target)?\s*[:=-]?\s*(\d{2,4})\s*g?\b/i,
    /\b(\d{2,4})\s*g?\s*protein\b/i,
    /(?:^|[\s/|,])P\s*[:=-]?\s*(\d{2,4})\b/i,
  ],
  carbs: [
    /\bcarb(?:s|ohydrates?)?(?:\s*target)?\s*[:=-]?\s*(\d{2,4})\s*g?\b/i,
    /\b(\d{2,4})\s*g?\s*carb(?:s|ohydrates?)?\b/i,
    /(?:^|[\s/|,])C\s*[:=-]?\s*(\d{2,4})\b/i,
  ],
  fat: [
    /\bfat(?:s)?(?:\s*target)?\s*[:=-]?\s*(\d{2,4})\s*g?\b/i,
    /\b(\d{2,4})\s*g?\s*fat(?:s)?\b/i,
    /(?:^|[\s/|,])F\s*[:=-]?\s*(\d{2,4})\b/i,
  ],
};

function toPositiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function findMacroGrams(summary: string, key: MacroTargetKey): number | null {
  for (const pattern of MACRO_PATTERNS[key]) {
    const match = summary.match(pattern);
    const grams = toPositiveInteger(match?.[1]);
    if (grams !== null) {
      return grams;
    }
  }
  return null;
}

export function splitTodayIndicator(indicator: string): TodayIndicator {
  const [rawLabel, ...rest] = indicator.split(":");
  const label = rawLabel?.trim() ?? "";
  const value = rest.join(":").trim();

  if (!label.length || !value.length) {
    return {
      label: "Update",
      value: indicator.trim(),
    };
  }

  return { label, value };
}

export function parseMacroSummary(summary: string): ParsedMacroSummary | null {
  const normalizedSummary = summary.trim();
  if (!normalizedSummary.length) {
    return null;
  }

  const protein = findMacroGrams(normalizedSummary, "protein");
  const carbs = findMacroGrams(normalizedSummary, "carbs");
  const fat = findMacroGrams(normalizedSummary, "fat");

  if (protein === null || carbs === null || fat === null) {
    return null;
  }

  const caloriesMatch = normalizedSummary.match(/\b(\d{3,4})\s*kcal\b/i);
  const calories = toPositiveInteger(caloriesMatch?.[1]);

  return {
    summary: normalizedSummary,
    calories,
    rows: [
      { key: "protein", label: "Protein", grams: protein },
      { key: "carbs", label: "Carbs", grams: carbs },
      { key: "fat", label: "Fat", grams: fat },
    ],
  };
}
