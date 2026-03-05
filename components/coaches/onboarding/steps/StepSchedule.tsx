import { Text, TouchableOpacity, View } from "react-native";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceButton({ label, selected, onPress }: ChoiceProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`min-h-14 flex-1 items-center justify-center rounded-2xl border px-4 py-3 ${
        selected
          ? "border-violet-400/70 bg-violet-500/15"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <Text className={`text-sm font-semibold ${selected ? "text-violet-100" : "text-neutral-200"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function StepSchedule({ draft, patchDraft }: Props) {
  return (
    <View className="gap-5">
      <Text className="text-sm font-semibold text-neutral-300">Days per week</Text>
      <View className="flex-row flex-wrap gap-3">
        {[2, 3, 4, 5, 6].map((d) => (
          <View key={d} className="w-[48%]">
            <ChoiceButton
              label={`${d} days`}
              selected={draft.training.daysPerWeek === d}
              onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, daysPerWeek: d } }))}
            />
          </View>
        ))}
      </View>

      <Text className="text-sm font-semibold text-neutral-300">Session length</Text>
      <View className="flex-row flex-wrap gap-3">
        {[30, 45, 60, 75].map((m) => (
          <View key={m} className="w-[48%]">
            <ChoiceButton
              label={`${m} min`}
              selected={draft.training.sessionMinutes === m}
              onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, sessionMinutes: m as 30 | 45 | 60 | 75 } }))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
