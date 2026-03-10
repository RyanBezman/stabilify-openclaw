import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import SectionTitle from "../../ui/SectionTitle";

function splitIndicator(indicator: string) {
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

export default function CoachTodayCard({
  directive,
  statusIndicators,
}: {
  directive: string;
  statusIndicators: string[];
}) {
  const normalizedDirective = directive.trim();
  const focusText =
    normalizedDirective.length > 0
      ? normalizedDirective
      : "Start with one high-impact action and follow through today.";

  return (
    <View className="mb-6 border-y border-neutral-800/80 bg-neutral-900/40 px-5 py-5">
      <View className="flex-row items-center justify-between">
        <SectionTitle>Today</SectionTitle>
        <View className="rounded-full border border-violet-500/40 bg-violet-500/20 px-2.5 py-1">
          <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-violet-100">
            Focus
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-start gap-3">
        <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/20">
          <Ionicons name="flash-outline" size={15} color="#f5f3ff" />
        </View>
        <Text className="flex-1 text-base leading-6 text-white">{focusText}</Text>
      </View>

      {statusIndicators.length > 0 ? (
        <View className="mt-4">
          {statusIndicators.slice(0, 4).map((indicator, index) => {
            const parsed = splitIndicator(indicator);
            return (
              <View
                key={`${indicator}-${index}`}
                className={`flex-row items-start justify-between py-3 ${
                  index < Math.min(statusIndicators.length, 4) - 1 ? "border-b border-neutral-800/80" : ""
                }`}
              >
                <Text className="w-24 text-[10px] font-semibold uppercase tracking-[1px] text-neutral-500">
                  {parsed.label}
                </Text>
                <Text className="ml-4 flex-1 text-sm text-neutral-200">{parsed.value}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
