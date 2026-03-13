import type { AccountVisibility, ShareVisibility } from "./types";

export type PostAudienceIconName =
  | "globe-outline"
  | "people-outline"
  | "heart-outline"
  | "lock-closed-outline";

export type PostAudienceOption = {
  visibility: ShareVisibility;
  title: string;
  statusLabel: string;
  description: string;
  iconName: PostAudienceIconName;
  accentColor: string;
  accentBackgroundColor: string;
};

function buildPostAudienceOption(
  visibility: ShareVisibility,
  title: string,
  statusLabel: string,
  description: string,
  iconName: PostAudienceIconName,
  accentColor: string,
  accentBackgroundColor: string,
): PostAudienceOption {
  return {
    visibility,
    title,
    statusLabel,
    description,
    iconName,
    accentColor,
    accentBackgroundColor,
  };
}

const POST_AUDIENCE_OPTIONS: Record<ShareVisibility, PostAudienceOption> = {
  public: buildPostAudienceOption(
    "public",
    "Everyone",
    "Everyone can see this",
    "Visible anywhere your public posts can appear.",
    "globe-outline",
    "#38bdf8",
    "#0c4a6e",
  ),
  followers: buildPostAudienceOption(
    "followers",
    "Followers",
    "Followers can see this",
    "Visible to approved followers on your account.",
    "people-outline",
    "#a78bfa",
    "#4c1d95",
  ),
  close_friends: buildPostAudienceOption(
    "close_friends",
    "Close friends",
    "Close friends only",
    "Visible only to people on your close friends list.",
    "heart-outline",
    "#f59e0b",
    "#78350f",
  ),
  private: buildPostAudienceOption(
    "private",
    "Only me",
    "Only you can see this",
    "Keeps the post on your side only.",
    "lock-closed-outline",
    "#94a3b8",
    "#334155",
  ),
};

export function normalizePostAudienceAccountVisibility(
  accountVisibility: string | null | undefined,
): AccountVisibility {
  if (accountVisibility === "public" || accountVisibility === "followers") {
    return "public";
  }
  return "private";
}

export function inferPostVisibilityFromAudienceHint(audienceHint: string): ShareVisibility {
  const lowerHint = audienceHint.trim().toLowerCase();
  if (lowerHint.includes("everyone")) {
    return "public";
  }
  if (lowerHint.includes("close friends")) {
    return "close_friends";
  }
  if (lowerHint.includes("only you") || lowerHint.includes("private")) {
    return "private";
  }
  return "followers";
}

export function resolveDefaultPostVisibility(input: {
  accountVisibility: string | null | undefined;
  postShareVisibility: ShareVisibility | null | undefined;
}): ShareVisibility {
  const normalizedAccountVisibility = normalizePostAudienceAccountVisibility(
    input.accountVisibility,
  );

  if (
    input.postShareVisibility === "private" ||
    input.postShareVisibility === "followers" ||
    input.postShareVisibility === "close_friends"
  ) {
    return input.postShareVisibility;
  }

  if (input.postShareVisibility === "public") {
    return normalizedAccountVisibility === "public" ? "public" : "followers";
  }

  return normalizedAccountVisibility === "public" ? "followers" : "private";
}

export function sanitizeRequestedPostVisibility(input: {
  accountVisibility: string | null | undefined;
  requestedVisibility: ShareVisibility;
}): ShareVisibility {
  if (input.requestedVisibility !== "public") {
    return input.requestedVisibility;
  }

  return normalizePostAudienceAccountVisibility(input.accountVisibility) === "public"
    ? "public"
    : "followers";
}

export function getPostAudienceOption(visibility: ShareVisibility): PostAudienceOption {
  return POST_AUDIENCE_OPTIONS[visibility];
}

export function getPostAudienceStatusLabel(visibility: ShareVisibility): string {
  return getPostAudienceOption(visibility).statusLabel;
}

export function buildPostAudienceOptions(
  accountVisibility: AccountVisibility,
): PostAudienceOption[] {
  const orderedVisibilities: ShareVisibility[] =
    accountVisibility === "public"
      ? ["public", "followers", "close_friends", "private"]
      : ["followers", "close_friends", "private"];

  return orderedVisibilities.map((visibility) => getPostAudienceOption(visibility));
}
