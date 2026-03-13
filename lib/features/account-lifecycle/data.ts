import type { AccountLifecycleStatus } from "../../data/types";
import { supabase } from "../../supabase";
import { fail, ok, type Result } from "../shared";

export const ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS = 30;

type AccountLifecycleRow = {
  account_status: string | null;
  deletion_requested_at: string | null;
  scheduled_purge_at: string | null;
  deletion_legal_hold_at: string | null;
};

type AccountLifecycleRpcRow = {
  account_status: string | null;
  deletion_requested_at: string | null;
  scheduled_purge_at: string | null;
};

export type AccountLifecycleState = {
  status: AccountLifecycleStatus;
  deletionRequestedAt: string | null;
  scheduledPurgeAt: string | null;
  legalHoldAt: string | null;
};

type AccountDeletionMutationResult = {
  status: AccountLifecycleStatus;
  deletionRequestedAt: string | null;
  scheduledPurgeAt: string | null;
};

function normalizeAccountLifecycleStatus(
  value: string | null | undefined,
): AccountLifecycleStatus {
  return value === "pending_deletion" ? "pending_deletion" : "active";
}

async function resolveCurrentUserId(userId?: string): Promise<Result<{ userId: string }>> {
  const trimmedUserId = userId?.trim();
  if (trimmedUserId) {
    return ok({ userId: trimmedUserId });
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return fail(error);
  }

  const currentUserId = data.user?.id;
  if (!currentUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  return ok({ userId: currentUserId });
}

function mapLifecycleState(row: AccountLifecycleRow | null | undefined): AccountLifecycleState {
  return {
    status: normalizeAccountLifecycleStatus(row?.account_status),
    deletionRequestedAt: row?.deletion_requested_at ?? null,
    scheduledPurgeAt: row?.scheduled_purge_at ?? null,
    legalHoldAt: row?.deletion_legal_hold_at ?? null,
  };
}

function mapLifecycleMutationRow(
  row: AccountLifecycleRpcRow | null | undefined,
): AccountDeletionMutationResult | null {
  if (!row) {
    return null;
  }

  return {
    status: normalizeAccountLifecycleStatus(row.account_status),
    deletionRequestedAt: row.deletion_requested_at ?? null,
    scheduledPurgeAt: row.scheduled_purge_at ?? null,
  };
}

export async function fetchCurrentAccountLifecycleState(
  userId?: string,
): Promise<Result<AccountLifecycleState>> {
  const userResult = await resolveCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("account_status, deletion_requested_at, scheduled_purge_at, deletion_legal_hold_at")
    .eq("id", userResult.data.userId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  return ok(mapLifecycleState((data as AccountLifecycleRow | null) ?? null));
}

export async function requestCurrentUserAccountDeletion(): Promise<Result<AccountDeletionMutationResult>> {
  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    return fail(error);
  }

  const mapped = mapLifecycleMutationRow((Array.isArray(data) ? data[0] : null) as AccountLifecycleRpcRow | null);
  if (!mapped) {
    return fail("Couldn't schedule account deletion.");
  }

  return ok(mapped);
}

export async function restorePendingAccountDeletion(): Promise<Result<AccountDeletionMutationResult>> {
  const { data, error } = await supabase.rpc("restore_pending_account_deletion");
  if (error) {
    return fail(error);
  }

  const mapped = mapLifecycleMutationRow((Array.isArray(data) ? data[0] : null) as AccountLifecycleRpcRow | null);
  if (!mapped) {
    return fail("Couldn't restore your account.");
  }

  return ok(mapped);
}
