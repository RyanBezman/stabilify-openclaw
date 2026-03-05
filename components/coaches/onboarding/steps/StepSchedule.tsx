import { Text, View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepSchedule({ draft, patchDraft }: Props) {
  return (
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
  );
}
