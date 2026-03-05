import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import ProfileAvatar from "./ProfileAvatar";
import type { MembershipTier } from "../../lib/data/types";

export type ProfileStat = {
  label: string;
  value: string;
};

type ProfileHeroProps = {
  displayName: string;
  subtitle?: string;
  bio: string;
  photoUrl: string | null;
  membershipTier?: MembershipTier;
  photoLoading?: boolean;
  socialStats: ProfileStat[];
  onPressPhotoAction?: () => void;
};

function StatTile({ label, value }: ProfileStat) {
  return (
    <View className="min-w-[58px] flex-1 items-center px-1">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </Text>
    </View>
  );
}

export default function ProfileHero({
  displayName,
  subtitle,
  bio,
  photoUrl,
  membershipTier,
  photoLoading = false,
  socialStats,
  onPressPhotoAction,
}: ProfileHeroProps) {
  const avatar = <ProfileAvatar displayName={displayName} photoUrl={photoUrl} size={88} />;
  const showProBadge = membershipTier === "pro";
  const statsToRender =
    socialStats.length > 0
      ? socialStats
      : [
          { label: "Posts", value: "0" },
          { label: "Followers", value: "0" },
          { label: "Following", value: "0" },
        ];

  return (
    <View className="mb-6">
      <View className="items-center">
        <View className="relative">
          {onPressPhotoAction ? (
            <TouchableOpacity
              onPress={onPressPhotoAction}
              disabled={photoLoading}
              activeOpacity={0.8}
              className="relative"
            >
              {avatar}
              <View
                className="absolute items-center justify-center rounded-full border-2 border-neutral-950 bg-violet-600"
                style={{ width: 28, height: 28, bottom: 0, right: -2 }}
              >
                <Ionicons
                  name={photoLoading ? "hourglass-outline" : "camera"}
                  size={14}
                  color="#ffffff"
                />
              </View>
            </TouchableOpacity>
          ) : (
            avatar
          )}
          {showProBadge ? (
            <View
              className="absolute z-10 rounded-full border border-violet-500 bg-violet-600 px-2 py-0.5"
              style={{ top: -4, right: -8 }}
            >
              <Text className="text-[9px] font-bold uppercase tracking-wide text-white">
                Pro
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="mt-3 text-xl font-bold text-white" numberOfLines={1}>
          {displayName}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm font-medium text-violet-300" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {bio ? (
          <Text className="mt-1 text-center text-sm leading-relaxed text-neutral-400" numberOfLines={2}>
            {bio}
          </Text>
        ) : null}
      </View>

      <View className="mt-5 flex-row border-b border-neutral-800/60 pb-4">
        {statsToRender.map((stat, index) => (
          <View
            key={stat.label}
            className={`flex-1 ${index > 0 ? "border-l border-neutral-800/60" : ""}`}
          >
            <StatTile label={stat.label} value={stat.value} />
          </View>
        ))}
      </View>
    </View>
  );
}
