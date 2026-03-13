import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, View, useWindowDimensions } from "react-native";

type PostComposerPhotosGridProps = {
  uris: string[];
  onRemovePhoto: (index: number) => void;
};

export default function PostComposerPhotosGrid({
  uris,
  onRemovePhoto,
}: PostComposerPhotosGridProps) {
  const hasPhotos = uris.length > 0;
  const { width } = useWindowDimensions();
  const useSingleColumn = width < 360;

  if (!hasPhotos) {
    return null;
  }

  return (
    <View className="mt-4 flex-row flex-wrap justify-between gap-y-2">
      {uris.map((uri, index) => (
        <View
          key={`${uri}-${index}`}
          className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
          style={{
            width: uris.length === 1 || useSingleColumn ? "100%" : "49.2%",
            aspectRatio: uris.length === 1 ? 4 / 5 : 1,
          }}
        >
          <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
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
  );
}
