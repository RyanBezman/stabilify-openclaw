import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { AccountVisibility, ShareVisibility } from "../../lib/data/types";
import { buildPostAudienceOptions } from "../../lib/data/postVisibility";
import ModalSheet from "../ui/ModalSheet";

type PostAudienceSheetProps = {
  visible: boolean;
  accountVisibility: AccountVisibility;
  selectedVisibility: ShareVisibility;
  onSelectVisibility: (visibility: ShareVisibility) => void;
  onClose: () => void;
};

export default function PostAudienceSheet({
  visible,
  accountVisibility,
  selectedVisibility,
  onSelectVisibility,
  onClose,
}: PostAudienceSheetProps) {
  const options = buildPostAudienceOptions(accountVisibility);

  return (
    <ModalSheet
      visible={visible}
      onRequestClose={onClose}
      closeOnBackdropPress
      showBorder={false}
      enableSwipeToDismiss
      backdropClassName="bg-white/10"
      panelClassName="bg-black"
      contentClassName="pb-2"
    >
      <View className="items-center pb-2 pt-1">
        <View className="h-1.5 w-12 rounded-full bg-neutral-800" />
      </View>

      <Text className="mt-2 text-[32px] font-bold tracking-tight text-white">
        Who can see this?
      </Text>
      <Text className="mt-2 text-[15px] leading-6 text-neutral-400">
        Choose who can see this post. This only changes the audience for this post.
      </Text>

      <View className="mt-5">
        {options.map((option) => {
          const isSelected = option.visibility === selectedVisibility;

          return (
            <TouchableOpacity
              key={option.visibility}
              onPress={() => onSelectVisibility(option.visibility)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Share with ${option.title}`}
              className={`flex-row items-center rounded-[24px] px-3 py-3 ${
                isSelected ? "bg-neutral-900/70" : ""
              }`}
            >
              <View className="relative">
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: option.accentBackgroundColor }}
                >
                  <Ionicons name={option.iconName} size={26} color={option.accentColor} />
                </View>
                {isSelected ? (
                  <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-emerald-500">
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </View>
                ) : null}
              </View>

              <View className="ml-4 min-w-0 flex-1">
                <Text className="text-[16px] font-semibold text-white">{option.title}</Text>
                <Text className="mt-1 text-[13px] leading-5 text-neutral-400">
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ModalSheet>
  );
}
