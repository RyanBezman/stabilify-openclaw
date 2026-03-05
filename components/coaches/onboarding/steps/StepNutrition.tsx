import { Text, View } from "react-native";
import OptionPill from "../../../ui/OptionPill";
import type { CoachOnboardingDraft } from "../../../../lib/features/coaches";

type Props = {
  draft: CoachOnboardingDraft;
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const NUTRITION_PREFS = ["high_protein", "simple_meals", "high_carb", "mediterranean"] as const;
const NUTRITION_RESTRICTIONS = ["vegetarian", "vegan", "no_dairy", "gluten_free"] as const;

export default function StepNutrition({ draft, patchDraft }: Props) {
  return (
    <View className="gap-4">
      <Text className="text-sm font-semibold text-neutral-300">Preferences</Text>
      <View className="flex-row flex-wrap gap-2">
        {NUTRITION_PREFS.map((item) => {
          const selected = draft.nutrition.dietaryPreferences.includes(item);
          return (
            <OptionPill
              key={item}
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
          );
        })}
      </View>
      <Text className="text-sm font-semibold text-neutral-300">Restrictions</Text>
      <View className="flex-row flex-wrap gap-2">
        {NUTRITION_RESTRICTIONS.map((item) => {
          const selected = draft.nutrition.dietaryRestrictions.includes(item);
          return (
            <OptionPill
              key={item}
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
          );
        })}
      </View>
    </View>
  );
}
