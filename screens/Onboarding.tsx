import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { saveOnboarding } from "../lib/data/onboarding";
import Button from "../components/ui/Button";
import HelperText from "../components/ui/HelperText";
import OnboardingHeader from "../components/onboarding/OnboardingHeader";
import StepProgress from "../components/onboarding/StepProgress";
import StepProfile from "../components/onboarding/steps/StepProfile";
import StepGoal from "../components/onboarding/steps/StepGoal";
import StepRoutine from "../components/onboarding/steps/StepRoutine";
import { sanitizeWeightInput, sanitizeWholeNumberInput } from "../lib/utils/weight";
import { toDisplayTime, timeToDate, toTimeString } from "../lib/utils/time";
import type { RootStackParamList } from "../lib/navigation/types";
import type { OnboardingState } from "../lib/features/onboarding";
import {
  ONBOARDING_STEPS,
  buildOnboardingInput,
  createInitialOnboardingState,
  getOnboardingCadenceMessage,
  getOnboardingGoalState,
  getOnboardingValidationState,
} from "../lib/features/onboarding";
import { sanitizeUsername } from "../lib/utils/username";

type OnboardingProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export default function Onboarding({ navigation, route }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const prefillName = route?.params?.prefillName?.trim() ?? "";
  const [form, setForm] = useState<OnboardingState>(() =>
    createInitialOnboardingState(prefillName),
  );

  const isFirst = step === 0;
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const updateForm = <K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const goalState = getOnboardingGoalState(form);
  const { canContinue, canProceed, gymTargetValue, validationMessage } =
    getOnboardingValidationState({
      form,
      step,
      goal: goalState,
      saving,
    });
  const cadenceMessage = getOnboardingCadenceMessage(form.weighInCadence);

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (!selected) return;
    updateForm("reminderTime", toTimeString(selected));
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
  };

  const handleFinish = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    const payload = buildOnboardingInput({
      form,
      goal: goalState,
      gymTargetValue,
    });

    const { error } = await saveOnboarding(payload);
    setSaving(false);

    if (error) {
      Alert.alert("Setup failed", error);
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: "Authed" }] });
  };

  const goNext = () => {
    if (!canContinue || saving) return;
    if (isLast) {
      void handleFinish();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (saving) return;
    if (isFirst) {
      navigation.goBack();
    } else {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-5 pb-6 pt-6">
            <OnboardingHeader
              title={ONBOARDING_STEPS[step]?.title ?? ""}
              subtitle={ONBOARDING_STEPS[step]?.subtitle ?? ""}
              step={step + 1}
              totalSteps={ONBOARDING_STEPS.length}
              onBack={goBack}
            />

            <StepProgress total={ONBOARDING_STEPS.length} current={step} />

            {step === 0 ? (
              <StepProfile
                displayName={form.displayName}
                username={form.username}
                preferredUnit={form.preferredUnit}
                onDisplayNameChange={(value) => updateForm("displayName", value)}
                onUsernameChange={(value) =>
                  updateForm("username", sanitizeUsername(value))
                }
                onUnitChange={(value) => updateForm("preferredUnit", value)}
              />
            ) : step === 1 ? (
              <StepGoal
                goalType={form.goalType}
                preferredUnit={form.preferredUnit}
                currentWeight={form.currentWeight}
                targetMin={form.targetMin}
                targetMax={form.targetMax}
                targetWeight={form.targetWeight}
                onGoalTypeChange={(value) => updateForm("goalType", value)}
                onCurrentWeightChange={(value) =>
                  updateForm("currentWeight", sanitizeWeightInput(value))
                }
                onTargetMinChange={(value) =>
                  updateForm("targetMin", sanitizeWeightInput(value))
                }
                onTargetMaxChange={(value) =>
                  updateForm("targetMax", sanitizeWeightInput(value))
                }
                onTargetWeightChange={(value) =>
                  updateForm("targetWeight", sanitizeWeightInput(value))
                }
                goalLabel={goalState.goalLabel}
                rangeSummary={goalState.rangeSummary}
                statusText={goalState.statusText}
              />
            ) : (
              <StepRoutine
                cadence={form.weighInCadence}
                cadenceMessage={cadenceMessage}
                customCadence={form.customCadence}
                reminderDisplay={toDisplayTime(form.reminderTime)}
                timezone={form.timezone}
                gymProofEnabled={form.gymProofEnabled}
                gymName={form.gymName}
                onCadenceChange={(value) =>
                  updateForm("weighInCadence", value)
                }
                onCustomCadenceChange={(value) =>
                  updateForm(
                    "customCadence",
                    sanitizeWholeNumberInput(value)
                  )
                }
                gymSessionsTarget={form.gymSessionsTarget}
                onGymSessionsTargetChange={(value) =>
                  updateForm(
                    "gymSessionsTarget",
                    sanitizeWholeNumberInput(value)
                  )
                }
                onOpenTimePicker={() => setShowTimePicker(true)}
                onClearTime={() => updateForm("reminderTime", "")}
                onGymProofToggle={(value) =>
                  updateForm("gymProofEnabled", value)
                }
                onGymNameChange={(value) => updateForm("gymName", value)}
                gymOptions={form.gymOptions}
                loadingGyms={form.loadingGyms}
                gymError={form.gymError}
                selectedGymName={form.gymPlaceName}
                onFindGyms={() => {
                  updateForm("gymError", null);
                  updateForm("loadingGyms", true);
                }}
                onGymsLoaded={(options) => {
                  updateForm("gymOptions", options);
                  updateForm("loadingGyms", false);
                  updateForm("showGymList", true);
                }}
                onGymError={(message) => {
                  updateForm("gymError", message);
                  updateForm("loadingGyms", false);
                }}
                onGymSelect={(gym) => {
                  if (form.gymSelectedId === gym.id) {
                    updateForm("gymPlaceName", "");
                    updateForm("gymPlaceAddress", "");
                    updateForm("gymLat", null);
                    updateForm("gymLng", null);
                    updateForm("gymSelectedId", "");
                    if (form.gymName === gym.name) {
                      updateForm("gymName", "");
                    }
                    return;
                  }

                  updateForm("gymPlaceName", gym.name);
                  updateForm("gymPlaceAddress", gym.address ?? "");
                  updateForm("gymLat", gym.lat);
                  updateForm("gymLng", gym.lng);
                  updateForm("gymName", gym.name);
                  updateForm("gymSelectedId", gym.id);
                }}
                gymSearch={form.gymSearch}
                onGymSearchChange={(value) => updateForm("gymSearch", value)}
                selectedGymId={form.gymSelectedId}
                showGymList={form.showGymList}
                onToggleGymList={() =>
                  updateForm("showGymList", !form.showGymList)
                }
              />
            )}

            {Platform.OS === "android" && showTimePicker ? (
              <DateTimePicker
                value={timeToDate(form.reminderTime)}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            ) : null}

            {Platform.OS === "ios" ? (
              <Modal
                visible={showTimePicker}
                transparent
                animationType="fade"
                onRequestClose={closeTimePicker}
              >
                <View className="flex-1 justify-end bg-black/60">
                  <View className="rounded-t-3xl border border-neutral-800 bg-neutral-950 px-5 pb-8 pt-4">
                    <View className="mb-4 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-neutral-400">
                        Select reminder time
                      </Text>
                      <TouchableOpacity
                        onPress={closeTimePicker}
                        className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-white">
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={timeToDate(form.reminderTime)}
                      mode="time"
                      display="spinner"
                      themeVariant="dark"
                      textColor="#ffffff"
                      onChange={handleTimeChange}
                      style={{ alignSelf: "stretch" }}
                    />
                  </View>
                </View>
              </Modal>
            ) : null}

            <View className="mt-10">
              {validationMessage ? (
                <HelperText className="mb-3 font-medium">
                  {validationMessage}
                </HelperText>
              ) : null}
              <Button
                title={isLast ? "Finish setup" : "Next"}
                onPress={goNext}
                loading={saving && isLast}
                disabled={!canProceed}
                className="mb-4"
              />
              <TouchableOpacity
                onPress={() =>
                  saving
                    ? null
                    : navigation.reset({ index: 0, routes: [{ name: "Authed" }] })
                }
                disabled={saving}
              >
                <Text className="text-center text-sm text-neutral-500">
                  Skip for now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
