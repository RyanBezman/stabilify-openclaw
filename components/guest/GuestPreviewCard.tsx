import { Text, View } from "react-native";
import Card from "../ui/Card";
import { GUEST_PREVIEW_BARS } from "../../lib/features/guest-home";

export default function GuestPreviewCard() {
  return (
    <Card className="mb-6 overflow-hidden p-0">
      <View className="bg-gradient-to-b from-violet-500/15 via-violet-500/5 to-transparent p-5">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[11px] font-medium uppercase tracking-[1.2px] text-neutral-500">
              Current weight
            </Text>
            <View className="mt-1 flex-row items-baseline">
              <Text className="text-4xl font-bold tracking-tight text-white">165.4</Text>
              <Text className="ml-1 text-sm font-medium text-neutral-400">lb</Text>
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <Text className="text-sm font-semibold text-emerald-300">
                Down 0.4 lb/week
              </Text>
            </View>
          </View>

          <View className="items-end rounded-xl border border-neutral-800 bg-neutral-950/65 px-3 py-2">
            <Text className="text-[10px] font-medium uppercase tracking-[1.1px] text-neutral-500">
              Target
            </Text>
            <View className="mt-0.5 flex-row items-baseline">
              <Text className="text-lg font-semibold text-emerald-400">160</Text>
              <Text className="ml-1 text-[11px] font-medium text-neutral-500">lb</Text>
            </View>
          </View>
        </View>

        <View className="h-24 flex-row items-end gap-1.5 rounded-xl border border-neutral-800/80 bg-neutral-950/35 px-2 pb-2 pt-3">
          {GUEST_PREVIEW_BARS.map((height, index) => (
            <View
              key={index}
              className="flex-1 rounded-t bg-violet-400/60"
              style={{ height: `${height}%` }}
            />
          ))}
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-neutral-500">Recent trend</Text>
          <Text className="text-xs text-neutral-400">Last 12 check-ins</Text>
        </View>
      </View>
    </Card>
  );
}
