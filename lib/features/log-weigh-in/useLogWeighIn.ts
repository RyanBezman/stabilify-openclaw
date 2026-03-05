import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { WeightUnit } from "../../data/types";
import { fetchWeighInDefaults, saveWeighIn } from "../../data/weighIns";
import { formatWeight, parseWeight } from "../../utils/weight";
import { toDisplayTime, toTimeString } from "../../utils/time";
import type {
  LatestWeighIn,
  SaveCurrentWeighInResult,
  UseLogWeighInResult,
} from "./types";

const formatLongDate = (date: Date) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
};

const isSameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function useLogWeighIn(): UseLogWeighInResult {
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unit, setUnit] = useState<WeightUnit>("lb");
  const [timezone, setTimezone] = useState<string>("Local time");
  const [weight, setWeight] = useState("");
  const [recordedAt, setRecordedAt] = useState(new Date());
  const [latestWeighIn, setLatestWeighIn] = useState<LatestWeighIn | null>(
    null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    let active = true;

    const loadDefaults = async () => {
      setInitializing(true);
      const { data, error } = await fetchWeighInDefaults();
      if (!active) return;

      if (error) {
        setLoadError(error);
      } else if (data) {
        setLoadError(null);
        setUnit(data.preferredUnit);
        setTimezone(data.timezone);
        if (data.latestWeighIn) {
          setLatestWeighIn({
            weight: data.latestWeighIn.weight,
            unit: data.latestWeighIn.unit,
            localDate: data.latestWeighIn.localDate,
          });
        }
      }

      setInitializing(false);
    };

    void loadDefaults();

    return () => {
      active = false;
    };
  }, []);

  const now = new Date();
  const maxTime = isSameDate(recordedAt, now) ? now : undefined;
  const dateLabel = useMemo(() => formatLongDate(recordedAt), [recordedAt]);
  const timeLabel = useMemo(
    () => toDisplayTime(toTimeString(recordedAt)),
    [recordedAt],
  );

  const weightValue = parseWeight(weight);
  const isFuture = recordedAt.getTime() > now.getTime();
  const validationMessage = (() => {
    if (!weight.trim()) return "Enter your weight to continue.";
    if (weightValue === null || weightValue <= 0) return "Enter a valid weight.";
    if (isFuture) return "Weigh-in time can't be in the future.";
    return null;
  })();

  const canSave = !initializing && !saving && !validationMessage;

  const handleDateChange = useCallback((_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (!selected) return;

    setRecordedAt((prev) => {
      const updated = new Date(prev);
      updated.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
      return updated;
    });
  }, []);

  const handleTimeChange = useCallback((_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (!selected) return;

    setRecordedAt((prev) => {
      const updated = new Date(prev);
      updated.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return updated;
    });
  }, []);

  const closeDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const closeTimePicker = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const useLastWeight = useCallback(() => {
    if (!latestWeighIn) return;
    setWeight(latestWeighIn.weight.toString());
  }, [latestWeighIn]);

  const saveCurrentWeighIn = useCallback(async (): Promise<SaveCurrentWeighInResult> => {
    if (!canSave || weightValue === null) {
      return { saved: false };
    }

    setSaving(true);
    const { error } = await saveWeighIn({
      weight: weightValue,
      unit,
      recordedAt,
      timezone,
    });
    setSaving(false);

    if (error) {
      return { saved: false, error };
    }

    return {
      saved: true,
      message: `Logged ${formatWeight(weightValue, unit)} for ${formatLongDate(recordedAt)}.`,
    };
  }, [canSave, recordedAt, timezone, unit, weightValue]);

  return {
    initializing,
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
  };
}
