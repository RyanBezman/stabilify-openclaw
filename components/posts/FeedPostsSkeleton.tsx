import { View } from "react-native";
import SkeletonBlock from "../ui/SkeletonBlock";

type FeedPostsSkeletonProps = {
  rows?: number;
};

function FeedPostSkeletonRow() {
  return (
    <View className="w-full px-4 py-3.5">
      <View className="flex-row">
        <SkeletonBlock className="mr-3 h-11 w-11 rounded-full" />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <SkeletonBlock className="h-4 w-36 rounded-full" />
            <SkeletonBlock className="h-4 w-12 rounded-full" />
          </View>

          <SkeletonBlock className="mt-2 h-3.5 w-full rounded-full" />
          <SkeletonBlock className="mt-2 h-3.5 w-11/12 rounded-full" />
          <SkeletonBlock className="mt-2 h-3.5 w-7/12 rounded-full" />

          <SkeletonBlock className="mt-2.5 h-4 w-20 rounded-full" />
        </View>
      </View>
    </View>
  );
}

export default function FeedPostsSkeleton({ rows = 3 }: FeedPostsSkeletonProps) {
  return (
    <View className="border-y border-neutral-800/70">
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={`feed-post-skeleton-${index}`}
          className={index < rows - 1 ? "border-b border-neutral-800/70" : ""}
        >
          <FeedPostSkeletonRow />
        </View>
      ))}
    </View>
  );
}
