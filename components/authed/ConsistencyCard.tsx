import { Text, TouchableOpacity, View } from "react-native";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import ProgressRing from "./ProgressRing";

type ConsistencyOption = {
  id: string;
  label: string;
  days: number;
};

type ConsistencyCardProps = {
  options: ConsistencyOption[];
  selected: ConsistencyOption;
  onSelect: (option: ConsistencyOption) => void;
  showMenu: boolean;
  onToggleMenu: () => void;
  daysWithWeighIns: number;
  totalDays: number;
  percent: number;
};

export default function ConsistencyCard({
  options,
  selected,
  onSelect,
  showMenu,
  onToggleMenu,
  daysWithWeighIns,
  totalDays,
  percent,
}: ConsistencyCardProps) {
  const percentLabel = Math.round(percent * 100);

  return (
    <Card className="mb-6 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <SectionTitle>Consistency</SectionTitle>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggleMenu}
          className="flex-row items-center rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1"
        >
          <Text className="text-xs text-neutral-300">{selected.label}</Text>
          <Text className="ml-2 text-xs text-violet-400">▾</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl font-semibold tracking-tight text-white">{percentLabel}%</Text>
          <Text className="mt-1 text-sm text-neutral-400">
            {daysWithWeighIns} of {totalDays} days logged
          </Text>
        </View>
        <ProgressRing
          progress={percent}
          valueText={String(daysWithWeighIns)}
          subText={`${totalDays} days`}
          tone="violet"
          size={96}
          strokeWidth={8}
        />
      </View>

      {showMenu ? (
        <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/90 p-2">
          {options.map((option) => {
            const isActive = option.id === selected.id;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.8}
                onPress={() => onSelect(option)}
                className={`rounded-lg px-3 py-2 ${
                  isActive ? "bg-violet-500/20" : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    isActive ? "text-white" : "text-neutral-300"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

export type { ConsistencyOption };
