import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import type { ShareVisibility } from "../../lib/data/types";
import { getPostAudienceStatusLabel } from "../../lib/data/postVisibility";

type PostComposerActionBarProps = {
  saving: boolean;
  photoCount: number;
  canAddPhotos: boolean;
  onAddPhotos: () => void;
  onOpenAudiencePicker: () => void;
  keyboardVisible: boolean;
  overlayVisible: boolean;
  insets: EdgeInsets;
  selectedVisibility: ShareVisibility;
  characterCount: number;
  characterLimit: number;
};

export default function PostComposerActionBar({
  saving,
  photoCount,
  canAddPhotos,
  onAddPhotos,
  onOpenAudiencePicker,
  keyboardVisible,
  overlayVisible,
  insets,
  selectedVisibility,
  characterCount,
  characterLimit,
}: PostComposerActionBarProps) {
  const characterToneClassName =
    characterCount > characterLimit * 0.85 ? "text-violet-300" : "text-neutral-500";
  const pinnedToKeyboard = keyboardVisible || overlayVisible;

  return (
    <View
      className="bg-neutral-950"
      style={{ paddingBottom: pinnedToKeyboard ? 0 : Math.max(insets.bottom, 8) }}
    >
      <TouchableOpacity
        onPress={onOpenAudiencePicker}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Choose who can see this post"
        activeOpacity={0.85}
        className="flex-row items-center px-5 py-3"
      >
        <Ionicons name="globe-outline" size={16} color="#a78bfa" />
        <Text className="ml-2 text-sm font-medium text-violet-300">
          {getPostAudienceStatusLabel(selectedVisibility)}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#a78bfa" style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      <View className="border-t border-neutral-900 px-5 py-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onAddPhotos}
            disabled={!canAddPhotos || saving}
            accessibilityRole="button"
            accessibilityLabel={
              canAddPhotos ? `Add photos. ${photoCount} currently selected.` : "Photo limit reached"
            }
            className="h-10 w-10 items-center justify-center"
            activeOpacity={0.85}
          >
            <Ionicons
              name="images-outline"
              size={24}
              color={canAddPhotos && !saving ? "#a78bfa" : "#525252"}
            />
          </TouchableOpacity>

          <View className="flex-row items-center">
            {photoCount > 0 ? (
              <Text className="text-xs text-neutral-500">
                {photoCount} photo{photoCount === 1 ? "" : "s"}
              </Text>
            ) : null}
            {characterCount > 0 ? (
              <Text
                className={`text-xs ${characterToneClassName} ${
                  photoCount > 0 ? "ml-3" : ""
                }`}
              >
                {characterCount}/{characterLimit}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
