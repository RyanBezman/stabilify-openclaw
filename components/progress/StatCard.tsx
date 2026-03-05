import { Text, View } from "react-native";

type StatCardTone = "neutral" | "violet" | "emerald" | "amber";
type StatCardAlign = "left" | "center" | "right";

type StatCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  tone?: StatCardTone;
  align?: StatCardAlign;
  className?: string;
  valueClassName?: string;
};

const TONE_CLASS_NAME: Record<StatCardTone, string> = {
  neutral: "border-neutral-800 bg-neutral-950/60",
  violet: "border-violet-500/35 bg-violet-500/10",
  emerald: "border-emerald-500/35 bg-emerald-500/10",
  amber: "border-amber-500/35 bg-amber-500/10",
};

const ALIGN_CLASS_NAME: Record<StatCardAlign, string> = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
};

export default function StatCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  align = "left",
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <View
      className={`rounded-xl border px-4 py-3 ${TONE_CLASS_NAME[tone]} ${ALIGN_CLASS_NAME[align]} ${
        className ?? ""
      }`}
    >
      <Text className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </Text>
      <Text className={`mt-1 text-xl font-semibold text-white ${valueClassName ?? ""}`}>
        {value}
      </Text>
      {sublabel ? (
        <Text className="mt-1 text-xs text-neutral-400" numberOfLines={2}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

export type { StatCardAlign, StatCardTone, StatCardProps };
