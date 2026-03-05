import { Image, Text, View } from "react-native";
import type { ViewProps } from "react-native";
import type { ActiveCoach } from "../../lib/features/coaches";
import { coachAvatarModuleByName } from "../../lib/features/coaches";

type CoachAvatarProps = ViewProps & {
  coach: ActiveCoach;
  size?: number | "sm" | "md" | "lg" | "xl";
  onImageLoaded?: () => void;
};

const avatarTone = {
  ring: "border-violet-400/25",
  bg: "bg-neutral-900",
  text: "text-violet-100",
};

const sizeTokens = {
  sm: 44,
  md: 56,
  lg: 72,
  xl: 84,
} as const;

export default function CoachAvatar({
  coach,
  size = "md",
  onImageLoaded,
  className,
  style,
  ...props
}: CoachAvatarProps) {
  const px = typeof size === "number" ? size : sizeTokens[size];
  const initial = coach.displayName.trim().charAt(0).toUpperCase() || "C";
  const avatar = coachAvatarModuleByName[coach.displayName.trim()];
  const innerPad = Math.max(4, Math.round(px * 0.08));

  return (
    <View
      {...props}
      style={[
        { width: px, height: px, borderRadius: px / 2 },
        style,
      ]}
      className={`relative items-center justify-center border-2 ${avatarTone.ring} ${avatarTone.bg} ${
        className ?? ""
      }`}
    >
      {avatar ? (
        <Image
          source={avatar}
          style={{
            width: px - innerPad * 2,
            height: px - innerPad * 2,
            borderRadius: (px - innerPad * 2) / 2,
          }}
          resizeMode="cover"
          onLoadEnd={onImageLoaded}
        />
      ) : (
        <Text
          style={{ fontSize: Math.max(18, Math.round(px * 0.42)) }}
          className={`font-black ${avatarTone.text}`}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
