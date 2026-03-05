import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type GuestHeaderProps = {
  onProfilePress: () => void;
};

export default function GuestHeader({ onProfilePress }: GuestHeaderProps) {
  const topRowOpacity = useRef(new Animated.Value(0)).current;
  const topRowTranslateY = useRef(new Animated.Value(8)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;
  const supportOpacity = useRef(new Animated.Value(0)).current;
  const supportTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    let isMounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    const runAnimation = async () => {
      const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled().catch(
        () => false,
      );

      if (!isMounted) {
        return;
      }

      if (reduceMotionEnabled) {
        topRowOpacity.setValue(1);
        topRowTranslateY.setValue(0);
        badgeOpacity.setValue(1);
        badgeTranslateY.setValue(0);
        titleOpacity.setValue(1);
        titleTranslateY.setValue(0);
        supportOpacity.setValue(1);
        supportTranslateY.setValue(0);
        return;
      }

      topRowOpacity.setValue(0);
      topRowTranslateY.setValue(8);
      badgeOpacity.setValue(0);
      badgeTranslateY.setValue(8);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(8);
      supportOpacity.setValue(0);
      supportTranslateY.setValue(8);

      const baseConfig = {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      } as const;

      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(topRowOpacity, { toValue: 1, ...baseConfig }),
          Animated.timing(topRowTranslateY, { toValue: 0, ...baseConfig }),
        ]),
        Animated.stagger(70, [
          Animated.parallel([
            Animated.timing(badgeOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(badgeTranslateY, { toValue: 0, ...baseConfig }),
          ]),
          Animated.parallel([
            Animated.timing(titleOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(titleTranslateY, { toValue: 0, ...baseConfig }),
          ]),
          Animated.parallel([
            Animated.timing(supportOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(supportTranslateY, { toValue: 0, ...baseConfig }),
          ]),
        ]),
      ]);

      animation.start();
    };

    runAnimation();

    return () => {
      isMounted = false;
      animation?.stop();
    };
  }, [
    badgeOpacity,
    badgeTranslateY,
    supportOpacity,
    supportTranslateY,
    titleOpacity,
    titleTranslateY,
    topRowOpacity,
    topRowTranslateY,
  ]);

  return (
    <View className="mb-10">
      <Animated.View
        className="mb-5 flex-row items-center justify-between gap-3"
        style={{
          opacity: topRowOpacity,
          transform: [{ translateY: topRowTranslateY }],
        }}
      >
        <View className="min-w-0 flex-1">
          <View className="flex-row items-end gap-2.5">
            <Image
              source={require("../../assets/scale-logo.png")}
              className="h-9 w-9"
              resizeMode="contain"
              accessibilityLabel="Stabilify app icon"
            />
            <View className="h-9 justify-end">
              <Text
                numberOfLines={1}
                className="text-3xl font-bold tracking-tight text-white"
                style={{ lineHeight: 30, includeFontPadding: false, marginBottom: -2 }}
              >
                Stabilify
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={onProfilePress}
          className="h-11 min-w-[88px] items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 px-4"
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text className="text-sm font-semibold text-white">Sign in</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        className="self-start rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1"
        style={{
          opacity: badgeOpacity,
          transform: [{ translateY: badgeTranslateY }],
        }}
      >
        <Text className="text-xs font-medium tracking-wide text-neutral-300">
          Consistency-first tracking
        </Text>
      </Animated.View>

      <Animated.Text
        className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white"
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}
      >
        {"Build consistency\nyou can measure"}
      </Animated.Text>
      <Animated.Text
        className="mt-3 max-w-[92%] text-base leading-relaxed text-neutral-400"
        style={{
          opacity: supportOpacity,
          transform: [{ translateY: supportTranslateY }],
        }}
      >
        Log in seconds, smooth out daily noise, and build a streak you can keep.
      </Animated.Text>
    </View>
  );
}
