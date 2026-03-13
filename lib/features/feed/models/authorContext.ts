import type { AccountVisibility, ShareVisibility } from "../../../data/types";

export type AuthorContext = {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  photoUrl: string | null;
  accountVisibility: AccountVisibility;
  defaultPostVisibility: ShareVisibility;
  defaultAudienceHint: string;
};
