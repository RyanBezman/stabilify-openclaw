import type { User } from "@supabase/supabase-js";

type OwnProfileIdentitySource = {
  profile?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
} | null | undefined;

export type OwnProfileIdentity = {
  displayName: string;
  usernameLabel: string | null;
  profileHeaderTitle: string;
};

export function deriveOwnProfileIdentity(
  dashboard: OwnProfileIdentitySource,
  user?: User | null,
): OwnProfileIdentity {
  const fallbackName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Your Profile";
  const profileDisplayName = dashboard?.profile?.displayName?.trim();
  const displayName =
    profileDisplayName && profileDisplayName.length > 0 ? profileDisplayName : fallbackName;
  const profileUsernameRaw = dashboard?.profile?.username?.trim();
  const profileUsername = profileUsernameRaw ? profileUsernameRaw.replace(/^@+/, "") : null;
  const usernameLabel = profileUsername ? `@${profileUsername}` : null;
  const profileHeaderTitle = profileUsername ?? displayName;

  return {
    displayName,
    usernameLabel,
    profileHeaderTitle,
  };
}
