import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { WeeklyCheckin } from "../../../lib/features/coaches";

type AdjustmentDiffPatch = {
  op: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

function normalizeDiffPath(path: string) {
  const normalized = path.trim().replace(/^\/+/, "");
  if (!normalized.length) return "plan";
  return normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/_/g, " "))
    .join(" -> ");
}

function summarizeDiffValue(value: unknown) {
  if (typeof value === "string") {
    const compact = value.trim().replace(/\s+/g, " ");
    return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (value && typeof value === "object") {
    return "updated object";
  }
  return "";
}

function describeDiffPatch(patch: AdjustmentDiffPatch) {
  const action = patch.op === "add" ? "Add" : patch.op === "remove" ? "Remove" : "Replace";
  const path = normalizeDiffPath(patch.path);
  const valueSummary = patch.op === "remove" ? "" : summarizeDiffValue(patch.value);
  return valueSummary ? `${action} ${path}: ${valueSummary}` : `${action} ${path}`;
}

export default function CoachAdjustmentsCard({
  recommendations,
  guardrailNotes,
}: {
  recommendations: WeeklyCheckin["adjustmentRecommendations"] | null;
  guardrailNotes?: string[];
}) {
  if (!recommendations) return null;

  const groups: Array<{
    key: "training" | "nutrition" | "meal";
    label: string;
    patches: AdjustmentDiffPatch[];
  }> = [
    { key: "training", label: "Training", patches: recommendations.workoutDiff },
    { key: "nutrition", label: "Nutrition", patches: recommendations.nutritionDiff },
    { key: "meal", label: "Meal plan", patches: recommendations.mealPlanDiff },
  ];

  return (
    <View className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="git-compare-outline" size={13} color="#c4b5fd" />
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-violet-200">
          Coach adjustments
        </Text>
      </View>

      {groups.map((group) => (
        <View
          key={group.key}
          className="mt-2.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2.5 py-2"
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-400">
            {group.label}
          </Text>
          {group.patches.length ? (
            group.patches.slice(0, 4).map((patch, index) => (
              <Text
                key={`${group.key}-${patch.path}-${index}`}
                className="mt-1 text-xs text-neutral-200"
              >
                {`- ${describeDiffPatch(patch)}`}
              </Text>
            ))
          ) : (
            <Text className="mt-1 text-xs text-neutral-500">No changes.</Text>
          )}
        </View>
      ))}

      <View className="mt-2.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2.5 py-2">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-400">
          Rationale
        </Text>
        <Text className="mt-1 text-xs text-neutral-300">{recommendations.rationale.training}</Text>
        <Text className="mt-1 text-xs text-neutral-300">{recommendations.rationale.nutrition}</Text>
        <Text className="mt-1 text-xs text-neutral-300">{recommendations.rationale.coordination}</Text>
      </View>

      {guardrailNotes?.length ? (
        <View className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-amber-200">
            Guardrails
          </Text>
          {guardrailNotes.slice(0, 3).map((note, index) => (
            <Text key={`${note}-${index}`} className="mt-1 text-xs text-amber-100/90">
              {`- ${note}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
