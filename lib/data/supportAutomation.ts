import { supabase } from "../supabase";
import type {
  SupportNudgeSurface,
  SupportRequestStatus,
  SupportTriggerReason,
} from "./types";
import { fail, ok, type Result } from "../features/shared";

type SupportRequestRpcRow = {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  trigger_reason: SupportTriggerReason;
  status: SupportRequestStatus;
  outcome_post_id: string | null;
  nudge_opened_at: string | null;
  nudge_opened_surface: SupportNudgeSurface | null;
  created_at: string;
  updated_at: string;
};

type MarkNudgeOpenedRpcRow = {
  request_id: string;
  nudge_opened_at: string;
  nudge_opened_surface: SupportNudgeSurface;
  was_first_open: boolean;
};

type SetAutoSupportEnabledRpcRow = {
  auto_support_enabled: boolean;
  changed: boolean;
};

type GrantConsentRpcRow = {
  auto_support_consent_at: string;
};

type AllowAutoSupportWithConsentRpcRow = {
  auto_support_enabled: boolean;
  auto_support_consent_at: string;
  changed_enabled: boolean;
  changed_consent: boolean;
};

type DeferSupportNudgeRpcRow = {
  request_id: string;
  nudge_deferred_until_local_date: string;
};

type RegisterPushDeviceRpcRow = {
  id: string;
  expo_push_token: string;
  is_active: boolean;
  last_registered_at: string;
};

type SetPhoneNudgesEnabledRpcRow = {
  enabled: boolean;
  changed: boolean;
  active_device_count: number;
};

export type CurrentWeekSupportRequest = {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  triggerReason: SupportTriggerReason;
  status: SupportRequestStatus;
  outcomePostId: string | null;
  nudgeOpenedAt: string | null;
  nudgeOpenedSurface: SupportNudgeSurface | null;
  createdAt: string;
  updatedAt: string;
};

export type MarkSupportNudgeOpenedResult = {
  requestId: string;
  nudgeOpenedAt: string;
  nudgeOpenedSurface: SupportNudgeSurface;
  wasFirstOpen: boolean;
};

export type RegisterPushNotificationDeviceInput = {
  expoPushToken: string;
  platform: string;
  appVersion: string | null;
};

