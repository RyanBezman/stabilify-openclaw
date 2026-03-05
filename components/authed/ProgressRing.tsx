import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type ProgressRingTone = "violet" | "emerald" | "amber" | "rose" | "neutral";

type ProgressRingProps = {
  progress: number;
  valueText: string;
  subText?: string;
  tone?: ProgressRingTone;
  size?: number;
  strokeWidth?: number;
};

const TONE_COLORS: Record<ProgressRingTone, { track: string; progress: string }> = {
  violet: { track: "#2f2a3a", progress: "#8b5cf6" },
  emerald: { track: "#1f3430", progress: "#34d399" },
  amber: { track: "#3d3222", progress: "#f59e0b" },
  rose: { track: "#3e2530", progress: "#fb7185" },
  neutral: { track: "#2f2f2f", progress: "#a3a3a3" },
};

function clampProgress(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export default function ProgressRing({
  progress,
  valueText,
  subText,
  tone = "violet",
  size = 92,
  strokeWidth = 9,
}: ProgressRingProps) {
  const clampedProgress = clampProgress(progress);
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const colors = TONE_COLORS[tone];

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.progress}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View className="absolute items-center px-1">
        <Text className="text-lg font-semibold text-white">{valueText}</Text>
        {subText ? <Text className="text-[10px] text-neutral-400">{subText}</Text> : null}
      </View>
    </View>
  );
}
