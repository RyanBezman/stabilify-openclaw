import { Text, TouchableOpacity, View } from "react-native";
import type { CurrentWeekSupportRequest } from "../../lib/data/supportAutomation";
import Card from "../ui/Card";

export type SupportNudgeDisplayVariant =
  | "suppressed_prompt"
  | "suppressed_acknowledged"
  | "disabled"
  | "published";

type SupportNudgeCardProps = {
  request: CurrentWeekSupportRequest;
  variant: SupportNudgeDisplayVariant;
  phoneNudgesEnabled: boolean;
  actionBusy: boolean;
  enablePhoneNudgesBusy: boolean;
  onAllowAutoSupport: () => void;
  onNotNow: () => void;
  onReEnableAutoSupport: () => void;
  onEnablePhoneNudges: () => void;
};

function triggerReasonLabel(triggerReason: CurrentWeekSupportRequest["triggerReason"]) {
  if (triggerReason === "two_consecutive_missed_weeks") {
    return "Two consecutive missed weeks";
  }
  if (triggerReason === "missed_weekly_target") {
    return "Missed weekly target";
  }
  return "Off pace for 3 days";
}

export default function SupportNudgeCard({
  request,
  variant,
  phoneNudgesEnabled,
  actionBusy,
  enablePhoneNudgesBusy,
  onAllowAutoSupport,
  onNotNow,
  onReEnableAutoSupport,
  onEnablePhoneNudges,
}: SupportNudgeCardProps) {
  const reasonLabel = triggerReasonLabel(request.triggerReason);

  return (
    <Card className="mb-6 border border-violet-500/30 bg-violet-500/10 p-5">
      {variant === "suppressed_prompt" ? (
        <>
          <Text className="text-base font-semibold text-white">Allow private auto-support?</Text>
          <Text className="mt-2 text-sm text-violet-100/90">
            When you&apos;re behind, Stabilify can post a private support request to your close
            friends. It won&apos;t share weight, photos, or location details.
          </Text>
          <Text className="mt-2 text-xs font-medium text-violet-200/80">Reason: {reasonLabel}</Text>

          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              onPress={onAllowAutoSupport}
              className="flex-1 items-center justify-center rounded-2xl bg-violet-600 px-4 py-2.5"
              disabled={actionBusy}
            >
              <Text className="text-sm font-semibold text-white">
                {actionBusy ? "Saving..." : "Allow auto-support"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNotNow}
              className="flex-1 items-center justify-center rounded-2xl border border-violet-300/40 px-4 py-2.5"
              disabled={actionBusy}
            >
              <Text className="text-sm font-semibold text-violet-100">Not now</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {variant === "suppressed_acknowledged" ? (
        <>
          <Text className="text-base font-semibold text-white">Auto-support is ready.</Text>
          <Text className="mt-2 text-sm text-violet-100/90">
            Private auto-support is on for future behind-goal triggers. This week&apos;s request
            stays suppressed and won&apos;t backfill.
          </Text>
          <Text className="mt-2 text-xs font-medium text-violet-200/80">Reason: {reasonLabel}</Text>
        </>
      ) : null}

      {variant === "disabled" ? (
        <>
          <Text className="text-base font-semibold text-white">You&apos;re off pace this week.</Text>
          <Text className="mt-2 text-sm text-violet-100/90">
            Recovery nudges are still active, but close-friends auto support posting is disabled.
          </Text>
          <Text className="mt-2 text-xs font-medium text-violet-200/80">Reason: {reasonLabel}</Text>

          <TouchableOpacity
            onPress={onReEnableAutoSupport}
            className="mt-4 items-center justify-center rounded-2xl bg-violet-600 px-4 py-2.5"
            disabled={actionBusy}
          >
            <Text className="text-sm font-semibold text-white">
              {actionBusy ? "Saving..." : "Re-enable auto support"}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      {variant === "published" ? (
        <>
          <Text className="text-base font-semibold text-white">Support post published.</Text>
          <Text className="mt-2 text-sm text-violet-100/90">
            Your close friends were notified. Keep momentum with your next gym session.
          </Text>
          <Text className="mt-2 text-xs font-medium text-violet-200/80">Reason: {reasonLabel}</Text>
        </>
      ) : null}

      {!phoneNudgesEnabled ? (
        <TouchableOpacity
          onPress={onEnablePhoneNudges}
          className="mt-4 items-center justify-center rounded-2xl border border-violet-300/40 px-4 py-2.5"
          disabled={enablePhoneNudgesBusy}
        >
          <Text className="text-sm font-semibold text-violet-100">
            {enablePhoneNudgesBusy ? "Enabling phone notifications..." : "Enable phone notifications"}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text className="mt-4 text-xs font-medium text-violet-200/80">Phone notifications enabled.</Text>
      )}
    </Card>
  );
}