function mapSupportRequestRow(row: SupportRequestRpcRow): CurrentWeekSupportRequest {
  return {
    id: row.id,
    userId: row.user_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    triggerReason: row.trigger_reason,
    status: row.status,
    outcomePostId: row.outcome_post_id,
    nudgeOpenedAt: row.nudge_opened_at,
    nudgeOpenedSurface: row.nudge_opened_surface,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentUserId(userId?: string): Promise<Result<{ userId: string }>> {
  if (userId) {
    return ok({ userId });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return fail(error);
  }
  const resolvedUserId = data.user?.id;
  if (!resolvedUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  return ok({ userId: resolvedUserId });
}

export async function fetchCurrentWeekSupportRequest(): Promise<Result<CurrentWeekSupportRequest | null>> {
  const { data, error } = await supabase.rpc("fetch_current_week_support_request");

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as SupportRequestRpcRow | null;
  if (!row) {
    return ok(null);
  }

  return ok(mapSupportRequestRow(row));
}

export async function markSupportNudgeOpened(input: {
  requestId: string;
  surface?: SupportNudgeSurface;
}): Promise<Result<MarkSupportNudgeOpenedResult>> {
  const requestId = input.requestId.trim();
  if (!requestId) {
    return fail("Support request ID is required.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase.rpc("mark_support_nudge_opened", {
    p_request_id: requestId,
    p_surface: input.surface ?? "home",
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as MarkNudgeOpenedRpcRow | null;
  if (!row?.request_id || !row.nudge_opened_at || !row.nudge_opened_surface) {
    return fail("Couldn't mark nudge as opened.");
  }

  return ok({
    requestId: row.request_id,
    nudgeOpenedAt: row.nudge_opened_at,
    nudgeOpenedSurface: row.nudge_opened_surface,
    wasFirstOpen: row.was_first_open,
  });
}

export async function setAutoSupportEnabled(
  enabled: boolean,
): Promise<Result<{ autoSupportEnabled: boolean; changed: boolean }>> {
  const { data, error } = await supabase.rpc("set_auto_support_enabled", {
    enabled,
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as SetAutoSupportEnabledRpcRow | null;
  if (!row) {
    return fail("Couldn't update support automation setting.");
  }

  return ok({
    autoSupportEnabled: row.auto_support_enabled,
    changed: row.changed,
  });
}

async function grantAutoSupportConsent(): Promise<Result<{ consentedAt: string }>> {
  const { data, error } = await supabase.rpc("grant_auto_support_consent");

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as GrantConsentRpcRow | null;
  if (!row?.auto_support_consent_at) {
    return fail("Couldn't save support automation consent.");
  }

  return ok({ consentedAt: row.auto_support_consent_at });
}

export async function allowAutoSupportWithConsent(): Promise<
  Result<{
    autoSupportEnabled: boolean;
    autoSupportConsentedAt: string;
    changedEnabled: boolean;
    changedConsent: boolean;
  }>
> {
  const { data, error } = await supabase.rpc("allow_auto_support_with_consent");

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as AllowAutoSupportWithConsentRpcRow | null;
  if (!row || row.auto_support_enabled !== true || !row.auto_support_consent_at) {
    return fail("Couldn't update support automation consent.");
  }

  return ok({
    autoSupportEnabled: row.auto_support_enabled,
    autoSupportConsentedAt: row.auto_support_consent_at,
    changedEnabled: row.changed_enabled,
    changedConsent: row.changed_consent,
  });
}

export async function deferSupportNudge(input: {
  requestId: string;
  surface?: SupportNudgeSurface;
}): Promise<Result<{ requestId: string; deferredUntilLocalDate: string }>> {
  const requestId = input.requestId.trim();
  if (!requestId) {
    return fail("Support request ID is required.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase.rpc("defer_support_nudge", {
    p_request_id: requestId,
    p_surface: input.surface ?? "home",
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as DeferSupportNudgeRpcRow | null;
  if (!row?.request_id || !row.nudge_deferred_until_local_date) {
    return fail("Couldn't defer support nudge.");
  }

  return ok({
    requestId: row.request_id,
    deferredUntilLocalDate: row.nudge_deferred_until_local_date,
  });
}

export async function registerPushNotificationDevice(
  input: RegisterPushNotificationDeviceInput,
): Promise<Result<{ id: string; isActive: boolean; lastRegisteredAt: string }>> {
  const expoPushToken = input.expoPushToken.trim();
  if (!expoPushToken) {
    return fail("Push token is required.", { code: "VALIDATION" });
  }

  const platform = input.platform.trim() || "unknown";

  const { data, error } = await supabase.rpc("register_push_notification_device", {
    p_expo_push_token: expoPushToken,
    p_platform: platform,
    p_app_version: input.appVersion,
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as RegisterPushDeviceRpcRow | null;
  if (!row?.id) {
    return fail("Couldn't register push notification device.");
  }

  return ok({
    id: row.id,
    isActive: row.is_active,
    lastRegisteredAt: row.last_registered_at,
  });
}

export async function fetchHasActivePushNotificationDevice(
  userId?: string,
): Promise<Result<{ hasActiveDevice: boolean }>> {
  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const { count, error } = await supabase
    .from("push_notification_devices")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userResult.data.userId)
    .eq("is_active", true);

  if (error) {
    return fail(error);
  }

  return ok({ hasActiveDevice: (count ?? 0) > 0 });
}

export async function setPhoneNudgesEnabled(
  enabled: boolean,
): Promise<Result<{ enabled: boolean; changed: boolean; activeDeviceCount: number }>> {
  let { data, error } = await supabase.rpc("set_phone_nudges_enabled", {
    p_enabled: enabled,
  });

  const isParamCacheMiss =
    typeof error?.message === "string" &&
    error.message.includes("Could not find the function public.set_phone_nudges_enabled(p_enabled)");

  if (isParamCacheMiss) {
    const fallbackResult = await supabase.rpc("set_phone_nudges_enabled", {
      enabled,
    });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as SetPhoneNudgesEnabledRpcRow | null;
  if (!row || typeof row.active_device_count !== "number") {
    return fail("Couldn't update phone nudges setting.");
  }

  return ok({
    enabled: row.enabled,
    changed: row.changed,
    activeDeviceCount: row.active_device_count,
  });
}
