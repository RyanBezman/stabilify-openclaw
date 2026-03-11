import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { sanitizeWeightInput } from "../lib/utils/weight";
import AuthHeader from "../components/auth/AuthHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import HelperText from "../components/ui/HelperText";
import Input from "../components/ui/Input";
import ModalSheet from "../components/ui/ModalSheet";
import SectionTitle from "../components/ui/SectionTitle";
import { useLogWeighIn } from "../lib/features/log-weigh-in";
import AppScreen from "../components/ui/AppScreen";
import type {
  IOSPickerModalProps,
  LoadErrorCardProps,
  LogWeighInScreenProps,
  PickerRowProps,
  WeightCardProps,
  WhenCardProps,
} from "../lib/features/log-weigh-in";

const IS_IOS = Platform.OS === "ios";
const IS_ANDROID = Platform.OS === "android";
const APPLE_HEALTH_HEART = "#ff304f";

function LoadErrorCard({ loadError }: LoadErrorCardProps) {
  if (!loadError) return null;

  return (
    <Card className="mb-6 border border-rose-500/40 bg-rose-500/10 p-5">
      <Text className="text-sm font-semibold text-rose-200">
        Couldn&apos;t load your defaults
      </Text>
      <Text className="mt-2 text-sm text-rose-200/70">{loadError}</Text>
    </Card>
  );
}

