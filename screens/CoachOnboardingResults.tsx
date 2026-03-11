import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  buildOnboardingResultTracks,
  coachFromSelection,
  hydrateOnboardingResultsSnapshot,
} from "../lib/features/coaches";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";

type Props = NativeStackScreenProps<RootStackParamList, "CoachOnboardingResults">;
type DashboardSnapshot = Awaited<
  ReturnType<typeof hydrateOnboardingResultsSnapshot>
>["snapshot"];

export default function CoachOnboardingResults({ navigation, route }: Props) {
  const {
    coachGender,
    coachPersonality,
    generatedTracks,
    warning,
  } = route.params;
  const workoutCoach = useMemo(
    () => coachFromSelection("workout", coachGender, coachPersonality),
    [coachGender, coachPersonality],
  );
  const nutritionCoach = useMemo(
    () => coachFromSelection("nutrition", coachGender, coachPersonality),
    [coachGender, coachPersonality],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      const result = await hydrateOnboardingResultsSnapshot({
        generatedTracks,
        workoutCoach,
        nutritionCoach,
        loadSnapshot: async ({ coach, specialization }) => {
          const { hydrateCoachDashboard } = await import("../lib/features/coaches");
          return hydrateCoachDashboard({ coach, specialization });
        },
      });
      if (!mounted) return;
      setSnapshot(result.snapshot);
      setError(result.error);
      setLoading(false);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [generatedTracks, nutritionCoach, reloadKey, workoutCoach]);

  const trackCards = useMemo(
    () => buildOnboardingResultTracks(generatedTracks, snapshot),
    [generatedTracks, snapshot],
  );

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-6">
        <Text className="text-3xl font-bold tracking-tight text-white">Your coach is ready</Text>
        <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
          Review both tracks before jumping into the dashboard.
        </Text>

        {warning ? (
          <Card className="mt-4 border border-amber-500/30 bg-amber-500/10 p-4">
            <Text className="text-sm font-semibold text-amber-200">{warning}</Text>
          </Card>
        ) : null}

        {loading ? (
          <View className="mt-6 items-center rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <ActivityIndicator color="#a78bfa" />
            <Text className="mt-3 text-sm font-semibold text-neutral-300">Loading your plan results...</Text>
          </View>
        ) : null}

        {error ? (
          <Card className="mt-6 border border-amber-500/30 bg-amber-500/10 p-4">
            <Text className="text-sm font-semibold text-amber-200">{error}</Text>
            <Button
              className="mt-3"
              title="Retry"
              variant="secondary"
              onPress={() => {
                setSnapshot(null);
                setError(null);
                setReloadKey((prev) => prev + 1);
              }}
            />
          </Card>
        ) : null}

        {!loading ? (
          <View className="mt-6 gap-4">
            {trackCards.map((track) => {
              const trackCoach = track.specialization === "workout" ? workoutCoach : nutritionCoach;
              return (
                <Card key={track.track} className="p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-white">{track.title}</Text>
                    <View
                      className={`rounded-full border px-3 py-1.5 ${
                        track.generated
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-neutral-700 bg-neutral-800"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold uppercase tracking-[1.4px] ${
                          track.generated ? "text-emerald-200" : "text-neutral-300"
                        }`}
                      >
                        {track.generated ? "Generated" : "Not generated"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-sm leading-relaxed text-neutral-300">{track.subtitle}</Text>
                  <Button
                    className="mt-4"
                    title={track.ctaLabel}
                    onPress={() =>
                      navigation.navigate("CoachWorkspace", {
                        specialization: track.specialization,
                        coach: trackCoach,
                        tab: "plan",
                        openIntake: track.openIntake,
                      })
                    }
                  />
                </Card>
              );
            })}
          </View>
        ) : null}

        <Button
          className="mt-6"
          title="Go to Coach Dashboard"
          variant="secondary"
          onPress={() => navigation.navigate("Authed", { screen: "Coaches" })}
        />
      </ScrollView>
    </AppScreen>
  );
}
