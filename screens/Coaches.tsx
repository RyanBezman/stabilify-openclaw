import { StatusBar } from "expo-status-bar";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CoachAvatar from "../components/coaches/CoachAvatar";
import CoachGenderPicker from "../components/coaches/CoachGenderPicker";
import CoachOptionCard from "../components/coaches/CoachOptionCard";
import CoachesLoadingSkeleton from "../components/coaches/CoachesLoadingSkeleton";
import CoachDashboardSkeleton from "../components/coaches/CoachDashboardSkeleton";
import CoachWorkspaceLocked from "../components/coaches/CoachWorkspaceLocked";
import CoachChatCard from "../components/coaches/dashboard/CoachChatCard";
import CoachTodayCard from "../components/coaches/dashboard/CoachTodayCard";
import TrackCard from "../components/coaches/dashboard/TrackCard";
import WeeklyCheckinCard from "../components/coaches/dashboard/WeeklyCheckinCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useCoach } from "../lib/features/coaches";
import { useCoachAccessGate } from "../lib/features/coaches";
import type {
  ActiveCoach,
  CoachGender,
  CoachPersonality,
} from "../lib/features/coaches";
import { coachFromSelection } from "../lib/features/coaches";
import { coachPersonalityCopy } from "../lib/features/coaches";
import {
  clearUnifiedCoachOnServer,
  ensureCoachSelectionProfile,
  setUnifiedCoachOnServer,
} from "../lib/features/coaches";
import { preloadCoachAvatars } from "../lib/features/coaches";
import { useCoachDashboard } from "../lib/features/coaches";
import type { CoachesScreenProps } from "../lib/features/coaches";
import { fetchCurrentAuthUser } from "../lib/features/auth";
import { useCoachRenderDiagnostics } from "../lib/features/coaches";
import { useCoachDashboardFocusRefresh } from "../lib/features/coaches/hooks/useCoachDashboardFocusRefresh";

const personalityLabels: Record<CoachPersonality, string> = Object.fromEntries(
  (Object.keys(coachPersonalityCopy) as CoachPersonality[]).map((p) => [
    p,
    coachPersonalityCopy[p].label,
  ]),
) as Record<CoachPersonality, string>;

const personalities: CoachPersonality[] = [
  "hype",
  "strict",
  "sweet",
  "relaxed",
  "bubbly",
  "analyst",
];

