import { Image, Text, View } from "react-native";
import { useEffect, useState } from "react";

type ProfileAvatarProps = {
  displayName: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
};

export default function ProfileAvatar({
  displayName,
  photoUrl,
  size = 48,
  className,
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const initials = [
    parts[0]?.charAt(0).toUpperCase() ?? "",
    parts.length > 1 ? parts[parts.length - 1]?.charAt(0).toUpperCase() ?? "" : "",
  ]
    .join("")
    .trim() || "U";
  const showPhoto = Boolean(photoUrl) && !imageFailed;
  const resolvedPhotoUrl = photoUrl ?? "";
  const initialsFontSize = Math.max(18, Math.round(size * 0.28));

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full border border-violet-500/40 bg-violet-600/20 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: resolvedPhotoUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text className="font-bold text-white" style={{ fontSize: initialsFontSize }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
