import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import OptionPill from "../../ui/OptionPill";
import WheelPickerSheet, { type WheelPickerColumn } from "../../ui/WheelPickerSheet";
import type {
  NutritionGoal,
  NutritionIntake,
} from "../../../lib/features/coaches";
import {
  ageOptions,
  clampAgeYears,
  clampWeightLb,
  cmToFeetInches,
  feetInchesToCm,
  heightFeetOptions,
  heightInchesOptionsForFeet,
  kgToLb,
  lbToKg,
  weightLbOptions,
} from "../../../lib/utils/bodyMetrics";

type NutritionIntakeCardProps = {
  intake: NutritionIntake;
  disabled?: boolean;
  onChange: (partial: Partial<NutritionIntake>) => void;
  onCancel: () => void;
  onGenerate: () => void;
};

type PickerMode = "height" | "weight" | "age" | null;

function PickerRow({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-4 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-neutral-300">{label}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-white">{value}</Text>
          <Ionicons name="chevron-down" size={16} color="#a3a3a3" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const goalOptions: Array<{ label: string; value: NutritionGoal }> = [
  { label: "Lose", value: "lose" },
  { label: "Maintain", value: "maintain" },
  { label: "Gain", value: "gain" },
];

export default function NutritionIntakeCard({
  intake,
  disabled,
  onChange,
  onCancel,
  onGenerate,
}: NutritionIntakeCardProps) {
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [heightDraft, setHeightDraft] = useState(() => cmToFeetInches(intake.heightCm));
  const [weightDraftLb, setWeightDraftLb] = useState(() => kgToLb(intake.weightKg));
  const [ageDraft, setAgeDraft] = useState(() => clampAgeYears(intake.ageYears));

  const feetOptions = useMemo(() => heightFeetOptions(), []);
  const lbsOptions = useMemo(() => weightLbOptions(), []);
  const yearsOptions = useMemo(() => ageOptions(), []);

  const heightDisplay = useMemo(() => {
    const { feet, inches } = cmToFeetInches(intake.heightCm);
    return `${feet}'${inches}"`;
  }, [intake.heightCm]);

  const weightDisplay = useMemo(() => `${kgToLb(intake.weightKg)} lb`, [intake.weightKg]);
  const ageDisplay = useMemo(() => `${clampAgeYears(intake.ageYears)}`, [intake.ageYears]);

  const openHeightPicker = () => {
    const next = cmToFeetInches(intake.heightCm);
    const validInches = heightInchesOptionsForFeet(next.feet);
    setHeightDraft({
      feet: next.feet,
      inches: validInches.includes(next.inches) ? next.inches : (validInches[0] ?? 0),
    });
    setPickerMode("height");
  };

  const openWeightPicker = () => {
    setWeightDraftLb(kgToLb(intake.weightKg));
    setPickerMode("weight");
  };

  const openAgePicker = () => {
    setAgeDraft(clampAgeYears(intake.ageYears));
    setPickerMode("age");
  };

  const pickerColumns = useMemo<WheelPickerColumn[]>(() => {
    if (pickerMode === "height") {
      const inchValues = heightInchesOptionsForFeet(heightDraft.feet);
      return [
        {
          key: "feet",
          label: "Feet",
          value: heightDraft.feet,
          options: feetOptions.map((feet) => ({ label: `${feet}`, value: feet })),
          onValueChange: (value) => {
            const feet = Number(value);
            if (!Number.isFinite(feet)) return;
            setHeightDraft((prev) => {
              const nextInchValues = heightInchesOptionsForFeet(feet);
              return {
                feet,
                inches: nextInchValues.includes(prev.inches) ? prev.inches : (nextInchValues[0] ?? 0),
              };
            });
          },
        },
        {
          key: "inches",
          label: "Inches",
          value: heightDraft.inches,
          options: inchValues.map((inches) => ({ label: `${inches}`, value: inches })),
          onValueChange: (value) => {
            const inches = Number(value);
            if (!Number.isFinite(inches)) return;
            setHeightDraft((prev) => ({ ...prev, inches }));
          },
        },
      ];
    }

    if (pickerMode === "weight") {
      return [
        {
          key: "weight",
          label: "Pounds",
          value: weightDraftLb,
          options: lbsOptions.map((lb) => ({ label: `${lb}`, value: lb })),
          onValueChange: (value) => {
            const pounds = Number(value);
            if (!Number.isFinite(pounds)) return;
            setWeightDraftLb(clampWeightLb(pounds));
          },
        },
      ];
    }

    if (pickerMode === "age") {
      return [
        {
          key: "age",
          label: "Age",
          value: ageDraft,
          options: yearsOptions.map((year) => ({ label: `${year}`, value: year })),
          onValueChange: (value) => {
            const age = Number(value);
            if (!Number.isFinite(age)) return;
            setAgeDraft(clampAgeYears(age));
          },
        },
      ];
    }

    return [];
  }, [ageDraft, feetOptions, heightDraft.feet, heightDraft.inches, lbsOptions, pickerMode, weightDraftLb, yearsOptions]);

  const pickerTitle =
    pickerMode === "height" ? "Select height" : pickerMode === "weight" ? "Select weight" : "Select age";

  const canGenerate = Boolean(intake.goal) && !disabled;

  const applyPickerValue = () => {
    if (pickerMode === "height") {
      onChange({ heightCm: feetInchesToCm(heightDraft.feet, heightDraft.inches) });
    } else if (pickerMode === "weight") {
      onChange({ weightKg: lbToKg(weightDraftLb) });
    } else if (pickerMode === "age") {
      onChange({ ageYears: clampAgeYears(ageDraft) });
    }
    setPickerMode(null);
  };

  return (
    <Card className="mt-3 p-5">
      <Text className="text-lg font-bold text-white">Nutrition intake</Text>

      <View className="mt-5 gap-4">
        <PickerRow label="Height" value={heightDisplay} onPress={openHeightPicker} disabled={disabled} />
        <PickerRow label="Weight" value={weightDisplay} onPress={openWeightPicker} disabled={disabled} />
        <PickerRow label="Age" value={ageDisplay} onPress={openAgePicker} disabled={disabled} />

        <View>
          <Text className="mb-2 text-sm font-semibold text-neutral-300">Sex</Text>
          <View className="flex-row gap-3">
            <OptionPill
              label="Male"
              selected={intake.sex === "male"}
              onPress={() => onChange({ sex: "male" })}
            />
            <OptionPill
              label="Female"
              selected={intake.sex === "female"}
              onPress={() => onChange({ sex: "female" })}
            />
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-neutral-300">Goal</Text>
          <View className="flex-row gap-3">
            {goalOptions.map((goal) => (
              <OptionPill
                key={goal.value}
                label={goal.label}
                selected={intake.goal === goal.value}
                onPress={() => onChange({ goal: goal.value })}
              />
            ))}
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Button
          className="flex-1"
          title="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={disabled}
        />
        <Button
          className="flex-1"
          title="Generate plan"
          onPress={onGenerate}
          disabled={!canGenerate}
        />
      </View>

      <WheelPickerSheet
        visible={pickerMode !== null}
        title={pickerTitle}
        columns={pickerColumns}
        onCancel={() => setPickerMode(null)}
        onDone={applyPickerValue}
      />
    </Card>
  );
}
