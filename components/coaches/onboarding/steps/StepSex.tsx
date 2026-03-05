import { Text, View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

type SexValue = NonNullable<CoachOnboardingDraft["body"]["sex"]>;

const sexOptions: Array<{ value: SexValue; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function StepSex({ draft, patchDraft }: Props) {
  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-neutral-300">Sex</Text>
      <View className="flex-row flex-wrap gap-2">
        {sexOptions.map((option) => (
          <OptionPill
            key={option.value}
            label={option.label}
            selected={draft.body.sex === option.value}
            onPress={() => patchDraft((prev) => ({ ...prev, body: { ...prev.body, sex: option.value } }))}
          />
        ))}
      </View>
      <Text className="text-xs leading-relaxed text-neutral-500">
        This is used only for calorie and macro calculations.
      </Text>
    </View>
  );
}
