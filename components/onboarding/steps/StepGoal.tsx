import { Text, TouchableOpacity, View } from "react-native";
import type { GoalType, WeightUnit } from "../../../lib/data/types";
import Input from "../../ui/Input";
import FormLabel from "../../ui/FormLabel";
import HelperText from "../../ui/HelperText";
import OptionPill from "../../ui/OptionPill";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";

type StepGoalProps = {
  goalType: GoalType;
  preferredUnit: WeightUnit;
  currentWeight: string;
  targetMin: string;
  targetMax: string;
  targetWeight: string;
  onGoalTypeChange: (value: GoalType) => void;
  onCurrentWeightChange: (value: string) => void;
  onTargetMinChange: (value: string) => void;
  onTargetMaxChange: (value: string) => void;
  onTargetWeightChange: (value: string) => void;
  goalLabel: string;
  rangeSummary: string;
  statusText: string;
};

const goalOptions: { label: string; value: GoalType }[] = [
  { label: "Maintain", value: "maintain" },
  { label: "Lose", value: "lose" },
  { label: "Gain", value: "gain" },
];

export default function StepGoal({
  goalType,
  preferredUnit,
  currentWeight,
  targetMin,
  targetMax,
  targetWeight,
  onGoalTypeChange,
  onCurrentWeightChange,
  onTargetMinChange,
  onTargetMaxChange,
  onTargetWeightChange,
  goalLabel,
  rangeSummary,
  statusText,
}: StepGoalProps) {
  const isMaintain = goalType === "maintain";

  return (
    <View className="gap-5">
      <View>
        <FormLabel className="mb-3">Goal Focus</FormLabel>
        <View className="flex-row gap-3">
          {goalOptions.map((option) => (
            <OptionPill
              key={option.value}
              label={option.label}
              selected={goalType === option.value}
              onPress={() => onGoalTypeChange(option.value)}
            />
          ))}
        </View>
      </View>

      <View>
        <FormLabel>Starting Weight ({preferredUnit})</FormLabel>
        <Input
          value={currentWeight}
          onChangeText={onCurrentWeightChange}
          placeholder="205"
          keyboardType="decimal-pad"
        />
      </View>

      {isMaintain ? (
        <View>
          <FormLabel>Maintenance Range ({preferredUnit})</FormLabel>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                value={targetMin}
                onChangeText={onTargetMinChange}
                placeholder="200"
                keyboardType="decimal-pad"
              />
              <HelperText className="mt-2">Minimum</HelperText>
            </View>
            <View className="flex-1">
              <Input
                value={targetMax}
                onChangeText={onTargetMaxChange}
                placeholder="210"
                keyboardType="decimal-pad"
              />
              <HelperText className="mt-2">Maximum</HelperText>
            </View>
          </View>
        </View>
      ) : (
        <View>
          <FormLabel>Target Weight ({preferredUnit})</FormLabel>
          <Input
            value={targetWeight}
            onChangeText={onTargetWeightChange}
            placeholder={goalType === "lose" ? "190" : "215"}
            keyboardType="decimal-pad"
          />
        </View>
      )}

      <Card className="p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <SectionTitle>Goal Snapshot</SectionTitle>
          <View className="rounded-full border border-violet-500/30 bg-violet-600/20 px-3 py-1">
            <Text className="text-xs font-semibold text-violet-300">
              {goalLabel}
            </Text>
          </View>
        </View>
        <Text className="text-base font-semibold text-white">
          {rangeSummary}
        </Text>
        <Text className="mt-2 text-sm text-neutral-400">{statusText}</Text>
      </Card>

      <HelperText>
        {isMaintain
          ? "You can fine-tune your range anytime in settings."
          : "You can update your target anytime in settings."}
      </HelperText>
    </View>
  );
}
