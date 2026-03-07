import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthHeader from "../components/auth/AuthHeader";
import GymProofSettingsCard from "../components/gym/GymProofSettingsCard";
import GymSettingsSkeleton from "../components/gym/GymSettingsSkeleton";
import Button from "../components/ui/Button";
import { useGymSettings } from "../lib/features/gym-settings";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";

type GymSettingsProps = NativeStackScreenProps<RootStackParamList, "GymSettings">;

export default function GymSettings({ navigation }: GymSettingsProps) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const {
    loading,
    saving,
    gymProofEnabled,
    setGymProofEnabled,
    gymName,
    setGymName,
    gymPlaceName,
    selectedGymId,
    showGymList,
    gymSearch,
    setGymSearch,
    manualAddress,
    setManualAddress,
    selectedManualAddressId,
    manualAddressOptions,
    loadingManualAddressOptions,
    manualAddressError,
    gymOptions,
    loadingGyms,
    gymError,
    filteredGyms,
    handleFindGyms,
    handleSave,
    selectGym,
    selectManualAddress,
    toggleGymList,
  } = useGymSettings();

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollManualSectionIntoView = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const onSave = async () => {
    const saved = await handleSave();
    if (!saved) return;

    Alert.alert("Saved", "Gym settings updated.", [
      { text: "Done", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerClassName="px-5 pb-6 pt-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            <AuthHeader title="Gym settings" onBack={navigation.goBack} />

            {loading ? (
              <GymSettingsSkeleton />
            ) : (
              <GymProofSettingsCard
                gymProofEnabled={gymProofEnabled}
                setGymProofEnabled={setGymProofEnabled}
                handleFindGyms={handleFindGyms}
                loadingGyms={loadingGyms}
                gymError={gymError}
                gymOptions={gymOptions}
                showGymList={showGymList}
                toggleGymList={toggleGymList}
                gymSearch={gymSearch}
                setGymSearch={setGymSearch}
                manualAddress={manualAddress}
                setManualAddress={setManualAddress}
                selectedManualAddressId={selectedManualAddressId}
                manualAddressOptions={manualAddressOptions}
                loadingManualAddressOptions={loadingManualAddressOptions}
                manualAddressError={manualAddressError}
                filteredGyms={filteredGyms}
                selectedGymId={selectedGymId}
                selectGym={selectGym}
                selectManualAddress={selectManualAddress}
                gymPlaceName={gymPlaceName}
                gymName={gymName}
                setGymName={setGymName}
                onGymNameFocus={scrollManualSectionIntoView}
                onGymAddressFocus={scrollManualSectionIntoView}
              />
            )}
          </ScrollView>

          {loading || keyboardVisible ? null : (
            <View className="border-t border-neutral-800 bg-neutral-950 px-5 pb-4 pt-3">
              <Button
                title={saving ? "Saving..." : "Save settings"}
                onPress={onSave}
                loading={saving}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
