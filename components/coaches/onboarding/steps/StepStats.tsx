import { View } from "react-native";
import Input from "../../../ui/Input";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepStats({ draft, patchDraft }: Props) {
  return (
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
  );
}