export default function Coaches({ navigation }: CoachesScreenProps) {
  const {
    setActiveCoach,
    getActiveCoach,
    hydrated,
    refreshFromServer,
    serverCheckedBySpecialization,
    serverSyncingBySpecialization,
    serverErrorBySpecialization,
  } = useCoach();
  const {
    viewState,
    tierError,
    refreshMembershipTier,
  } = useCoachAccessGate();

  const workoutCoach = getActiveCoach("workout");
  const nutritionCoach = getActiveCoach("nutrition");
  const canonicalCoach = workoutCoach ?? nutritionCoach;
  const coachIdentityKey = canonicalCoach
    ? `${canonicalCoach.gender}:${canonicalCoach.personality}`
    : null;

  const [gender, setGender] = useState<CoachGender>("woman");
  const [personality, setPersonality] = useState<CoachPersonality>("hype");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [forcePicker, setForcePicker] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loadedAvatars, setLoadedAvatars] = useState<Record<string, boolean>>(
    {},
  );

  const serverChecked =
    serverCheckedBySpecialization.workout &&
    serverCheckedBySpecialization.nutrition;
  const serverSyncing =
    serverSyncingBySpecialization.workout ||
    serverSyncingBySpecialization.nutrition;
  const serverError =
    serverErrorBySpecialization.workout ??
    serverErrorBySpecialization.nutrition;

  const dashboard = useCoachDashboard({
    coach: canonicalCoach,
    hydrated: hydrated && serverChecked,
    specialization: "nutrition",
  });
  const refreshDashboard = dashboard.refresh;

  useCoachRenderDiagnostics("CoachesScreen", {
    ready: hydrated && serverChecked,
    forcePicker,
    coach: coachIdentityKey ?? "none",
  });

  const coachesForGender = useMemo(
    () => personalities.map((p) => coachFromSelection("workout", gender, p)),
    [gender],
  );

  useEffect(() => {
    void preloadCoachAvatars();
  }, []);

  useEffect(() => {
    if (!canonicalCoach || forcePicker) return;
    setGender(canonicalCoach.gender);
    setPersonality(canonicalCoach.personality);
  }, [canonicalCoach, forcePicker]);

  useCoachDashboardFocusRefresh({
    coachIdentityKey,
    forcePicker,
    refreshDashboard,
  });

  const persistCoachSelection = async (
    coach: ActiveCoach,
  ): Promise<boolean> => {
    setSaveError(null);
    setSaving(true);

    try {
      const authResult = await fetchCurrentAuthUser();
      if (authResult.error) {
        setSaveError(authResult.error ?? "Couldn't load session.");
        return false;
      }

      const user = authResult.data?.user;
      const userId = user?.id;
      if (!userId) {
        setSaveError("You must be signed in to select a coach.");
        return false;
      }

      const fallbackName =
        (typeof user?.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name.trim()) ||
        (typeof user?.email === "string" && user.email.trim()) ||
        "User";
      const fallbackTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const profileResult = await ensureCoachSelectionProfile(
        userId,
        fallbackName,
        fallbackTimezone,
      );
      if (profileResult.error) {
        setSaveError(
          profileResult.error ?? "Couldn't initialize your profile.",
        );
        return false;
      }

      const res = await setUnifiedCoachOnServer(
        userId,
        coach.gender,
        coach.personality,
      );
      if (res.error) {
        setSaveError(res.error ?? "Couldn't save coach.");
        return false;
      }

      const nextWorkoutCoach = coachFromSelection(
        "workout",
        coach.gender,
        coach.personality,
      );
      const nextNutritionCoach =
        res.data?.nutritionLinked === false
          ? null
          : coachFromSelection("nutrition", coach.gender, coach.personality);

      setActiveCoach("workout", nextWorkoutCoach);
      setActiveCoach("nutrition", nextNutritionCoach);
      setForcePicker(false);
      if (res.data?.warning) {
        setSaveError(res.data.warning);
      }

      await refreshFromServer();
      return true;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Couldn't save coach.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmAndPersist = (coach: ActiveCoach) => {
    const switching = canonicalCoach
      ? canonicalCoach.gender !== coach.gender ||
        canonicalCoach.personality !== coach.personality
      : false;

    if (!switching) {
      void persistCoachSelection(coach);
      return;
    }

    Alert.alert(
      `Set ${coach.displayName} as your coach?`,
      "Switching coaches will reset both workout and nutrition plans + chat history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Set coach",
          style: "default",
          onPress: () => void persistCoachSelection(coach),
        },
      ],
    );
  };

  const removeCoach = async () => {
    setSaveError(null);
    setRemoving(true);
    try {
      const authResult = await fetchCurrentAuthUser();
      if (authResult.error) {
        setSaveError(authResult.error ?? "Couldn't load session.");
        return;
      }
      const userId = authResult.data?.user?.id;
      if (!userId) {
        setSaveError("You must be signed in to remove your coach.");
        return;
      }

      const res = await clearUnifiedCoachOnServer(userId);
      if (res.error) {
        setSaveError(res.error ?? "Couldn't remove coach.");
        return;
      }

      setActiveCoach("workout", null);
      setActiveCoach("nutrition", null);
      setForcePicker(false);
      await refreshFromServer();
    } finally {
      setRemoving(false);
    }
  };

  const ready = hydrated && serverChecked;
  if (viewState === "locked") {
    return (
      <CoachWorkspaceLocked
        coachName={canonicalCoach?.displayName ?? null}
        error={tierError}
        onRetry={() => void refreshMembershipTier({ blocking: true })}
        onUpgrade={() => navigation.navigate("BillingPlans")}
      />
    );
  }

  if (canonicalCoach && !forcePicker) {
    const dashboardReady = viewState === "ready" && ready;
    const nutritionPendingApproval = dashboard.effectiveNutritionPendingReview;

    return (
      <SafeAreaView className="flex-1 bg-neutral-950">
        <StatusBar style="light" />
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-40 pt-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 flex-row items-center justify-between gap-3">
            <Text className="text-3xl font-bold tracking-tight text-white">
              Coach Dashboard
            </Text>
            <CoachAvatar coach={canonicalCoach} size={42} />
          </View>

          {serverError || dashboard.error || saveError ? (
            <Card className="mb-6 border border-amber-500/30 bg-amber-500/10 p-4">
              <Text className="text-sm font-semibold text-amber-200">
                {saveError ?? serverError ?? dashboard.error}
              </Text>
            </Card>
          ) : null}

          {dashboardReady && dashboard.snapshot ? (
            <>
              <CoachChatCard
                onPress={() =>
                  navigation.navigate("CoachWorkspace", {
                    coach: canonicalCoach,
                    specialization: "workout",
                    tab: "chat",
                  })
                }
              />

              <CoachTodayCard
                directive={dashboard.snapshot.today.directive}
                statusIndicators={dashboard.snapshot.today.statusIndicators}
              />

              <View className="mb-6 flex-row gap-3">
                <TrackCard
                  title="Training"
                  subtitle={dashboard.snapshot.training.preview}
                  cta={dashboard.snapshot.training.cta}
                  icon="barbell-outline"
                  onPress={() =>
                    navigation.navigate("CoachWorkspace", {
                      specialization: "workout",
                      tab: "plan",
                      openIntake: !dashboard.snapshot?.training.planId,
                    })
                  }
                />

                <TrackCard
                  title="Nutrition"
                  subtitle={dashboard.snapshot.nutrition.targetsSummary}
                  cta={dashboard.snapshot.nutrition.cta}
                  stateLabel={
                    nutritionPendingApproval
                      ? "Pending approval"
                      : undefined
                  }
                  stateLoading={nutritionPendingApproval && dashboard.nutritionSyncing}
                  icon="restaurant-outline"
                  onPress={() =>
                    navigation.push("CoachWorkspace", {
                      specialization: "nutrition",
                      tab: "plan",
                      openIntake: !dashboard.snapshot?.nutrition.planId,
                      openDraft: Boolean(
                        nutritionPendingApproval
                      ),
                    })
                  }
                />
              </View>

              <WeeklyCheckinCard
                nextDueLabel={dashboard.weeklyRecap.nextDueLabel}
                checkinCompleted={dashboard.weeklyRecap.checkinCompleted}
                planAcceptedThisWeek={dashboard.weeklyRecap.planAcceptedThisWeek}
                adherenceTrendDirection={dashboard.weeklyRecap.adherenceTrendDirection}
                adherenceTrendDelta={dashboard.weeklyRecap.adherenceTrendDelta}
                cta={dashboard.weeklyRecap.cta}
                onPress={() =>
                  navigation.navigate("CoachCheckins", {
                    specialization: "nutrition",
                  })
                }
              />
            </>
          ) : (
            <CoachDashboardSkeleton />
          )}

          <View className="mt-8 border-t border-neutral-900 pt-4">
            <Button
              variant="secondary"
              title="Switch coach"
              onPress={() => {
                setForcePicker(true);
                setSaveError(null);
              }}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={removing}
              onPress={() => {
                Alert.alert(
                  "Remove coach?",
                  "This will clear your workout and nutrition coach data.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => void removeCoach(),
                    },
                  ],
                );
              }}
              className={`mt-4 self-center ${removing ? "opacity-60" : ""}`}
            >
              <Text className="text-sm font-semibold text-rose-400/80">
                {removing ? "Removing..." : "Remove coach"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (viewState === "gating" || !ready) {
    return <CoachesLoadingSkeleton />;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-40 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold tracking-tight text-white">
          Coach
        </Text>

        {serverSyncing ? (
          <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Checking coach...
          </Text>
        ) : null}

        {serverError ? (
          <Card className="mt-4 border border-amber-500/30 bg-amber-500/10 p-4">
            <Text className="text-sm font-semibold text-amber-200">
              {serverError}
            </Text>
          </Card>
        ) : null}

        <View className="mt-5">
          <CoachGenderPicker
            gender={gender}
            onChange={(value) => setGender(value)}
          />
        </View>

        <View className="gap-3">
          {coachesForGender.map((coach) => {
            const p = coach.personality;
            const personalityCopy = coachPersonalityCopy[p];
            const selected = personality === p;
            const isLoaded = Boolean(loadedAvatars[coach.displayName]);

            return (
              <View key={`${gender}-${p}`}>
                <CoachOptionCard
                  coach={coach}
                  personalityLabel={personalityLabels[p]}
                  personalitySummary={personalityCopy.aboutLine}
                  selected={selected}
                  loaded={isLoaded}
                  disabled={saving}
                  confirmLoading={selected && saving}
                  confirmDisabled={saving}
                  confirmLabel="Confirm"
                  confirmAccessibilityLabel={`Confirm ${coach.displayName} as your coach`}
                  error={selected ? saveError : null}
                  onImageLoaded={() =>
                    setLoadedAvatars((prev) => ({
                      ...prev,
                      [coach.displayName]: true,
                    }))
                  }
                  onSelect={() => {
                    setPersonality(p);
                    setSaveError(null);
                  }}
                  onConfirm={() => confirmAndPersist(coach)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
