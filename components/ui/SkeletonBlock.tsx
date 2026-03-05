import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

type SkeletonBlockProps = {
  className?: string;
};

// Simple shimmer skeleton block (no gradients; uses a sweeping highlight).
export default function SkeletonBlock({ className }: SkeletonBlockProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  const highlightStyle = useMemo(() => {
    const travel = Math.max(1, width);
    return {
      transform: [
        {
          translateX: translateX.interpolate({
            inputRange: [0, 1],
            outputRange: [-travel, travel],
          }),
        },
      ],
    };
  }, [translateX, width]);

  useEffect(() => {
    if (!width) return;
    translateX.setValue(0);
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [translateX, width]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={`overflow-hidden rounded-2xl bg-neutral-900 ${className ?? ""}`}
    >
      <Animated.View
        pointerEvents="none"
        style={highlightStyle}
        className="absolute inset-y-0 w-24 bg-white/10"
      />
    </View>
  );
}

