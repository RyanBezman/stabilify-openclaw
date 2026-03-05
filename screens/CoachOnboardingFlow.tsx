import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import OnboardingHero from "../components/coaches/onboarding/OnboardingHero";
import OnboardingStepContent from "../components/coaches/onboarding/OnboardingStepContent";
import OnboardingTopBar from "../components/coaches/onboarding/OnboardingTopBar";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";
import {
  submitCoachOnboardingWorkflow,
  useCoachOnboarding,
  type CoachOnboardingStepId,
} from "../lib/features/coaches";

type Props = NativeStackScreenProps<RootStackParamList, "CoachOnboardingFlow">;

const GENERATING_PHASES_BY_START = {
  both: [
    "Saving your coaching profile",
    "Generating workout plan",
    "Generating nutrition plan",
    "Finalizing coach workspace",
  ],
  workout: [
    "Saving your coaching profile",
    "Generating workout plan",
    "Finalizing coach workspace",
  ],
  nutrition: [
    "Saving your coaching profile",
    "Generating nutrition plan",
    "Finalizing coach workspace",
  ],
} as const;

const LOADING_TIPS = [
  "Calibrating your plan to your goal, schedule, and constraints.",
  "Balancing training intensity and recovery for consistency.",
  "Setting nutrition targets that match your selected outcome.",
  "Final quality checks before opening your workspace.",
] as const;

