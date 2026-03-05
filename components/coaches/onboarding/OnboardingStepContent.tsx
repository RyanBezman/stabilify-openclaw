import type { CoachOnboardingDraft, CoachOnboardingStepId } from "../../../lib/features/coaches";
import OnboardingReviewSummary from "./OnboardingReviewSummary";
import StepConstraints from "./steps/StepConstraints";
import StepEquipment from "./steps/StepEquipment";
import StepExperience from "./steps/StepExperience";
import StepGoal from "./steps/StepGoal";
import StepNutrition from "./steps/StepNutrition";
import StepPersona from "./steps/StepPersona";
import StepPlanStart from "./steps/StepPlanStart";
import StepSchedule from "./steps/StepSchedule";
import StepHeight from "./steps/StepHeight";
import StepWeight from "./steps/StepWeight";
import StepSex from "./steps/StepSex";

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
  if (currentStep === "sex") return <StepSex draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "weight") return <StepWeight draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "height") return <StepHeight draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "persona") return <StepPersona draft={draft} patchDraft={patchDraft} />;
  if (currentStep === "plan_start") return <StepPlanStart draft={draft} patchDraft={patchDraft} />;

  return (
    <OnboardingReviewSummary
      summaryChips={summaryChips}
      goal={draft.goal.primary}
      experience={draft.experienceLevel}
      heightCm={draft.body.heightCm}
      weightKg={draft.body.weightKg}
      sex={draft.body.sex}
      trainingLine={`${draft.training.daysPerWeek} days • ${draft.training.sessionMinutes} min • ${draft.training.equipmentAccess.replace("_", " ")}`}
      coachLine={`${draft.persona.gender} • ${draft.persona.personality} personality`}
      planStart={draft.planStart}
    />
  );
}
