import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import StepCardHeader from "../gym/logGymSession/StepCardHeader";
import StepProgress from "../gym/logGymSession/StepProgress";
import StepReadyToSave from "../gym/logGymSession/StepReadyToSave";
import StepTakePhoto from "../gym/logGymSession/StepTakePhoto";
import StepVerifyLocation from "../gym/logGymSession/StepVerifyLocation";
import { useLogGymSession } from "../../lib/features/log-gym-session";
import type { GymSessionStatus, GymSessionStatusReason } from "../../lib/data/types";

type InlineGymSessionCaptureCardProps = {
  cardHeight: number;
  onCancel: () => void;
  onSaved: (payload: { photoUri: string }) => void;
  onSaveResolved?: (payload: {
    sessionId: string;
    status: GymSessionStatus;
    statusReason: GymSessionStatusReason | null;
    distanceMeters: number | null;
  }) => void;
  onSaveFailed?: () => void;
};

export default function InlineGymSessionCaptureCard({
  cardHeight,
  onCancel,
  onSaved,
  onSaveResolved,
  onSaveFailed,
}: InlineGymSessionCaptureCardProps) {
  const {
    permission,
    requestPermission,
    saving,
    loadError,
    photoUri,
    locationError,
    currentStep,
    saveSession,
    handleCapture,
    handleCaptureLocation,
    handleReset,
  } = useLogGymSession();

  const handleSave = async () => {
    if (!photoUri) {
      return;
    }

    onSaved({ photoUri });

    const { saved, error, sessionId, status, statusReason, distanceMeters } = await saveSession();
    if (error) {
      Alert.alert("Save failed", error);
      onSaveFailed?.();
      return;
    }
    if (!saved) {
      onSaveFailed?.();
      return;
    }

    if (status && sessionId) {
      onSaveResolved?.({
        sessionId,
        status,
        statusReason: statusReason ?? null,
        distanceMeters: distanceMeters ?? null,
      });
    }
  };

  return (
    <Card className="mb-6 border border-violet-500/25 p-5" style={{ height: cardHeight }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase tracking-wide text-violet-300">
          Add gym session
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCancel}
          className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1"
        >
          <Text className="text-xs font-semibold text-neutral-300">Close</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <View className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
          <Text className="text-sm text-rose-200">{loadError}</Text>
        </View>
      ) : null}

      <StepProgress currentStep={currentStep} totalSteps={4} />
      <StepCardHeader currentStep={currentStep} />

      <ScrollView
        className="flex-1"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {currentStep === 1 ? (
          <StepTakePhoto
            permission={permission}
            onRequestPermission={requestPermission}
            onOpenCamera={handleCapture}
          />
        ) : null}

        {currentStep === 2 ? (
          <StepVerifyLocation
            photoUri={photoUri}
            locationError={locationError}
            onCaptureLocation={handleCaptureLocation}
            onReset={handleReset}
          />
        ) : null}

        {currentStep === 3 ? (
          <StepReadyToSave
            saving={saving}
            photoUri={photoUri}
            onSave={handleSave}
            onReset={handleReset}
            hideSaveLoadingState
          />
        ) : null}
      </ScrollView>
    </Card>
  );
}
