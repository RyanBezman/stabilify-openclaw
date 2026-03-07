import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { RootStackParamList } from "../lib/navigation/types";
import { mapCoachChatRouteToWorkspaceParams } from "../lib/features/coaches";
import AppScreen from "../components/ui/AppScreen";

type ScreenProps = NativeStackScreenProps<RootStackParamList, "CoachChat">;

export default function CoachChatScreen({ navigation, route }: ScreenProps) {
  useEffect(() => {
    navigation.replace("CoachWorkspace", mapCoachChatRouteToWorkspaceParams(route.params));
  }, [
    navigation,
    route.params?.coach,
    route.params?.initialDomain,
    route.params?.prefill,
    route.params?.specialization,
  ]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color="#a3a3a3" />
        <Text className="mt-3 text-sm text-neutral-400">Opening coach workspace...</Text>
      </View>
    </AppScreen>
  );
}
