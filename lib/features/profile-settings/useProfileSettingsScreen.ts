import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { requestCurrentUserAccountDeletion } from "../account-lifecycle";
import { signOutCurrentUser } from "../auth";
import type { ProfileSettingsValues } from "./data";
import type { EditableProfileSettingsFieldKey } from "./editableFields";
import {
  buildAccountVisibilityPatch,
  buildEditableFieldRows,
  buildShareVisibilityPatch,
} from "./screenHelpers";
import { useProfileSettings } from "./useProfileSettings";
import { useProfileSettingsNotifications } from "./useProfileSettingsNotifications";
import { useProfileSettingsPhoto } from "./useProfileSettingsPhoto";

type ProfileSettingsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "ProfileSettings"
>;

export function useProfileSettingsScreen(navigation: ProfileSettingsNavigation) {
  const settings = useProfileSettings();
  const {
    avatarPath,
    grantAutoSupportConsent,
    hasUsableSnapshot,
    loadError,
    refresh,
    setAppleHealthStepsEnabled,
    setAutoSupportEnabled,
    setPhoneNudgesEnabled,
    updateProfileValues,
  } = settings;
  const [showAdvancedPrivacy, setShowAdvancedPrivacy] = useState(false);
  const [requestingAccountDeletion, setRequestingAccountDeletion] = useState(false);

  const refreshProfileSettingsSurface = useCallback(async () => {
    const result = await refresh({ blocking: false, preserveOnError: true });
    return result.error ? { error: result.error } : {};
  }, [refresh]);

  const { openPhotoActions, photoLoading, photoUrl } = useProfileSettingsPhoto({
    avatarPath,
    refreshProfile: refreshProfileSettingsSurface,
  });
  const {
    handleSendDelayedTestNotification,
    handleSendTestNotification,
    handleSetPhoneNudgesEnabled,
    handleShowPushDebugInfo,
    loadingPushDebugInfo,
    sendingDelayedTestNotification,
    sendingTestNotification,
  } = useProfileSettingsNotifications({
    setPhoneNudgesEnabled,
  });

  useEffect(() => {
    if (!loadError || hasUsableSnapshot) {
      return;
    }
    Alert.alert("Couldn't load profile settings", loadError);
  }, [hasUsableSnapshot, loadError]);

  const editableFieldRows = buildEditableFieldRows(settings);

  const updateSettingsPatch = useCallback(
    async (title: string, patch: Partial<ProfileSettingsValues>) => {
      const result = await updateProfileValues(patch);
      if (result.error) {
        Alert.alert(title, result.error);
      }
      return result;
    },
    [updateProfileValues],
  );

  const handleImmediateSaveError = (title: string, message?: string) => {
    if (!message) {
      return;
    }
    Alert.alert(title, message);
  };

  const handleAccountVisibilityChange = useCallback(async (next: "private" | "public") => {
    if (next === "private") {
      setShowAdvancedPrivacy(false);
    }

    await updateSettingsPatch(
      "Couldn't update profile visibility",
      buildAccountVisibilityPatch(next),
    );
  }, [updateSettingsPatch]);

  const handleSocialEnabledToggle = useCallback(async (enabled: boolean) => {
    await updateSettingsPatch("Couldn't update social features", {
      socialEnabled: enabled,
    });
  }, [updateSettingsPatch]);

  const handleWeighInShareToggle = useCallback(async (enabled: boolean) => {
    await updateSettingsPatch(
      "Couldn't update weigh-in sharing",
      buildShareVisibilityPatch("weighInShareVisibility", enabled),
    );
  }, [updateSettingsPatch]);

  const handleGymEventShareToggle = useCallback(async (enabled: boolean) => {
    await updateSettingsPatch(
      "Couldn't update gym sharing",
      buildShareVisibilityPatch("gymEventShareVisibility", enabled),
    );
  }, [updateSettingsPatch]);

  const handlePostShareToggle = useCallback(async (enabled: boolean) => {
    await updateSettingsPatch(
      "Couldn't update post sharing",
      buildShareVisibilityPatch("postShareVisibility", enabled),
    );
  }, [updateSettingsPatch]);

  const handleProgressVisibilityToggle = useCallback(async (enabled: boolean) => {
    await updateSettingsPatch("Couldn't update progress visibility", {
      progressVisibility: enabled ? "public" : "private",
    });
  }, [updateSettingsPatch]);

  const handlePreferredUnitChange = useCallback(async (nextUnit: "lb" | "kg") => {
    await updateSettingsPatch("Couldn't update preferred unit", {
      preferredUnit: nextUnit,
    });
  }, [updateSettingsPatch]);

  const handleGrantAutoSupportConsent = useCallback(async (): Promise<boolean> => {
    const result = await grantAutoSupportConsent();
    if (!result.success && result.error) {
      Alert.alert("Couldn't save consent", result.error);
      return false;
    }
    if (!result.success) {
      return false;
    }

    Alert.alert(
      "Consent saved",
      "Private auto-support is on for future behind-goal triggers. This week's request stays suppressed and won't backfill.",
    );
    return true;
  }, [grantAutoSupportConsent]);

  const handleAppleHealthStepsToggle = useCallback(async (enabled: boolean) => {
    const result = await setAppleHealthStepsEnabled(enabled);
    if (result.success || !result.error) {
      return;
    }

    Alert.alert(
      "Couldn't update Apple Health",
      result.error,
      [
        { text: "OK", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ],
    );
  }, [setAppleHealthStepsEnabled]);

  const handleAutoSupportToggle = useCallback((enabled: boolean) => {
    if (!enabled) {
      void updateSettingsPatch("Couldn't disable auto support", {
        autoSupportEnabled: false,
      });
      return;
    }

    setAutoSupportEnabled(true);
    Alert.alert(
      "Allow private auto-support?",
      "When you're behind, Stabilify can post a private support request to your close friends. It won't share weight, photos, or location details.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setAutoSupportEnabled(false);
          },
        },
        {
          text: "I agree",
          onPress: () => {
            void (async () => {
              const consentSaved = await handleGrantAutoSupportConsent();
              if (!consentSaved) {
                setAutoSupportEnabled(false);
              }
            })();
          },
        },
      ],
    );
  }, [handleGrantAutoSupportConsent, setAutoSupportEnabled, updateSettingsPatch]);

  const openEditableField = useCallback(
    (fieldKey: EditableProfileSettingsFieldKey) => {
      navigation.navigate("ProfileSettingsTextEdit", { fieldKey });
    },
    [navigation],
  );

  const handleRequestAccountDeletion = useCallback(async (): Promise<boolean> => {
    if (requestingAccountDeletion) {
      return false;
    }

    setRequestingAccountDeletion(true);
    try {
      const deletionResult = await requestCurrentUserAccountDeletion();
      if (deletionResult.error) {
        Alert.alert("Couldn't delete your account", deletionResult.error);
        return false;
      }

      const signOutResult = await signOutCurrentUser({ scope: "local" });
      if (signOutResult.error) {
        Alert.alert(
          "Account scheduled for deletion",
          "Your account is hidden now, but this device could not sign out cleanly. Close and reopen the app, then sign back in within 30 days if you want to restore it.",
        );
        return false;
      }

      return true;
    } finally {
      setRequestingAccountDeletion(false);
    }
  }, [requestingAccountDeletion]);

  return {
    ...settings,
    editableFieldRows,
    handleAccountVisibilityChange,
    handleAppleHealthStepsToggle,
    handleAutoSupportToggle,
    handleGymEventShareToggle,
    handlePostShareToggle,
    handlePreferredUnitChange,
    handleProgressVisibilityToggle,
    handleSendDelayedTestNotification,
    handleSendTestNotification,
    handleSetPhoneNudgesEnabled,
    handleShowPushDebugInfo,
    handleSocialEnabledToggle,
    handleWeighInShareToggle,
    loadingPushDebugInfo,
    openEditableField,
    openPhotoActions,
    photoLoading,
    photoUrl,
    requestingAccountDeletion,
    sendingDelayedTestNotification,
    sendingTestNotification,
    setShowAdvancedPrivacy,
    showAdvancedPrivacy,
    handleRequestAccountDeletion,
  };
}
