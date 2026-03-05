import { Text, TouchableOpacity } from "react-native";

type OptionPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export default function OptionPill({
  label,
  selected,
  onPress,
}: OptionPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`min-w-0 flex-1 rounded-2xl border px-3 py-3 ${
        selected ? "border-violet-500 bg-violet-600" : "border-neutral-800 bg-neutral-900"
      }`}
      activeOpacity={0.8}
    >
      <Text
        numberOfLines={2}
        className={`text-center text-sm font-semibold leading-5 ${
          selected ? "text-white" : "text-neutral-300"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
