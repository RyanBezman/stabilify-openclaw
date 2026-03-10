import { View } from "react-native";
import Card from "../ui/Card";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function CoachDashboardSkeleton() {
  return (
    <>
      <View className="mb-6 px-5">
        <Card className="overflow-hidden p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="mt-2 h-7 w-2/3 rounded-full" />
              <SkeletonBlock className="mt-2 h-4 w-full rounded-full" />
            </View>
            <SkeletonBlock className="h-11 w-11 rounded-full" />
          </View>
          <View className="mt-3 flex-row gap-2">
            <SkeletonBlock className="h-6 w-28 rounded-full" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </View>
        </Card>
      </View>

      <View className="mb-6 px-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <SkeletonBlock className="h-4 w-20 rounded-full" />
        </View>
        <View className="flex-row gap-3">
          <Card className="flex-1 p-4">
            <SkeletonBlock className="mx-auto h-20 w-20 rounded-full" />
            <SkeletonBlock className="mx-auto mt-3 h-4 w-20 rounded-full" />
          </Card>
          <Card className="flex-1 p-4">
            <SkeletonBlock className="mx-auto h-20 w-20 rounded-full" />
            <SkeletonBlock className="mx-auto mt-3 h-4 w-24 rounded-full" />
          </Card>
        </View>
        <Card className="mt-3 p-4">
          <View className="flex-row items-center gap-4">
            <View className="flex-1">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="mt-2 h-6 w-28 rounded-full" />
            </View>
            <View className="h-8 w-px bg-neutral-800" />
            <View className="flex-1">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="mt-2 h-6 w-32 rounded-full" />
            </View>
          </View>
        </Card>
      </View>

      <View className="mb-6 border-y border-neutral-800/80 bg-neutral-900/40 px-5 py-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SkeletonBlock className="h-4 w-16 rounded-full" />
          <SkeletonBlock className="h-5 w-14 rounded-full" />
        </View>
        <SkeletonBlock className="h-5 w-full rounded-full" />
        <SkeletonBlock className="mt-2 h-5 w-5/6 rounded-full" />
        <View className="mt-4 flex-row gap-3">
          <SkeletonBlock className="h-4 w-20 rounded-full" />
          <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        </View>
        <View className="mt-3 flex-row gap-3">
          <SkeletonBlock className="h-4 w-20 rounded-full" />
          <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        </View>
      </View>

      <View className="mb-6 px-5">
        <Card className="p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="h-4 w-24 rounded-full" />
          </View>
          <View className="flex-row gap-4">
            <SkeletonBlock className="h-24 w-24 rounded-full" />
            <View className="flex-1 justify-center gap-2">
              <SkeletonBlock className="h-4 w-full rounded-full" />
              <SkeletonBlock className="h-4 w-5/6 rounded-full" />
              <SkeletonBlock className="h-4 w-2/3 rounded-full" />
            </View>
          </View>
          <View className="mt-4 flex-row justify-end">
            <SkeletonBlock className="h-8 w-28 rounded-full" />
          </View>
        </Card>
      </View>
    </>
  );
}
