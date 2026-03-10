import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Math.round(value);
}

export default function TrackCard({
  title,
  subtitle,
  cta,
  stateLabel,
  stateLoading = false,
  progressPercent,
  progressLabel,
  icon,
  onPress,
}: {
  title: "Training" | "Nutrition";
  subtitle: string;
  cta: string;
  stateLabel?: string;
  stateLoading?: boolean;
  progressPercent?: number;
  progressLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const safePercent =
    typeof progressPercent === "number" ? clampPercent(progressPercent) : null;
  const accentClassName = "bg-violet-400";

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <View className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <Ionicons name={icon} size={16} color="#737373" />
          </View>
          <Text className="mt-2 text-sm leading-5 text-neutral-300" numberOfLines={2}>
            {subtitle}
          </Text>
          {stateLabel ? (
            <View className="mt-2 max-w-full self-start rounded-full border border-neutral-700 bg-neutral-950/60 px-2 py-0.5">
              <View className="flex-row items-center gap-1.5">
                {stateLoading ? <ActivityIndicator size="small" color="#a3a3a3" /> : null}
                <Text
                  className="text-[10px] font-semibold uppercase tracking-[0.8px] text-neutral-300"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stateLabel}
                </Text>
              </View>
            </View>
          ) : null}
          {safePercent !== null ? (
            <View className="mt-4">
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                  {progressLabel ?? "Progress"}
                </Text>
                <Text className="text-[11px] font-semibold text-neutral-300">{safePercent}%</Text>
              </View>
              <View className="h-1.5 rounded-full bg-neutral-800">
                <View
                  className={`h-full rounded-full ${accentClassName}`}
                  style={{ width: `${Math.max(safePercent, 8)}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>
        <Text className="mt-5 text-xs font-semibold text-violet-300">{cta}</Text>
      </View>
    </TouchableOpacity>
  );
}
