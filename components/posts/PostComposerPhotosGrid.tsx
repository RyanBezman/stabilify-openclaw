import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";

type PostComposerPhotosGridProps = {
  uris: string[];
  maxPhotos: number;
  onRemovePhoto: (index: number) => void;
  onClearAll: () => void;
};

export default function PostComposerPhotosGrid({
  uris,
  maxPhotos,
  onRemovePhoto,
  onClearAll,
}: PostComposerPhotosGridProps) {
  const hasPhotos = uris.length > 0;

  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Photos</Text>
        <Text className="text-xs text-neutral-500">{uris.length}/{maxPhotos}</Text>
      </View>

      {hasPhotos ? (
        <>
          <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
            {uris.map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                className="relative w-[49.2%] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
              >
                <Image source={{ uri }} className="h-40 w-full" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => onRemovePhoto(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-black/70"
                  activeOpacity={0.9}
                >
                  <Ionicons name="close" size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={onClearAll}
            accessibilityRole="button"
            accessibilityLabel="Clear all selected photos"
            className="mt-2 self-start rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5"
            activeOpacity={0.85}
          >
            <Text className="text-xs font-semibold text-neutral-300">Clear all</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}
