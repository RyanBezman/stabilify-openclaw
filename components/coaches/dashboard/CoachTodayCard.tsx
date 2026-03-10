import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { parseMacroSummary, splitTodayIndicator } from "../../../lib/features/coaches/models/todayCard";
import SectionTitle from "../../ui/SectionTitle";

export default function CoachTodayCard({
  directive: _directive,
  statusIndicators,
}: {
  directive: string;
  statusIndicators: string[];
}) {
  const visibleIndicators = statusIndicators.slice(0, 2);
  const parsedIndicators = visibleIndicators.map(splitTodayIndicator);
  const workoutRow =
    parsedIndicators.find((row) => row.label.trim().toLowerCase() === "workout") ?? null;
  const macrosRow =
    parsedIndicators.find((row) => {
      const label = row.label.trim().toLowerCase();
      return label === "macros" || label === "nutrition";
    }) ?? null;

  const workoutValue = workoutRow?.value.length ? workoutRow.value : "Unscheduled";
  const macrosValue = macrosRow?.value.length ? macrosRow.value : "Not set";
  const parsedMacros = parseMacroSummary(macrosValue);
  const macroSnapshot = parsedMacros
    ? [
        parsedMacros.calories ? `${parsedMacros.calories} kcal` : null,
        ...parsedMacros.rows.map((row) => `${row.grams}${row.label.charAt(0).toUpperCase()}`),
      ]
        .filter((entry): entry is string => Boolean(entry))
        .join(" • ")
    : macrosValue;

  return (
    <View className="mb-4 px-5">
      <SectionTitle className="mb-2.5 text-neutral-400">Today</SectionTitle>
      <View className="flex-row overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 px-4 py-3.5">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800">
            <Ionicons name="barbell-outline" size={16} color="#a3a3a3" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
              Workout
            </Text>
            <Text className="mt-0.5 text-sm font-semibold text-white" numberOfLines={1}>
              {workoutValue}
            </Text>
          </View>
        </View>

        <View className="w-px shrink-0 bg-neutral-800" />

        <View className="min-w-0 flex-1 flex-row items-center gap-3 px-4 py-3.5">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800">
            <Ionicons name="restaurant-outline" size={16} color="#a3a3a3" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
              Macros
            </Text>
            <Text className="mt-0.5 text-sm font-semibold text-white" numberOfLines={1}>
              {macroSnapshot}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
