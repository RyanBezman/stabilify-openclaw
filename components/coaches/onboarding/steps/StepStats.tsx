import { useMemo } from "react";
import { Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Card from "../../../ui/Card";
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
    <View className="gap-4">
      <Text className="text-sm font-semibold text-neutral-300">Set your body stats</Text>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-400">Weight</Text>
        <Text className="mt-1 text-sm text-neutral-300">{selectedWeightLb} lb</Text>
        <View className="mt-3 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
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
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-400">Height</Text>
        <Text className="mt-1 text-sm text-neutral-300">
          {selectedHeight.feet}' {selectedHeight.inches}\"
        </Text>
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
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

          <View className="flex-1 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
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
      </Card>
    </View>
  );
}
