import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/ui/Button";
import HelperText from "../components/ui/HelperText";
import AppScreen from "../components/ui/AppScreen";
import { profileSettingsEditableFields } from "../lib/features/profile-settings/editableFields";
import {
  fetchProfileSettingsValues,
  saveProfileSettingsValues,
  type ProfileSettingsValues,
} from "../lib/features/profile-settings/data";
import type { RootStackParamList } from "../lib/navigation/types";

type ProfileSettingsTextEditProps = NativeStackScreenProps<
  RootStackParamList,
  "ProfileSettingsTextEdit"
>;

const PROFILE_SETTINGS_TEXT_EDIT_ACCESSORY_ID = "profile-settings-text-edit-done-accessory";

export default function ProfileSettingsTextEdit({
  navigation,
  route,
}: ProfileSettingsTextEditProps) {
  const insets = useSafeAreaInsets();
  const { fieldKey } = route.params;
  const field = profileSettingsEditableFields[fieldKey];
  const inputRef = useRef<TextInput | null>(null);
  const allowNavigationRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileValues, setProfileValues] = useState<ProfileSettingsValues | null>(null);
  const [draft, setDraft] = useState("");

  const initialDraft = profileValues ? field.getDraft(profileValues) : "";
  const isDirty = profileValues ? draft !== initialDraft : false;
  const helperText = field.helperText?.(draft);
  const showKeyboardAccessory =
    fieldKey === "dailyStepGoal" && Platform.OS === "ios";

  async function loadFieldValues() {
    setLoading(true);
    setLoadError(null);

    const result = await fetchProfileSettingsValues();
    if (result.error || !result.data) {
      setLoadError(result.error ?? "Couldn't load profile settings.");
      setLoading(false);
      return;
    }

    setProfileValues(result.data);
    setDraft(field.getDraft(result.data));
    setLoading(false);
  }

  function confirmDiscardIfDirty(onDiscard: () => void) {
    if (!isDirty || saving) {
      onDiscard();
      return;
    }

    Alert.alert("Discard changes?", "Your edits haven't been saved yet.", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: onDiscard,
      },
    ]);
  }

  function handleBack() {
    confirmDiscardIfDirty(() => {
      allowNavigationRef.current = true;
      navigation.goBack();
    });
  }

  async function handleSave() {
    if (saving || !profileValues) {
      return;
    }

    if (!isDirty) {
      allowNavigationRef.current = true;
      navigation.goBack();
      return;
    }

    Keyboard.dismiss();
    setSaving(true);
    const result = await saveProfileSettingsValues(
      field.buildNextValues(profileValues, draft),
    );
    setSaving(false);

    if (result.error || !result.data?.ok) {
      Alert.alert(
        `Couldn't update ${field.label.toLowerCase()}`,
        result.error ?? "Couldn't save your changes.",
      );
      return;
    }

    allowNavigationRef.current = true;
    navigation.goBack();
  }

  useEffect(() => {
    void loadFieldValues();
  }, [fieldKey]);

  useEffect(() => {
    if (loading || loadError) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [loadError, loading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowNavigationRef.current || saving || !isDirty) {
        return;
      }

      event.preventDefault();
      confirmDiscardIfDirty(() => {
        allowNavigationRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [isDirty, navigation, saving]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10 pt-2"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          automaticallyAdjustsScrollIndicatorInsets={Platform.OS === "ios"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View className="px-5 pb-5 pt-4">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleBack}
                className="h-11 w-11 items-center justify-center rounded-full"
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={28} color="#fafafa" />
              </TouchableOpacity>
              <Text className="ml-3 flex-1 text-[22px] font-semibold text-white">
                {field.editTitle}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  void handleSave();
                }}
                disabled={loading || saving || !profileValues}
                activeOpacity={0.75}
                className="rounded-full px-3 py-2"
              >
                <Text
                  className={`text-sm font-semibold ${
                    loading || !profileValues ? "text-neutral-600" : "text-violet-300"
                  }`}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View className="px-5 pt-6">
              <Text className="text-base text-neutral-400">Loading {field.label.toLowerCase()}...</Text>
            </View>
          ) : loadError ? (
            <View className="px-5 pt-6">
              <Text className="text-base text-white">Couldn't load this field.</Text>
              <HelperText className="mt-2">{loadError}</HelperText>
              <View className="mt-5 gap-3">
                <Button
                  title="Try again"
                  onPress={() => {
                    void loadFieldValues();
                  }}
                />
                <Button title="Go back" variant="secondary" onPress={handleBack} />
              </View>
            </View>
          ) : (
            <>
              <View className="px-5 pb-3">
                <Text className="text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                  {field.label}
                </Text>
                {field.description ? <HelperText className="mt-2">{field.description}</HelperText> : null}
              </View>

              <View className="border-y border-neutral-900 bg-black">
                <View className="px-5 py-4">
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={(value) => {
                      setDraft(field.normalizeDraft ? field.normalizeDraft(value) : value);
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor="#737373"
                    multiline={field.multiline}
                    editable={!saving}
                    autoCapitalize={field.autoCapitalize}
                    autoCorrect={field.autoCorrect}
                    inputMode={field.inputMode}
                    keyboardType={field.keyboardType}
                    maxLength={field.maxLength}
                    returnKeyType={field.multiline ? "default" : "done"}
                    blurOnSubmit={!field.multiline}
                    inputAccessoryViewID={
                      showKeyboardAccessory ? PROFILE_SETTINGS_TEXT_EDIT_ACCESSORY_ID : undefined
                    }
                    onSubmitEditing={() => {
                      if (!field.multiline) {
                        void handleSave();
                      }
                    }}
                    style={{
                      color: "#fafafa",
                      fontSize: 18,
                      paddingVertical: 0,
                      minHeight: field.multiline ? 180 : undefined,
                      textAlignVertical: field.multiline ? "top" : "center",
                    }}
                  />
                </View>
                {helperText ? (
                  <View className="px-5 pb-4">
                    <HelperText>{helperText}</HelperText>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>

        {showKeyboardAccessory ? (
          <InputAccessoryView nativeID={PROFILE_SETTINGS_TEXT_EDIT_ACCESSORY_ID}>
            <View className="border-t border-neutral-800 bg-neutral-950/95 px-4 pb-2 pt-2">
              <View className="flex-row justify-end">
                <Pressable
                  onPress={Keyboard.dismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Done editing"
                  className="h-10 w-10 items-center justify-center rounded-full bg-neutral-900"
                >
                  <Ionicons name="checkmark" size={22} color="#fafafa" />
                </Pressable>
              </View>
            </View>
          </InputAccessoryView>
        ) : null}
      </View>
    </AppScreen>
  );
}
