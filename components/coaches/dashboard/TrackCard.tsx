import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

function getStateTone(stateLabel?: string) {
  const normalized = stateLabel?.trim().toLowerCase() ?? "";

  if (normalized.includes("pending")) {
    return {
      container: "border-amber-400/40 bg-amber-500/15",
      text: "text-amber-100",
      spinnerColor: "#fde68a",
    };
  }

  if (normalized.includes("setup")) {
    return {
      container: "border-violet-500/35 bg-violet-500/12",
      text: "text-violet-100",
      spinnerColor: "#c4b5fd",
    };
  }

  return {
    container: "border-neutral-700 bg-neutral-950/70",
    text: "text-neutral-200",
    spinnerColor: "#d4d4d8",
  };
}

export default function TrackCard({
  title,
  cta,
  stateLabel,
  stateLoading = false,
  icon,
  onPress,
}: {
  title: "Training" | "Nutrition";
  cta: string;
  stateLabel?: string;
  stateLoading?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const stateTone = getStateTone(stateLabel);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={cta}
    >
      <View className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
        <View className="px-5 py-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/35 bg-violet-500/15">
                  <Ionicons name={icon} size={18} color="#c4b5fd" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-white">{title}</Text>
                  <Text className="mt-1 text-[10px] font-semibold uppercase tracking-[1px] text-violet-300">
                    Coach plan
                  </Text>
                </View>
              </View>
            </View>

            <View className="shrink-0 rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-violet-100">
                Open
              </Text>
            </View>
          </View>

          {stateLabel ? (
            <View
              className={`mt-4 max-w-full self-start rounded-full px-2.5 py-1 ${stateTone.container}`}
            >
              <View className="flex-row items-center gap-1.5">
                {stateLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={stateTone.spinnerColor}
                  />
                ) : null}
                <Text
                  className={`text-[10px] font-semibold uppercase tracking-[0.8px] ${stateTone.text}`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stateLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
