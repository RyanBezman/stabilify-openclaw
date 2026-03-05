import { View } from "react-native";
import OptionPill from "../ui/OptionPill";
import type { CoachGender } from "../../lib/features/coaches";

export default function CoachGenderPicker({
  gender,
  onChange,
}: {
  gender: CoachGender;
  onChange: (next: CoachGender) => void;
}) {
  return (
    <View className="mb-6">
      <View className="flex-row gap-3">
        <OptionPill
          label="Woman"
          selected={gender === "woman"}
          onPress={() => onChange("woman")}
        />
        <OptionPill
          label="Man"
          selected={gender === "man"}
          onPress={() => onChange("man")}
        />
      </View>
    </View>
  );
}
