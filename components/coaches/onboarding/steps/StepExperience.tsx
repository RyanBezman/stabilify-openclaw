import { View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepExperience({ draft, patchDraft }: Props) {
  return (
    <View className="gap-3">
      <OptionPill label="Beginner" selected={draft.experienceLevel === "beginner"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "beginner" }))} />
      <OptionPill label="Intermediate" selected={draft.experienceLevel === "intermediate"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "intermediate" }))} />
      <OptionPill label="Advanced" selected={draft.experienceLevel === "advanced"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "advanced" }))} />
    </View>
  );
}
