import { type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type AuthHeaderProps = {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
};

export default function AuthHeader({ title, onBack, rightAction }: AuthHeaderProps) {
  return (
    <View className="mb-8 flex-row items-center">
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900"
        >
          <Text className="text-lg text-white">←</Text>
        </TouchableOpacity>
      ) : null}
      <Text numberOfLines={1} className="min-w-0 flex-1 text-2xl font-bold text-white">
        {title}
      </Text>
      {rightAction ? <View className="ml-4">{rightAction}</View> : null}
    </View>
  );
}
