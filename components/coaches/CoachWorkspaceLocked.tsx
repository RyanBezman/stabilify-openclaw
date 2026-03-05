import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../ui/Card";
import Button from "../ui/Button";

const PRO_VALUE_POINTS = [
  "Unlimited coach chat to work through plateaus and adjustments.",
  "Workout and nutrition plan generation with one-tap draft review.",
  "Personalized coaching workflows that adapt to your routine and goals.",
] as const;

type CoachWorkspaceLockedProps = {
  coachName?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
  onBrowseCoaches?: () => void;
  onUpgrade: () => void;
};

export default function CoachWorkspaceLocked({
  coachName,
  loading = false,
  error,
  onRetry,
  onBack,
  onBrowseCoaches,
  onUpgrade,
}: CoachWorkspaceLockedProps) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row items-center">
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60"
            >
              <Ionicons name="chevron-back" size={22} color="#e5e5e5" />
            </TouchableOpacity>
          ) : (
            <View className="h-10 w-10" />
          )}
          <View className="flex-1 items-center">
            <Text className="text-base font-bold text-white">Coach</Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        <Card className="border-violet-500/35 bg-violet-950/20 p-5">
          <View className="self-start rounded-full border border-violet-400/45 bg-violet-500/15 px-3 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
              Pro required
            </Text>
          </View>

          <Text className="mt-4 text-2xl font-bold text-white">
            Unlock AI Coaching
          </Text>
          <Text className="mt-2 text-sm leading-6 text-neutral-300">
            {coachName
              ? `${coachName} is available on Pro. Upgrade to access chat, workout planning, and nutrition planning tools.`
              : "Upgrade to Pro to access coach chat, workout planning, and nutrition planning tools."}
          </Text>

          <View className="mt-5 gap-3">
            {PRO_VALUE_POINTS.map((point) => (
              <View key={point} className="flex-row items-start">
                <View className="mr-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-300" />
                <Text className="flex-1 text-sm leading-6 text-neutral-200">{point}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View className="mt-5 flex-row items-center">
              <ActivityIndicator color="#a3a3a3" />
              <Text className="ml-2 text-sm font-medium text-neutral-400">Checking membership...</Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
              <Text className="text-sm font-semibold text-rose-300">{error}</Text>
              {onRetry ? (
                <Button
                  className="mt-3"
                  title="Retry"
                  variant="secondary"
                  onPress={onRetry}
                />
              ) : null}
            </View>
          ) : null}

          <Button className="mt-5" title="Upgrade to Pro" onPress={onUpgrade} />
          {onBrowseCoaches ? (
            <Button
              className="mt-3"
              variant="secondary"
              title="Back to Coaches"
              onPress={onBrowseCoaches}
            />
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
