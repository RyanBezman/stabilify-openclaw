import { Text, TouchableOpacity, View } from "react-native";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const NUTRITION_PREFS = ["high_protein", "simple_meals", "high_carb", "mediterranean"] as const;
const NUTRITION_RESTRICTIONS = ["vegetarian", "vegan", "no_dairy", "gluten_free"] as const;

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceButton({ label, selected, onPress }: ChoiceProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`min-h-14 flex-1 items-center justify-center rounded-2xl border px-4 py-3 ${
        selected
          ? "border-violet-400/70 bg-violet-500/15"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <Text className={`text-sm font-semibold ${selected ? "text-violet-100" : "text-neutral-200"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function StepNutrition({ draft, patchDraft }: Props) {
  return (
    <View className="gap-5">
      <Text className="text-sm font-semibold text-neutral-300">Meal style</Text>
      <View className="flex-row flex-wrap gap-3">
        {NUTRITION_PREFS.map((item) => {
          const selected = draft.nutrition.dietaryPreferences.includes(item);
          return (
            <View key={item} className="w-[48%]">
              <ChoiceButton
                label={item.replace("_", " ")}
                selected={selected}
                onPress={() =>
                  patchDraft((prev) => ({
                    ...prev,
                    nutrition: {
                      ...prev.nutrition,
                      dietaryPreferences: selected
                        ? prev.nutrition.dietaryPreferences.filter((entry) => entry !== item)
                        : [...prev.nutrition.dietaryPreferences, item],
                    },
                  }))
                }
              />
            </View>
          );
        })}
      </View>

      <Text className="text-sm font-semibold text-neutral-300">Restrictions</Text>
      <View className="flex-row flex-wrap gap-3">
        {NUTRITION_RESTRICTIONS.map((item) => {
          const selected = draft.nutrition.dietaryRestrictions.includes(item);
          return (
            <View key={item} className="w-[48%]">
              <ChoiceButton
                label={item.replace("_", " ")}
                selected={selected}
                onPress={() =>
                  patchDraft((prev) => ({
                    ...prev,
                    nutrition: {
                      ...prev.nutrition,
                      dietaryRestrictions: selected
                        ? prev.nutrition.dietaryRestrictions.filter((entry) => entry !== item)
                        : [...prev.nutrition.dietaryRestrictions, item],
                    },
                  }))
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
