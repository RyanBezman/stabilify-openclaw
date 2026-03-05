import { Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import { formatDistance } from "../../lib/utils/distance";
import ProgressRing from "./ProgressRing";
import type {
  GymSessionStatus,
  GymSessionStatusReason,
  GymSessionValidationRequestStatus,
} from "../../lib/data/types";
import { getGymSessionStatusReasonCopy } from "../../lib/data/gymSessionStatusReason";

type GymProgressCardProps = {
  completed: number;
  target: number;
  weekLabel: string;
  onLogSession?: () => void;
  onSetupGym?: () => void;
  logSessionEnabled?: boolean;
  onRetry?: () => void;
  onRequestValidation?: () => void;
  requestValidationLoading?: boolean;
  validationRequestStatus?: GymSessionValidationRequestStatus | null;
  lastStatus?: GymSessionStatus;
  lastStatusReason?: GymSessionStatusReason | null;
  lastDistanceMeters?: number | null;
  preferredUnit?: "lb" | "kg";
};

export default function GymProgressCard({
  completed,
  target,
  weekLabel,
  onLogSession,
  onSetupGym,
  logSessionEnabled = true,
  onRetry,
  onRequestValidation,
  requestValidationLoading = false,
  validationRequestStatus = null,
  lastStatus,
  lastStatusReason,
  lastDistanceMeters,
  preferredUnit = "lb",
}: GymProgressCardProps) {
  if (!target || target <= 0) {
    return (
      <Card className="mb-6 p-5">
        <SectionTitle>Gym sessions</SectionTitle>
        <Text className="mt-3 text-sm text-neutral-500">
          Set a weekly gym goal to start tracking your streak.
        </Text>
      </Card>
    );
  }

  const safeCompleted = Math.min(completed, target);
  const percent = Math.min(safeCompleted / target, 1);
  const remaining = Math.max(target - safeCompleted, 0);
  const isEmpty = safeCompleted === 0;
  const resolvedStatus = lastStatus;
  const statusLabel =
    resolvedStatus === "verified"
      ? "Verified"
      : resolvedStatus === "provisional"
        ? "Provisional"
        : resolvedStatus === "partial"
          ? "Partial"
          : null;
  const statusIcon =
    resolvedStatus === "verified"
      ? "✓"
      : resolvedStatus === "provisional"
        ? "!"
        : resolvedStatus === "partial"
          ? "○"
          : null;
  const statusStyles =
    resolvedStatus === "verified"
      ? {
          bg: "bg-emerald-500",
          text: "text-white",
          border: "border-emerald-500",
        }
      : resolvedStatus === "provisional"
        ? { bg: "bg-rose-500", text: "text-white", border: "border-rose-500" }
        : resolvedStatus === "partial"
          ? {
              bg: "bg-amber-500",
              text: "text-white",
              border: "border-amber-500",
            }
          : { bg: "", text: "", border: "" };
  const reasonCopy =
    resolvedStatus === "partial" || resolvedStatus === "provisional"
      ? getGymSessionStatusReasonCopy(lastStatusReason)
      : null;
  const reasonTextColor =
    resolvedStatus === "provisional"
      ? "text-rose-200"
      : resolvedStatus === "partial"
        ? "text-amber-200"
        : "text-neutral-200";
  const guidanceTextColor =
    resolvedStatus === "provisional"
      ? "text-rose-200/80"
      : resolvedStatus === "partial"
        ? "text-amber-200/80"
        : "text-neutral-300";
  const reasonContainerClassName =
    resolvedStatus === "provisional"
      ? "mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3"
      : resolvedStatus === "partial"
        ? "mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
        : "mt-3 rounded-xl border border-neutral-700 bg-neutral-900 p-3";
  const validationStatusLabel =
    validationRequestStatus === "open"
      ? "Pending friend review"
      : validationRequestStatus === "accepted"
        ? "Accepted"
        : validationRequestStatus === "declined"
          ? "Declined"
          : validationRequestStatus === "expired"
            ? "Expired"
            : null;
  const canRequestValidation =
    resolvedStatus === "provisional"
    && Boolean(onRequestValidation)
    && (
      validationRequestStatus === null
      || validationRequestStatus === "declined"
      || validationRequestStatus === "expired"
    );
  const requestValidationTitle =
    validationRequestStatus === "declined" || validationRequestStatus === "expired"
      ? "Request again"
      : "Request close-friend validation";
  const ringTone =
    resolvedStatus === "provisional"
      ? "rose"
      : resolvedStatus === "partial"
        ? "amber"
        : "emerald";

  return (
    <Card className="mb-6 p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <SectionTitle>Gym sessions</SectionTitle>
        <Text className="text-xs text-neutral-500">{weekLabel}</Text>
      </View>
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl font-semibold tracking-tight text-white">{safeCompleted}</Text>
          <Text className="mt-1 text-sm text-neutral-400">of {target} sessions this week</Text>
          <Text className="mt-1 text-xs text-neutral-500">
            {remaining === 0 ? "Goal hit" : `${remaining} to go`}
          </Text>
        </View>
        <ProgressRing
          progress={percent}
          valueText={`${Math.round(percent * 100)}%`}
          subText="complete"
          tone={ringTone}
          size={96}
          strokeWidth={8}
        />
      </View>
      {isEmpty ? (
        <Text className="mt-2 text-sm text-neutral-400">
          No verified sessions yet. Log your first visit to start the streak.
        </Text>
      ) : null}
      {statusLabel ? (
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className={`h-6 w-6 items-center justify-center rounded-full ${statusStyles.bg}`}
            >
              <Text className={`text-sm font-bold ${statusStyles.text}`}>
                {statusIcon}
              </Text>
            </View>
            <Text className="text-sm font-medium text-white">
              {statusLabel} today
            </Text>
          </View>
          {resolvedStatus === "provisional" ? (
            <View className="items-end">
              {lastDistanceMeters ? (
                <Text className="text-xs text-neutral-500">
                  {formatDistance(lastDistanceMeters, preferredUnit)} away
                </Text>
              ) : null}
              {validationStatusLabel ? (
                <View className="mt-1 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-neutral-300">
                    {validationStatusLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {reasonCopy ? (
        <View className={reasonContainerClassName}>
          <Text className={`text-sm ${reasonTextColor}`}>{reasonCopy.reasonText}</Text>
          {reasonCopy.actionText ? (
            <Text className={`mt-1 text-xs ${guidanceTextColor}`}>{reasonCopy.actionText}</Text>
          ) : null}
          </View>
      ) : null}
      <View className="mt-4 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs text-neutral-500">
          Verified sessions only. Max one per day.
        </Text>
        <View className="shrink-0">
          {canRequestValidation && onRequestValidation ? (
            <TouchableOpacity
              onPress={onRequestValidation}
              activeOpacity={0.8}
              disabled={requestValidationLoading}
              className="rounded-full border border-sky-500/40 bg-sky-600/20 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-sky-200">
                {requestValidationLoading ? "Requesting..." : requestValidationTitle}
              </Text>
            </TouchableOpacity>
          ) : resolvedStatus === "provisional" && validationRequestStatus === "open" ? (
            <View className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1">
              <Text className="text-xs font-semibold text-neutral-200">
                Pending friend review
              </Text>
            </View>
          ) : resolvedStatus === "provisional" && onRetry ? (
            <TouchableOpacity
              onPress={onRetry}
              activeOpacity={0.8}
              className="rounded-full border border-rose-500/40 bg-rose-600/20 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-rose-200">Retry</Text>
            </TouchableOpacity>
          ) : resolvedStatus === "verified" ? (
            <View className="rounded-full border border-emerald-500/40 bg-emerald-600/20 px-3 py-1">
              <Text className="text-xs font-semibold text-emerald-200">
                Verified today
              </Text>
            </View>
          ) : onLogSession && logSessionEnabled ? (
            <TouchableOpacity
              onPress={onLogSession}
              activeOpacity={0.8}
              className="rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-violet-200">
                Log session
              </Text>
            </TouchableOpacity>
          ) : onSetupGym ? (
            <TouchableOpacity
              onPress={onSetupGym}
              activeOpacity={0.8}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-neutral-200">
                Set gym location
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
