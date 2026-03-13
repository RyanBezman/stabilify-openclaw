import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import CoachFlowProgressOverlay from "../components/coaches/flow/CoachFlowProgressOverlay";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";
import {
  buildGeneratedTracksFromPlanStart,
  createInitialCoachOnboardingDraft,
  coachFromSelection,
  fetchCoachUserProfileJson,
  mapCoachUserProfileJsonToDraft,
  submitCoachOnboardingWorkflow,
  useCoach,
  useCoachOnboarding,
  COACH_ONBOARDING_STEPS,
  type CoachOnboardingStepId,
} from "../lib/features/coaches";
import { fetchCurrentAuthUser } from "../lib/features/auth";

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

function serializeDraft(draft: ReturnType<typeof createInitialCoachOnboardingDraft>) {
  return JSON.stringify(draft);
}

export default function CoachOnboardingFlow({ navigation, route }: Props) {
  const { setActiveCoach } = useCoach();
  const allowNavigationRef = useRef(false);
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
    goToStep,
    isLastStep,
    submitting,
    submitError,
    setSubmitStart,
    setSubmitDone,
    setSubmitError,
    setDraft,
  } = useCoachOnboarding();
  const prefillAppliedRef = useRef(false);
  const [entryDraftJson, setEntryDraftJson] = useState(() =>
    serializeDraft(createInitialCoachOnboardingDraft()),
  );
  const [prefillLoading, setPrefillLoading] = useState(
    Boolean(
      route.params?.prefillFromCurrentProfile ||
        route.params?.prefillCoachGender ||
        route.params?.prefillCoachPersonality ||
        route.params?.prefillPlanStart ||
        route.params?.startAtStep,
    ),
  );
  const [prefillError, setPrefillError] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [submitSeconds, setSubmitSeconds] = useState(0);

  useEffect(() => {
    if (prefillAppliedRef.current) {
      return;
    }

    const hasPrefillRequest = Boolean(
      route.params?.prefillFromCurrentProfile ||
        route.params?.prefillCoachGender ||
        route.params?.prefillCoachPersonality ||
        route.params?.prefillPlanStart ||
        route.params?.startAtStep,
    );

    if (!hasPrefillRequest) {
      setEntryDraftJson(serializeDraft(createInitialCoachOnboardingDraft()));
      setPrefillLoading(false);
      return;
    }

    prefillAppliedRef.current = true;
    let mounted = true;

    const applyPrefill = async () => {
      setPrefillLoading(true);
      setPrefillError(null);

      let profile: Record<string, unknown> | null = null;
      if (route.params?.prefillFromCurrentProfile) {
        const authResult = await fetchCurrentAuthUser();
        const userId = authResult.data?.user?.id ?? null;
          if (authResult.error || !userId) {
            if (mounted) {
              setPrefillError(
                authResult.error ?? "Couldn't load your current coaching setup.",
              );
            }
          } else {
            const profileResult = await fetchCoachUserProfileJson(userId);
            if (profileResult.error) {
              if (mounted) {
                setPrefillError(
                  profileResult.error ?? "Couldn't load your current coaching setup.",
                );
              }
            } else {
              profile = profileResult.data?.profile ?? null;
          }
        }
      }

      const nextDraft = mapCoachUserProfileJsonToDraft(profile, {
        gender: route.params?.prefillCoachGender,
        personality: route.params?.prefillCoachPersonality,
        planStart: route.params?.prefillPlanStart,
      });

      if (!mounted) {
        return;
      }

      if (!profile && !route.params?.prefillFromCurrentProfile) {
        const fallbackDraft = createInitialCoachOnboardingDraft();
        fallbackDraft.persona = nextDraft.persona;
        fallbackDraft.planStart = nextDraft.planStart;
        setDraft(fallbackDraft);
        setEntryDraftJson(serializeDraft(fallbackDraft));
      } else {
        setDraft(nextDraft);
        setEntryDraftJson(serializeDraft(nextDraft));
      }

      if (route.params?.startAtStep) {
        const stepIndex = COACH_ONBOARDING_STEPS.indexOf(
          route.params.startAtStep,
        );
        if (stepIndex >= 0) {
          goToStep(stepIndex);
        }
      }

      setPrefillLoading(false);
    };

    void applyPrefill();

    return () => {
      mounted = false;
    };
  }, [
    goToStep,
    route.params?.prefillCoachGender,
    route.params?.prefillCoachPersonality,
    route.params?.prefillFromCurrentProfile,
    route.params?.prefillPlanStart,
    route.params?.startAtStep,
    setDraft,
  ]);

  const isDirty = useMemo(
    () => serializeDraft(draft) !== entryDraftJson,
    [draft, entryDraftJson],
  );

  const exitOnboarding = useCallback(() => {
    allowNavigationRef.current = true;

    if (route.params?.returnTo === "today") {
      navigation.navigate("Authed", {
        screen: "Today",
      });
      return;
    }

    navigation.navigate("Authed", {
      screen: "Coaches",
      params: {
        specialization: route.params?.specialization,
      },
    });
  }, [navigation, route.params?.returnTo, route.params?.specialization]);

  const confirmExitIfDirty = useCallback(
    (onExit: () => void) => {
      if (submitting) {
        return;
      }

      if (!isDirty) {
        onExit();
        return;
      }

      Alert.alert("Leave setup?", "Your onboarding progress won't be saved.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: onExit,
        },
      ]);
    },
    [isDirty, submitting],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowNavigationRef.current || submitting || !isDirty) {
        return;
      }

      event.preventDefault();
      confirmExitIfDirty(() => {
        allowNavigationRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [confirmExitIfDirty, isDirty, navigation, submitting]);

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
    const subtitleByStep: Record<CoachOnboardingStepId, string | undefined> = {
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
      review: undefined,
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
    setActiveCoach(
      "workout",
      coachFromSelection("workout", draft.persona.gender, draft.persona.personality)
    );
    setActiveCoach(
      "nutrition",
      res.data?.nutritionLinked === false
        ? null
        : coachFromSelection("nutrition", draft.persona.gender, draft.persona.personality)
    );
    setSubmitDone();
    allowNavigationRef.current = true;
    navigation.replace("CoachOnboardingResults", {
      planStart: draft.planStart,
      coachGender: draft.persona.gender,
      coachPersonality: draft.persona.personality,
      generatedTracks:
        res.data?.generatedTracks
        ?? buildGeneratedTracksFromPlanStart(draft.planStart),
      warning: res.data?.warning,
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
  if (prefillLoading) {
    return (
      <AppScreen className="flex-1 bg-neutral-950 px-6" maxContentWidth={720}>
        <View className="flex-1 items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900 px-6">
          <ActivityIndicator color="#a78bfa" />
          <Text className="mt-4 text-lg font-semibold text-white">
            Loading your current coaching setup
          </Text>
          <Text className="mt-2 text-center text-sm leading-relaxed text-neutral-400">
            We’re pulling your saved goals, schedule, and preferences so you can switch coaches without starting from scratch.
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (submitting) {
    return (
      <AppScreen className="flex-1 bg-neutral-950 px-6" maxContentWidth={720}>
        <CoachFlowProgressOverlay
          title="Building your coaching setup"
          subtitle="We’re preparing your selected plans and coach workspace."
          elapsedSeconds={submitSeconds}
          progressPct={loadingProgressPct}
          phases={generatingPhases}
          activePhaseIndex={generatingIndex}
          tips={LOADING_TIPS}
          activeTipIndex={tipIndex}
          loadingPulse={loadingPulse}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <OnboardingTopBar
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        progressAnim={progressAnim}
        currentStepLabel={title}
        onBack={() => (stepIndex === 0 ? confirmExitIfDirty(exitOnboarding) : back())}
        onClose={() => confirmExitIfDirty(exitOnboarding)}
      />

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-6" keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }, { scale }] }}>
          <OnboardingHero title={title} subtitle={subtitle} showReadyBadge={currentStep === "review"} />

          {prefillError ? (
            <Card className="mt-4 border border-amber-500/30 bg-amber-500/10 p-4">
              <Text className="text-sm font-semibold text-amber-200">{prefillError}</Text>
            </Card>
          ) : null}

          {stepIndex > 1 && currentStep !== "review" ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {summaryChips.slice(0, 3).map((chip) => (
                <View key={chip} className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5">
                  <Text className="text-[11px] font-semibold text-neutral-300">{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {currentStep === "weight" || currentStep === "height" ? (
            <View className="mt-6 px-1">
              <OnboardingStepContent
                currentStep={currentStep}
                draft={draft}
                summaryChips={summaryChips}
                patchDraft={patchDraft}
                onEditProfile={() => goToStep(0)}
                onEditPlanSetup={() => goToStep(9)}
              />
            </View>
          ) : (
            <Card className="mt-6 p-5">
              <OnboardingStepContent
                currentStep={currentStep}
                draft={draft}
                summaryChips={summaryChips}
                patchDraft={patchDraft}
                onEditProfile={() => goToStep(0)}
                onEditPlanSetup={() => goToStep(9)}
              />
            </Card>
          )}

          {validationError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{validationError}</Text> : null}
          {submitError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{submitError}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View className="border-t border-neutral-900 bg-neutral-950 px-5 pb-6 pt-4">
        <Button
          title={isLastStep ? "Build my plan" : "Continue"}
          onPress={() => (isLastStep ? void onSubmit() : next())}
          disabled={!canContinue}
        />
      </View>
    </AppScreen>
  );
}
