import { Text, TouchableOpacity, View } from "react-native";

type PostComposerHeaderProps = {
  canPost: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function PostComposerHeader({
  canPost,
  saving,
  onCancel,
  onSubmit,
}: PostComposerHeaderProps) {
  const postDisabled = saving || !canPost;

  return (
    <View className="px-5 pb-2 pt-3">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Cancel creating post"
          className="py-2 pr-3"
          activeOpacity={0.75}
        >
          <Text className={`text-[17px] ${saving ? "text-neutral-600" : "text-white"}`}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={postDisabled}
          accessibilityRole="button"
          accessibilityLabel="Post"
          className={`rounded-full px-5 py-2.5 ${
            postDisabled ? "bg-violet-700/40" : "bg-violet-600"
          }`}
          activeOpacity={0.85}
        >
          <Text
            className={`text-[16px] font-semibold ${
              postDisabled ? "text-white/60" : "text-white"
            }`}
          >
            {saving ? "Posting" : "Post"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
