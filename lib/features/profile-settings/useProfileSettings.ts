import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { requestAppleHealthStepReadAccess } from "../../data/appleHealth";
import type {
  AccountVisibility,
  ProgressVisibility,
  ShareVisibility,
  WeightUnit,
} from "../../data/types";
import {
  allowAutoSupportWithConsent,
  fetchHasActivePushNotificationDevice,
  registerPushNotificationDevice,
  setPhoneNudgesEnabled as setPhoneNudgesEnabledRemote,
} from "../../data/supportAutomation";
import {
  fetchProfileSettingsValues,
  saveProfileSettingsValues,
} from "./data";
import { isSessionRequired } from "../shared";
import { getExpoProjectId } from "../../utils/expo";
import type { ProfileSettingsValues } from "./data";

type ProfileSettingsActionResult = {
  success: boolean;
  error?: string;
};

async function requestExpoPushToken(): Promise<{ token?: string; error?: string }> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;
  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return {
      error: "Phone notification permission is required to enable phone notifications.",
    };
  }

  try {
    const configuredProjectId = getExpoProjectId();
    const tokenResult = configuredProjectId
      ? await Notifications.getExpoPushTokenAsync({ projectId: configuredProjectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data?.trim();
    if (!token) {
      return { error: "Couldn't read Expo push token for this device." };
    }

    return { token };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Couldn't fetch Expo push token.";
    if (errorMessage.toLowerCase().includes("projectid")) {
      return {
        error:
          "Push notifications are not configured for this build (missing EXPO_PUBLIC_EXPO_PROJECT_ID).",
      };
    }

    return {
      error: `Couldn't fetch Expo push token: ${errorMessage}`,
    };
  }
}

export function useProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPhoneNudges, setUpdatingPhoneNudges] = useState(false);
  const [grantingAutoSupportConsent, setGrantingAutoSupportConsent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>("lb");
  const [timezone, setTimezone] = useState("");
  const [accountVisibility, setAccountVisibility] = useState<AccountVisibility>("private");
  const [progressVisibility, setProgressVisibility] =
    useState<ProgressVisibility>("public");
  const [socialEnabled, setSocialEnabled] = useState(false);
  const [weighInShareVisibility, setWeighInShareVisibility] =
    useState<ShareVisibility>("private");
  const [gymEventShareVisibility, setGymEventShareVisibility] =
    useState<ShareVisibility>("private");
  const [postShareVisibility, setPostShareVisibility] =
    useState<ShareVisibility>("private");
  const [autoSupportEnabled, setAutoSupportEnabled] = useState(true);
  const [autoSupportConsentedAt, setAutoSupportConsentedAt] = useState<string | null>(null);
  const [phoneNudgesEnabled, setPhoneNudgesEnabledState] = useState(false);
  const [appleHealthStepsEnabled, setAppleHealthStepsEnabledState] = useState(false);
  const [dailyStepGoal, setDailyStepGoal] = useState(10000);
  const [updatingAppleHealthSteps, setUpdatingAppleHealthSteps] = useState(false);

  const applyProfileSettings = useCallback((values: ProfileSettingsValues) => {
    setDisplayName(values.displayName);
    setUsername(values.username);
    setBio(values.bio);
    setAvatarPath(values.avatarPath);
    setPreferredUnit(values.preferredUnit);
    setTimezone(values.timezone);
    setAccountVisibility(values.accountVisibility);
    setProgressVisibility(values.progressVisibility);
    setSocialEnabled(values.socialEnabled);
    setWeighInShareVisibility(values.weighInShareVisibility);
    setGymEventShareVisibility(values.gymEventShareVisibility);
    setPostShareVisibility(values.postShareVisibility);
    setAutoSupportEnabled(values.autoSupportEnabled && Boolean(values.autoSupportConsentedAt));
    setAutoSupportConsentedAt(values.autoSupportConsentedAt);
    setAppleHealthStepsEnabledState(values.appleHealthStepsEnabled);
    setDailyStepGoal(values.dailyStepGoal);
  }, []);

  const buildCurrentValues = useCallback(
    (): ProfileSettingsValues => ({
      displayName,
      username,
      bio,
      avatarPath,
      preferredUnit,
      timezone,
      accountVisibility,
      progressVisibility,
      socialEnabled,
      weighInShareVisibility,
      gymEventShareVisibility,
      postShareVisibility,
      autoSupportEnabled,
      autoSupportConsentedAt,
      appleHealthStepsEnabled,
      dailyStepGoal,
    }),
    [
      accountVisibility,
      appleHealthStepsEnabled,
      autoSupportConsentedAt,
      autoSupportEnabled,
      avatarPath,
      bio,
      dailyStepGoal,
      displayName,
      gymEventShareVisibility,
      postShareVisibility,
      preferredUnit,
      progressVisibility,
      socialEnabled,
      timezone,
      username,
      weighInShareVisibility,
    ],
  );

  const refresh = useCallback(async (): Promise<ProfileSettingsActionResult> => {
    setLoading(true);
    const [profileSettingsResult, pushDeviceResult] = await Promise.all([
      fetchProfileSettingsValues(),
      fetchHasActivePushNotificationDevice(),
    ]);
    const { data, error, code } = profileSettingsResult;

    if (isSessionRequired({ code })) {
      setLoadError("Please sign in again.");
      setLoading(false);
      return { success: false, error: "Please sign in again." };
    }

    if (error || !data) {
      setLoadError(error ?? "Couldn't load profile settings.");
      setLoading(false);
      return { success: false, error: error ?? "Couldn't load profile settings." };
    }

    setLoadError(null);
    applyProfileSettings(data);

    if (!pushDeviceResult.error) {
      setPhoneNudgesEnabledState(pushDeviceResult.data?.hasActiveDevice ?? false);
    } else {
      setPhoneNudgesEnabledState(false);
    }

    setLoading(false);
    return { success: true };
  }, [applyProfileSettings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async () => {
    if (saving) {
      return { success: false, error: "Save already in progress." };
    }

    const values = buildCurrentValues();
    setSaving(true);
    const { data, error, code } = await saveProfileSettingsValues(values);
    setSaving(false);

    if (isSessionRequired({ code })) {
      return { success: false, error: "Please sign in again." };
    }
    if (error) {
      return { success: false, error };
    }
    if (!data?.ok) {
      return { success: false, error: "Couldn't save profile settings." };
    }
    setAutoSupportConsentedAt(data.autoSupportConsentedAt);

    return { success: true };
  }, [autoSupportConsentedAt, buildCurrentValues, saving]);

  const updateProfileValues = useCallback(
    async (patch: Partial<ProfileSettingsValues>): Promise<ProfileSettingsActionResult> => {
      if (saving) {
        return { success: false, error: "Save already in progress." };
      }

      const previousValues = buildCurrentValues();
      const nextValues: ProfileSettingsValues = {
        ...previousValues,
        ...patch,
      };

      applyProfileSettings(nextValues);
      setSaving(true);
      const { data, error, code } = await saveProfileSettingsValues(nextValues);
      setSaving(false);

      if (isSessionRequired({ code })) {
        applyProfileSettings(previousValues);
        return { success: false, error: "Please sign in again." };
      }

      if (error || !data?.ok) {
        applyProfileSettings(previousValues);
        return {
          success: false,
          error: error ?? "Couldn't save profile settings.",
        };
      }

      setAutoSupportConsentedAt(data.autoSupportConsentedAt);
      return { success: true };
    },
    [applyProfileSettings, buildCurrentValues, saving],
  );

  const grantAutoSupportConsent = useCallback(async (): Promise<ProfileSettingsActionResult> => {
    if (grantingAutoSupportConsent) {
      return { success: false };
    }

    setGrantingAutoSupportConsent(true);
    try {
      const consentResult = await allowAutoSupportWithConsent();
      if (consentResult.error || !consentResult.data) {
        return {
          success: false,
          error: consentResult.error ?? "Couldn't save support consent.",
        };
      }

      setAutoSupportEnabled(consentResult.data.autoSupportEnabled);
      setAutoSupportConsentedAt(consentResult.data.autoSupportConsentedAt);
      return { success: true };
    } finally {
      setGrantingAutoSupportConsent(false);
    }
  }, [grantingAutoSupportConsent]);

  const setPhoneNudgesEnabled = useCallback(
    async (enabled: boolean): Promise<ProfileSettingsActionResult> => {
      if (updatingPhoneNudges) {
        return { success: false };
      }

      const previousEnabled = phoneNudgesEnabled;
      setPhoneNudgesEnabledState(enabled);
      setUpdatingPhoneNudges(true);
      try {
        if (!enabled) {
          const disableResult = await setPhoneNudgesEnabledRemote(false);
          if (disableResult.error) {
            setPhoneNudgesEnabledState(previousEnabled);
            return {
              success: false,
              error: disableResult.error,
            };
          }

          setPhoneNudgesEnabledState(false);
          return { success: true };
        }

        const tokenResult = await requestExpoPushToken();
        if (tokenResult.error || !tokenResult.token) {
          setPhoneNudgesEnabledState(previousEnabled);
          return {
            success: false,
            error: tokenResult.error ?? "Couldn't access push token.",
          };
        }

        const registrationResult = await registerPushNotificationDevice({
          expoPushToken: tokenResult.token,
          platform: Platform.OS,
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? null,
        });

        if (registrationResult.error) {
          setPhoneNudgesEnabledState(previousEnabled);
          return { success: false, error: registrationResult.error };
        }

        const pushDeviceResult = await fetchHasActivePushNotificationDevice();
        if (!pushDeviceResult.error) {
          setPhoneNudgesEnabledState(pushDeviceResult.data?.hasActiveDevice ?? true);
        } else {
          setPhoneNudgesEnabledState(true);
        }

        return { success: true };
      } finally {
        setUpdatingPhoneNudges(false);
      }
    },
    [phoneNudgesEnabled, updatingPhoneNudges],
  );

  const setAppleHealthStepsEnabled = useCallback(
    async (enabled: boolean): Promise<ProfileSettingsActionResult> => {
      if (updatingAppleHealthSteps) {
        return { success: false };
      }

      setUpdatingAppleHealthSteps(true);
      try {
        if (enabled) {
          const accessResult = await requestAppleHealthStepReadAccess();
          if (accessResult.error) {
            return { success: false, error: accessResult.error };
          }
        }

        return await updateProfileValues({ appleHealthStepsEnabled: enabled });
      } finally {
        setUpdatingAppleHealthSteps(false);
      }
    },
    [updateProfileValues, updatingAppleHealthSteps],
  );

  return {
    loading,
    saving,
    updatingPhoneNudges,
    updatingAppleHealthSteps,
    grantingAutoSupportConsent,
    loadError,
    refresh,
    displayName,
    setDisplayName,
    username,
    setUsername,
    bio,
    setBio,
    avatarPath,
    setAvatarPath,
    preferredUnit,
    setPreferredUnit,
    timezone,
    setTimezone,
    accountVisibility,
    setAccountVisibility,
    progressVisibility,
    setProgressVisibility,
    socialEnabled,
    setSocialEnabled,
    weighInShareVisibility,
    setWeighInShareVisibility,
    gymEventShareVisibility,
    setGymEventShareVisibility,
    postShareVisibility,
    setPostShareVisibility,
    autoSupportEnabled,
    setAutoSupportEnabled,
    autoSupportConsentedAt,
    phoneNudgesEnabled,
    setPhoneNudgesEnabled,
    appleHealthStepsEnabled,
    setAppleHealthStepsEnabled,
    dailyStepGoal,
    setDailyStepGoal,
    grantAutoSupportConsent,
    updateProfileValues,
    save,
  };
}
