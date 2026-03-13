import { getProfilePhotoSignedUrl } from "../../profile";
import {
  resolveDefaultPostVisibility,
  normalizePostAudienceAccountVisibility,
} from "../../../data/postVisibility";
import { supabase } from "../../../supabase";
import {
  DEFAULT_AUDIENCE_HINT,
  resolveDefaultAudienceHint,
} from "../models/audience";
import type { AuthorContext } from "../models/authorContext";

export async function resolveCurrentAuthorContext(): Promise<AuthorContext | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const fallbackDisplayName =
    (typeof userData.user.user_metadata?.full_name === "string" &&
      userData.user.user_metadata.full_name.trim()) ||
    (typeof userData.user.email === "string" && userData.user.email.trim()) ||
    `User ${userData.user.id.slice(0, 8)}`;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, avatar_path, account_visibility, post_share_visibility")
    .eq("id", userData.user.id)
    .maybeSingle();

  const profileDisplayName = profileData?.display_name?.trim();
  const displayName =
    profileDisplayName && profileDisplayName.length > 0 ? profileDisplayName : fallbackDisplayName;
  const avatarPath = profileData?.avatar_path ?? null;

  let photoUrl: string | null = null;
  if (avatarPath) {
    const signedUrlResult = await getProfilePhotoSignedUrl(avatarPath);
    photoUrl = signedUrlResult.data?.signedUrl ?? null;
  }

  const accountVisibility = normalizePostAudienceAccountVisibility(profileData?.account_visibility);
  const defaultPostVisibility = resolveDefaultPostVisibility({
    accountVisibility: profileData?.account_visibility,
    postShareVisibility: profileData?.post_share_visibility ?? null,
  });

  return {
    userId: userData.user.id,
    displayName,
    avatarPath,
    photoUrl,
    accountVisibility,
    defaultPostVisibility,
    defaultAudienceHint: profileError
      ? DEFAULT_AUDIENCE_HINT
      : resolveDefaultAudienceHint(profileData?.account_visibility),
  };
}
