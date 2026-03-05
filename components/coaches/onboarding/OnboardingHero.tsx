import { Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  showReadyBadge: boolean;
};

export default function OnboardingHero({ title, subtitle, showReadyBadge }: Props) {
  return (
    <>
      <Text className="text-3xl font-bold tracking-tight text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-relaxed text-neutral-400">{subtitle}</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-neutral-400">~60 sec setup</Text>
        </View>
        {showReadyBadge ? (
          <View className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-violet-300">ready to generate</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}
