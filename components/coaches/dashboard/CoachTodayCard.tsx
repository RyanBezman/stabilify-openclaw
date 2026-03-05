import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Card from "../../ui/Card";
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
    <Card className="mb-6 overflow-hidden p-5">
      <View className="flex-row items-center justify-between">
        <SectionTitle>Today</SectionTitle>
        <View className="rounded-full border border-violet-500/40 bg-violet-600/20 px-2.5 py-1">
          <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-violet-200">
            Focus
          </Text>
        </View>
      </View>

      <View className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
        <View className="flex-row items-start gap-3">
          <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/20">
            <Ionicons name="flash-outline" size={14} color="#ddd6fe" />
          </View>
          <Text className="flex-1 text-base leading-6 text-white">{focusText}</Text>
        </View>
      </View>

      {statusIndicators.length > 0 ? (
        <View className="mt-3 gap-2">
          {statusIndicators.slice(0, 4).map((indicator, index) => {
            const parsed = splitIndicator(indicator);
            return (
            <View
              key={`${indicator}-${index}`}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2.5"
            >
              <Text className="text-[10px] font-semibold uppercase tracking-[0.9px] text-neutral-500">
                {parsed.label}
              </Text>
              <Text className="mt-1 text-sm text-neutral-200">{parsed.value}</Text>
            </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
