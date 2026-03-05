import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { PlanIntake } from "../../lib/features/coaches";

type QuickMode = "days" | "focus" | null;

const dayOptions = [1, 2, 3, 4, 5, 6, 7];
const focusOptions: Array<{ label: string; value: PlanIntake["goal"] }> = [
  { label: "Strength", value: "strength" },
  { label: "Fat loss", value: "fat_loss" },
  { label: "Recomp", value: "recomp" },
];

export default function PlanQuickActions({
  disabled,
  onPickDays,
  onPickFocus,
}: {
  disabled?: boolean;
  onPickDays: (days: number) => void;
  onPickFocus: (goal: PlanIntake["goal"]) => void;
}) {
  const [mode, setMode] = useState<QuickMode>(null);

  return (
    <View className="border-t border-neutral-900 bg-neutral-950 px-4 pb-2 pt-2">
      <View className="flex-row flex-wrap gap-2">
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={disabled}
          onPress={() => setMode((prev) => (prev === "days" ? null : "days"))}
          className={`max-w-full rounded-full border px-3 py-2 ${
            mode === "days" ? "border-neutral-500 bg-neutral-800" : "border-neutral-700 bg-neutral-900"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Text numberOfLines={2} className="text-xs font-semibold text-neutral-100">
            Revise days/week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={disabled}
          onPress={() => setMode((prev) => (prev === "focus" ? null : "focus"))}
          className={`max-w-full rounded-full border px-3 py-2 ${
            mode === "focus" ? "border-neutral-500 bg-neutral-800" : "border-neutral-700 bg-neutral-900"
          } ${disabled ? "opacity-50" : ""}`}
        >
          <Text numberOfLines={2} className="text-xs font-semibold text-neutral-100">
            Change focus
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "days" ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {dayOptions.map((days) => (
            <TouchableOpacity
              key={`days-${days}`}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => {
                setMode(null);
                onPickDays(days);
              }}
              className={`rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 ${disabled ? "opacity-50" : ""}`}
            >
              <Text className="text-xs font-semibold text-neutral-200">{days} days</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {mode === "focus" ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {focusOptions.map((focus) => (
            <TouchableOpacity
              key={`focus-${focus.value}`}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => {
                setMode(null);
                onPickFocus(focus.value);
              }}
              className={`rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 ${disabled ? "opacity-50" : ""}`}
            >
              <Text className="text-xs font-semibold text-neutral-200">{focus.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
