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
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-900 px-4 py-3">
      <TouchableOpacity
        onPress={onCancel}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Cancel creating post"
        className="rounded-full px-2 py-1"
      >
        <Text className={`text-sm font-semibold ${saving ? "text-neutral-600" : "text-neutral-300"}`}>
          Cancel
        </Text>
      </TouchableOpacity>

      <Text className="text-base font-semibold text-white">Create post</Text>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={saving || !canPost}
        accessibilityRole="button"
        accessibilityLabel="Post"
        className="rounded-full px-2 py-1"
      >
        <Text
          className={`text-sm font-semibold ${
            saving || !canPost ? "text-neutral-600" : "text-violet-300"
          }`}
        >
          {saving ? "Saving" : "Post"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
