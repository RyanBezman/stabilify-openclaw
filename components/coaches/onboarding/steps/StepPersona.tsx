import { Text, View } from "react-native";
import Card from "../../../ui/Card";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function StepPersona({ draft, patchDraft }: Props) {
  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-neutral-300">Personality</Text>
      <View className="flex-row flex-wrap gap-2">
        {[
          ["strict", "Strict"],
          ["hype", "Hype"],
          ["sweet", "Sweet"],
        ].map(([value, label]) => (
          <OptionPill
            key={value}
            label={label}
            selected={draft.persona.personality === value}
            onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, personality: value as typeof prev.persona.personality } }))}
          />
        ))}
      </View>
      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-violet-300">Preview</Text>
        <Text className="mt-2 text-sm font-semibold text-white">
          {draft.persona.personality === "strict"
            ? "No excuses today. Hit your sessions and keep nutrition tight."
            : draft.persona.personality === "hype"
              ? "Let’s stack wins today. You’ve got momentum—let’s use it."
              : "You’re doing great. We’ll keep this realistic and consistent."}
        </Text>
      </Card>
      <Text className="text-sm font-semibold text-neutral-300">Coach style</Text>
      <View className="flex-row flex-wrap gap-2">
        <OptionPill label="Woman" selected={draft.persona.gender === "woman"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "woman" } }))} />
        <OptionPill label="Man" selected={draft.persona.gender === "man"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "man" } }))} />
      </View>
    </View>
  );
}
