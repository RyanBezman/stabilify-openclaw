import React from "react";
import { Animated, Easing, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SkeletonBlock from "../ui/SkeletonBlock";
import StepCardHeader from "../gym/logGymSession/StepCardHeader";
import StepProgress from "../gym/logGymSession/StepProgress";

type GymSessionAnalyzingCardProps = {
  cardHeight: number;
  photoUri: string;
  progress: number;
  phase?: "analyzing" | "verified" | "rejected";
  reason?: string | null;
  showCloseFriendValidation?: boolean;
  validationRequesting?: boolean;
  validationRequested?: boolean;
  onRequestCloseFriendValidation?: () => void;
  onClose?: () => void;
};

const PHOTO_SIZE = 144;
const RING_SIZE = 88;
const RING_STROKE = 6;
function clampProgress(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function ProgressBadge({ progress }: { progress: number }) {
  const clampedProgress = clampProgress(progress);
  const radius = Math.max((RING_SIZE - RING_STROKE) / 2, 1);
  const center = RING_SIZE / 2;
  const circumference = 2 * Math.PI * radius;
  const progressAnimation = React.useRef(new Animated.Value(clampedProgress)).current;
  const [animatedProgress, setAnimatedProgress] = React.useState(clampedProgress);

  React.useEffect(() => {
    const animation = Animated.timing(progressAnimation, {
      toValue: clampedProgress,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [clampedProgress, progressAnimation]);

  React.useEffect(() => {
    const subscription = progressAnimation.addListener(({ value }) => {
      setAnimatedProgress(clampProgress(value));
    });
    return () => {
      progressAnimation.removeListener(subscription);
    };
  }, [progressAnimation]);

  const strokeDashoffset = circumference * (1 - animatedProgress);
  const percent = Math.round(animatedProgress * 100);

  return (
    <View className="items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#ffffff"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-[13px] font-semibold text-white">{percent}%</Text>
      </View>
    </View>
  );
}

export default function GymSessionAnalyzingCard({
  cardHeight,
  photoUri,
  progress,
  phase = "analyzing",
  reason = null,
  showCloseFriendValidation = false,
  validationRequesting = false,
  validationRequested = false,
  onRequestCloseFriendValidation,
  onClose,
}: GymSessionAnalyzingCardProps) {
  return (
    <Card className="mb-6 border border-violet-500/25 p-5" style={{ height: cardHeight }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-violet-300">
          Add gym session
        </Text>
        {onClose ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1"
          >
            <Text className="text-xs font-semibold text-neutral-300">Close</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <StepProgress currentStep={4} totalSteps={4} />
      <StepCardHeader currentStep={4} />

      <ScrollView
        className="flex-1"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="mt-2 flex-row items-center gap-4">
          <View className="relative" style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}>
            <Image
              source={{ uri: photoUri }}
              style={{ width: "100%", height: "100%", borderRadius: 14 }}
              resizeMode="cover"
            />
            <View className="absolute inset-0 items-center justify-center">
              <ProgressBadge progress={progress} />
            </View>
          </View>

          <View className="flex-1 justify-center">
            <View className="flex-row items-center gap-2">
              {phase === "verified" ? (
                <View
                  className="h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                >
                  <Text className="text-xs font-bold text-white">✓</Text>
                </View>
              ) : null}
              <Text
                className={`text-base font-semibold ${
                  phase === "rejected" ? "text-amber-300" : "text-white"
                }`}
              >
                {phase === "verified"
                  ? "Verified"
                  : phase === "rejected"
                    ? "Needs validation"
                    : "Analyzing session..."}
              </Text>
              {phase === "rejected" ? (
                <View
                  className="h-6 w-6 items-center justify-center rounded-full bg-amber-500"
                >
                  <Text className="text-xs font-bold text-white">!</Text>
                </View>
              ) : null}
            </View>

            {phase === "analyzing" ? (
              <View className="mt-4 gap-2.5">
                <SkeletonBlock className="h-2 w-28 rounded-full" />
                <SkeletonBlock className="h-2 w-40 rounded-full" />
                <SkeletonBlock className="h-2 w-32 rounded-full" />
              </View>
            ) : (
              <Text className="mt-4 text-sm leading-5 text-neutral-300">
                {reason ?? "Session processing finished."}
              </Text>
            )}

            {phase === "analyzing" ? (
              <Text className="mt-5 text-xs text-neutral-400">We'll notify you when done.</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {phase === "rejected" && showCloseFriendValidation ? (
        validationRequested ? (
          <Button
            title="Validation requested"
            variant="secondary"
            disabled
            className="mt-4"
          />
        ) : (
          <Button
            title={validationRequesting ? "Requesting..." : "Ask close friends to validate"}
            onPress={onRequestCloseFriendValidation}
            loading={validationRequesting}
            disabled={validationRequesting}
            className="mt-4"
          />
        )
      ) : null}
    </Card>
  );
}
