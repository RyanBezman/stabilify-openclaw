import type {
  AccountVisibility,
  ProgressVisibility,
  ShareVisibility,
  WeightUnit,
} from "../../data/types";
import { supabase } from "../../supabase";
import { getLocalTimeZone } from "../../utils/time";
import {
  createUsernameCandidate,
  getUsernameValidationError,
  normalizeUsername,
} from "../../utils/username";
import { fail, ok, type Result } from "../shared";

export type ProfileSettingsValues = {
  displayName: string;
  username: string;
  bio: string;
  preferredUnit: WeightUnit;
  timezone: string;
  accountVisibility: AccountVisibility;
  progressVisibility: ProgressVisibility;
  socialEnabled: boolean;
  weighInShareVisibility: ShareVisibility;
  gymEventShareVisibility: ShareVisibility;
  postShareVisibility: ShareVisibility;
  autoSupportEnabled: boolean;
  autoSupportConsentedAt: string | null;
  appleHealthStepsEnabled: boolean;
  dailyStepGoal: number;
};

type AuthedUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
};

function normalizeAccountVisibility(value: string | null | undefined): AccountVisibility {
  if (value === "public" || value === "followers") {
    return "public";
  }
  return "private";
}

function fallbackDisplayName(user: AuthedUser) {
  const fullName = user.user_metadata?.full_name?.trim();
  if (fullName) return fullName;
  const email = user.email?.trim();
  if (email) return email;
  return "User";
}

async function getAuthedUser(): Promise<Result<{ user?: AuthedUser }>> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }
  return ok({ user: data.user as AuthedUser });
}

function normalizeDailyStepGoal(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 10000;
  }
  const roundedValue = Math.round(value);
  return Math.min(Math.max(roundedValue, 1000), 50000);
}

export async function fetchProfileSettingsValues(): Promise<Result<ProfileSettingsValues>> {
  const { data: authData } = await getAuthedUser();
  if (!authData?.user) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  const user = authData.user;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, username, bio, preferred_unit, timezone, account_visibility, progress_visibility, social_enabled, weigh_in_share_visibility, gym_event_share_visibility, post_share_visibility, auto_support_enabled, auto_support_consent_at, apple_health_steps_enabled, daily_step_goal",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  if (!data) {
    return ok({
      displayName: fallbackDisplayName(user),
      username: createUsernameCandidate(fallbackDisplayName(user), user.id),
      bio: "",
      preferredUnit: "lb",
      timezone: getLocalTimeZone(),
      accountVisibility: "private",
      progressVisibility: "public",
      socialEnabled: false,
      weighInShareVisibility: "private",
      gymEventShareVisibility: "private",
      postShareVisibility: "private",
      autoSupportEnabled: true,
      autoSupportConsentedAt: null,
      appleHealthStepsEnabled: false,
      dailyStepGoal: 10000,
    });
  }

  const row = data as {
    display_name: string;
    username: string | null;
    bio: string | null;
    preferred_unit: WeightUnit;
    timezone: string;
    account_visibility: string | null;
    progress_visibility: ProgressVisibility | null;
    social_enabled: boolean | null;
    weigh_in_share_visibility: ShareVisibility | null;
    gym_event_share_visibility: ShareVisibility | null;
    post_share_visibility: ShareVisibility | null;
    auto_support_enabled: boolean | null;
    auto_support_consent_at: string | null;
    apple_health_steps_enabled: boolean | null;
    daily_step_goal: number | null;
  };

  return ok({
    displayName: row.display_name,
    username: row.username?.trim() || createUsernameCandidate(row.display_name, user.id),
    bio: row.bio ?? "",
    preferredUnit: row.preferred_unit,
    timezone: row.timezone,
    accountVisibility: normalizeAccountVisibility(row.account_visibility),
    progressVisibility: row.progress_visibility ?? "public",
    socialEnabled: row.social_enabled ?? false,
    weighInShareVisibility: row.weigh_in_share_visibility ?? "private",
    gymEventShareVisibility: row.gym_event_share_visibility ?? "private",
    postShareVisibility: row.post_share_visibility ?? "private",
    autoSupportEnabled: row.auto_support_enabled ?? true,
    autoSupportConsentedAt: row.auto_support_consent_at ?? null,
    appleHealthStepsEnabled: row.apple_health_steps_enabled ?? false,
    dailyStepGoal: normalizeDailyStepGoal(row.daily_step_goal),
  });
}

export async function saveProfileSettingsValues(
  values: ProfileSettingsValues,
): Promise<Result<{ ok: true; autoSupportConsentedAt: string | null }>> {
  const { data: authData } = await getAuthedUser();
  if (!authData?.user) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  const user = authData.user;
  const displayName = values.displayName.trim();
  if (!displayName) {
    return fail("Display name is required.", { code: "VALIDATION" });
  }
  const username = normalizeUsername(values.username);
  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    return fail(usernameError, { code: "VALIDATION" });
  }

  const timezone = values.timezone.trim() || getLocalTimeZone();
  const dailyStepGoal = normalizeDailyStepGoal(values.dailyStepGoal);
  const isPrivateAccount = values.accountVisibility === "private";
  const socialEnabled = isPrivateAccount ? false : values.socialEnabled;
  const weighInShareVisibility = isPrivateAccount
    ? "private"
    : values.weighInShareVisibility;
  const gymEventShareVisibility = isPrivateAccount
    ? "private"
    : values.gymEventShareVisibility;
  const postShareVisibility = isPrivateAccount
    ? "private"
    : values.postShareVisibility;

  const needsConsentBeforeEnable =
    values.autoSupportEnabled &&
    !values.autoSupportConsentedAt;
  if (needsConsentBeforeEnable) {
    return fail("Consent is required before enabling auto support.", { code: "VALIDATION" });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        username,
        bio: values.bio.trim().slice(0, 160),
        preferred_unit: values.preferredUnit,
        timezone,
        account_visibility: values.accountVisibility,
        progress_visibility: values.progressVisibility,
        social_enabled: socialEnabled,
        weigh_in_share_visibility: weighInShareVisibility,
        gym_event_share_visibility: gymEventShareVisibility,
        post_share_visibility: postShareVisibility,
        apple_health_steps_enabled: values.appleHealthStepsEnabled,
        daily_step_goal: dailyStepGoal,
      },
      { onConflict: "id" },
    );

  if (error) {
    return fail(error);
  }

  const autoSupportResult = await supabase.rpc("set_auto_support_enabled", {
    enabled: values.autoSupportEnabled,
  });
  if (autoSupportResult.error) {
    return fail(autoSupportResult.error);
  }

  return ok({ ok: true, autoSupportConsentedAt: values.autoSupportConsentedAt ?? null });
}
