import type { CoachOnboardingDraft, CoachOnboardingStepId } from "../../../lib/features/coaches";
import OnboardingReviewSummary from "./OnboardingReviewSummary";
import StepConstraints from "./steps/StepConstraints";
import StepEquipment from "./steps/StepEquipment";
import StepExperience from "./steps/StepExperience";
import StepGoal from "./steps/StepGoal";
import StepNutrition from "./steps/StepNutrition";
import StepPersona from "./steps/StepPersona";
import StepSchedule from "./steps/StepSchedule";
import StepStats from "./steps/StepStats";

type Props = {
  currentStep: CoachOnboardingStepId;
  draft: CoachOnboardingDraft;
  summaryChips: string[];
  patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) => void;
};

export default function OnboardingStepContent({ currentStep, draft, summaryChips, patchDraft }: Props) {
  if (currentStep === "goal") return <StepGoal draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "experience") return <StepExperience draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "schedule") return <StepSchedule draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "equipment") return <StepEquipment draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "nutrition") return <StepNutrition draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "constraints") return <StepConstraints draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "stats") return <StepStats draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "persona") return <StepPersona draft={draft} patchDraft={patchDraft} />;

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
