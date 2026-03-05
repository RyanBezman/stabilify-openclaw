import StatCard from "./StatCard";

type StreakCardProps = {
  streakDays: number;
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
};

export default function StreakCard({
  streakDays,
  className,
  compact = false,
  align = "left",
}: StreakCardProps) {
  const value = streakDays > 0 ? `${streakDays} day${streakDays === 1 ? "" : "s"}` : "—";

  return (
    <StatCard
      label="Streak"
      value={value}
      sublabel={compact ? undefined : "Active weigh-in run"}
      tone={streakDays > 0 ? "violet" : "neutral"}
      align={align}
      className={className}
    />
  );
}

export type { StreakCardProps };
