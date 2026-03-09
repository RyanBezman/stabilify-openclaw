import { ScrollView, View } from "react-native";
import SkeletonBlock from "../ui/SkeletonBlock";
import AppScreen from "../ui/AppScreen";

export default function CoachesLoadingSkeleton() {
  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={960}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <SkeletonBlock className="h-10 w-56" />
        <SkeletonBlock className="mt-3 h-5 w-full" />
        <SkeletonBlock className="mt-2 h-5 w-5/6" />

        <SkeletonBlock className="mt-10 h-4 w-40" />
        <View className="mt-3 flex-row gap-3">
          <SkeletonBlock className="h-14 flex-1" />
          <SkeletonBlock className="h-14 flex-1" />
        </View>

        <SkeletonBlock className="mt-8 h-4 w-40" />
        <View className="mt-3 gap-3">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </View>

        <SkeletonBlock className="mt-8 h-40 w-full" />
      </ScrollView>
    </AppScreen>
  );
}