function PickerRow({
  label,
  value,
  onPress,
  containerClassName,
}: PickerRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${containerClassName} flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4`}
      activeOpacity={0.8}
    >
      <Text className="text-sm text-neutral-400">{label}</Text>
      <Text className="text-base font-semibold text-white">{value}</Text>
    </TouchableOpacity>
  );
}

function WeightCard({
  weight,
  setWeight,
  unit,
  canImportAppleHealth,
  appleHealthImporting,
  appleHealthImportError,
  appleHealthImportedSampleLabel,
  onImportAppleHealth,
}: WeightCardProps) {
  return (
    <Card className="mb-6 p-5">
      <SectionTitle>Weight</SectionTitle>
      <View className="mt-4">
        <View className="relative">
          <Input
            value={weight}
            onChangeText={(value) => setWeight(sanitizeWeightInput(value))}
            placeholder="180.4"
            keyboardType="decimal-pad"
            className="pr-16"
          />
          <View className="pointer-events-none absolute inset-y-0 right-5 items-center justify-center">
            <Text className="text-sm font-medium uppercase tracking-[1.2px] text-neutral-500">
              {unit}
            </Text>
          </View>
        </View>
      </View>

      {canImportAppleHealth ? (
        <View
          className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 px-4 py-3.5"
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <View className="absolute right-[4px] top-[4px]">
                  <Ionicons name="heart" size={20} color={APPLE_HEALTH_HEART} />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">Apple Health</Text>
                <Text className="mt-1 text-sm text-neutral-400">
                  Use your latest weight from Apple Health.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onImportAppleHealth}
              disabled={appleHealthImporting}
              className={`rounded-full border px-3 py-1.5 ${
                appleHealthImporting
                  ? "border-neutral-700 bg-neutral-800"
                  : "border-neutral-700 bg-neutral-900"
              }`}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: appleHealthImporting ? "#9ca3af" : "#f5f5f5" }}
              >
                {appleHealthImporting ? "Loading..." : "Use latest"}
              </Text>
            </TouchableOpacity>
          </View>
          {appleHealthImportedSampleLabel ? (
            <HelperText className="mt-2 text-neutral-400">
              Imported sample: {appleHealthImportedSampleLabel}
            </HelperText>
          ) : null}
          {appleHealthImportError ? (
            <HelperText className="mt-2 text-rose-300">
              {appleHealthImportError}
            </HelperText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function WhenCard({
  dateLabel,
  timeLabel,
  onPressDate,
  onPressTime,
}: WhenCardProps) {
  return (
    <Card className="mb-6 p-5">
      <SectionTitle>When</SectionTitle>

      <PickerRow
        label="Date"
        value={dateLabel}
        onPress={onPressDate}
        containerClassName="mt-4"
      />
      <PickerRow
        label="Time"
        value={timeLabel}
        onPress={onPressTime}
        containerClassName="mt-3"
      />

      <HelperText className="mt-1">
        Saving again updates that day&apos;s entry.
      </HelperText>
    </Card>
  );
}

function IOSPickerModal({
  visible,
  title,
  onClose,
  children,
}: IOSPickerModalProps) {
  return (
    <ModalSheet visible={visible} onRequestClose={onClose}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-neutral-400">{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">Done</Text>
        </TouchableOpacity>
      </View>
      {children}
    </ModalSheet>
  );
}

export default function LogWeighIn({ navigation }: LogWeighInScreenProps) {
  const {
    saving,
    loadError,
    unit,
    timezone,
    weight,
    setWeight,
    recordedAt,
    appleHealthImporting,
    appleHealthImportError,
    appleHealthImportedSampleLabel,
    canImportAppleHealth,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    now,
    maxTime,
    dateLabel,
    timeLabel,
    validationMessage,
    canSave,
    closeDatePicker,
    closeTimePicker,
    saveCurrentWeighIn,
    importAppleHealthWeight,
    handleDateChange,
    handleTimeChange,
  } = useLogWeighIn();

  const onSave = async () => {
    const result = await saveCurrentWeighIn();

    if (result.error) {
      Alert.alert("Save failed", result.error);
      return;
    }
    if (!result.saved) return;

    Alert.alert("Weigh-in saved", result.message, [
      { text: "Done", onPress: () => navigation.goBack() },
    ]);
  };

  const onImportAppleHealth = async () => {
    const result = await importAppleHealthWeight();
    if (result.error) {
      Alert.alert(
        "Apple Health import failed",
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
      return;
    }

    if (result.message) {
      Alert.alert("Apple Health weight imported", result.message);
    }
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <KeyboardAvoidingView
        behavior={IS_IOS ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-5 pb-10 pt-6">
            <AuthHeader title="Log weigh-in" onBack={navigation.goBack} />

            <LoadErrorCard loadError={loadError} />

            <WeightCard
              weight={weight}
              setWeight={setWeight}
              unit={unit}
              canImportAppleHealth={canImportAppleHealth}
              appleHealthImporting={appleHealthImporting}
              appleHealthImportError={appleHealthImportError}
              appleHealthImportedSampleLabel={appleHealthImportedSampleLabel}
              onImportAppleHealth={onImportAppleHealth}
            />

            <WhenCard
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              onPressDate={() => setShowDatePicker(true)}
              onPressTime={() => setShowTimePicker(true)}
            />

            {IS_ANDROID && showDatePicker ? (
              <DateTimePicker
                value={recordedAt}
                mode="date"
                display="default"
                maximumDate={now}
                onChange={handleDateChange}
              />
            ) : null}
            {IS_ANDROID && showTimePicker ? (
              <DateTimePicker
                value={recordedAt}
                mode="time"
                display="default"
                maximumDate={maxTime}
                onChange={handleTimeChange}
              />
            ) : null}

            {IS_IOS ? (
              <IOSPickerModal
                visible={showDatePicker}
                title="Select date"
                onClose={closeDatePicker}
              >
                <DateTimePicker
                  value={recordedAt}
                  mode="date"
                  display="spinner"
                  maximumDate={now}
                  onChange={handleDateChange}
                  themeVariant="dark"
                  textColor="#ffffff"
                  style={{ alignSelf: "stretch" }}
                />
              </IOSPickerModal>
            ) : null}

            {IS_IOS ? (
              <IOSPickerModal
                visible={showTimePicker}
                title="Select time"
                onClose={closeTimePicker}
              >
                <DateTimePicker
                  value={recordedAt}
                  mode="time"
                  display="spinner"
                  maximumDate={maxTime}
                  onChange={handleTimeChange}
                  themeVariant="dark"
                  textColor="#ffffff"
                  style={{ alignSelf: "stretch" }}
                />
              </IOSPickerModal>
            ) : null}

            {validationMessage ? (
              <HelperText className="mb-3 font-medium text-rose-300">
                {validationMessage}
              </HelperText>
            ) : null}

            <Button
              title={saving ? "Saving..." : "Save weigh-in"}
              onPress={onSave}
              loading={saving}
              disabled={!canSave}
              className="mb-4"
            />
            <TouchableOpacity onPress={navigation.goBack} disabled={saving}>
              <Text className="text-center text-sm text-neutral-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
