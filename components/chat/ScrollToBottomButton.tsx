import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

export default function ScrollToBottomButton({
  visible,
  bottom,
  onPress,
}: {
  visible: boolean;
  bottom: number;
  onPress: () => void;
}) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 16,
        bottom,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="h-11 w-11 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/90"
      >
        <Ionicons name="arrow-down" size={18} color="#e5e5e5" />
      </TouchableOpacity>
    </View>
  );
}

