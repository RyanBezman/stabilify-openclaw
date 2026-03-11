import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Button from "../../ui/Button";
import OptionPill from "../../ui/OptionPill";
import PlanSurface from "../workspace/PlanSurface";
import type { NutritionPlan } from "../../../lib/features/coaches";
import { getNutritionPlanViewKey } from "../../../lib/features/coaches/models/planViewKey";

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

function HeaderBadge({
  kind,
  hasToggle,
}: {
  kind: "current" | "new";
  hasToggle: boolean;
}) {
  if (kind === "current") {
    return (
      <View className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
        <Text className="text-xs font-semibold text-emerald-200">
          {hasToggle ? "CURRENT" : "ACTIVE"}
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
      <Text className="text-xs font-semibold text-amber-200">NEW</Text>
    </View>
  );
}

function SectionToggle({
  title,
  subtitle,
  open,
  onPress,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="flex-row items-center justify-between gap-3"
    >
      <View className="flex-1">
        <Text
          className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300"
        >
          {title}
        </Text>
        {subtitle ? <Text className="mt-1 text-sm leading-5 text-neutral-200">{subtitle}</Text> : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-semibold text-neutral-200">
          {open ? "Hide" : "Show"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#e5e5e5"
        />
      </View>
    </TouchableOpacity>
  );
}

function MacroStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
        {label}
      </Text>
      <Text className="mt-1 text-base font-semibold text-white">{value}</Text>
    </View>
  );
}

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
  const [mealsOpen, setMealsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const planViewKey = useMemo(() => getNutritionPlanViewKey(plan), [plan]);

  useEffect(() => {
    if (!plan) {
      setExpandedMeals({});
      setMealsOpen(false);
      setNotesOpen(false);
      return;
    }

    setMealsOpen(false);
    setNotesOpen(false);
    setExpandedMeals({});
  }, [planViewKey]);

  if (!plan) {
    return (
      <PlanSurface className="mt-3 p-5">
        <Text className="text-base font-semibold text-white">Build your nutrition plan</Text>
        <Text className="mt-2 text-sm leading-6 text-neutral-300">
          Create a calmer baseline plan, then adjust it with your coach as needed.
        </Text>
        <Button
          className="mt-4"
          title="Create nutrition plan"
          onPress={onOpenIntake}
          disabled={planApiUnavailable}
        />
      </PlanSurface>
    );
  }

  const hasToggle = Boolean(activePlan && draftPlan);
  const displayedPlanKind = draftPlan && showDraftInPlan ? "new" : "current";

  return (
    <PlanSurface className="mt-3">
      <View className="px-5 py-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={2} className="text-lg font-bold text-white">
              {plan.title}
            </Text>
          </View>
          <View className="shrink-0 self-start">
            <HeaderBadge kind={displayedPlanKind} hasToggle={hasToggle} />
          </View>
        </View>

        {hasToggle ? (
          <View className="mt-5 flex-row gap-3">
            <OptionPill label="Current" selected={!showDraftInPlan} onPress={() => onToggleDraft(false)} />
            <OptionPill label="New" selected={showDraftInPlan} onPress={() => onToggleDraft(true)} />
          </View>
        ) : null}

        <View className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-300">
                Daily target
              </Text>
              <Text className="mt-2 text-2xl font-bold tracking-tight text-white">
                {plan.dailyCaloriesTarget}
                <Text className="text-sm font-semibold text-neutral-300"> kcal</Text>
              </Text>
            </View>
            <View className="rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1.5">
              <Text className="text-xs font-semibold text-neutral-100">
                {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <View className="mt-4 border-t border-neutral-800 pt-4">
            <View className="flex-row items-center gap-3">
              <MacroStat label="Protein" value={`${plan.macros.proteinG}g`} />
              <View className="h-10 w-px bg-neutral-800" />
              <MacroStat label="Carbs" value={`${plan.macros.carbsG}g`} />
              <View className="h-10 w-px bg-neutral-800" />
              <MacroStat label="Fats" value={`${plan.macros.fatsG}g`} />
            </View>
          </View>
        </View>
      </View>

      <View className="border-t border-neutral-800 px-5 py-4">
        <SectionToggle
          title="Meal structure"
          subtitle={`${plan.meals.length} meal${plan.meals.length === 1 ? "" : "s"}`}
          open={mealsOpen}
          onPress={() => setMealsOpen((current) => !current)}
        />
      </View>

      {mealsOpen
        ? plan.meals.map((meal, mealIndex) => {
            const mealKey = `${meal.name}-${mealIndex}`;
            const mealOpen = Boolean(expandedMeals[mealKey]);

            return (
              <View
                key={mealKey}
                className={`${mealIndex === 0 ? "" : "border-t border-neutral-800"} px-5 py-4`}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    setExpandedMeals((current) => ({
                      ...current,
                      [mealKey]: !current[mealKey],
                    }))
                  }
                  className="flex-row items-start justify-between gap-3"
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-neutral-100">{meal.name}</Text>
                    <Text className="mt-1 text-sm leading-5 text-neutral-200">
                      {meal.items.length} item{meal.items.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-semibold uppercase tracking-[1px] text-neutral-200">
                      {meal.targetCalories} kcal
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-neutral-300">
                      {mealOpen ? "Hide" : "Show"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {mealOpen ? (
                  <View className="mt-3 gap-2">
                    {meal.items.map((item, itemIndex) => (
                      <Text
                        key={`${meal.name}-${item}-${itemIndex}`}
                        className="text-sm leading-6 text-white"
                      >
                        • {item}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        : null}

      {plan.notes.length ? (
        <View className="border-t border-neutral-800 px-5 py-4">
          <SectionToggle
            title="Notes"
            subtitle={`${plan.notes.length} note${plan.notes.length === 1 ? "" : "s"}`}
            open={notesOpen}
            onPress={() => setNotesOpen((current) => !current)}
          />
          {notesOpen ? (
            <View className="mt-3 gap-2">
              {plan.notes.map((note, noteIndex) => (
                <Text
                  key={`${note}-${noteIndex}`}
                  className="text-sm leading-6 text-neutral-200"
                >
                  • {note}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {draftPlan ? (
        showExplicitDecision ? (
          <View className="border-t border-neutral-800 px-5 py-5">
            <View className="rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/15 px-3 py-2.5">
              <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-fuchsia-100">
                Decision required
              </Text>
              <Text className="mt-1 text-sm text-fuchsia-50">
                Choose how to handle this updated nutrition draft.
              </Text>
            </View>
            <View className="mt-4 gap-3">
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
          </View>
        ) : (
          <View className="border-t border-neutral-800 px-5 py-5">
            <View className="flex-row gap-3">
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
          </View>
        )
      ) : (
        <View className="border-t border-neutral-800 px-5 py-5">
          <Button
            title="Regenerate with updated intake"
            onPress={onOpenIntake}
            disabled={planBusy || planApiUnavailable}
          />
        </View>
      )}
    </PlanSurface>
  );
}
