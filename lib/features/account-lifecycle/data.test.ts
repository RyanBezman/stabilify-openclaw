import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../../supabase", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

import {
  fetchCurrentAccountLifecycleState,
  requestCurrentUserAccountDeletion,
  restorePendingAccountDeletion,
} from "./data";

describe("account lifecycle data", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.getUser.mockReset();
    mocks.rpc.mockReset();
  });

  it("maps the current account lifecycle state for a pending deletion account", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        account_status: "pending_deletion",
        deletion_requested_at: "2026-03-13T12:00:00.000Z",
        scheduled_purge_at: "2026-04-12T12:00:00.000Z",
        deletion_legal_hold_at: null,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const result = await fetchCurrentAccountLifecycleState("user-1");

    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith(
      "account_status, deletion_requested_at, scheduled_purge_at, deletion_legal_hold_at",
    );
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual({
      data: {
        status: "pending_deletion",
        deletionRequestedAt: "2026-03-13T12:00:00.000Z",
        scheduledPurgeAt: "2026-04-12T12:00:00.000Z",
        legalHoldAt: null,
      },
    });
  });

  it("treats a missing profile row as an active account", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-2" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    const result = await fetchCurrentAccountLifecycleState();

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: {
        status: "active",
        deletionRequestedAt: null,
        scheduledPurgeAt: null,
        legalHoldAt: null,
      },
    });
  });

  it("maps request_account_deletion RPC payload", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          account_status: "pending_deletion",
          deletion_requested_at: "2026-03-13T12:00:00.000Z",
          scheduled_purge_at: "2026-04-12T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await requestCurrentUserAccountDeletion();

    expect(mocks.rpc).toHaveBeenCalledWith("request_account_deletion");
    expect(result).toEqual({
      data: {
        status: "pending_deletion",
        deletionRequestedAt: "2026-03-13T12:00:00.000Z",
        scheduledPurgeAt: "2026-04-12T12:00:00.000Z",
      },
    });
  });

  it("returns an error when restore_pending_account_deletion returns malformed data", async () => {
    mocks.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await restorePendingAccountDeletion();

    expect(mocks.rpc).toHaveBeenCalledWith("restore_pending_account_deletion");
    expect(result).toEqual({
      error: "Couldn't restore your account.",
    });
  });
});
