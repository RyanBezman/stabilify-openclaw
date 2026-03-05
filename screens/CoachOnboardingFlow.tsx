import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import OptionPill from "../components/ui/OptionPill";
import type { RootStackParamList } from "../lib/navigation/types";
import {
  submitCoachOnboardingWorkflow,
  useCoachOnboarding,
  type CoachOnboardingStepId,
} from "../lib/features/coaches";

type Props = NativeStackScreenProps<RootStackParamList, "CoachOnboardingFlow">;

const NUTRITION_PREFS = ["high_protein", "simple_meals", "high_carb", "mediterranean"] as const;
const NUTRITION_RESTRICTIONS = ["vegetarian", "vegan", "no_dairy", "gluten_free"] as const;
const GENERATING_STATES = [
  "Analyzing your goals...",
  "Building your training plan...",
  "Tuning your nutrition targets...",
] as const;

export default function CoachOnboardingFlow({ navigation, route }: Props) {
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
  const [generatingIndex, setGeneratingIndex] = useState(0);

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(18);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [currentStep, fade, slide]);

  useEffect(() => {
    if (!submitting) {
      setGeneratingIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setGeneratingIndex((prev) => (prev + 1) % GENERATING_STATES.length);
    }, 900);

    return () => clearInterval(interval);
  }, [submitting]);

  const title = useMemo(() => {
    const titleByStep: Record<CoachOnboardingStepId, string> = {
      goal: "What is your goal?",
      experience: "How experienced are you?",
      schedule: "How often can you train?",
      equipment: "What equipment do you have?",
      nutrition: "How do you like to eat?",
      constraints: "Any constraints to plan around?",
      stats: "Let’s personalize your plan",
      persona: "Pick your coach personality",
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
      stats: "These numbers help the coach calibrate targets correctly.",
      persona: "One unified personality across workout and nutrition coaching.",
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
    navigation.replace("CoachWorkspace", {
      specialization: route.params?.specialization ?? "workout",
      tab: "plan",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => (stepIndex === 0 ? navigation.goBack() : back())}>
            <Text className="text-sm font-semibold text-neutral-400">Back</Text>
          </TouchableOpacity>
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500">
            {stepIndex + 1}/{totalSteps}
          </Text>
        </View>
        <View className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-900">
          <View className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-6" keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
          <Text className="text-3xl font-bold tracking-tight text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-relaxed text-neutral-400">{subtitle}</Text>

          <Card className="mt-6 p-5">
            {currentStep === "goal" ? (
              <View className="gap-3">
                <OptionPill label="Lose fat" selected={draft.goal.primary === "lose"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "lose" } }))} />
                <OptionPill label="Maintain" selected={draft.goal.primary === "maintain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "maintain" } }))} />
                <OptionPill label="Gain muscle" selected={draft.goal.primary === "gain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "gain" } }))} />
              </View>
            ) : null}

            {currentStep === "experience" ? (
              <View className="gap-3">
                <OptionPill label="Beginner" selected={draft.experienceLevel === "beginner"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "beginner" }))} />
                <OptionPill label="Intermediate" selected={draft.experienceLevel === "intermediate"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "intermediate" }))} />
                <OptionPill label="Advanced" selected={draft.experienceLevel === "advanced"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "advanced" }))} />
              </View>
            ) : null}

            {currentStep === "schedule" ? (
              <View className="gap-4">
                <Text className="text-sm font-semibold text-neutral-300">Days per week</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <OptionPill key={d} label={`${d} days`} selected={draft.training.daysPerWeek === d} onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, daysPerWeek: d } }))} />
                  ))}
                </View>
                <Text className="text-sm font-semibold text-neutral-300">Session length</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[30, 45, 60, 75].map((m) => (
                    <OptionPill key={m} label={`${m} min`} selected={draft.training.sessionMinutes === m} onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, sessionMinutes: m as 30 | 45 | 60 | 75 } }))} />
                  ))}
                </View>
              </View>
            ) : null}

            {currentStep === "equipment" ? (
              <View className="gap-3">
                {[
                  ["full_gym", "Full gym"],
                  ["home_gym", "Home gym"],
                  ["dumbbells", "Dumbbells"],
                  ["bodyweight", "Bodyweight"],
                  ["mixed", "Mixed"],
                ].map(([value, label]) => (
                  <OptionPill
                    key={value}
                    label={label}
                    selected={draft.training.equipmentAccess === value}
                    onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, equipmentAccess: value as typeof prev.training.equipmentAccess } }))}
                  />
                ))}
              </View>
            ) : null}

            {currentStep === "nutrition" ? (
              <View className="gap-4">
                <Text className="text-sm font-semibold text-neutral-300">Preferences</Text>
                <View className="flex-row flex-wrap gap-2">
                  {NUTRITION_PREFS.map((item) => {
                    const selected = draft.nutrition.dietaryPreferences.includes(item);
                    return (
                      <OptionPill
                        key={item}
                        label={item.replace("_", " ")}
                        selected={selected}
                        onPress={() =>
                          patchDraft((prev) => ({
                            ...prev,
                            nutrition: {
                              ...prev.nutrition,
                              dietaryPreferences: selected
                                ? prev.nutrition.dietaryPreferences.filter((entry) => entry !== item)
                                : [...prev.nutrition.dietaryPreferences, item],
                            },
                          }))
                        }
                      />
                    );
                  })}
                </View>
                <Text className="text-sm font-semibold text-neutral-300">Restrictions</Text>
                <View className="flex-row flex-wrap gap-2">
                  {NUTRITION_RESTRICTIONS.map((item) => {
                    const selected = draft.nutrition.dietaryRestrictions.includes(item);
                    return (
                      <OptionPill
                        key={item}
                        label={item.replace("_", " ")}
                        selected={selected}
                        onPress={() =>
                          patchDraft((prev) => ({
                            ...prev,
                            nutrition: {
                              ...prev.nutrition,
                              dietaryRestrictions: selected
                                ? prev.nutrition.dietaryRestrictions.filter((entry) => entry !== item)
                                : [...prev.nutrition.dietaryRestrictions, item],
                            },
                          }))
                        }
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {currentStep === "constraints" ? (
              <View className="gap-4">
                <Input
                  value={draft.constraints.scheduleConstraintsNote}
                  onChangeText={(text) => patchDraft((prev) => ({ ...prev, constraints: { ...prev.constraints, scheduleConstraintsNote: text } }))}
                  placeholder="Any schedule constraints?"
                  multiline
                />
                <Input
                  value={draft.training.notes}
                  onChangeText={(text) => patchDraft((prev) => ({ ...prev, training: { ...prev.training, notes: text } }))}
                  placeholder="Anything else your coach should know?"
                  multiline
                />
              </View>
            ) : null}

            {currentStep === "stats" ? (
              <View className="gap-4">
                <Input
                  value={draft.body.weightKg ? String(draft.body.weightKg) : ""}
                  onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, weightKg: Number(text.replace(/[^0-9.]/g, "")) || null } }))}
                  keyboardType="decimal-pad"
                  placeholder="Weight (kg)"
                />
                <Input
                  value={draft.body.heightCm ? String(draft.body.heightCm) : ""}
                  onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, heightCm: Number(text.replace(/[^0-9]/g, "")) || null } }))}
                  keyboardType="number-pad"
                  placeholder="Height (cm) optional"
                />
                <Input
                  value={draft.body.age ? String(draft.body.age) : ""}
                  onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, age: Number(text.replace(/[^0-9]/g, "")) || null } }))}
                  keyboardType="number-pad"
                  placeholder="Age optional"
                />
              </View>
            ) : null}

            {currentStep === "persona" ? (
              <View className="gap-4">
                <Text className="text-sm font-semibold text-neutral-300">Personality</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    ["strict", "Strict"],
                    ["hype", "Hype"],
                    ["sweet", "Sweet"],
                  ].map(([value, label]) => (
                    <OptionPill
                      key={value}
                      label={label}
                      selected={draft.persona.personality === value}
                      onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, personality: value as typeof prev.persona.personality } }))}
                    />
                  ))}
                </View>
                <Card variant="subtle" className="p-4">
                  <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-violet-300">Preview</Text>
                  <Text className="mt-2 text-sm font-semibold text-white">
                    {draft.persona.personality === "strict"
                      ? "No excuses today. Hit your sessions and keep nutrition tight."
                      : draft.persona.personality === "hype"
                        ? "Let’s stack wins today. You’ve got momentum—let’s use it."
                        : "You’re doing great. We’ll keep this realistic and consistent."}
                  </Text>
                </Card>
                <Text className="text-sm font-semibold text-neutral-300">Coach style</Text>
                <View className="flex-row flex-wrap gap-2">
                  <OptionPill label="Woman" selected={draft.persona.gender === "woman"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "woman" } }))} />
                  <OptionPill label="Man" selected={draft.persona.gender === "man"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "man" } }))} />
                </View>
              </View>
            ) : null}

            {currentStep === "review" ? (
              <View className="gap-3">
                <Text className="text-sm text-neutral-300">Goal: {draft.goal.primary}</Text>
                <Text className="text-sm text-neutral-300">Experience: {draft.experienceLevel}</Text>
                <Text className="text-sm text-neutral-300">Training: {draft.training.daysPerWeek} days • {draft.training.sessionMinutes} min</Text>
                <Text className="text-sm text-neutral-300">Equipment: {draft.training.equipmentAccess.replace("_", " ")}</Text>
                <Text className="text-sm text-neutral-300">Coach: {draft.persona.gender} • {draft.persona.personality}</Text>
              </View>
            ) : null}
          </Card>

          {validationError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{validationError}</Text> : null}
          {submitError ? <Text className="mt-3 text-sm font-semibold text-rose-300">{submitError}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View className="border-t border-neutral-900 bg-neutral-950 px-5 pb-6 pt-4">
        {submitting ? (
          <View className="items-center justify-center gap-2 py-3">
            <ActivityIndicator color="#a78bfa" />
            <Text className="text-sm font-semibold text-neutral-300">
              {GENERATING_STATES[generatingIndex]}
            </Text>
          </View>
        ) : (
          <Button
            title={isLastStep ? "Build my plan" : "Continue"}
            onPress={() => (isLastStep ? void onSubmit() : next())}
            disabled={!canContinue}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
