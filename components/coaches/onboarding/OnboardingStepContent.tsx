import { Text, View } from "react-native";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import OptionPill from "../../ui/OptionPill";
import type { CoachOnboardingDraft, CoachOnboardingStepId } from "../../../lib/features/coaches";
import OnboardingReviewSummary from "./OnboardingReviewSummary";

type Props = {
  currentStep: CoachOnboardingStepId;
  draft: CoachOnboardingDraft;
  summaryChips: string[];
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

const NUTRITION_PREFS = ["high_protein", "simple_meals", "high_carb", "mediterranean"] as const;
const NUTRITION_RESTRICTIONS = ["vegetarian", "vegan", "no_dairy", "gluten_free"] as const;

export default function OnboardingStepContent({ currentStep, draft, summaryChips, patchDraft }: Props) {
  if (currentStep === "goal") {
    return (
      <View className="gap-3">
        <OptionPill label="Lose fat" selected={draft.goal.primary === "lose"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "lose" } }))} />
        <OptionPill label="Maintain" selected={draft.goal.primary === "maintain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "maintain" } }))} />
        <OptionPill label="Gain muscle" selected={draft.goal.primary === "gain"} onPress={() => patchDraft((prev) => ({ ...prev, goal: { ...prev.goal, primary: "gain" } }))} />
      </View>
    );
  }

  if (currentStep === "experience") {
    return (
      <View className="gap-3">
        <OptionPill label="Beginner" selected={draft.experienceLevel === "beginner"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "beginner" }))} />
        <OptionPill label="Intermediate" selected={draft.experienceLevel === "intermediate"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "intermediate" }))} />
        <OptionPill label="Advanced" selected={draft.experienceLevel === "advanced"} onPress={() => patchDraft((prev) => ({ ...prev, experienceLevel: "advanced" }))} />
      </View>
    );
  }

  if (currentStep === "schedule") {
    return (
      <View className="gap-4">
        <Text className="text-sm font-semibold text-neutral-300">Days per week</Text>
        <View className="flex-row flex-wrap gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <OptionPill key={d} label={`${d} days`} selected={draft.training.daysPerWeek === d} onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, daysPerWeek: d } }))} />
          ))}
        </View>
        <Text className="text-sm font-semibold text-neutral-300">Session length</Text>
        <View className="flex-row flex-wrap gap-2">
          {[30, 45, 60, 75].map((m) => (
            <OptionPill key={m} label={`${m} min`} selected={draft.training.sessionMinutes === m} onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, sessionMinutes: m as 30 | 45 | 60 | 75 } }))} />
          ))}
        </View>
      </View>
    );
  }

  if (currentStep === "equipment") {
    return (
      <View className="gap-3">
        {[
          ["full_gym", "Full gym"],
          ["home_gym", "Home gym"],
          ["dumbbells", "Dumbbells"],
          ["bodyweight", "Bodyweight"],
          ["mixed", "Mixed"],
        ].map(([value, label]) => (
          <OptionPill
            key={value}
            label={label}
            selected={draft.training.equipmentAccess === value}
            onPress={() => patchDraft((prev) => ({ ...prev, training: { ...prev.training, equipmentAccess: value as typeof prev.training.equipmentAccess } }))}
          />
        ))}
      </View>
    );
  }

  if (currentStep === "nutrition") {
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

  if (currentStep === "constraints") {
    return (
      <View className="gap-4">
        <Input
          value={draft.constraints.scheduleConstraintsNote}
          onChangeText={(text) => patchDraft((prev) => ({ ...prev, constraints: { ...prev.constraints, scheduleConstraintsNote: text } }))}
          placeholder="Work/travel/time constraints (optional)"
          multiline
        />
        <Input
          value={draft.training.notes}
          onChangeText={(text) => patchDraft((prev) => ({ ...prev, training: { ...prev.training, notes: text } }))}
          placeholder="Injuries, limitations, or preferences (optional)"
          multiline
        />
      </View>
    );
  }

  if (currentStep === "stats") {
    return (
      <View className="gap-4">
        <Input
          value={draft.body.weightKg ? String(draft.body.weightKg) : ""}
          onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, weightKg: Number(text.replace(/[^0-9.]/g, "")) || null } }))}
          keyboardType="decimal-pad"
          placeholder="Weight (kg)"
        />
        <Input
          value={draft.body.heightCm ? String(draft.body.heightCm) : ""}
          onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, heightCm: Number(text.replace(/[^0-9]/g, "")) || null } }))}
          keyboardType="number-pad"
          placeholder="Height (cm) optional"
        />
        <Input
          value={draft.body.age ? String(draft.body.age) : ""}
          onChangeText={(text) => patchDraft((prev) => ({ ...prev, body: { ...prev.body, age: Number(text.replace(/[^0-9]/g, "")) || null } }))}
          keyboardType="number-pad"
          placeholder="Age optional"
        />
      </View>
    );
  }

  if (currentStep === "persona") {
    return (
      <View className="gap-4">
        <Text className="text-sm font-semibold text-neutral-300">Personality</Text>
        <View className="flex-row flex-wrap gap-2">
          {[
            ["strict", "Strict"],
            ["hype", "Hype"],
            ["sweet", "Sweet"],
          ].map(([value, label]) => (
            <OptionPill
              key={value}
              label={label}
              selected={draft.persona.personality === value}
              onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, personality: value as typeof prev.persona.personality } }))}
            />
          ))}
        </View>
        <Card variant="subtle" className="p-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-violet-300">Preview</Text>
          <Text className="mt-2 text-sm font-semibold text-white">
            {draft.persona.personality === "strict"
              ? "No excuses today. Hit your sessions and keep nutrition tight."
              : draft.persona.personality === "hype"
                ? "Let’s stack wins today. You’ve got momentum—let’s use it."
                : "You’re doing great. We’ll keep this realistic and consistent."}
          </Text>
        </Card>
        <Text className="text-sm font-semibold text-neutral-300">Coach style</Text>
        <View className="flex-row flex-wrap gap-2">
          <OptionPill label="Woman" selected={draft.persona.gender === "woman"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "woman" } }))} />
          <OptionPill label="Man" selected={draft.persona.gender === "man"} onPress={() => patchDraft((prev) => ({ ...prev, persona: { ...prev.persona, gender: "man" } }))} />
        </View>
      </View>
    );
  }

  return (
    <OnboardingReviewSummary
      summaryChips={summaryChips}
      goal={draft.goal.primary}
      experience={draft.experienceLevel}
      weightKg={draft.body.weightKg}
      trainingLine={`${draft.training.daysPerWeek} days • ${draft.training.sessionMinutes} min • ${draft.training.equipmentAccess.replace("_", " ")}`}
      coachLine={`${draft.persona.gender} • ${draft.persona.personality} personality`}
    />
  );
}
