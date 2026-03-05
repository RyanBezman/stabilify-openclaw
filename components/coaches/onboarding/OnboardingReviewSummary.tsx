import { Text, View } from "react-native";
import Card from "../../ui/Card";

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

function heightDisplay(heightCm: number | null) {
  if (heightCm === null) return "not set";
  const totalInches = Math.round(heightCm / CM_PER_IN);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} ft ${inches} in`;
}

type Props = {
  summaryChips: string[];
  goal: string;
  experience: string;
  heightCm: number | null;
  weightKg: number | null;
  sex: "male" | "female" | "other" | null;
  trainingLine: string;
  coachLine: string;
  planStart: "workout" | "nutrition" | "both";
};

export default function OnboardingReviewSummary({
  summaryChips,
  goal,
  experience,
  heightCm,
  weightKg,
  sex,
  trainingLine,
  coachLine,
  planStart,
}: Props) {
  const weightLb = weightKg === null ? null : Math.round(weightKg * LB_PER_KG);

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {summaryChips.map((chip) => (
          <View key={chip} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5">
            <Text className="text-xs font-semibold text-violet-200">{chip}</Text>
          </View>
        ))}
      </View>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Goal & profile</Text>
        <Text className="mt-2 text-sm text-neutral-200">Goal: {goal}</Text>
        <Text className="mt-1 text-sm text-neutral-200">Experience: {experience}</Text>
        <Text className="mt-1 text-sm text-neutral-200">Sex: {sex ?? "not set"}</Text>
        <Text className="mt-1 text-sm text-neutral-200">Height: {heightDisplay(heightCm)}</Text>
        <Text className="mt-1 text-sm text-neutral-200">Weight: {weightLb === null ? "not set" : `${weightLb} lb`}</Text>
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Training setup</Text>
        <Text className="mt-2 text-sm text-neutral-200">{trainingLine}</Text>
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">What you get</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(planStart === "both" || planStart === "workout") ? (
            <View className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <Text className="text-xs font-semibold text-emerald-200">Workout Plan</Text>
            </View>
          ) : null}
          {(planStart === "both" || planStart === "nutrition") ? (
            <View className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2">
              <Text className="text-xs font-semibold text-sky-200">Nutrition Plan</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-3 text-sm text-neutral-300">
          {planStart === "both"
            ? "Both plans are generated together from your profile and coach personality."
            : planStart === "workout"
              ? "Your workout plan is generated first; nutrition can be added anytime."
              : "Your nutrition plan is generated first; workout can be added anytime."}
        </Text>
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Unified coach</Text>
        <Text className="mt-2 text-sm text-neutral-200">{coachLine}</Text>
      </Card>
    </View>
  );
}
