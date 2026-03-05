import { View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepEquipment({ draft, patchDraft }: Props) {
  return (
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
  );
}
