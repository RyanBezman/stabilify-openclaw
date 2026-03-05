import React from "react";
import { Text, View } from "react-native";
import type { GymSessionStatus, GymSessionStatusReason } from "../../lib/data/types";
import { formatDistance } from "../../lib/utils/distance";
import { getGymSessionStatusReasonCopy } from "../../lib/data/gymSessionStatusReason";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";

type ProfileGymProgressCardProps = {
  completed: number;
  target: number;
  weekLabel: string;
  lastStatus?: GymSessionStatus;
  lastStatusReason?: GymSessionStatusReason | null;
  lastDistanceMeters?: number | null;
  preferredUnit?: "lb" | "kg";
};

export default function ProfileGymProgressCard({
  completed,
  target,
  weekLabel,
  lastStatus,
  lastStatusReason,
  lastDistanceMeters,
  preferredUnit = "lb",
}: ProfileGymProgressCardProps) {
  if (!target || target <= 0) {
    return (
      <Card className="mb-6 p-5">
        <SectionTitle>Gym sessions</SectionTitle>
        <Text className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          Set a weekly gym goal to start tracking your streak.
        </Text>
      </Card>
    );
  }

  const safeCompleted = Math.min(completed, target);
  const percent = Math.min(safeCompleted / target, 1);
  const barWidth = percent === 0 ? 0 : Math.max(Math.round(percent * 100), 4);
  const remaining = Math.max(target - safeCompleted, 0);
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
          text: "text-neutral-900 dark:text-white",
        }
      : resolvedStatus === "provisional"
        ? { bg: "bg-rose-500", text: "text-neutral-900 dark:text-white" }
        : resolvedStatus === "partial"
          ? {
              bg: "bg-amber-500",
              text: "text-neutral-900 dark:text-white",
            }
          : { bg: "", text: "" };

  const reasonCopy =
    resolvedStatus === "partial" || resolvedStatus === "provisional"
      ? getGymSessionStatusReasonCopy(lastStatusReason)
      : null;
  const reasonTextColor =
    resolvedStatus === "provisional"
      ? "text-rose-700 dark:text-rose-200"
      : resolvedStatus === "partial"
        ? "text-amber-700 dark:text-amber-200"
        : "text-neutral-800 dark:text-neutral-200";
  const guidanceTextColor =
    resolvedStatus === "provisional"
      ? "text-rose-700 dark:text-rose-200/80"
      : resolvedStatus === "partial"
        ? "text-amber-700 dark:text-amber-200/80"
        : "text-neutral-900 dark:text-neutral-300";
  const reasonContainerClassName =
    resolvedStatus === "provisional"
      ? "mt-3 rounded-xl border border-rose-500/40 bg-rose-100 dark:bg-rose-500/10 p-3"
      : resolvedStatus === "partial"
        ? "mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
        : "mt-3 rounded-xl border border-neutral-400 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3";

  return (
    <Card className="mb-6 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <SectionTitle>Gym sessions</SectionTitle>
        <Text className="text-xs text-neutral-500 dark:text-neutral-500">{weekLabel}</Text>
      </View>

      <View className="flex-row items-end justify-between gap-3">
        <Text className="text-3xl font-semibold text-neutral-900 dark:text-white">
          {safeCompleted}/{target}
        </Text>
        <Text className="flex-1 text-right text-sm text-neutral-700 dark:text-neutral-400">
          {remaining === 0 ? "Goal hit" : `${remaining} to go`}
        </Text>
      </View>

      {statusLabel ? (
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className={`h-6 w-6 items-center justify-center rounded-full ${statusStyles.bg}`}>
              <Text className={`text-sm font-bold ${statusStyles.text}`}>{statusIcon}</Text>
            </View>
            <Text className="text-sm font-medium text-neutral-900 dark:text-white">{statusLabel} today</Text>
          </View>
          {resolvedStatus === "provisional" && lastDistanceMeters ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-500">
              {formatDistance(lastDistanceMeters, preferredUnit)} away
            </Text>
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

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <View className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${barWidth}%` }} />
      </View>

      <Text className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">Verified sessions only. Max one per day.</Text>
    </Card>
  );
}
