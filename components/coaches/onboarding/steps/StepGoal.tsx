import { View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepGoal({ draft, patchDraft }: Props) {
  return (
    <View className="gap-3">
      <OptionPill label="Lose fat" selected={draft.goal.primary === "lose"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "lose" } }))} />
      <OptionPill label="Maintain" selected={draft.goal.primary === "maintain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "maintain" } }))} />
      <OptionPill label="Gain muscle" selected={draft.goal.primary === "gain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "gain" } }))} />
    </View>
  );
}
