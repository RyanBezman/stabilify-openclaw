import { ActivityIndicator, Animated, Text, View } from "react-native";

type CoachFlowProgressOverlayProps = {
  title: string;
  subtitle: string;
  elapsedSeconds: number;
  progressPct: number;
  phases: readonly string[];
  activePhaseIndex: number;
  tips: readonly string[];
  activeTipIndex: number;
  loadingPulse: Animated.Value;
};

export default function CoachFlowProgressOverlay({
  title,
  subtitle,
  elapsedSeconds,
  progressPct,
  phases,
  activePhaseIndex,
  tips,
  activeTipIndex,
  loadingPulse,
}: CoachFlowProgressOverlayProps) {
  const tipFadeStyle = {
    opacity: loadingPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.65, 1],
    }),
    transform: [
      {
        scale: loadingPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.995, 1],
        }),
      },
    ],
  };

  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-full max-w-md gap-4">
        <Text className="text-center text-2xl font-bold text-white">{title}</Text>
        <Text className="text-center text-sm text-neutral-400">{subtitle}</Text>

        <View className="mt-3 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5">
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-400">
                Progress
              </Text>
              <Text className="text-xs font-semibold text-violet-200">{progressPct}%</Text>
            </View>
            <View className="h-2 w-full rounded-full bg-neutral-800">
              <View
                className="h-2 rounded-full bg-violet-400"
                style={{ width: `${progressPct}%` }}
              />
            </View>
            <Text className="mt-2 text-[11px] text-neutral-500">
              Elapsed: {elapsedSeconds}s
            </Text>
          </View>

          {phases.map((phase, index) => {
            const done = index < activePhaseIndex;
            const active = index === activePhaseIndex;
            return (
              <View
                key={phase}
                className="mb-3 flex-row items-center gap-3 last:mb-0"
              >
                <Text
                  className={`text-base ${
                    done
                      ? "text-emerald-300"
                      : active
                        ? "text-violet-200"
                        : "text-neutral-600"
                  }`}
                >
                  {done ? "✓" : active ? "◉" : "○"}
                </Text>
                <Text
                  className={`text-sm font-medium ${
                    done
                      ? "text-emerald-200"
                      : active
                        ? "text-neutral-200"
                        : "text-neutral-500"
                  }`}
                >
                  {phase}
                </Text>
              </View>
            );
          })}
        </View>

        <Animated.View
          style={tipFadeStyle}
          className="mt-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-neutral-400">
            What’s happening now
          </Text>
          <Text className="mt-2 text-sm leading-relaxed text-neutral-200">
            {tips[activeTipIndex]}
          </Text>
        </Animated.View>

        <View className="mt-2 flex-row items-center justify-center gap-2">
          <ActivityIndicator color="#a78bfa" />
          <Text className="text-sm font-semibold text-neutral-300">
            Please keep this screen open...
          </Text>
        </View>
      </View>
    </View>
  );
}
