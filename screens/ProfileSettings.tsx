import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HelperText from "../components/ui/HelperText";
import OptionPill from "../components/ui/OptionPill";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmationSheet from "../components/ui/ConfirmationSheet";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import {
  useProfileSettingsScreen,
} from "../lib/features/profile-settings";
import type { EditableProfileSettingsFieldKey } from "../lib/features/profile-settings/editableFields";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";

type ProfileSettingsProps = NativeStackScreenProps<RootStackParamList, "ProfileSettings">;

type SettingsToggleRowProps = {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
};

type SettingsLinkRowProps = {
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  tone?: "default" | "danger";
};

function SettingsToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
  isLast = false,
}: SettingsToggleRowProps) {
  return (
    <View className={`flex-row items-center px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"}`}>
      <View className="mr-4 flex-1">
        <Text className="text-[16px] text-white">{title}</Text>
        {description ? <HelperText className="mt-1">{description}</HelperText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#262626", true: "#7c3aed" }}
        thumbColor="#f5f3ff"
        disabled={disabled}
      />
    </View>
  );
}

function SettingsLinkRow({
  title,
  description,
  value,
  onPress,
  isLast = false,
  tone = "default",
}: SettingsLinkRowProps) {
  const titleClassName = tone === "danger" ? "text-[16px] text-rose-200" : "text-[16px] text-white";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"}`}
    >
      <View className="mr-4 flex-1">
        <Text className={titleClassName}>{title}</Text>
        {description ? <HelperText className="mt-1">{description}</HelperText> : null}
      </View>
      {value ? <Text className="mr-3 text-[16px] text-neutral-400">{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color="#737373" />
    </TouchableOpacity>
  );
}

type SettingsEditableFieldRowProps = {
  label: string;
  value: string;
  usesPlaceholder?: boolean;
  onPress: () => void;
  disabled?: boolean;
  isLast?: boolean;
};

function SettingsEditableFieldRow({
  label,
  value,
  usesPlaceholder = false,
  onPress,
  disabled = false,
  isLast = false,
}: SettingsEditableFieldRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      className={`flex-row items-start px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"} ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <View className="w-28 pr-4">
        <Text className="text-[16px] text-neutral-200">{label}</Text>
      </View>
      <View className="flex-1 pr-3">
        <Text
          numberOfLines={label === "Bio" ? 3 : 2}
          className={`text-[16px] ${usesPlaceholder ? "text-neutral-500" : "text-white"}`}
        >
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#737373" />
    </TouchableOpacity>
  );
}

export default function ProfileSettings({ navigation }: ProfileSettingsProps) {
  const insets = useSafeAreaInsets();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const {
    loading,
    saving,
    updatingPhoneNudges,
    updatingAppleHealthSteps,
    grantingAutoSupportConsent,
    displayName,
    preferredUnit,
    accountVisibility,
    progressVisibility,
    socialEnabled,
    weighInShareVisibility,
    gymEventShareVisibility,
    postShareVisibility,
    autoSupportEnabled,
    phoneNudgesEnabled,
    appleHealthStepsEnabled,
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
  } = useProfileSettingsScreen(navigation);

  const renderEditableFieldRow = (
    row: {
      fieldKey: EditableProfileSettingsFieldKey;
      label: string;
      value: string;
      usesPlaceholder: boolean;
    },
    isLast = false,
  ) => (
    <SettingsEditableFieldRow
      key={row.fieldKey}
      label={row.label}
      value={row.value}
      usesPlaceholder={row.usesPlaceholder}
      disabled={loading || saving}
      onPress={() => {
        openEditableField(row.fieldKey);
      }}
      isLast={isLast}
    />
  );

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10 pt-2"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View>
              <View className="px-5 pb-5 pt-4">
                <View className="relative items-center justify-center py-2">
                  <TouchableOpacity
                    onPress={navigation.goBack}
                    className="absolute left-0 top-0 h-11 w-11 items-center justify-center rounded-full"
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-back" size={28} color="#fafafa" />
                  </TouchableOpacity>
                  <Text className="text-[22px] font-semibold text-white">Edit profile</Text>
                </View>
              </View>

              <View className="items-center border-y border-neutral-900 px-5 py-8">
                <TouchableOpacity
                  onPress={openPhotoActions}
                  activeOpacity={0.85}
                  disabled={photoLoading}
                  className="items-center"
                >
                  <ProfileAvatar
                    displayName={displayName}
                    photoUrl={photoUrl}
                    size={96}
                    className="border-neutral-800 bg-neutral-900"
                  />
                  <Text className="mt-4 text-sm font-medium text-violet-300">
                    {photoLoading ? "Updating picture..." : "Edit picture"}
                  </Text>
                </TouchableOpacity>
                <Text className="mt-4 text-lg font-medium text-white">
                  {displayName || "Your profile"}
                </Text>
                <Text className="mt-2 text-sm text-neutral-500">
                  Tap a text field to edit it. Preference changes still save automatically.
                </Text>
              </View>

              <View className="mt-6 border-y border-neutral-900 bg-black">
                {editableFieldRows.slice(0, 3).map((row) => renderEditableFieldRow(row))}
                <View className="border-b border-neutral-900 px-5 py-4">
                  <View className="flex-row">
                    <View className="w-28 pr-4">
                      <Text className="text-[16px] text-neutral-200">Unit</Text>
                    </View>
                    <View className="flex-1 flex-row flex-wrap gap-2">
                      <OptionPill
                        label="Pounds (lb)"
                        selected={preferredUnit === "lb"}
                        disabled={loading || saving}
                        onPress={() => {
                          void handlePreferredUnitChange("lb");
                        }}
                      />
                      <OptionPill
                        label="Kilograms (kg)"
                        selected={preferredUnit === "kg"}
                        disabled={loading || saving}
                        onPress={() => {
                          void handlePreferredUnitChange("kg");
                        }}
                      />
                    </View>
                  </View>
                </View>
                {renderEditableFieldRow(editableFieldRows[3])}
                {renderEditableFieldRow(editableFieldRows[4], true)}
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Privacy
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <View className="border-b border-neutral-900 px-5 py-4">
                  <View className="flex-row">
                    <View className="w-28 pr-4">
                      <Text className="text-[16px] text-neutral-200">Profile</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row flex-wrap gap-2">
                        <OptionPill
                          label="Private"
                          selected={accountVisibility === "private"}
                          disabled={loading || saving}
                          onPress={() => {
                            void handleAccountVisibilityChange("private");
                          }}
                        />
                        <OptionPill
                          label="Public"
                          selected={accountVisibility === "public"}
                          disabled={loading || saving}
                          onPress={() => {
                            void handleAccountVisibilityChange("public");
                          }}
                        />
                      </View>
                      <HelperText className="mt-2">
                        Public makes your profile visible and defaults sharing to followers.
                      </HelperText>
                    </View>
                  </View>
                </View>
                <SettingsToggleRow
                  title="Show Progress on public profile"
                  description="Turn off to hide your Progress tab from other users."
                  value={progressVisibility === "public"}
                  onValueChange={handleProgressVisibilityToggle}
                  disabled={loading || saving}
                />
                {accountVisibility === "public" ? (
                  <TouchableOpacity
                    onPress={() => setShowAdvancedPrivacy((value) => !value)}
                    activeOpacity={0.8}
                    className="border-b border-neutral-900 px-5 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="mr-4 flex-1">
                        <Text className="text-[16px] text-white">Advanced privacy</Text>
                        <HelperText className="mt-1">
                          Fine-tune social defaults for posts, gym events, and weigh-ins.
                        </HelperText>
                      </View>
                      <Ionicons
                        name={showAdvancedPrivacy ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#737373"
                      />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View className="border-b border-neutral-900 px-5 py-4">
                    <Text className="text-[16px] text-white">Advanced privacy</Text>
                    <HelperText className="mt-1">
                      Available once your profile is public.
                    </HelperText>
                  </View>
                )}

                {accountVisibility === "public" && showAdvancedPrivacy ? (
                  <>
                    <SettingsToggleRow
                      title="Social features"
                      description="Enable social surfaces and sharing defaults."
                      value={socialEnabled}
                      onValueChange={(value) => {
                        void handleSocialEnabledToggle(value);
                      }}
                      disabled={loading || saving}
                    />
                    <SettingsToggleRow
                      title="Share weigh-ins by default"
                      description="Off keeps weigh-ins private by default."
                      value={weighInShareVisibility !== "private"}
                      onValueChange={handleWeighInShareToggle}
                    />
                    <SettingsToggleRow
                      title="Share gym events by default"
                      description="Off keeps gym events private by default."
                      value={gymEventShareVisibility !== "private"}
                      onValueChange={handleGymEventShareToggle}
                    />
                    <SettingsToggleRow
                      title="Share posts by default"
                      description="Off keeps posts private by default."
                      value={postShareVisibility !== "private"}
                      onValueChange={handlePostShareToggle}
                    />
                  </>
                ) : null}
                <SettingsLinkRow
                  title="Blocked accounts"
                  description="Review who you've blocked and unblock people when you're ready."
                  onPress={() => navigation.navigate("BlockedAccounts")}
                  isLast
                />
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Support
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <SettingsToggleRow
                  title="Auto support post"
                  description="Allow close-friends support posts when you are behind this week."
                  value={autoSupportEnabled}
                  onValueChange={handleAutoSupportToggle}
                  disabled={loading || saving || grantingAutoSupportConsent}
                />
                <SettingsToggleRow
                  title="Phone notifications"
                  description="Turn on to receive private behind-goal reminders on this device."
                  value={phoneNudgesEnabled}
                  onValueChange={(value) => {
                    void handleSetPhoneNudgesEnabled(value);
                  }}
                  disabled={loading || saving || updatingPhoneNudges}
                />
                <SettingsToggleRow
                  title="Track steps"
                  description={
                    Platform.OS === "ios"
                      ? "Sync today's steps from Apple Health into your Home progress card."
                      : "Apple Health sync is available on iPhone only."
                  }
                  value={appleHealthStepsEnabled}
                  onValueChange={(value) => {
                    void handleAppleHealthStepsToggle(value);
                  }}
                  disabled={loading || saving || updatingAppleHealthSteps || Platform.OS !== "ios"}
                  isLast
                />
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Verification
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <SettingsLinkRow
                  title="Gym verification location"
                  description="Update your saved gym to control gym session verification."
                  onPress={() => navigation.navigate("GymSettings")}
                  isLast
                />
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Danger zone
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <SettingsLinkRow
                  title="Delete account"
                  description="Hide your account now. You can restore it for 30 days by signing back in."
                  onPress={() => setShowDeleteConfirmation(true)}
                  tone="danger"
                  isLast
                />
              </View>

              {__DEV__ ? (
                <Card className="mx-5 mb-6 mt-8 p-5">
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
                  <View className="mt-3">
                    <Button
                      title={
                        sendingDelayedTestNotification
                          ? "Scheduling delayed notification..."
                          : "Send delayed notification (5s)"
                      }
                      loading={sendingDelayedTestNotification}
                      disabled={sendingDelayedTestNotification}
                      onPress={() => {
                        void handleSendDelayedTestNotification();
                      }}
                    />
                  </View>
                  <View className="mt-3">
                    <Button
                      title={loadingPushDebugInfo ? "Loading push info..." : "Show push registration info"}
                      loading={loadingPushDebugInfo}
                      disabled={loadingPushDebugInfo}
                      onPress={() => {
                        void handleShowPushDebugInfo();
                      }}
                    />
                  </View>
                </Card>
              ) : null}
          </View>
        </ScrollView>
      </View>
      <ConfirmationSheet
        visible={showDeleteConfirmation}
        title="Delete your account?"
        message="This hides your profile immediately. If you sign back in within 30 days, you can restore it. After 30 days, your accountability history, coach chats, and uploads are permanently deleted unless a legal hold is required."
        confirmLabel="Delete account"
        confirmTone="destructive"
        loading={requestingAccountDeletion}
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={() => {
          void (async () => {
            const didScheduleDeletion = await handleRequestAccountDeletion();
            if (didScheduleDeletion) {
              setShowDeleteConfirmation(false);
            }
          })();
        }}
      />
    </AppScreen>
  );
}
