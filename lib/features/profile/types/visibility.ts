import type { AccountVisibility, ProgressVisibility } from "../../../data/types";

export type CanShowProgressTabInput = {
  isOwner: boolean;
  accountVisibility: AccountVisibility;
  progressVisibility: ProgressVisibility;
};
