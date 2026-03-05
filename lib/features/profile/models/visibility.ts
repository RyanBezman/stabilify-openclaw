import type { CanShowProgressTabInput } from "../types/visibility";

export function canShowProgressTab({
  isOwner,
  accountVisibility,
  progressVisibility,
}: CanShowProgressTabInput) {
  if (isOwner) {
    return true;
  }

  if (accountVisibility !== "public") {
    return false;
  }

  return progressVisibility === "public";
}

export type { CanShowProgressTabInput } from "../types/visibility";
