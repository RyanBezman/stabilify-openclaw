import { Text, TouchableOpacity, View } from "react-native";

export type ProfileContentTab = "posts" | "progress";

type ProfileTabPickerProps = {
  value: ProfileContentTab;
  onChange: (tab: ProfileContentTab) => void;
  showProgressTab: boolean;
};

export default function ProfileTabPicker({
  value,
  onChange,
  showProgressTab,
}: ProfileTabPickerProps) {
  return (
    <View className="mb-4 flex-row rounded-2xl border border-neutral-800 bg-neutral-900/80 p-1">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onChange("posts")}
        className={`flex-1 rounded-xl px-4 py-2.5 ${
          value === "posts" ? "bg-violet-600/25" : "bg-transparent"
        }`}
      >
        <Text
          className={`text-center text-sm font-semibold ${
            value === "posts" ? "text-violet-100" : "text-neutral-400"
          }`}
        >
          Posts
        </Text>
      </TouchableOpacity>

      {showProgressTab ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onChange("progress")}
          className={`flex-1 rounded-xl px-4 py-2.5 ${
            value === "progress" ? "bg-violet-600/25" : "bg-transparent"
          }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              value === "progress" ? "text-violet-100" : "text-neutral-400"
            }`}
          >
            Progress
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
