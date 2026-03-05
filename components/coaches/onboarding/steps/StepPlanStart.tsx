import { Text, TouchableOpacity, View } from "react-native";
import CoachAvatar from "../../CoachAvatar";
import { coachFromSelection } from "../../../../lib/features/coaches";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

type Option = "workout" | "nutrition" | "both";

const labels: Record<Option, string> = {
  workout: "Workout Plan First",
  nutrition: "Nutrition Plan First",
  both: "Both Together",
};

export default function StepPlanStart({ draft, patchDraft }: Props) {
  const workoutCoach = coachFromSelection("workout", draft.persona.gender, draft.persona.personality);
  const nutritionCoach = coachFromSelection("nutrition", draft.persona.gender, draft.persona.personality);

  const renderOption = (value: Option) => {
    const selected = draft.planStart === value;
    return (
      <TouchableOpacity
        key={value}
        activeOpacity={0.9}
        onPress={() => patchDraft((prev) => ({ ...prev, planStart: value }))}
        className={`min-h-14 items-center justify-center rounded-2xl border px-4 py-3 ${
          selected ? "border-violet-400/70 bg-violet-500/15" : "border-neutral-800 bg-neutral-900"
        }`}
      >
        <Text className={`text-sm font-semibold ${selected ? "text-violet-100" : "text-neutral-200"}`}>{labels[value]}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="gap-5">
      <Text className="text-sm font-semibold text-neutral-300">Choose how to start</Text>
      <View className="flex-row items-center justify-center gap-3">
        <View className="items-center gap-2">
          <CoachAvatar coach={workoutCoach} size="md" />
          <Text className="text-xs font-semibold text-neutral-300">Workout Coach</Text>
        </View>
        <View className="items-center gap-2">
          <CoachAvatar coach={nutritionCoach} size="md" />
          <Text className="text-xs font-semibold text-neutral-300">Nutrition Coach</Text>
        </View>
      </View>
      <View className="gap-3">
        {renderOption("both")}
        {renderOption("workout")}
        {renderOption("nutrition")}
      </View>
    </View>
  );
}
