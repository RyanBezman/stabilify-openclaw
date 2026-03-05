import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CoachAvatar from "./CoachAvatar";
import type { ActiveCoach, CoachPersonality } from "../../lib/features/coaches";

export type PlanGenerationStage = "idle" | "sending" | "modeling" | "persisting" | "done";
export type PlanGenerationAction = "generate" | "revise_days" | "promote" | "discard" | null;

type Props = {
  visible: boolean;
  coach: ActiveCoach;
  stage: PlanGenerationStage;
  action: PlanGenerationAction;
  mode?: "overlay" | "inline";
};

type RowStatus = "done" | "active" | "pending";

type StepRow = {
  id: number;
  label: string;
  status: RowStatus;
};

const helperCopyByPersonality: Record<CoachPersonality, string[]> = {
  strict: [
    "Keeping it simple and repeatable.",
    "Prioritizing clean structure and consistency.",
    "Locking in a plan you can execute weekly.",
  ],
  sweet: [
    "Building this to feel doable from day one.",
    "Keeping your week realistic and supportive.",
    "Small wins and steady progress are the focus.",
  ],
  relaxed: [
    "Keeping this manageable and sustainable.",
    "Balancing progress with a realistic pace.",
    "Optimizing for consistency, not complexity.",
  ],
  bubbly: [
    "Making this approachable and energizing.",
    "Setting up a plan that feels good to follow.",
    "Keeping momentum high and the structure clear.",
  ],
  hype: [
    "Dialing in a plan built for momentum.",
    "Keeping intensity smart and consistent.",
    "Building a week you can actually hit.",
  ],
  analyst: [
    "Balancing volume, recovery, and progression.",
    "Matching exercise selection to your constraints.",
    "Structuring this for measurable progress.",
  ],
};

function actionTitle(action: PlanGenerationAction, coachName: string) {
  if (action === "revise_days") return `${coachName} is revising your plan`;
  if (action === "promote") return `${coachName} is activating your plan`;
  if (action === "discard") return `${coachName} is updating your draft`;
  return `${coachName} is building your plan`;
}

function stageRows(stage: PlanGenerationStage, modelingStep: 2 | 3): StepRow[] {
  const steps = [
    { id: 1, label: "Reading your goals" },
    { id: 2, label: "Selecting exercises for your setup" },
    { id: 3, label: "Balancing weekly schedule" },
    { id: 4, label: "Saving your draft" },
  ];

  if (stage === "done") {
    return steps.map((s) => ({ ...s, status: "done" as RowStatus }));
  }

  if (stage === "persisting") {
    return steps.map((s) => ({
      ...s,
      status: s.id < 4 ? "done" : "active",
    }));
  }

  if (stage === "modeling") {
    return steps.map((s) => ({
      ...s,
      status: s.id === 1 || s.id < modelingStep ? "done" : s.id === modelingStep ? "active" : "pending",
    }));
  }

  if (stage === "sending") {
    return steps.map((s) => ({
      ...s,
      status: s.id === 1 ? "active" : "pending",
    }));
  }

  return steps.map((s) => ({ ...s, status: "pending" as RowStatus }));
}

export default function PlanGenerationOverlay({
  visible,
  coach,
  stage,
  action,
  mode = "overlay",
}: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const [copyIndex, setCopyIndex] = useState(0);
  const [modelingStep, setModelingStep] = useState<2 | 3>(2);
  const [showTimeoutHint, setShowTimeoutHint] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse, visible]);

  useEffect(() => {
    if (!visible) {
      setCopyIndex(0);
      return;
    }

    const id = setInterval(() => {
      setCopyIndex((prev) => prev + 1);
    }, 1600);

    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (stage !== "modeling") {
      setModelingStep(2);
      return;
    }

    const id = setTimeout(() => {
      setModelingStep(3);
    }, 850);

    return () => clearTimeout(id);
  }, [stage]);

  useEffect(() => {
    if (!visible || stage === "done") {
      setShowTimeoutHint(false);
      return;
    }

    const id = setTimeout(() => {
      setShowTimeoutHint(true);
    }, 12000);

    return () => clearTimeout(id);
  }, [stage, visible]);

  const helperCopy = helperCopyByPersonality[coach.personality];
  const helperLine = helperCopy[copyIndex % helperCopy.length];
  const rows = useMemo(() => stageRows(stage, modelingStep), [stage, modelingStep]);
  const isQuickDiscard = action === "discard";
  const isSavingPlan = action === "promote";

  if (!visible) return null;

  const content = (
    <View
      className={`w-full border border-neutral-800 bg-neutral-950 ${
        mode === "inline"
          ? "rounded-2xl p-5"
          : `rounded-3xl p-6 ${isQuickDiscard ? "max-w-[380px]" : "max-w-[440px]"}`
      }`}
    >
      {isQuickDiscard ? (
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
            <Ionicons name="trash-outline" size={18} color="#f5f5f5" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-white">Discarding draft plan</Text>
            <Text className="mt-1 text-xs text-neutral-400">Removing the new version and keeping your current plan</Text>
          </View>
          <ActivityIndicator size="small" color="#a78bfa" />
        </View>
      ) : isSavingPlan ? (
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900">
            <Ionicons name="checkmark-circle-outline" size={18} color="#c4b5fd" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-white">Saving your plan</Text>
            <Text className="mt-1 text-xs text-neutral-400">Making this draft your active plan</Text>
          </View>
          <ActivityIndicator size="small" color="#a78bfa" />
        </View>
      ) : (
        <>
          <View className="flex-row items-center">
            <CoachAvatar coach={coach} size={42} />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-white">{actionTitle(action, coach.displayName)}</Text>
              <Text className="mt-1 text-xs text-neutral-400">Crafting your personalized workout draft</Text>
            </View>
            <Animated.View style={{ opacity: pulse }} className="h-3 w-3 rounded-full bg-violet-400" />
          </View>

          <View className="mt-6 gap-3">
            {rows.map((row) => (
              <View key={row.id} className="flex-row items-center" accessibilityLabel={`${row.label}: ${row.status}`}>
                <View className="h-5 w-5 items-center justify-center">
                  {row.status === "done" ? (
                    <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                  ) : row.status === "active" ? (
                    <ActivityIndicator size="small" color="#a78bfa" />
                  ) : (
                    <View className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                  )}
                </View>
                <Text
                  className={`ml-3 text-sm ${
                    row.status === "pending"
                      ? "text-neutral-500"
                      : row.status === "active"
                        ? "text-violet-200"
                        : "text-neutral-300"
                  }`}
                >
                  {row.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3">
            <Text className="text-sm text-neutral-300">{helperLine}</Text>
            {showTimeoutHint ? (
              <Text className="mt-2 text-xs text-neutral-500">
                Still working. This can take a bit for personalized plans.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );

  if (mode === "inline") {
    return content;
  }

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-neutral-950/80 px-8"
      accessible
      accessibilityLabel="Plan generation in progress"
      accessibilityViewIsModal
    >
      {content}
    </View>
  );
}
