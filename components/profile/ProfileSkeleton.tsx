import { View } from "react-native";
import Card from "../ui/Card";
import SkeletonBlock from "../ui/SkeletonBlock";

type ProfileSkeletonProps = {
  variant?: "owner" | "public";
};

export default function ProfileSkeleton({ variant = "owner" }: ProfileSkeletonProps) {
  if (variant === "public") {
    return (
      <View>
        <View className="mb-6 items-center">
          <SkeletonBlock className="h-[88px] w-[88px] rounded-full" />
          <SkeletonBlock className="mt-3 h-6 w-40 rounded-full" />
          <SkeletonBlock className="mt-1 h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-2 h-4 w-56 rounded-full" />
        </View>

        <View className="mb-4 flex-row border-b border-neutral-800/60 pb-4">
          <View className="flex-1 items-center px-2">
            <SkeletonBlock className="h-5 w-10 rounded-full" />
            <SkeletonBlock className="mt-1 h-2 w-12 rounded-full" />
          </View>
          <View className="flex-1 items-center border-l border-neutral-800/60 px-2">
            <SkeletonBlock className="h-5 w-10 rounded-full" />
            <SkeletonBlock className="mt-1 h-2 w-16 rounded-full" />
          </View>
          <View className="flex-1 items-center border-l border-neutral-800/60 px-2">
            <SkeletonBlock className="h-5 w-10 rounded-full" />
            <SkeletonBlock className="mt-1 h-2 w-16 rounded-full" />
          </View>
        </View>

        <SkeletonBlock className="mb-4 h-9 w-full rounded-xl" />
        <SkeletonBlock className="mb-4 h-10 w-full rounded-xl" />

        <Card className="mb-3 overflow-hidden p-0">
          <View className="px-4 py-4">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-2 h-3 w-64 rounded-full" />
          </View>
          <View className="h-px bg-neutral-800" />
          <View className="px-4 py-4">
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-2 h-3 w-64 rounded-full" />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <View className="mb-6 items-center">
        <SkeletonBlock className="h-[88px] w-[88px] rounded-full" />
        <SkeletonBlock className="mt-3 h-6 w-40 rounded-full" />
        <SkeletonBlock className="mt-1 h-4 w-24 rounded-full" />
        <SkeletonBlock className="mt-2 h-4 w-56 rounded-full" />
      </View>

      <View className="mb-4 flex-row border-b border-neutral-800/60 pb-4">
        <View className="flex-1 items-center px-2">
          <SkeletonBlock className="h-5 w-10 rounded-full" />
          <SkeletonBlock className="mt-1 h-2 w-12 rounded-full" />
        </View>
        <View className="flex-1 items-center border-l border-neutral-800/60 px-2">
          <SkeletonBlock className="h-5 w-10 rounded-full" />
          <SkeletonBlock className="mt-1 h-2 w-16 rounded-full" />
        </View>
        <View className="flex-1 items-center border-l border-neutral-800/60 px-2">
          <SkeletonBlock className="h-5 w-10 rounded-full" />
          <SkeletonBlock className="mt-1 h-2 w-16 rounded-full" />
        </View>
      </View>

      <SkeletonBlock className="mb-4 h-10 w-full rounded-xl" />

      <Card className="mb-3 overflow-hidden p-0">
        <View className="px-4 py-4">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-64 rounded-full" />
        </View>
        <View className="h-px bg-neutral-800" />
        <View className="px-4 py-4">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-64 rounded-full" />
        </View>
      </Card>

      <Card className="mb-3 p-5">
        <SkeletonBlock className="h-3 w-24 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-64 rounded-full" />
      </Card>

      <Card variant="outline" className="mt-6 p-5">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
      </Card>
    </View>
  );
}
