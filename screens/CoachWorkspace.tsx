import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  type AlertButton,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import OptionPill from "../components/ui/OptionPill";
import SectionTitle from "../components/ui/SectionTitle";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import CoachAvatar from "../components/coaches/CoachAvatar";
import CoachWorkspaceLocked from "../components/coaches/CoachWorkspaceLocked";
import CoachWorkspaceSkeleton from "../components/coaches/CoachWorkspaceSkeleton";
import PlanGenerationOverlay from "../components/coaches/PlanGenerationOverlay";
import WorkspaceHeader from "../components/coaches/workspace/WorkspaceHeader";
import PlanPane from "../components/coaches/workspace/PlanPane";
import ChatPane from "../components/coaches/workspace/ChatPane";
import PlanSurface from "../components/coaches/workspace/PlanSurface";
import { useCoach, useCoachAccessGate } from "../lib/features/coaches";
import type {
  CoachSpecialization,
} from "../lib/features/coaches";
import { useCoachWorkspace } from "../lib/features/coaches";
import { clearUnifiedCoachOnServer, fetchCoachOnboardingStatus } from "../lib/features/coaches";
import { fetchCurrentUserId } from "../lib/features/auth";
import NutritionIntakeCard from "../components/coaches/nutrition/NutritionIntakeCard";
import NutritionPlanCard from "../components/coaches/nutrition/NutritionPlanCard";
import type {
  CoachWorkspaceScreenProps,
  CoachWorkspaceViewProps,
} from "../lib/features/coaches";
import { useCoachRenderDiagnostics } from "../lib/features/coaches";
import AppScreen from "../components/ui/AppScreen";

