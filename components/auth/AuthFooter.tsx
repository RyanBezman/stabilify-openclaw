import { Text, TouchableOpacity } from "react-native";

type AuthFooterProps = {
  prompt: string;
  actionLabel: string;
  onPress: () => void;
};

export default function AuthFooter({
  prompt,
  actionLabel,
  onPress,
}: AuthFooterProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text className="text-center text-sm text-neutral-500">
        {prompt}{" "}
        <Text className="font-medium text-violet-400">{actionLabel}</Text>
      </Text>
    </TouchableOpacity>
  );
}
