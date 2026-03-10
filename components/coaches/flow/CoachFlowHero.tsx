import { Text, View } from "react-native";

type CoachFlowHeroProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string | null;
};

export default function CoachFlowHero({
  title,
  subtitle,
  badgeLabel = null,
}: CoachFlowHeroProps) {
  return (
    <>
      <Text className="text-3xl font-bold tracking-tight text-white">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
          {subtitle}
        </Text>
      ) : null}
      {badgeLabel ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-violet-300">
              {badgeLabel}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
