import { Text, View } from "react-native";

type HowItWorksItem = {
  title: string;
  description: string;
};

type GuestHowItWorksProps = {
  items: ReadonlyArray<HowItWorksItem>;
};

export default function GuestHowItWorks({ items }: GuestHowItWorksProps) {
  return (
    <View className="mb-8">
      <Text className="mb-4 text-lg font-semibold text-white">
        How it works
      </Text>
      <View className="gap-4">
        {items.map((item, index) => (
          <View key={item.title} className="flex-row items-start">
            <View className="mr-4 h-9 w-9 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/20">
              <Text className="text-sm font-bold text-violet-400">
                {index + 1}
              </Text>
            </View>
            <View className="flex-1 pt-0.5">
              <Text className="mb-1 font-semibold text-white">
                {item.title}
              </Text>
              <Text className="text-sm leading-5 text-neutral-400">
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
