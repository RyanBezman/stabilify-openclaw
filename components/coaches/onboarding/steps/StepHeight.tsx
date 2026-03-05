import { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const CM_PER_IN = 2.54;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const cmToFeetInches = (cm: number | null): { feet: number; inches: number } => {
  if (cm === null || Number.isNaN(cm)) return { feet: 5, inches: 5 };
  const totalInches = Math.round(cm / CM_PER_IN);
  const feet = clamp(Math.floor(totalInches / 12), 4, 7);
  const inches = clamp(totalInches % 12, 0, 11);
  return { feet, inches };
};
const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * CM_PER_IN);

export default function StepHeight({ draft, patchDraft }: Props) {
  const selectedHeight = useMemo(() => cmToFeetInches(draft.body.heightCm), [draft.body.heightCm]);
  const { width } = useWindowDimensions();
  const stackPickers = width < 390;

  return (
    <View className="min-h-[360px] items-center justify-center gap-6 py-6">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-neutral-500">Height</Text>
      <Text className="text-3xl font-semibold text-white">{selectedHeight.feet} ft {selectedHeight.inches} in</Text>
      <View className={stackPickers ? "w-full gap-3" : "w-full flex-row gap-3"}>
        <View className="flex-1">
          <Picker
            selectedValue={selectedHeight.feet}
            dropdownIconColor="#a3a3a3"
            onValueChange={(value) => {
              const feet = typeof value === "number" ? value : Number(value);
              patchDraft((prev) => ({
                ...prev,
                body: { ...prev.body, heightCm: feetInchesToCm(feet, selectedHeight.inches) },
              }));
            }}
            itemStyle={{ color: "#f5f5f5" }}
          >
            {[4, 5, 6, 7].map((feet) => (
              <Picker.Item key={feet} label={`${feet} ft`} value={feet} />
            ))}
          </Picker>
        </View>
        <View className="flex-1">
          <Picker
            selectedValue={selectedHeight.inches}
            dropdownIconColor="#a3a3a3"
            onValueChange={(value) => {
              const inches = typeof value === "number" ? value : Number(value);
              patchDraft((prev) => ({
                ...prev,
                body: { ...prev.body, heightCm: feetInchesToCm(selectedHeight.feet, inches) },
              }));
            }}
            itemStyle={{ color: "#f5f5f5" }}
          >
            {Array.from({ length: 12 }, (_, idx) => idx).map((inch) => (
              <Picker.Item key={inch} label={`${inch} in`} value={inch} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}
