import { Text, View } from "react-native";
import Card from "../../../ui/Card";
import OptionPill from "../../../ui/OptionPill";
import {
  coachPersonalityCopy,
  type CoachOnboardingDraft,
  type CoachPersonality,
} from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepPersona({ draft, patchDraft }: Props) {
  const personalities: CoachPersonality[] = [
    "hype",
    "strict",
    "sweet",
    "relaxed",
    "bubbly",
    "analyst",
  ];
  const selectedCopy = coachPersonalityCopy[draft.persona.personality];

  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-neutral-300">Personality</Text>
      <View className="flex-row flex-wrap gap-2">
        {personalities.map((value) => (
          <OptionPill
            key={value}
            label={coachPersonalityCopy[value].label}
            selected={draft.persona.personality === value}
            onPress={() =>
              patchDraft((prev) => ({
                ...prev,
                persona: { ...prev.persona, personality: value },
              }))
            }
          />
        ))}
      </View>
      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-violet-300">Preview</Text>
        <Text className="mt-2 text-sm font-semibold text-white">
          {selectedCopy.aboutLine}
        </Text>
        <Text className="mt-2 text-xs leading-relaxed text-neutral-400">{selectedCopy.hint}</Text>
      </Card>
      <Text className="text-sm font-semibold text-neutral-300">Coach style</Text>
      <View className="flex-row flex-wrap gap-2">
        <OptionPill label="Woman" selected={draft.persona.gender === "woman"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "woman" } }))} />
        <OptionPill label="Man" selected={draft.persona.gender === "man"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "man" } }))} />
      </View>
    </View>
  );
}
