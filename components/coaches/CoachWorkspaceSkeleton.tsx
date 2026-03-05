import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import SkeletonBlock from "../ui/SkeletonBlock";

type CoachWorkspaceSkeletonProps = {
  withScreenWrapper?: boolean;
};

function SkeletonContent() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-40 pt-6"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-start">
        <SkeletonBlock className="h-20 w-20 rounded-full" />
        <View className="ml-4 flex-1">
          <SkeletonBlock className="h-8 w-44 rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-64 rounded-full" />
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <SkeletonBlock className="h-8 w-28 rounded-full" />
      </View>

      <SkeletonBlock className="mt-7 h-4 w-36 rounded-full" />

      <View className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <SkeletonBlock className="h-6 w-44 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-64 rounded-full" />
        <SkeletonBlock className="mt-2 h-4 w-48 rounded-full" />

        <View className="mt-5 gap-3">
          <SkeletonBlock className="h-16 w-full rounded-2xl" />
          <SkeletonBlock className="h-16 w-full rounded-2xl" />
          <SkeletonBlock className="h-16 w-full rounded-2xl" />
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <SkeletonBlock className="h-12 flex-1 rounded-xl" />
        <SkeletonBlock className="h-12 flex-1 rounded-xl" />
      </View>
    </ScrollView>
  );
}

export default function CoachWorkspaceSkeleton({
  withScreenWrapper = true,
}: CoachWorkspaceSkeletonProps) {
  if (!withScreenWrapper) return <SkeletonContent />;

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <SkeletonContent />
    </SafeAreaView>
  );
}
