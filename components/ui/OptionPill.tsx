import { Text, TouchableOpacity } from "react-native";

type OptionPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function OptionPill({
  label,
  selected,
  onPress,
  disabled = false,
}: OptionPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`min-w-0 flex-1 rounded-2xl border px-3 py-3 ${
        selected ? "border-violet-500 bg-violet-600" : "border-neutral-800 bg-neutral-900"
      } ${disabled ? "opacity-50" : ""}`}
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