export function CoachWorkspaceView({
  coach,
  specialization,
  hydrated,
  initialTab = "plan",
  openIntakeOnMount = false,
  openDraftOnMount = false,
  requirePlanFeedbackChoice = false,
  feedbackContext = "checkin_review",
  prefill,
  initialInputMode = "text",
  userTier,
  showBack = false,
  onBack,
  onRequestChangeCoach,
  onRequestRemoveCoach,
  onTierRequired,
}: CoachWorkspaceViewProps) {
  const {
    tab,
    setTab,
    activePlan,
    draftPlan,
    showDraftInPlan,
    setShowDraftInPlan,
    showIntake,
    setShowIntake,
    requiresPlanFeedbackChoice,
    feedbackLogging,
    showDaysRevision,
    setShowDaysRevision,
    pendingDaysPerWeek,
    setPendingDaysPerWeek,
    intakeStep,
    setIntakeStep,
    messages,
    workspaceSkeletonVisible,
    syncError,
    sendError,
    setSendError,
    planError,
    planApiUnavailable,
    sending,
    planLoadingVisible,
    planStage,
    planLoadingAction,
    planSuccessChip,
    composerHeight,
    setComposerHeight,
    showScrollToBottom,
    draft,
    setDraft,
    chatScrollRef,
    composerRef,
    headerTitle,
    isWorkout,
    displayedPlanKind,
    hasAnyPlan,
    hasToggle,
    displayedWorkoutPlan,
    displayedNutritionPlan,
    workoutActivePlan,
    workoutDraftPlan,
    nutritionActivePlan,
    nutritionDraftPlan,
    workoutIntake,
    nutritionIntake,
    revealingMessageId,
    revealedChars,
    cursorOpacity,
    finishReveal,
    assistantBusy,
    planBusy,
    inlinePlanLoadingAction,
    showInlinePlanLoading,
    clampDays,
    openPlanIntake,
    hydrateWorkspace,
    updateWorkoutIntake,
    updateNutritionIntake,
    generatePlan,
    revisePlanDays,
    promoteDraftPlan,
    discardDraftPlan,
    handleAcceptUpdatedNutritionPlan,
    handleNotNowUpdatedNutritionPlan,
    handleAskCoachAboutUpdatedNutritionPlan,
    sendMessage,
    handleSend,
    scrollToBottom,
    handleScrollDistanceFromBottomChange,
    handleChatContentSizeChange,
    retryLastSend,
    openDaysRevision,
  } = useCoachWorkspace({
    coach,
    specialization,
    hydrated,
    initialTab,
    openIntakeOnMount,
    openDraftOnMount,
    requirePlanFeedbackChoice,
    feedbackContext,
    prefill,
    userTier,
    onTierRequired,
  });
  const [workoutNotesOpen, setWorkoutNotesOpen] = useState(false);
  const [workoutScheduleOpen, setWorkoutScheduleOpen] = useState(true);
  const [expandedWorkoutDays, setExpandedWorkoutDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!displayedWorkoutPlan) {
      setWorkoutNotesOpen(false);
      setWorkoutScheduleOpen(true);
      setExpandedWorkoutDays({});
      return;
    }

    setWorkoutNotesOpen(false);
    setWorkoutScheduleOpen(true);
    setExpandedWorkoutDays(
      Object.fromEntries(
        displayedWorkoutPlan.schedule.map((day, index) => [
          `${day.dayLabel}-${index}`,
          index === 0,
        ]),
      ),
    );
  }, [displayedWorkoutPlan]);

  useCoachRenderDiagnostics("CoachWorkspaceView", {
    specialization,
    coach: coach ? `${coach.gender}:${coach.personality}` : "none",
    tab,
    workspaceSkeletonVisible,
    sending,
    messages: messages.length,
  });

  if (!coach) {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={960}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-32 pt-6"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-3 text-3xl font-bold tracking-tight text-white">Coach</Text>
          <Text className="text-base leading-relaxed text-neutral-400">
            You don't have a coach selected yet.
          </Text>
          <Card className="mt-6 p-5">
            <Text className="text-base font-semibold text-white">Pick a coach first</Text>
            <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
              Head back to Coaches to choose a presentation + personality.
            </Text>
            <Button
              className="mt-4"
              title="Back to Coaches"
              onPress={() => {
                if (onBack) onBack();
                else onRequestChangeCoach?.();
              }}
            />
          </Card>
        </ScrollView>
      </AppScreen>
    );
  }

  const handleOpenCoachActions = () => {
    const changeCoachButtons: AlertButton[] = [{ text: "Cancel", style: "cancel" }];
    if (onRequestRemoveCoach) {
      changeCoachButtons.push({
        text: "Remove coach",
        style: "destructive",
        onPress: () => onRequestRemoveCoach(),
      });
    }
    changeCoachButtons.push({
      text: "Change coach",
      style: "destructive",
      onPress: () => {
        setShowIntake(false);
        onRequestChangeCoach?.();
      },
    });

    Alert.alert(
      "Change coach?",
      "Switching coaches will reset workout and nutrition plans + chat history.",
      changeCoachButtons
    );
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={1120}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View className="flex-1">
          <WorkspaceHeader
            coach={coach}
            title={headerTitle}
            tab={tab}
            showBack={showBack}
            onBack={onBack}
            onOpenActions={handleOpenCoachActions}
          />

          {workspaceSkeletonVisible ? <CoachWorkspaceSkeleton withScreenWrapper={false} /> : null}

          {!workspaceSkeletonVisible && tab === "plan" ? (
            <PlanPane>
              <View className="mb-6">
                <View className="flex-row items-start">
                  <CoachAvatar coach={coach} size="xl" />
                  <View className="ml-4 flex-1">
                    <Text className="mb-2 text-3xl font-bold tracking-tight text-white">{headerTitle}</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {draftPlan ? (
                    <View
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-amber-200">
                        New plan ready
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {!!syncError ? (
                <Card className="mb-4 border border-rose-500/30 bg-rose-950/20 p-4">
                  <Text className="text-sm font-semibold text-rose-300">{syncError}</Text>
                  <Button className="mt-3" title="Retry sync" variant="secondary" onPress={() => void hydrateWorkspace()} />
                </Card>
              ) : null}

              {!!planError ? (
                <Card className="mb-4 border border-rose-500/30 bg-rose-950/20 p-4">
                  <Text className="text-sm font-semibold text-rose-300">{planError}</Text>
                </Card>
              ) : null}

              {planSuccessChip ? (
                <View className="mb-4 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-emerald-200">{planSuccessChip}</Text>
                </View>
              ) : null}

              {planApiUnavailable ? (
                <Card className="mb-4 border border-amber-500/30 bg-amber-950/20 p-4">
                  <Text className="text-sm font-semibold text-amber-200">
                    OpenAI is not configured for coach planning yet. Plan generation is disabled until the backend has `OPENAI_API_KEY`.
                  </Text>
                </Card>
              ) : null}

              <SectionTitle>{isWorkout ? "Workout plan" : "Nutrition plan"}</SectionTitle>
              {showIntake ? (
                inlinePlanLoadingAction === "generate" ? (
                  <View className="mt-3">
                    <PlanGenerationOverlay
                      visible
                      mode="inline"
                      coach={coach}
                      stage={planStage}
                      action={planLoadingAction}
                    />
                  </View>
                ) : isWorkout ? (
                  <Card className="mt-3 p-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-white">Plan intake</Text>
                      <View className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5">
                        <Text className="text-xs font-semibold text-neutral-300">Step {intakeStep} / 3</Text>
                      </View>
                    </View>

                    {intakeStep === 1 ? (
                      <View className="mt-5 gap-5">
                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Goal</Text>
                          <View className="mt-3 flex-row gap-3">
                            <OptionPill label="Strength" selected={workoutIntake.goal === "strength"} onPress={() => updateWorkoutIntake({ goal: "strength" })} />
                            <OptionPill label="Fat loss" selected={workoutIntake.goal === "fat_loss"} onPress={() => updateWorkoutIntake({ goal: "fat_loss" })} />
                            <OptionPill label="Recomp" selected={workoutIntake.goal === "recomp"} onPress={() => updateWorkoutIntake({ goal: "recomp" })} />
                          </View>
                        </View>

                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Experience</Text>
                          <View className="mt-3 flex-row gap-3">
                            <OptionPill label="Beginner" selected={workoutIntake.experience === "beginner"} onPress={() => updateWorkoutIntake({ experience: "beginner" })} />
                            <OptionPill label="Intermediate" selected={workoutIntake.experience === "intermediate"} onPress={() => updateWorkoutIntake({ experience: "intermediate" })} />
                            <OptionPill label="Advanced" selected={workoutIntake.experience === "advanced"} onPress={() => updateWorkoutIntake({ experience: "advanced" })} />
                          </View>
                        </View>

                        <View className="flex-row gap-3">
                          <Button className="flex-1" title="Cancel" variant="secondary" onPress={() => setShowIntake(false)} />
                          <Button className="flex-1" title="Next" onPress={() => setIntakeStep(2)} />
                        </View>
                      </View>
                    ) : null}

                    {intakeStep === 2 ? (
                      <View className="mt-5 gap-5">
                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Days per week</Text>
                          <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-4">
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() =>
                                updateWorkoutIntake({
                                  daysPerWeek: clampDays(workoutIntake.daysPerWeek - 1),
                                })
                              }
                              disabled={clampDays(workoutIntake.daysPerWeek) <= 1}
                              className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                                clampDays(workoutIntake.daysPerWeek) <= 1
                                  ? "border-neutral-800 bg-neutral-900 opacity-50"
                                  : "border-neutral-700 bg-neutral-950"
                              }`}
                            >
                              <Ionicons name="remove" size={20} color="#e5e5e5" />
                            </TouchableOpacity>

                            <View className="items-center">
                              <Text className="text-3xl font-bold text-white">{clampDays(workoutIntake.daysPerWeek)}</Text>
                              <Text className="mt-1 text-xs font-semibold uppercase tracking-[2px] text-neutral-500">days/week</Text>
                            </View>

                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() =>
                                updateWorkoutIntake({
                                  daysPerWeek: clampDays(workoutIntake.daysPerWeek + 1),
                                })
                              }
                              disabled={clampDays(workoutIntake.daysPerWeek) >= 7}
                              className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                                clampDays(workoutIntake.daysPerWeek) >= 7
                                  ? "border-neutral-800 bg-neutral-900 opacity-50"
                                  : "border-neutral-700 bg-neutral-950"
                              }`}
                            >
                              <Ionicons name="add" size={20} color="#e5e5e5" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Session length</Text>
                          <View className="mt-3 flex-row gap-3">
                            <OptionPill label="30m" selected={workoutIntake.sessionMinutes === 30} onPress={() => updateWorkoutIntake({ sessionMinutes: 30 })} />
                            <OptionPill label="45m" selected={workoutIntake.sessionMinutes === 45} onPress={() => updateWorkoutIntake({ sessionMinutes: 45 })} />
                          </View>
                          <View className="mt-3 flex-row gap-3">
                            <OptionPill label="60m" selected={workoutIntake.sessionMinutes === 60} onPress={() => updateWorkoutIntake({ sessionMinutes: 60 })} />
                            <OptionPill label="75m" selected={workoutIntake.sessionMinutes === 75} onPress={() => updateWorkoutIntake({ sessionMinutes: 75 })} />
                          </View>
                        </View>

                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Equipment</Text>
                          <View className="mt-3 flex-row gap-3">
                            <OptionPill label="Full gym" selected={workoutIntake.equipment === "full_gym"} onPress={() => updateWorkoutIntake({ equipment: "full_gym" })} />
                            <OptionPill label="Home" selected={workoutIntake.equipment === "home_basic"} onPress={() => updateWorkoutIntake({ equipment: "home_basic" })} />
                          </View>
                        </View>

                        <View className="flex-row gap-3">
                          <Button className="flex-1" title="Back" variant="secondary" onPress={() => setIntakeStep(1)} />
                          <Button className="flex-1" title="Next" onPress={() => setIntakeStep(3)} />
                        </View>
                      </View>
                    ) : null}

                    {intakeStep === 3 ? (
                      <View className="mt-5 gap-5">
                        <View>
                          <Text className="text-sm font-semibold text-neutral-300">Injuries / limitations (optional)</Text>
                          <Text className="mt-2 text-xs leading-relaxed text-neutral-500">
                            Example: knee pain, no barbell, shoulder discomfort, no jumping.
                          </Text>
                          <Input
                            className="mt-3"
                            value={workoutIntake.injuryNotes}
                            onChangeText={(text) => updateWorkoutIntake({ injuryNotes: text })}
                            placeholder="Anything to avoid?"
                            multiline
                          />
                        </View>

                        <Card variant="subtle" className="p-5">
                          <Text className="text-base font-semibold text-white">Review</Text>
                          <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
                            Goal: {workoutIntake.goal.replace("_", " ")} · {workoutIntake.daysPerWeek} days/week · {workoutIntake.sessionMinutes} min · {" "}
                            {workoutIntake.equipment === "full_gym" ? "full gym" : "home"} · {workoutIntake.experience}
                          </Text>
                          {workoutIntake.injuryNotes.trim() ? (
                            <Text className="mt-2 text-sm leading-relaxed text-neutral-400">Limits: {workoutIntake.injuryNotes.trim()}</Text>
                          ) : null}
                        </Card>

                        <View className="flex-row gap-3">
                          <Button className="flex-1" title="Back" variant="secondary" onPress={() => setIntakeStep(2)} />
                          <Button className="flex-1" title="Generate plan" onPress={() => void generatePlan()} disabled={planBusy || planApiUnavailable} />
                        </View>
                      </View>
                    ) : null}
                  </Card>
                ) : (
                  <NutritionIntakeCard
                    intake={nutritionIntake}
                    disabled={planBusy || planApiUnavailable}
                    onChange={updateNutritionIntake}
                    onCancel={() => setShowIntake(false)}
                    onGenerate={() => void generatePlan()}
                  />
                )
              ) : isWorkout && showDaysRevision ? (
                inlinePlanLoadingAction === "revise_days" ? (
                  <View className="mt-3">
                    <PlanGenerationOverlay
                      visible
                      mode="inline"
                      coach={coach}
                      stage={planStage}
                      action={planLoadingAction}
                    />
                  </View>
                ) : (
                  <Card className="mt-3 p-5">
                    <Text className="text-lg font-bold text-white">Revise days per week</Text>
                    <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
                      We'll generate a new draft plan with this training frequency.
                    </Text>

                    <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-4">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setPendingDaysPerWeek((prev) => clampDays(prev - 1))}
                        disabled={pendingDaysPerWeek <= 1}
                        className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                          pendingDaysPerWeek <= 1
                            ? "border-neutral-800 bg-neutral-900 opacity-50"
                            : "border-neutral-700 bg-neutral-950"
                        }`}
                      >
                        <Ionicons name="remove" size={20} color="#e5e5e5" />
                      </TouchableOpacity>

                      <View className="items-center">
                        <Text className="text-3xl font-bold text-white">{pendingDaysPerWeek}</Text>
                        <Text className="mt-1 text-xs font-semibold uppercase tracking-[2px] text-neutral-500">days/week</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setPendingDaysPerWeek((prev) => clampDays(prev + 1))}
                        disabled={pendingDaysPerWeek >= 7}
                        className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                          pendingDaysPerWeek >= 7
                            ? "border-neutral-800 bg-neutral-900 opacity-50"
                            : "border-neutral-700 bg-neutral-950"
                        }`}
                      >
                        <Ionicons name="add" size={20} color="#e5e5e5" />
                      </TouchableOpacity>
                    </View>

                    <View className="mt-5 flex-row gap-3">
                      <Button className="flex-1" title="Cancel" variant="secondary" onPress={() => setShowDaysRevision(false)} />
                      <Button className="flex-1" title="Generate new draft" onPress={() => void revisePlanDays()} disabled={planBusy || planApiUnavailable} />
                    </View>
                  </Card>
                )
              ) : isWorkout ? (
                <PlanSurface className="mt-3">
                  <View className="px-5 py-5">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-white">
                          {displayedWorkoutPlan ? displayedWorkoutPlan.title : "No plan yet"}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-neutral-300">
                          {displayedWorkoutPlan
                            ? `${displayedWorkoutPlan.daysPerWeek} days/week · ${
                                displayedPlanKind === "current"
                                  ? workoutDraftPlan
                                    ? "current"
                                    : "active"
                                  : "new"
                              }`
                            : "Create your first plan, then refine it with your coach."}
                        </Text>
                      </View>
                      {displayedWorkoutPlan ? (
                        displayedPlanKind === "current" ? (
                          <View className="ml-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-emerald-200">
                              {hasToggle ? "CURRENT" : "ACTIVE"}
                            </Text>
                          </View>
                        ) : (
                          <View className="ml-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-amber-200">NEW</Text>
                          </View>
                        )
                      ) : null}
                    </View>

                    {workoutActivePlan && workoutDraftPlan ? (
                      <View className="mt-5 flex-row gap-3">
                        <OptionPill label="Current" selected={!showDraftInPlan} onPress={() => setShowDraftInPlan(false)} />
                        <OptionPill label="New" selected={showDraftInPlan} onPress={() => setShowDraftInPlan(true)} />
                      </View>
                    ) : null}

                    {displayedWorkoutPlan ? (
                      <>
                        <View className="mt-5 flex-row gap-3">
                          <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
                              Days / week
                            </Text>
                            <Text className="mt-2 text-lg font-semibold text-white">
                              {displayedWorkoutPlan.daysPerWeek}
                            </Text>
                          </View>
                          <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
                              Sessions
                            </Text>
                            <Text className="mt-2 text-lg font-semibold text-white">
                              {displayedWorkoutPlan.schedule.length}
                            </Text>
                          </View>
                        </View>

                        {displayedWorkoutPlan.notes.length ? (
                          <View className="mt-5">
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => setWorkoutNotesOpen((current) => !current)}
                              className="flex-row items-center justify-between gap-3"
                            >
                              <View className="flex-1">
                                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
                                  Notes
                                </Text>
                                <Text className="mt-1 text-sm leading-5 text-neutral-200">
                                  {displayedWorkoutPlan.notes.length} note{displayedWorkoutPlan.notes.length === 1 ? "" : "s"}
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-2">
                                <Text className="text-sm font-semibold text-neutral-200">
                                  {workoutNotesOpen ? "Hide" : "Show"}
                                </Text>
                                <Ionicons
                                  name={workoutNotesOpen ? "chevron-up" : "chevron-down"}
                                  size={16}
                                  color="#e5e5e5"
                                />
                              </View>
                            </TouchableOpacity>
                            {workoutNotesOpen ? (
                              <View className="mt-3 gap-2">
                                {displayedWorkoutPlan.notes.map((note, noteIndex) => (
                                  <Text
                                    key={`${note}-${noteIndex}`}
                                    className="text-sm leading-6 text-neutral-200"
                                  >
                                    • {note}
                                  </Text>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View className="mt-5">
                        <Text className="text-base font-semibold text-white">Build your plan</Text>
                        <Text className="mt-2 text-sm leading-6 text-neutral-300">
                          Answer a few intake questions and your coach will generate a workout draft you can confirm.
                        </Text>
                        <Button
                          className="mt-4"
                          title="Create workout plan"
                          onPress={openPlanIntake}
                          disabled={planApiUnavailable}
                        />
                      </View>
                    )}
                  </View>

                  {displayedWorkoutPlan ? (
                    <>
                      <View className="border-t border-neutral-800 px-5 py-4">
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setWorkoutScheduleOpen((current) => !current)}
                          className="flex-row items-center justify-between gap-3"
                        >
                          <View className="flex-1">
                            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
                              Weekly schedule
                            </Text>
                            <Text className="mt-1 text-sm leading-5 text-neutral-200">
                              {displayedWorkoutPlan.schedule.length} day{displayedWorkoutPlan.schedule.length === 1 ? "" : "s"}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-semibold text-neutral-200">
                              {workoutScheduleOpen ? "Hide" : "Show"}
                            </Text>
                            <Ionicons
                              name={workoutScheduleOpen ? "chevron-up" : "chevron-down"}
                              size={16}
                              color="#e5e5e5"
                            />
                          </View>
                        </TouchableOpacity>
                      </View>

                      {workoutScheduleOpen
                        ? displayedWorkoutPlan.schedule.map((day, dayIndex) => {
                            const dayKey = `${day.dayLabel}-${dayIndex}`;
                            const dayOpen = Boolean(expandedWorkoutDays[dayKey]);

                            return (
                              <View
                                key={dayKey}
                                className={`${dayIndex === 0 ? "" : "border-t border-neutral-800"} px-5 py-4`}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() =>
                                    setExpandedWorkoutDays((current) => ({
                                      ...current,
                                      [dayKey]: !current[dayKey],
                                    }))
                                  }
                                  className="flex-row items-start justify-between gap-3"
                                >
                                  <View className="flex-1">
                                    <Text className="text-base font-semibold text-neutral-100">
                                      {day.dayLabel}
                                    </Text>
                                    <Text className="mt-1 text-sm leading-5 text-neutral-200">
                                      {day.focus} • {day.items.length} exercise{day.items.length === 1 ? "" : "s"}
                                    </Text>
                                  </View>
                                  <Text className="text-xs font-semibold text-neutral-300">
                                    {dayOpen ? "Hide" : "Show"}
                                  </Text>
                                </TouchableOpacity>
                                {dayOpen ? (
                                  <View className="mt-3 gap-3">
                                    {day.items.map((item, itemIndex) => (
                                      <View
                                        key={`${day.dayLabel}-${item.name}-${itemIndex}`}
                                        className="flex-row items-start justify-between gap-3"
                                      >
                                        <Text className="flex-1 text-sm leading-6 text-white">
                                          {item.name}
                                        </Text>
                                        <Text className="shrink-0 pt-0.5 text-right text-xs text-neutral-300">
                                          {item.sets} x {item.reps}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            );
                          })
                        : null}

                      <View className="border-t border-neutral-800 px-5 py-5">
                        {workoutDraftPlan ? (
                          <View className="flex-row gap-3">
                            <Button
                              className="flex-1"
                              title={workoutActivePlan ? "Keep new plan" : "Save plan"}
                              onPress={() => void promoteDraftPlan()}
                              disabled={planBusy}
                            />
                            <Button
                              className="flex-1"
                              variant="secondary"
                              title="Discard new"
                              onPress={() => {
                                void discardDraftPlan();
                              }}
                              disabled={planBusy || planApiUnavailable}
                            />
                          </View>
                        ) : (
                          <Button
                            title="Revise days/week"
                            onPress={openDaysRevision}
                            disabled={planBusy || planApiUnavailable}
                          />
                        )}
                      </View>
                    </>
                  ) : null}
                </PlanSurface>
              ) : (
                <NutritionPlanCard
                  plan={displayedNutritionPlan}
                  activePlan={nutritionActivePlan}
                  draftPlan={nutritionDraftPlan}
                  showDraftInPlan={showDraftInPlan}
                  onToggleDraft={setShowDraftInPlan}
                  onOpenIntake={openPlanIntake}
                  onKeepDraft={() => void handleAcceptUpdatedNutritionPlan()}
                  onDiscardDraft={() => void discardDraftPlan()}
                  onNotNowDraft={() => void handleNotNowUpdatedNutritionPlan()}
                  onAskCoachDraft={() => void handleAskCoachAboutUpdatedNutritionPlan()}
                  showExplicitDecision={requiresPlanFeedbackChoice}
                  planBusy={planBusy || feedbackLogging}
                  planApiUnavailable={planApiUnavailable}
                />
              )}
            </PlanPane>
          ) : null}

          {!workspaceSkeletonVisible && tab === "chat" ? (
            <ChatPane
              coach={coach}
              messages={messages}
              syncError={syncError}
              sendError={sendError}
              sending={sending}
              assistantBusy={assistantBusy}
              hydrateWorkspace={hydrateWorkspace}
              chatScrollRef={chatScrollRef}
              composerRef={composerRef}
              revealingMessageId={revealingMessageId}
              revealedChars={revealedChars}
              cursorOpacity={cursorOpacity}
              finishReveal={finishReveal}
              handleScrollDistanceFromBottomChange={handleScrollDistanceFromBottomChange}
              handleChatContentSizeChange={handleChatContentSizeChange}
              onAssistantReviewDraftPlan={() => {
                if (draftPlan) setShowDraftInPlan(true);
                setTab("plan");
              }}
              showScrollToBottom={showScrollToBottom}
              composerHeight={composerHeight}
              setComposerHeight={setComposerHeight}
              scrollToBottom={scrollToBottom}
              isWorkout={isWorkout}
              draft={draft}
              setDraft={setDraft}
              handleSend={handleSend}
              retryLastSend={retryLastSend}
              sendMessage={sendMessage}
              setSendError={setSendError}
              initialInputMode={initialInputMode}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <PlanGenerationOverlay
        visible={planLoadingVisible && !showInlinePlanLoading}
        coach={coach}
        stage={planStage}
        action={planLoadingAction}
      />
    </AppScreen>
  );
}

export default function CoachWorkspaceScreen({
  navigation,
  route,
}: CoachWorkspaceScreenProps) {
  const { getActiveCoach, hydrated, setActiveCoach } = useCoach();
  const specialization: CoachSpecialization =
    route.params?.specialization ?? route.params?.coach?.specialization ?? "workout";
  const coach = route.params?.coach ?? getActiveCoach(specialization);
  const [removing, setRemoving] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const {
    isPro,
    membershipTier,
    tierError,
    viewState,
    refreshMembershipTier,
    lockToFreeTier,
  } = useCoachAccessGate();

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (viewState !== "ready" || !isPro) {
        if (mounted) setCheckingOnboarding(false);
        return;
      }

      const authResult = await fetchCurrentUserId();
      const userId = authResult.data?.userId;
      if (authResult.error || !userId) {
        if (mounted) setCheckingOnboarding(false);
        return;
      }

      const status = await fetchCoachOnboardingStatus(userId);
      if (mounted && !status.error && !status.data?.complete) {
        navigation.replace("CoachOnboardingFlow", { specialization });
        return;
      }

      if (mounted) setCheckingOnboarding(false);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [isPro, navigation, specialization, viewState]);

  useCoachRenderDiagnostics("CoachWorkspaceScreen", {
    specialization,
    coach: coach ? `${coach.gender}:${coach.personality}` : "none",
    viewState,
    removing,
  });

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Authed", { screen: "Coaches", params: { specialization } });
  };

  if (checkingOnboarding) {
    return <CoachWorkspaceSkeleton />;
  }

  if (viewState === "locked") {
    return (
      <CoachWorkspaceLocked
        coachName={coach?.displayName ?? null}
        error={tierError}
        onRetry={() => void refreshMembershipTier({ blocking: true })}
        onUpgrade={() => navigation.navigate("BillingPlans")}
        onBack={handleBack}
        onBrowseCoaches={() => navigation.navigate("Authed", { screen: "Coaches", params: { specialization } })}
      />
    );
  }

  return (
    <View className="flex-1">
      <CoachWorkspaceView
        coach={coach}
        specialization={specialization}
        hydrated={viewState === "ready" && isPro ? hydrated : false}
        initialTab={route.params?.tab}
        openIntakeOnMount={route.params?.openIntake}
        openDraftOnMount={route.params?.openDraft}
        requirePlanFeedbackChoice={route.params?.requirePlanFeedbackChoice}
        feedbackContext={route.params?.feedbackContext}
        prefill={route.params?.prefill}
        initialInputMode={route.params?.inputMode}
        userTier={membershipTier}
        showBack
        onBack={handleBack}
        onTierRequired={lockToFreeTier}
        onRequestChangeCoach={() => navigation.navigate("Authed", { screen: "Coaches", params: { specialization } })}
        onRequestRemoveCoach={async () => {
          setRemoving(true);
          try {
            const authResult = await fetchCurrentUserId();
            const userId = authResult.data?.userId;
            if (authResult.error) return;
            if (!userId) return;
            const res = await clearUnifiedCoachOnServer(userId);
            if (res.error) return;
            setActiveCoach("workout", null);
            setActiveCoach("nutrition", null);
            navigation.navigate("Authed", { screen: "Coaches", params: { specialization } });
          } finally {
            setRemoving(false);
          }
        }}
      />
      {removing ? (
        <LoadingOverlay
          title="Removing coach"
          subtitle="Resetting workout and nutrition history..."
        />
      ) : null}
    </View>
  );
}
