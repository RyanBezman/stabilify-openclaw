import { View } from "react-native";
import type { WeightUnit } from "../../../lib/data/types";
import Input from "../../ui/Input";
import FormLabel from "../../ui/FormLabel";
import HelperText from "../../ui/HelperText";
import OptionPill from "../../ui/OptionPill";

type StepProfileProps = {
  displayName: string;
  username: string;
  preferredUnit: WeightUnit;
  onDisplayNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onUnitChange: (value: WeightUnit) => void;
};

const unitOptions: { label: string; value: WeightUnit }[] = [
  { label: "Pounds (lb)", value: "lb" },
  { label: "Kilograms (kg)", value: "kg" },
];

export default function StepProfile({
  displayName,
  username,
  preferredUnit,
  onDisplayNameChange,
  onUsernameChange,
  onUnitChange,
}: StepProfileProps) {
  return (
    <View className="gap-5">
      <View>
        <FormLabel>Display Name</FormLabel>
        <Input
          value={displayName}
          onChangeText={onDisplayNameChange}
          placeholder="Jordan"
        />
      </View>
      <View>
        <FormLabel>Username</FormLabel>
        <Input
          value={username}
          onChangeText={onUsernameChange}
          placeholder="jordan_fit"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <HelperText className="mt-2">
          Lowercase letters, numbers, and underscores only.
        </HelperText>
      </View>
      <View>
        <FormLabel className="mb-3">Preferred Unit</FormLabel>
        <View className="flex-row gap-3">
          {unitOptions.map((option) => (
            <OptionPill
              key={option.value}
              label={option.label}
              selected={preferredUnit === option.value}
              onPress={() => onUnitChange(option.value)}
            />
          ))}
        </View>
      </View>
      <HelperText>You can update this anytime in settings.</HelperText>
    </View>
  );
}
