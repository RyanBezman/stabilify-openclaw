import { View } from "react-native";
import Input from "../../../ui/Input";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepConstraints({ draft, patchDraft }: Props) {
  return (
    <View className="gap-4">
      <Input
        value={draft.constraints.scheduleConstraintsNote}
        onChangeText={(text) => patchDraft((prev) => ({ ...prev, constraints: { ...prev.constraints, scheduleConstraintsNote: text } }))}
        placeholder="Work/travel/time constraints (optional)"
        multiline
      />
      <Input
        value={draft.training.notes}
        onChangeText={(text) => patchDraft((prev) => ({ ...prev, training: { ...prev.training, notes: text } }))}
        placeholder="Injuries, limitations, or preferences (optional)"
        multiline
      />
    </View>
  );
}
