import { Text, View } from "react-native";

type AccoladeBadgeProps = {
  icon: string;
  label: string;
  active: boolean;
  className?: string;
};

export default function AccoladeBadge({
  icon,
  label,
  active,
  className,
}: AccoladeBadgeProps) {
  return (
    <View
      className={`flex-row items-center rounded-full border px-3 py-1.5 ${
        active
          ? "border-violet-500/40 bg-violet-500/10"
          : "border-neutral-800 bg-neutral-950/60"
      } ${className ?? ""}`}
    >
      <Text className="mr-2 text-sm">{icon}</Text>
      <Text
        className={`text-xs font-semibold ${
          active ? "text-violet-200" : "text-neutral-400"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export type { AccoladeBadgeProps };
