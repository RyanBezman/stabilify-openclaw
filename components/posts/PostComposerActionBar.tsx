import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import Button from "../ui/Button";

type PostComposerActionBarProps = {
  saving: boolean;
  canPost: boolean;
  photoCount: number;
  canAddPhotos: boolean;
  onAddPhotos: () => void;
  keyboardVisible: boolean;
  insets: EdgeInsets;
  onSubmit: () => void;
};

export default function PostComposerActionBar({
  saving,
  canPost,
  photoCount,
  canAddPhotos,
  onAddPhotos,
  keyboardVisible,
  insets,
  onSubmit,
}: PostComposerActionBarProps) {
  return (
    <View
      className="border-t border-neutral-900 bg-neutral-950 px-4 pt-3"
      style={{ paddingBottom: keyboardVisible ? 6 : Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={onAddPhotos}
          disabled={!canAddPhotos || saving}
          accessibilityRole="button"
          accessibilityLabel={
            canAddPhotos ? `Add photos. ${photoCount} currently selected.` : "Photo limit reached"
          }
          className={`h-10 w-10 items-center justify-center rounded-xl border ${
            canAddPhotos && !saving
              ? "border-neutral-700 bg-neutral-900"
              : "border-neutral-800 bg-neutral-900/60"
          }`}
          activeOpacity={0.85}
        >
          <Ionicons name="images-outline" size={16} color="#d4d4d4" />
        </TouchableOpacity>

        <View className="ml-auto">
          <Button
            title={saving ? "Saving..." : "Post"}
            variant="primary"
            size="sm"
            className="min-w-[104px]"
            onPress={onSubmit}
            disabled={!canPost || saving}
          />
        </View>
      </View>
    </View>
  );
}
