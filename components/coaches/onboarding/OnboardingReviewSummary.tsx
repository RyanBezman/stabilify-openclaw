import { Text, View } from "react-native";
import Card from "../../ui/Card";

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

function heightDisplay(heightCm: number | null) {
  if (heightCm === null) return "Not set";
  const totalInches = Math.round(heightCm / CM_PER_IN);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} ft ${inches} in`;
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
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

type DetailRowProps = {
  label: string;
  value: string;
  withBorder?: boolean;
};

function DetailRow({ label, value, withBorder = true }: DetailRowProps) {
  return (
    <View className={`flex-row items-center justify-between gap-4 py-2.5 ${withBorder ? "border-t border-neutral-800" : ""}`}>
      <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-neutral-100">{value}</Text>
    </View>
  );
}

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
      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Review summary</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {summaryChips.map((chip) => (
            <View key={chip} className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
              <Text className="text-xs font-semibold text-violet-200">{chip}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Profile</Text>
        <View className="mt-2">
          <DetailRow label="Goal" value={titleCase(goal)} withBorder={false} />
          <DetailRow label="Experience" value={titleCase(experience)} />
          <DetailRow label="Sex" value={sex ? titleCase(sex) : "Not set"} />
          <DetailRow label="Height" value={heightDisplay(heightCm)} />
          <DetailRow label="Weight" value={weightLb === null ? "Not set" : `${weightLb} lb`} />
        </View>
      </Card>

      <Card variant="subtle" className="p-4">
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">Plan setup</Text>
        <View className="mt-2">
          <DetailRow label="Training" value={titleCase(trainingLine)} withBorder={false} />
          <DetailRow label="Coach" value={titleCase(coachLine)} />
          <DetailRow
            label="Starting with"
            value={planStart === "both" ? "Workout + Nutrition" : titleCase(planStart)}
          />
        </View>

        <Text className="mt-3 text-xs leading-5 text-neutral-400">
          {planStart === "both"
            ? "Both plans are generated together from this profile."
            : planStart === "workout"
              ? "Workout starts now. Nutrition can be added anytime."
              : "Nutrition starts now. Workout can be added anytime."}
        </Text>
      </Card>
    </View>
  );
}
