import { useMemo } from "react";
import { Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const LB_PER_KG = 2.2046226218;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const kgToLb = (kg: number | null) => (kg === null ? 170 : clamp(Math.round(kg * LB_PER_KG), 80, 450));
const lbToKg = (lb: number) => Number((lb / LB_PER_KG).toFixed(1));

export default function StepWeight({ draft, patchDraft }: Props) {
  const selectedWeightLb = useMemo(() => kgToLb(draft.body.weightKg), [draft.body.weightKg]);

  return (
    <View className="items-center gap-5 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-neutral-500">Weight</Text>
      <Text className="text-3xl font-semibold text-white">{selectedWeightLb} lb</Text>
      <View className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-2 py-2">
        <Picker
          selectedValue={selectedWeightLb}
          dropdownIconColor="#a3a3a3"
          onValueChange={(value) => {
            const numeric = typeof value === "number" ? value : Number(value);
            patchDraft((prev) => ({ ...prev, body: { ...prev.body, weightKg: lbToKg(numeric) } }));
          }}
          itemStyle={{ color: "#f5f5f5" }}
        >
          {Array.from({ length: 371 }, (_, idx) => idx + 80).map((lb) => (
            <Picker.Item key={lb} label={`${lb} lb`} value={lb} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
