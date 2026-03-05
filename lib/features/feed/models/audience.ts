export const DEFAULT_AUDIENCE_HINT = "Default audience: followers.";
export const PUBLIC_AUDIENCE_HINT = "Default audience: everyone.";

export function resolveDefaultAudienceHint(accountVisibility: string | null | undefined) {
  if (accountVisibility === "public" || accountVisibility === "followers") {
    return PUBLIC_AUDIENCE_HINT;
  }
  return DEFAULT_AUDIENCE_HINT;
}
