import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Card from "../ui/Card";

const SkeletonBlock = ({
  className,
  shimmerValue,
}: {
  className: string;
  shimmerValue: Animated.Value;
}) => {
  const [width, setWidth] = useState(0);
  const shimmerWidth = Math.max(width * 0.35, 28);
  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth, width + shimmerWidth],
  });

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className={`relative overflow-hidden bg-neutral-800/80 ${className}`}
    >
      {width > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: shimmerWidth,
            transform: [{ translateX }],
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
      ) : null}
    </View>
  );
};

export default function DashboardSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shimmerValue.setValue(0);
    const animation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerValue]);

  return (
    <View>
      <View className="mb-8 flex-row items-center justify-between">
        <View>
          <SkeletonBlock
            className="mb-2 h-3 w-24 rounded-full"
            shimmerValue={shimmerValue}
          />
          <SkeletonBlock
            className="h-6 w-32 rounded-full"
            shimmerValue={shimmerValue}
          />
        </View>
        <SkeletonBlock
          className="h-8 w-20 rounded-full"
          shimmerValue={shimmerValue}
        />
      </View>

      <Card className="mb-6 p-5">
        <View className="flex-row items-center">
          <SkeletonBlock
            className="mr-4 h-12 w-12 rounded-full"
            shimmerValue={shimmerValue}
          />
          <View className="flex-1">
            <SkeletonBlock
              className="mb-2 h-4 w-28 rounded-full"
              shimmerValue={shimmerValue}
            />
            <SkeletonBlock
              className="h-3 w-40 rounded-full"
              shimmerValue={shimmerValue}
            />
          </View>
          <View className="items-end">
            <SkeletonBlock
              className="mb-2 h-3 w-16 rounded-full"
              shimmerValue={shimmerValue}
            />
            <SkeletonBlock
              className="h-4 w-12 rounded-full"
              shimmerValue={shimmerValue}
            />
          </View>
        </View>
        <View className="mt-4 flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3">
          <View>
            <SkeletonBlock
              className="mb-2 h-3 w-24 rounded-full"
              shimmerValue={shimmerValue}
            />
            <SkeletonBlock
              className="h-6 w-20 rounded-full"
              shimmerValue={shimmerValue}
            />
          </View>
          <View className="items-end">
            <SkeletonBlock
              className="mb-2 h-3 w-20 rounded-full"
              shimmerValue={shimmerValue}
            />
            <SkeletonBlock
              className="h-5 w-16 rounded-full"
              shimmerValue={shimmerValue}
            />
          </View>
        </View>
      </Card>

      <Card className="mb-6 p-4">
        <SkeletonBlock
          className="h-5 w-48 rounded-full"
          shimmerValue={shimmerValue}
        />
      </Card>

      <Card className="mb-6 p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <SkeletonBlock
            className="h-3 w-24 rounded-full"
            shimmerValue={shimmerValue}
          />
          <SkeletonBlock
            className="h-3 w-32 rounded-full"
            shimmerValue={shimmerValue}
          />
        </View>
        <SkeletonBlock
          className="h-28 w-full rounded-xl"
          shimmerValue={shimmerValue}
        />
      </Card>

      <Card className="mb-6 p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <SkeletonBlock
            className="h-3 w-24 rounded-full"
            shimmerValue={shimmerValue}
          />
          <SkeletonBlock
            className="h-6 w-20 rounded-full"
            shimmerValue={shimmerValue}
          />
        </View>
        <SkeletonBlock
          className="h-6 w-16 rounded-full"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="mt-2 h-3 w-28 rounded-full"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="mt-4 h-2 w-full rounded-full"
          shimmerValue={shimmerValue}
        />
      </Card>

      <Card className="mb-6 p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <SkeletonBlock
            className="h-3 w-28 rounded-full"
            shimmerValue={shimmerValue}
          />
          <SkeletonBlock
            className="h-3 w-24 rounded-full"
            shimmerValue={shimmerValue}
          />
        </View>
        <SkeletonBlock
          className="h-6 w-24 rounded-full"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="mt-2 h-3 w-20 rounded-full"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="mt-4 h-2 w-full rounded-full"
          shimmerValue={shimmerValue}
        />
      </Card>

      <View className="mb-8 flex-row gap-3">
        <SkeletonBlock
          className="h-20 flex-1 rounded-2xl"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="h-20 flex-1 rounded-2xl"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="h-20 flex-1 rounded-2xl"
          shimmerValue={shimmerValue}
        />
      </View>

      <Card className="mb-8 p-5">
        <SkeletonBlock
          className="mb-4 h-3 w-32 rounded-full"
          shimmerValue={shimmerValue}
        />
        <SkeletonBlock
          className="h-20 w-full rounded-xl"
          shimmerValue={shimmerValue}
        />
      </Card>
    </View>
  );
}
