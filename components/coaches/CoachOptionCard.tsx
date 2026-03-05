import { Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import SkeletonBlock from "../ui/SkeletonBlock";
import CoachAvatar from "./CoachAvatar";
import type { ActiveCoach } from "../../lib/features/coaches";
import Button from "../ui/Button";

export default function CoachOptionCard({
  coach,
  personalityLabel,
  personalitySummary,
  selected,
  loaded,
  onImageLoaded,
  onSelect,
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  confirmLabel = "Confirm",
  confirmAccessibilityLabel,
  error,
  disabled = false,
}: {
  coach: ActiveCoach;
  personalityLabel: string;
  personalitySummary: string;
  selected: boolean;
  loaded: boolean;
  onImageLoaded: () => void;
  onSelect: () => void;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  confirmAccessibilityLabel?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const markLoaded = () => onImageLoaded();

  return (
    <View>
      {loaded ? (
        <Card
          variant={selected ? "default" : "subtle"}
          className={`overflow-hidden ${selected ? "border-violet-400/30" : ""}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Select ${coach.displayName}, ${personalityLabel} coach`}
            onPress={onSelect}
            className="px-4 py-4"
          >
            <View className="flex-row items-center gap-3">
              <CoachAvatar coach={coach} size="md" onImageLoaded={markLoaded} />
              <View className="flex-1">
                <Text className="text-base font-bold text-white">
                  {coach.displayName}
                </Text>
                <Text className="mt-0.5 text-sm font-medium text-neutral-500">
                  {personalityLabel}
                </Text>
              </View>
              {selected ? (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-violet-500/90">
                  <Text className="text-xs font-bold text-white">✓</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>

          {selected ? (
            <View className="border-t border-neutral-800 px-4 pb-4 pt-3">
              <Text className="text-sm leading-relaxed text-neutral-300">
                {personalitySummary}
              </Text>

              <Button
                size="sm"
                className="mt-3 self-start px-4"
                title={confirmLabel}
                loading={confirmLoading}
                disabled={confirmDisabled}
                accessibilityLabel={
                  confirmAccessibilityLabel ?? `Confirm ${coach.displayName}`
                }
                onPress={onConfirm}
              />

              {error ? (
                <Text className="mt-2 text-sm font-semibold text-rose-300">
                  {error}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : (
        <Card variant="subtle" className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <SkeletonBlock className="h-[54px] w-[54px] rounded-full" />
            <View className="flex-1">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="mt-2 h-4 w-20" />
            </View>
          </View>
          {/* Trigger load so we can swap from skeleton once the image is decoded. */}
          <CoachAvatar
            coach={coach}
            size="md"
            onImageLoaded={markLoaded}
            style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
          />
        </Card>
      )}
    </View>
  );
}
