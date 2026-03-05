import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function TypingPulse() {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.1] });

  return (
    <View className="h-6 w-6 items-center justify-center">
      <View className="h-2.5 w-2.5 rounded-full bg-neutral-200/80" />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: 18,
            height: 18,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: "rgba(229, 229, 229, 0.7)", // neutral-200/70
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    </View>
  );
}

