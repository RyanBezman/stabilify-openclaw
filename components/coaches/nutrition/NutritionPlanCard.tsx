import { Text, View } from "react-native";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import OptionPill from "../../ui/OptionPill";
import type { NutritionPlan } from "../../../lib/features/coaches";

type NutritionPlanCardProps = {
  plan: NutritionPlan | null;
  activePlan: NutritionPlan | null;
  draftPlan: NutritionPlan | null;
  showDraftInPlan: boolean;
  onToggleDraft: (value: boolean) => void;
  onOpenIntake: () => void;
  onKeepDraft: () => void;
  onDiscardDraft: () => void;
  onNotNowDraft?: () => void;
  onAskCoachDraft?: () => void;
  showExplicitDecision?: boolean;
  planBusy: boolean;
  planApiUnavailable: boolean;
};

export default function NutritionPlanCard({
  plan,
  activePlan,
  draftPlan,
  showDraftInPlan,
  onToggleDraft,
  onOpenIntake,
  onKeepDraft,
  onDiscardDraft,
  onNotNowDraft,
  onAskCoachDraft,
  showExplicitDecision = false,
  planBusy,
  planApiUnavailable,
}: NutritionPlanCardProps) {
  if (!plan) {
    return (
      <Card variant="subtle" className="mt-5 p-5">
        <Text className="text-base font-semibold text-white">Build your nutrition plan</Text>
        <Button
          className="mt-4"
          title="Create nutrition plan"
          onPress={onOpenIntake}
          disabled={planApiUnavailable}
        />
      </Card>
    );
  }

  const hasToggle = Boolean(activePlan && draftPlan);

  return (
    <Card className="mt-3 p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">{plan.title}</Text>
          <Text className="mt-2 text-sm leading-relaxed text-neutral-400">
            {plan.dailyCaloriesTarget} kcal/day
          </Text>
        </View>
      </View>

      {hasToggle ? (
        <View className="mt-5 flex-row gap-3">
          <OptionPill label="Current" selected={!showDraftInPlan} onPress={() => onToggleDraft(false)} />
          <OptionPill label="New" selected={showDraftInPlan} onPress={() => onToggleDraft(true)} />
        </View>
      ) : null}

      <View className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <Text className="text-sm font-semibold text-neutral-300">Macro targets</Text>
        <View className="mt-3 flex-row gap-2">
          <View className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <Text className="text-xs text-neutral-500">Protein</Text>
            <Text className="mt-1 text-base font-semibold text-white">{plan.macros.proteinG}g</Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <Text className="text-xs text-neutral-500">Carbs</Text>
            <Text className="mt-1 text-base font-semibold text-white">{plan.macros.carbsG}g</Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <Text className="text-xs text-neutral-500">Fats</Text>
            <Text className="mt-1 text-base font-semibold text-white">{plan.macros.fatsG}g</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 gap-3">
        {plan.meals.map((meal, mealIndex) => (
          <View
            key={`${meal.name}-${mealIndex}`}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <Text className="text-sm font-semibold text-neutral-300">
              {meal.name} · {meal.targetCalories} kcal
            </Text>
            <View className="mt-3 gap-2">
              {meal.items.map((item, itemIndex) => (
                <Text key={`${meal.name}-${item}-${itemIndex}`} className="text-sm text-white">
                  • {item}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>

      {plan.notes.length ? (
        <View className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <Text className="text-sm font-semibold text-neutral-300">Notes</Text>
          <View className="mt-2 gap-2">
            {plan.notes.map((note, noteIndex) => (
              <Text key={`${note}-${noteIndex}`} className="text-sm text-neutral-300">
                • {note}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {draftPlan ? (
        showExplicitDecision ? (
          <View className="mt-5 gap-3">
            <View className="rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/15 px-3 py-2.5">
              <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-fuchsia-100">
                Decision required
              </Text>
              <Text className="mt-1 text-xs text-fuchsia-50">
                Choose how to handle this updated nutrition draft.
              </Text>
            </View>
            <Button
              title={activePlan ? "Accept updated plan" : "Accept plan"}
              onPress={onKeepDraft}
              disabled={planBusy}
            />
            <Button
              variant="secondary"
              title="Not now"
              onPress={onNotNowDraft ?? onDiscardDraft}
              disabled={planBusy}
            />
            <Button
              variant="secondary"
              title="Ask coach"
              onPress={onAskCoachDraft}
              disabled={planBusy}
            />
          </View>
        ) : (
          <View className="mt-5 flex-row gap-3">
            <Button
              className="flex-1"
              title={activePlan ? "Keep new plan" : "Save plan"}
              onPress={onKeepDraft}
              disabled={planBusy}
            />
            <Button
              className="flex-1"
              variant="secondary"
              title="Discard new"
              onPress={onDiscardDraft}
              disabled={planBusy || planApiUnavailable}
            />
          </View>
        )
      ) : (
        <View className="mt-5">
          <Button
            title="Regenerate with updated intake"
            onPress={onOpenIntake}
            disabled={planBusy || planApiUnavailable}
          />
        </View>
      )}
    </Card>
  );
}
