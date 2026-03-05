import { useMemo } from "react";
import { Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const kgToLb = (kg: number | null) => {
  if (!kg || Number.isNaN(kg)) return 180;
  return clamp(Math.round(kg * LB_PER_KG), 80, 450);
};

const lbToKg = (lb: number) => Number((lb / LB_PER_KG).toFixed(1));

const cmToFeetInches = (cm: number | null): { feet: number; inches: number } => {
  if (!cm || Number.isNaN(cm)) return { feet: 5, inches: 10 };
  const totalInches = Math.round(cm / CM_PER_IN);
  const feet = clamp(Math.floor(totalInches / 12), 4, 7);
  const inches = clamp(totalInches % 12, 0, 11);
  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * CM_PER_IN);

export default function StepStats({ draft, patchDraft }: Props) {
  const selectedWeightLb = useMemo(() => kgToLb(draft.body.weightKg), [draft.body.weightKg]);
  const selectedHeight = useMemo(() => cmToFeetInches(draft.body.heightCm), [draft.body.heightCm]);

  return (
    <View className="gap-8">
      <View className="items-center">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-neutral-500">Weight</Text>
        <Text className="mt-1 text-xl font-semibold text-white">{selectedWeightLb} lb</Text>
        <View className="w-full">
          <Picker
            selectedValue={selectedWeightLb}
            dropdownIconColor="#a3a3a3"
            onValueChange={(value) => {
              const numeric = typeof value === "number" ? value : Number(value);
              patchDraft((prev) => ({
                ...prev,
                body: { ...prev.body, weightKg: lbToKg(numeric) },
              }));
            }}
            itemStyle={{ color: "#f5f5f5" }}
          >
            {Array.from({ length: 371 }, (_, idx) => idx + 80).map((lb) => (
              <Picker.Item key={lb} label={`${lb} lb`} value={lb} />
            ))}
          </Picker>
        </View>
      </View>

      <View className="items-center">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-neutral-500">Height</Text>
        <Text className="mt-1 text-xl font-semibold text-white">
          {selectedHeight.feet}' {selectedHeight.inches}\"
        </Text>
        <View className="mt-2 w-full flex-row">
          <View className="flex-1">
            <Picker
              selectedValue={selectedHeight.feet}
              dropdownIconColor="#a3a3a3"
              onValueChange={(value) => {
                const feet = typeof value === "number" ? value : Number(value);
                patchDraft((prev) => ({
                  ...prev,
                  body: {
                    ...prev.body,
                    heightCm: feetInchesToCm(feet, selectedHeight.inches),
                  },
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
                  body: {
                    ...prev.body,
                    heightCm: feetInchesToCm(selectedHeight.feet, inches),
                  },
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
    </View>
  );
}
