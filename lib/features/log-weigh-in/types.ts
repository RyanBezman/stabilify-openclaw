import type { ReactNode } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WeightUnit } from "../../data/types";
import type { RootStackParamList } from "../../navigation/types";

export type LogWeighInScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "LogWeighIn"
>;

export type LatestWeighIn = {
  weight: number;
  unit: WeightUnit;
  localDate: string;
};

export type SaveCurrentWeighInResult = {
  saved: boolean;
  error?: string;
  message?: string;
};

export type UseLogWeighInResult = {
  initializing: boolean;
  saving: boolean;
  loadError: string | null;
  unit: WeightUnit;
  timezone: string;
  weight: string;
  setWeight: (value: string) => void;
  recordedAt: Date;
  latestWeighIn: LatestWeighIn | null;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (value: boolean) => void;
  now: Date;
  maxTime: Date | undefined;
  dateLabel: string;
  timeLabel: string;
  validationMessage: string | null;
  canSave: boolean;
  closeDatePicker: () => void;
  closeTimePicker: () => void;
  saveCurrentWeighIn: () => Promise<SaveCurrentWeighInResult>;
  useLastWeight: () => void;
  handleDateChange: (_event: unknown, selected?: Date) => void;
  handleTimeChange: (_event: unknown, selected?: Date) => void;
};

export type LoadErrorCardProps = {
  loadError: string | null;
};

export type PickerRowProps = {
  label: string;
  value: string;
  onPress: () => void;
  containerClassName: string;
};

export type WeightCardProps = {
  weight: string;
  setWeight: (value: string) => void;
  unit: WeightUnit;
  latestWeighIn: LatestWeighIn | null;
  onUseLastWeight: () => void;
};

export type WhenCardProps = {
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  onPressDate: () => void;
  onPressTime: () => void;
};

export type IOSPickerModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};
