import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Card from "../ui/Card";

function SkeletonBlock({
  className,
  shimmerValue,
}: {
  className: string;
  shimmerValue: Animated.Value;
}) {
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
}

export default function GymSettingsSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shimmerValue.setValue(0);
    const animation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerValue]);

  return (
    <Card className="p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <SkeletonBlock
            className="h-4 w-40 rounded-full"
            shimmerValue={shimmerValue}
          />
          <SkeletonBlock
            className="mt-2.5 h-3 w-56 rounded-full"
            shimmerValue={shimmerValue}
          />
        </View>
        <SkeletonBlock
          className="ml-4 h-8 w-14 rounded-full"
          shimmerValue={shimmerValue}
        />
      </View>
    </Card>
  );
}
