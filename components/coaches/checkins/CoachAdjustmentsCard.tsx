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
    <View className="border-t border-neutral-900">
      <View className="flex-row items-center gap-1.5 px-5 py-4">
        <Ionicons name="git-compare-outline" size={13} color="#c4b5fd" />
        <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-violet-200">
          Coach adjustments
        </Text>
      </View>

      {groups.map((group) => (
        <View
          key={group.key}
          className="border-t border-neutral-900 px-5 py-4"
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500">
            {group.label}
          </Text>
          {group.patches.length ? (
            group.patches.slice(0, 4).map((patch, index) => (
              <Text
                key={`${group.key}-${patch.path}-${index}`}
                className="mt-2 text-sm leading-5 text-neutral-200"
              >
                {`- ${describeDiffPatch(patch)}`}
              </Text>
            ))
          ) : (
            <Text className="mt-2 text-sm text-neutral-500">No changes.</Text>
          )}
        </View>
      ))}

      <View className="border-t border-neutral-900 px-5 py-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500">
          Rationale
        </Text>
        <Text className="mt-2 text-sm leading-5 text-neutral-300">{recommendations.rationale.training}</Text>
        <Text className="mt-2 text-sm leading-5 text-neutral-300">{recommendations.rationale.nutrition}</Text>
        <Text className="mt-2 text-sm leading-5 text-neutral-300">{recommendations.rationale.coordination}</Text>
      </View>

      {guardrailNotes?.length ? (
        <View className="border-t border-neutral-900 px-5 py-4">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-amber-200">
            Guardrails
          </Text>
          {guardrailNotes.slice(0, 3).map((note, index) => (
            <Text key={`${note}-${index}`} className="mt-2 text-sm leading-5 text-amber-100/90">
              {`- ${note}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
