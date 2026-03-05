import type { CoachSpecialization } from "../types";

type GreetingInput = {
  specialization: CoachSpecialization;
  coachName: string;
  hasActivePlan: boolean;
};

export function buildCoachGreeting({
  specialization,
  coachName,
  hasActivePlan,
}: GreetingInput) {
  if (specialization === "nutrition") {
    return hasActivePlan
      ? `I'm ${coachName}. Your nutrition plan is active. Tell me what you want to adjust and we'll update it together.`
      : `I'm ${coachName}. Share your nutrition goal and we can build your meal plan.`;
  }

  return `I'm ${coachName}. Tell me your goal and schedule, and we'll build your workout plan. I can also revise it in chat (for example: make this 5 days/week).`;
}
