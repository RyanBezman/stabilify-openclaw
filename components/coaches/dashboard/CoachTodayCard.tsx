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
    <View className="mb-4 bg-neutral-900/20 py-1.5">
      <View className="px-5">
        <SectionTitle className="text-neutral-400">Today</SectionTitle>
        <View className="mt-1.5 flex-row items-center gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Ionicons name="barbell-outline" size={12} color="#737373" />
            <View className="min-w-0 flex-1">
              <Text className="text-[9px] font-semibold uppercase tracking-[1px] text-neutral-500">
                Workout
              </Text>
              <Text className="text-sm font-semibold text-neutral-100" numberOfLines={1}>
                {workoutValue}
              </Text>
            </View>
          </View>

          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Ionicons name="restaurant-outline" size={12} color="#737373" />
            <View className="min-w-0 flex-1">
              <Text className="text-[9px] font-semibold uppercase tracking-[1px] text-neutral-500">
                Macros
              </Text>
              <Text className="text-sm font-semibold text-neutral-100" numberOfLines={1}>
                {macroSnapshot}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
