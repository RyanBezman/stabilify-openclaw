import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type CircularProgressRingTone =
  | "neutral"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "blue";

export type CircularProgressRingProps = {
  label: string;
  value: number;
  valueText: string;
  subText: string;
  tone?: CircularProgressRingTone;
  progressColor?: string;
  size?: number;
  strokeWidth?: number;
  animateOnMount?: boolean;
  onPress?: () => void;
  testID?: string;
};

type TonePalette = {
  track: string;
  progress: string;
};

const TONE_PALETTE: Record<CircularProgressRingTone, TonePalette> = {
  neutral: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#a3a3a3",
  },
  violet: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#8b5cf6",
  },
  emerald: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#34d399",
  },
  amber: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#f59e0b",
  },
  rose: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#fb7185",
  },
  blue: {
    track: "rgba(255, 255, 255, 0.12)",
    progress: "#60a5fa",
  },
};

const RING_DURATION_MS = 420;

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export default function CircularProgressRing({
  label,
  value,
  valueText,
  subText,
  tone = "neutral",
  progressColor,
  size = 124,
  strokeWidth = 10,
  animateOnMount = true,
  onPress,
  testID,
}: CircularProgressRingProps) {
  const clampedValue = clampProgress(value);
  const initialProgress = useRef(animateOnMount ? 0 : clampedValue).current;
  const progressAnimation = useRef(new Animated.Value(initialProgress)).current;
  const isFirstRender = useRef(true);
  const [animatedProgress, setAnimatedProgress] = useState(initialProgress);

  useEffect(() => {
    const subscription = progressAnimation.addListener(({ value: nextValue }) => {
      setAnimatedProgress(clampProgress(nextValue));
    });

    return () => {
      progressAnimation.removeListener(subscription);
    };
  }, [progressAnimation]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!animateOnMount) {
        progressAnimation.setValue(clampedValue);
        return;
      }
    }

    const animation = Animated.timing(progressAnimation, {
      toValue: clampedValue,
      duration: RING_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [animateOnMount, clampedValue, progressAnimation]);

  const palette = TONE_PALETTE[tone];
  const radius = useMemo(() => Math.max((size - strokeWidth) / 2, 1), [size, strokeWidth]);
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animatedProgress);
  const valueTextClassName = size <= 100 ? "text-xl" : "text-2xl";
  const subTextClassName = size <= 100 ? "text-[10px]" : "text-[11px]";

  const content = (
    <View className="items-center">
      <View className="items-center justify-center" style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={palette.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor ?? palette.progress}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View className="absolute items-center px-2">
          <Text className={`${valueTextClassName} font-semibold text-white`}>{valueText}</Text>
          <Text className={`mt-0.5 ${subTextClassName} text-neutral-400`}>{subText}</Text>
        </View>
      </View>
      <Text className="mt-3 text-sm font-semibold text-white">{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      className="items-center"
    >
      {content}
    </TouchableOpacity>
  );
}
