import { View } from "react-native";
import Card from "../ui/Card";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function CoachDashboardSkeleton() {
  return (
    <>
      <Card className="mb-6 p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="mt-2 h-4 w-full rounded-full" />
          </View>
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </View>
        <SkeletonBlock className="h-7 w-24 rounded-full" />
      </Card>

      <Card className="mb-6 p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SkeletonBlock className="h-4 w-20 rounded-full" />
        </View>
        <SkeletonBlock className="h-4 w-3/4 rounded-full" />
        <View className="mt-4 flex-row gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </View>
      </Card>

      <View className="mb-6 flex-row gap-3">
        <Card className="flex-1 p-4">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-full rounded-full" />
          <SkeletonBlock className="mt-2 h-4 w-3/4 rounded-full" />
          <SkeletonBlock className="mt-4 h-8 w-24 rounded-full" />
        </Card>
        <Card className="flex-1 p-4">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-full rounded-full" />
          <SkeletonBlock className="mt-2 h-4 w-3/4 rounded-full" />
          <SkeletonBlock className="mt-4 h-8 w-24 rounded-full" />
        </Card>
      </View>

      <Card className="mb-6 p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
        </View>
        <SkeletonBlock className="h-4 w-full rounded-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-full" />
        <View className="mt-4 flex-row gap-3">
          <SkeletonBlock className="h-8 w-20 rounded-full" />
          <SkeletonBlock className="h-8 w-20 rounded-full" />
        </View>
      </Card>
    </>
  );
}
