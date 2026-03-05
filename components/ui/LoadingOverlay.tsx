import { ActivityIndicator, Text, View } from "react-native";

type LoadingOverlayProps = {
  title?: string;
  subtitle?: string;
};

export default function LoadingOverlay({ title, subtitle }: LoadingOverlayProps) {
  return (
    <View className="absolute inset-0 items-center justify-center bg-neutral-950/70 px-8">
      <View className="w-full max-w-[420px] rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
        <View className="flex-row items-center">
          <ActivityIndicator color="#ddd6fe" />
          <Text className="ml-3 text-base font-semibold text-white">
            {title ?? "Working..."}
          </Text>
        </View>
        {subtitle ? (
          <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

