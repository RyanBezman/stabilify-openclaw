export type ProfileSummary = {
  displayName: string;
  initial: string;
  photoUrl: string | null;
  goalLabel: string;
  goalSummary: string;
  startWeightLabel: string;
  startWeightValue: string;
  targetLabel: string;
  targetValue: string;
  targetValueClassName?: string;
  streakDays: number;
};
