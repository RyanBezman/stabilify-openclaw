import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../components/ui/Card";
import CoachAvatar from "../components/coaches/CoachAvatar";
import { useCoach } from "../lib/features/coaches";
import type { CoachSpecialization } from "../lib/features/coaches";
import type { RootStackParamList } from "../lib/navigation/types";
import { coachPersonalityCopy } from "../lib/features/coaches";

type ScreenProps = NativeStackScreenProps<RootStackParamList, "CoachProfile">;

export default function CoachProfileScreen({ navigation, route }: ScreenProps) {
  const { getActiveCoach, hydrated } = useCoach();
  const specialization =
    (route.params?.specialization as CoachSpecialization | undefined) ??
    route.params?.coach?.specialization ??
    "workout";
  const coach = route.params?.coach ?? getActiveCoach(specialization);

  void hydrated; // kept for signature consistency; profile is purely static UI.

  const copy = useMemo(() => (coach ? coachPersonalityCopy[coach.personality] : null), [coach]);

  if (!coach || !copy) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-950">
        <StatusBar style="light" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-neutral-200">No coach selected.</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4"
          >
            <Text className="text-sm font-semibold text-neutral-200">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="h-10 w-10 items-center justify-center rounded-xl"
          >
            <Ionicons name="chevron-back" size={26} color="#a3a3a3" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-sm font-semibold text-neutral-300">Coach Profile</Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        <Card variant="subtle" className="p-6">
          <View className="items-center">
            <CoachAvatar coach={coach} size="xl" />
            <Text className="mt-4 text-2xl font-bold text-white">{coach.displayName}</Text>
            <Text className="mt-2 text-center text-base leading-relaxed text-neutral-400">
              {coach.tagline}
            </Text>
            <Text className="mt-3 text-center text-sm leading-relaxed text-neutral-300">
              {copy.aboutLine}
            </Text>
          </View>
        </Card>

        <Card className="mt-4 p-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            What you get
          </Text>
          <View className="mt-3 gap-2">
            {copy.whatYouGet.map((line) => (
              <Text key={line} className="text-sm leading-relaxed text-neutral-200">
                • {line}
              </Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
