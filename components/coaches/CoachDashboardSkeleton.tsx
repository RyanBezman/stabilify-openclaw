import { View } from "react-native";
import Card from "../ui/Card";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function CoachDashboardSkeleton() {
  return (
    <>
      <View className="mb-4 px-5">
        <View className="-mx-5 bg-neutral-900/20 py-1.5">
          <View className="px-5">
            <SkeletonBlock className="h-4 w-16 rounded-full" />
            <View className="mt-1.5 flex-row items-center gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <SkeletonBlock className="h-3 w-3 rounded-full" />
                <View className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-14 rounded-full" />
                  <SkeletonBlock className="mt-1.5 h-4 w-full rounded-full" />
                </View>
              </View>
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <SkeletonBlock className="h-3 w-3 rounded-full" />
                <View className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-14 rounded-full" />
                  <SkeletonBlock className="mt-1.5 h-4 w-5/6 rounded-full" />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="mb-6 px-5">
        <View className="mb-3">
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
      </View>

      <View className="mb-6 px-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-4 w-20 rounded-full" />
        </View>
        <Card className="mt-3 p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
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
