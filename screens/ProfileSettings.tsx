import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import AuthHeader from "../components/auth/AuthHeader";
import FormLabel from "../components/ui/FormLabel";
import HelperText from "../components/ui/HelperText";
import Input from "../components/ui/Input";
import OptionPill from "../components/ui/OptionPill";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useProfileSettings } from "../lib/features/profile-settings";
import type { RootStackParamList } from "../lib/navigation/types";
import { sanitizeUsername } from "../lib/utils/username";
import AppScreen from "../components/ui/AppScreen";

type ProfileSettingsProps = NativeStackScreenProps<RootStackParamList, "ProfileSettings">;

function isPhoneNudgesPermissionError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("notification permission is required");
}

export default function ProfileSettings({ navigation }: ProfileSettingsProps) {
  const {
    loading,
    saving,
    updatingPhoneNudges,
    updatingAppleHealthSteps,
    grantingAutoSupportConsent,
    loadError,
    displayName,
    setDisplayName,
    username,
    setUsername,
    bio,
    setBio,
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
    phoneNudgesEnabled,
    setPhoneNudgesEnabled,
    appleHealthStepsEnabled,
    setAppleHealthStepsEnabled,
    dailyStepGoal,
    setDailyStepGoal,
    grantAutoSupportConsent,
    save,
  } = useProfileSettings();
  const [showAdvancedPrivacy, setShowAdvancedPrivacy] = useState(false);
  const [dailyStepGoalInput, setDailyStepGoalInput] = useState("10000");
  const [sendingTestNotification, setSendingTestNotification] = useState(false);

  useEffect(() => {
    if (!loadError) return;
    Alert.alert("Couldn't load profile settings", loadError);
  }, [loadError]);

  useEffect(() => {
    setDailyStepGoalInput(String(dailyStepGoal));
  }, [dailyStepGoal]);

  const handleSave = async () => {
    const result = await save();
    if (!result.success) {
      Alert.alert("Save failed", result.error ?? "Couldn't save profile settings.");
      return;
    }

    Alert.alert("Saved", "Profile settings updated.", [
      { text: "Done", onPress: () => navigation.goBack() },
    ]);
  };

  const handleAccountVisibilityChange = (next: "private" | "public") => {
    setAccountVisibility(next);

    if (next === "public") {
      setSocialEnabled(true);
      setWeighInShareVisibility("followers");
      setGymEventShareVisibility("followers");
      setPostShareVisibility("followers");
      return;
    }

    setSocialEnabled(false);
    setWeighInShareVisibility("private");
    setGymEventShareVisibility("private");
    setPostShareVisibility("private");
    setShowAdvancedPrivacy(false);
  };

  const handleWeighInShareToggle = (enabled: boolean) => {
    setWeighInShareVisibility(enabled ? "followers" : "private");
  };

  const handleGymEventShareToggle = (enabled: boolean) => {
    setGymEventShareVisibility(enabled ? "followers" : "private");
  };

  const handlePostShareToggle = (enabled: boolean) => {
    setPostShareVisibility(enabled ? "followers" : "private");
  };

  const handleProgressVisibilityToggle = (enabled: boolean) => {
    setProgressVisibility(enabled ? "public" : "private");
  };

  const handleSetPhoneNudgesEnabled = async (enabled: boolean) => {
    const result = await setPhoneNudgesEnabled(enabled);
    if (result.success || !result.error) {
      return;
    }

    if (enabled && isPhoneNudgesPermissionError(result.error)) {
      Alert.alert(
        "Enable notifications in Settings",
        "To turn on phone nudges, allow notifications for Stabilify in your device settings.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
    }
  };

  const handleGrantAutoSupportConsent = async (): Promise<boolean> => {
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
      "Future behind-goal triggers can auto-post to close friends. This week remains unchanged.",
    );
    return true;
  };

  const handleAppleHealthStepsToggle = async (enabled: boolean) => {
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
  };

  const handleDailyStepGoalTextChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    setDailyStepGoalInput(digitsOnly);
    if (!digitsOnly) {
      return;
    }

    setDailyStepGoal(Number(digitsOnly));
  };

  const handleDailyStepGoalInputBlur = () => {
    if (dailyStepGoalInput) {
      return;
    }

    setDailyStepGoal(10000);
    setDailyStepGoalInput("10000");
  };

  const handleAutoSupportToggle = (enabled: boolean) => {
    if (!enabled) {
      setAutoSupportEnabled(false);
      return;
    }

    setAutoSupportEnabled(true);
    Alert.alert(
      "Allow auto-support?",
      "When you are behind, Stabilify can automatically publish a private close-friends support post. No weight details are shared.",
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
  };

  const handleSendTestNotification = async () => {
    if (sendingTestNotification) {
      return;
    }

    setSendingTestNotification(true);
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      }

      const existingPermission = await Notifications.getPermissionsAsync();
      let notificationStatus = existingPermission.status;
      if (notificationStatus !== "granted") {
        const requestedPermission = await Notifications.requestPermissionsAsync();
        notificationStatus = requestedPermission.status;
      }

      if (notificationStatus !== "granted") {
        Alert.alert(
          "Notifications not enabled",
          "Allow notifications for Stabilify to test them from this screen.",
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Stabilify test notification",
          body: "Notifications are working in this dev build.",
          sound: "default",
        },
        trigger: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't schedule a local test notification.";
      Alert.alert("Test notification failed", message);
    } finally {
      setSendingTestNotification(false);
    }
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-6">
        <AuthHeader title="Profile settings" onBack={navigation.goBack} />

        <Card className="mb-6 p-5">
          <View className="mb-5">
            <FormLabel>Display Name</FormLabel>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Jordan"
              autoCapitalize="words"
              editable={!loading && !saving}
            />
          </View>

          <View className="mb-5">
            <FormLabel>Bio</FormLabel>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="A short line about yourself"
              maxLength={160}
              editable={!loading && !saving}
            />
            <HelperText className="mt-2">
              {bio.length}/160 characters
            </HelperText>
          </View>

          <View className="mb-5">
            <FormLabel>Username</FormLabel>
            <Input
              value={username}
              onChangeText={(value) => setUsername(sanitizeUsername(value))}
              placeholder="jordan_fit"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !saving}
            />
            <HelperText className="mt-2">
              Lowercase letters, numbers, and underscores only.
            </HelperText>
          </View>

          <View className="mb-5">
            <FormLabel className="mb-3">Preferred Unit</FormLabel>
            <View className="flex-row gap-3">
              <OptionPill
                label="Pounds (lb)"
                selected={preferredUnit === "lb"}
                onPress={() => setPreferredUnit("lb")}
              />
              <OptionPill
                label="Kilograms (kg)"
                selected={preferredUnit === "kg"}
                onPress={() => setPreferredUnit("kg")}
              />
            </View>
          </View>

          <View>
            <FormLabel>Timezone</FormLabel>
            <Input
              value={timezone}
              onChangeText={setTimezone}
              placeholder="America/Los_Angeles"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !saving}
            />
            <HelperText className="mt-2">
              Use an IANA timezone like America/Los_Angeles.
            </HelperText>
          </View>
        </Card>

        <Card className="mb-6 p-5">
          <View>
            <FormLabel className="mb-3">Profile Visibility</FormLabel>
            <View className="flex-row gap-3">
              <OptionPill
                label="Private"
                selected={accountVisibility === "private"}
                onPress={() => handleAccountVisibilityChange("private")}
              />
              <OptionPill
                label="Public"
                selected={accountVisibility === "public"}
                onPress={() => handleAccountVisibilityChange("public")}
              />
            </View>
            <HelperText className="mt-2">
              Public makes your profile visible and defaults sharing to followers.
            </HelperText>
          </View>

          <View className="mt-5">
            <View className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <View className="mr-3 flex-1">
                <Text className="text-sm font-semibold text-white">
                  Show Progress on public profile
                </Text>
                <HelperText className="mt-1">
                  Turn off to hide your Progress tab from other users.
                </HelperText>
              </View>
              <Switch
                value={progressVisibility === "public"}
                onValueChange={handleProgressVisibilityToggle}
                trackColor={{ false: "#262626", true: "#7c3aed" }}
                thumbColor="#f5f3ff"
              />
            </View>
          </View>

          {accountVisibility === "public" ? (
            <TouchableOpacity
              onPress={() => setShowAdvancedPrivacy((value) => !value)}
              className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
              activeOpacity={0.85}
            >
              <Text className="text-sm font-semibold text-neutral-200">
                {showAdvancedPrivacy ? "Hide advanced settings" : "Show advanced settings"}
              </Text>
            </TouchableOpacity>
          ) : (
            <HelperText className="mt-4">
              Advanced privacy is only available for public profiles.
            </HelperText>
          )}

          {accountVisibility === "public" && showAdvancedPrivacy ? (
            <View className="mt-5">
              <View className="mb-5">
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-white">Social features</Text>
                    <HelperText className="mt-1">Enable social surfaces and sharing defaults.</HelperText>
                  </View>
                  <Switch
                    value={socialEnabled}
                    onValueChange={setSocialEnabled}
                    trackColor={{ false: "#262626", true: "#7c3aed" }}
                    thumbColor="#f5f3ff"
                  />
                </View>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Share weigh-ins by default
                    </Text>
                    <HelperText className="mt-1">Off keeps weigh-ins private by default.</HelperText>
                  </View>
                  <Switch
                    value={weighInShareVisibility !== "private"}
                    onValueChange={handleWeighInShareToggle}
                    trackColor={{ false: "#262626", true: "#7c3aed" }}
                    thumbColor="#f5f3ff"
                  />
                </View>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Share gym events by default
                    </Text>
                    <HelperText className="mt-1">
                      Off keeps gym events private by default.
                    </HelperText>
                  </View>
                  <Switch
                    value={gymEventShareVisibility !== "private"}
                    onValueChange={handleGymEventShareToggle}
                    trackColor={{ false: "#262626", true: "#7c3aed" }}
                    thumbColor="#f5f3ff"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-white">Share posts by default</Text>
                    <HelperText className="mt-1">Off keeps posts private by default.</HelperText>
                  </View>
                  <Switch
                    value={postShareVisibility !== "private"}
                    onValueChange={handlePostShareToggle}
                    trackColor={{ false: "#262626", true: "#7c3aed" }}
                    thumbColor="#f5f3ff"
                  />
                </View>
              </View>
            </View>
          ) : null}
        </Card>

        <Card className="mb-6 p-5">
          <View className="mb-5 flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <View className="mr-3 flex-1">
              <Text className="text-sm font-semibold text-white">Auto support post</Text>
              <HelperText className="mt-1">
                Allow close-friends support posts when you are behind this week.
              </HelperText>
            </View>
            <Switch
              value={autoSupportEnabled}
              onValueChange={handleAutoSupportToggle}
              trackColor={{ false: "#262626", true: "#7c3aed" }}
              thumbColor="#f5f3ff"
              disabled={loading || saving || grantingAutoSupportConsent}
            />
          </View>

          <View className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-xs font-semibold uppercase text-neutral-500">
                  Phone nudges
                </Text>
                <Text className="mt-1 text-sm text-neutral-200">
                  {phoneNudgesEnabled ? "Enabled" : "Disabled"}
                </Text>
                <HelperText className="mt-1">
                  Turn on to register this device for private behind-goal reminders.
                </HelperText>
              </View>
              <Switch
                value={phoneNudgesEnabled}
                onValueChange={(value) => {
                  void handleSetPhoneNudgesEnabled(value);
                }}
                trackColor={{ false: "#262626", true: "#7c3aed" }}
                thumbColor="#f5f3ff"
                disabled={loading || saving || updatingPhoneNudges}
              />
            </View>
          </View>

          <View className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-xs font-semibold uppercase text-neutral-500">
                  Track steps
                </Text>
                <Text className="mt-1 text-sm text-neutral-200">
                  {appleHealthStepsEnabled ? "Enabled" : "Disabled"}
                </Text>
                <HelperText className="mt-1">
                  {Platform.OS === "ios"
                    ? "Sync today's steps from Apple Health into your Home progress card."
                    : "Apple Health sync is available on iPhone only."}
                </HelperText>
              </View>
              <Switch
                value={appleHealthStepsEnabled}
                onValueChange={(value) => {
                  void handleAppleHealthStepsToggle(value);
                }}
                trackColor={{ false: "#262626", true: "#7c3aed" }}
                thumbColor="#f5f3ff"
                disabled={loading || saving || updatingAppleHealthSteps || Platform.OS !== "ios"}
              />
            </View>

            <View className="mt-4 border-t border-neutral-800 pt-4">
              <Text className="text-xs font-semibold uppercase text-neutral-500">
                Daily step goal
              </Text>
              <Text className="mt-1 text-sm text-neutral-200">{dailyStepGoal.toLocaleString()} steps</Text>
              <HelperText className="mt-1">
                Home uses this target for the Steps ring after you connect Apple Health.
              </HelperText>
              <View className="mt-3 flex-row gap-2">
                {[6000, 8000, 10000, 12000].map((goal) => (
                  <OptionPill
                    key={goal}
                    label={`${goal / 1000}k`}
                    selected={dailyStepGoal === goal}
                    onPress={() => {
                      setDailyStepGoal(goal);
                      setDailyStepGoalInput(String(goal));
                    }}
                  />
                ))}
              </View>
              <View className="mt-3">
                <Input
                  value={dailyStepGoalInput}
                  onChangeText={handleDailyStepGoalTextChange}
                  onBlur={handleDailyStepGoalInputBlur}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="Custom step goal"
                  maxLength={5}
                />
              </View>
            </View>
          </View>
        </Card>

        <Card className="mb-6 p-5">
          <View className="flex-row items-center justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-sm font-semibold text-white">Gym verification location</Text>
              <HelperText className="mt-1">
                Update your saved gym to control gym session verification.
              </HelperText>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("GymSettings")}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2"
              activeOpacity={0.8}
            >
              <Text className="text-xs font-semibold text-neutral-200">Manage gym</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {__DEV__ ? (
          <Card className="mb-6 p-5">
            <Text className="text-sm font-semibold text-white">Developer tools</Text>
            <HelperText className="mt-1">
              Send a local notification from this screen to verify notification presentation in the dev build.
            </HelperText>
            <View className="mt-4">
              <Button
                title={sendingTestNotification ? "Sending test notification..." : "Send test notification"}
                loading={sendingTestNotification}
                disabled={sendingTestNotification}
                onPress={() => {
                  void handleSendTestNotification();
                }}
              />
            </View>
          </Card>
        ) : null}

        <Button
          title={saving ? "Saving..." : "Save settings"}
          loading={saving}
          disabled={loading}
          onPress={handleSave}
        />
      </ScrollView>
    </AppScreen>
  );
}