export default function CoachOnboardingFlow({ navigation }: Props) {
  const {
    currentStep,
    draft,
    patchDraft,
    canContinue,
    validationError,
    stepIndex,
    totalSteps,
    progress,
    next,
    back,
    isLastStep,
    submitting,
    submitError,
    setSubmitStart,
    setSubmitDone,
    setSubmitError,
  } = useCoachOnboarding();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [submitSeconds, setSubmitSeconds] = useState(0);

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(18);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 180, mass: 0.6, useNativeDriver: true }),
    ]).start();
  }, [currentStep, fade, scale, slide]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (!submitting) {
      setGeneratingIndex(0);
      setTipIndex(0);
      setSubmitSeconds(0);
      return;
    }

    const phases = GENERATING_PHASES_BY_START[draft.planStart];
    const interval = setInterval(() => {
      setGeneratingIndex((prev) => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 900);
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 2400);
    const secondsInterval = setInterval(() => {
      setSubmitSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
      clearInterval(secondsInterval);
    };
  }, [draft.planStart, submitting]);

  useEffect(() => {
    if (!submitting) {
      loadingPulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      loadingPulse.setValue(0);
    };
  }, [loadingPulse, submitting]);

  const title = useMemo(() => {
    const titleByStep: Record<CoachOnboardingStepId, string> = {
      goal: "What is your goal?",
      experience: "How experienced are you?",
      schedule: "How often can you train?",
      equipment: "What equipment do you have?",
      nutrition: "How do you like to eat?",
      constraints: "Any constraints to plan around?",
      sex: "Select your sex",
      weight: "Set your weight",
      height: "Set your height",
      persona: "Pick your coach personality",
      plan_start: "How do you want to start?",
      review: "Review and build your plan",
    };
    return titleByStep[currentStep];
  }, [currentStep]);

  const subtitle = useMemo(() => {
    const subtitleByStep: Record<CoachOnboardingStepId, string> = {
      goal: "Choose the primary outcome you care about most right now.",
      experience: "We adapt complexity and pacing to your training level.",
      schedule: "We’ll design the plan around your real week.",
      equipment: "Your program will only include what you can actually use.",
      nutrition: "Set preferences now so food recommendations feel realistic.",
      constraints: "Tell us what to work around so consistency stays high.",
      sex: "This helps estimate calories and macros accurately.",
      weight: "Use the wheel to set your current bodyweight.",
      height: "Use feet and inches to dial in your height.",
      persona: "One unified personality across workout and nutrition coaching.",
      plan_start: "Choose workout, nutrition, or both to generate first.",
      review: "Quick confirmation before your first plans are generated.",
    };
    return subtitleByStep[currentStep];
  }, [currentStep]);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitStart();
    const res = await submitCoachOnboardingWorkflow(draft);
    if (res.error) {
      setSubmitError(res.error);
      return;
    }
    setSubmitDone();
    navigation.replace("CoachOnboardingResults", {
      planStart: draft.planStart,
      coachGender: draft.persona.gender,
      coachPersonality: draft.persona.personality,
    });
  };

  const exitOnboarding = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Authed", {
      screen: "Today",
    });
  };

  const summaryChips = useMemo(
    () => [
      `${draft.training.daysPerWeek} days/week`,
      `${draft.training.sessionMinutes} min sessions`,
      draft.goal.primary,
      `${draft.persona.personality} coach`,
    ],
    [draft.goal.primary, draft.persona.personality, draft.training.daysPerWeek, draft.training.sessionMinutes],
  );

  const generatingPhases = GENERATING_PHASES_BY_START[draft.planStart];
  const loadingProgressPct = Math.round(((generatingIndex + 1) / generatingPhases.length) * 100);
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

  if (submitting) {
    return (
      <AppScreen className="flex-1 bg-neutral-950 px-6" maxContentWidth={720}>
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-md gap-4">
            <Text className="text-center text-2xl font-bold text-white">Building your coaching setup</Text>
            <Text className="text-center text-sm text-neutral-400">We’re preparing your selected plans and coach workspace.</Text>

            <View className="mt-3 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5">
              <View className="mb-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-400">Progress</Text>
                  <Text className="text-xs font-semibold text-violet-200">{loadingProgressPct}%</Text>
                </View>
                <View className="h-2 w-full rounded-full bg-neutral-800">
                  <View
                    className="h-2 rounded-full bg-violet-400"
                    style={{ width: `${loadingProgressPct}%` }}
                  />
                </View>
                <Text className="mt-2 text-[11px] text-neutral-500">Elapsed: {submitSeconds}s</Text>
              </View>

              {generatingPhases.map((phase, idx) => {
                const done = idx < generatingIndex;
                const active = idx === generatingIndex;
                return (
                  <View key={phase} className="mb-3 flex-row items-center gap-3 last:mb-0">
                    <Text className={`text-base ${done ? "text-emerald-300" : active ? "text-violet-200" : "text-neutral-600"}`}>
                      {done ? "✓" : active ? "◉" : "○"}
                    </Text>
                    <Text className={`text-sm font-medium ${done ? "text-emerald-200" : active ? "text-neutral-200" : "text-neutral-500"}`}>
                      {phase}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Animated.View style={tipFadeStyle} className="mt-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-neutral-400">What’s happening now</Text>
              <Text className="mt-2 text-sm leading-relaxed text-neutral-200">{LOADING_TIPS[tipIndex]}</Text>
            </Animated.View>

            <View className="mt-2 flex-row items-center justify-center gap-2">
              <ActivityIndicator color="#a78bfa" />
              <Text className="text-sm font-semibold text-neutral-300">Please keep this screen open…</Text>
            </View>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <OnboardingTopBar
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        progressAnim={progressAnim}
        onBack={() => (stepIndex === 0 ? exitOnboarding() : back())}
      />

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-6" keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }, { scale }] }}>
          <OnboardingHero title={title} subtitle={subtitle} showReadyBadge={currentStep === "review"} />

          {currentStep === "weight" || currentStep === "height" ? (
            <View className="mt-6 px-1">
              <OnboardingStepContent
                currentStep={currentStep}
                draft={draft}
                summaryChips={summaryChips}
                patchDraft={patchDraft}
              />
            </View>
          ) : (
            <Card className="mt-6 p-5">
              <OnboardingStepContent
                currentStep={currentStep}
                draft={draft}
                summaryChips={summaryChips}
                patchDraft={patchDraft}
              />
            </Card>
          )}

          {validationError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{validationError}</Text> : null}
          {submitError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{submitError}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View className="border-t border-neutral-900 bg-neutral-950 px-5 pb-6 pt-4">
        {isLastStep ? (
          <Text className="mb-3 text-center text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
            Your coach persona will be used across workout + nutrition
          </Text>
        ) : null}
        <Button
          title={isLastStep ? "Build my plan" : "Continue"}
          onPress={() => (isLastStep ? void onSubmit() : next())}
          disabled={!canContinue}
        />
      </View>
    </AppScreen>
  );
}
