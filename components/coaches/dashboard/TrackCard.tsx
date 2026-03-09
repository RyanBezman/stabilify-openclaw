import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Card from "../../ui/Card";

export default function TrackCard({
  title,
  subtitle,
  cta,
  stateLabel,
  stateLoading = false,
  icon,
  onPress,
}: {
  title: "Training" | "Nutrition";
  subtitle: string;
  cta: string;
  stateLabel?: string;
  stateLoading?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="flex-1">
      <Card variant="subtle" className="h-40 justify-between p-5">
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <Ionicons name={icon} size={16} color="#737373" />
          </View>
          <Text
            className="mt-2 text-sm text-neutral-300"
            numberOfLines={2}
          >
            {subtitle}
          </Text>
          {stateLabel ? (
            <View className="mt-2 max-w-full self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5">
              <View className="flex-row items-center gap-1.5">
                {stateLoading ? <ActivityIndicator size="small" color="#a7f3d0" /> : null}
                <Text
                  className="text-[10px] font-semibold uppercase tracking-[0.8px] text-emerald-200"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stateLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <Text className="text-xs font-semibold text-violet-300">{cta}</Text>
      </Card>
    </TouchableOpacity>
  );
}
