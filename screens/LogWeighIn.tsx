import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatShortDate } from "../lib/utils/metrics";
import { sanitizeWeightInput, formatWeight } from "../lib/utils/weight";
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
  latestWeighIn,
  onUseLastWeight,
}: WeightCardProps) {
  return (
    <Card className="mb-6 p-5">
      <SectionTitle>Weight</SectionTitle>
      <View className="mt-4 flex-row items-center">
        <View className="flex-1">
          <Input
            value={weight}
            onChangeText={(value) => setWeight(sanitizeWeightInput(value))}
            placeholder="180.4"
            keyboardType="decimal-pad"
          />
        </View>
        <View className="ml-3 items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-4">
          <Text className="text-sm font-semibold text-neutral-200">{unit}</Text>
        </View>
      </View>

      {latestWeighIn ? (
        <View className="mt-3 flex-row items-center justify-between gap-2">
          <HelperText className="flex-1">
            Last: {formatShortDate(latestWeighIn.localDate)} -{" "}
            {formatWeight(latestWeighIn.weight, latestWeighIn.unit)}
          </HelperText>
          {!weight.trim() ? (
            <TouchableOpacity
              onPress={onUseLastWeight}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-violet-300">Use last</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <HelperText className="mt-3">Your first weigh-in starts the streak.</HelperText>
      )}

      <HelperText className="mt-2">Units follow your profile preference.</HelperText>
    </Card>
  );
}

function WhenCard({
  dateLabel,
  timeLabel,
  timezone,
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

      <HelperText className="mt-2">Local time zone: {timezone}.</HelperText>
      <HelperText className="mt-1">
        Logging again for the same day replaces the previous entry.
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
    latestWeighIn,
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
    useLastWeight,
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
              latestWeighIn={latestWeighIn}
              onUseLastWeight={useLastWeight}
            />

            <WhenCard
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              timezone={timezone}
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
              <HelperText className="mb-3 font-medium">{validationMessage}</HelperText>
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
