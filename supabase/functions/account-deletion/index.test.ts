import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createAccountDeletionHandler } from "./index";

type DueProfileRow = {
  id: string;
};

type QueryError = {
  message: string;
};

type StorageEntry = {
  name: string | null;
};

type ListOptions = {
  limit: number;
  offset: number;
  sortBy: {
    column: string;
    order: string;
  };
};

type StorageCall =
  | {
      type: "list";
      bucket: string;
      userId: string;
      options: ListOptions;
    }
  | {
      type: "remove";
      bucket: string;
      paths: string[];
    };

type MockAdminClientArgs = {
  dueProfiles: DueProfileRow[];
  listPages?: Partial<Record<string, Partial<Record<string, StorageEntry[][]>>>>;
  deleteUserErrors?: Partial<Record<string, string>>;
};

function buildRequest(token: string, body?: { limit?: number }) {
  return new Request("https://example.com/functions/v1/account-deletion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-account-deletion-token": token,
    },
    body: JSON.stringify(body ?? {}),
  });
}

function createMockAdminClient(args: MockAdminClientArgs) {
  const storageCalls: StorageCall[] = [];
  const bucketApis = new Map<
    string,
    {
      list: ReturnType<typeof vi.fn<(userId: string, options: ListOptions) => Promise<{ data: StorageEntry[] | null; error: QueryError | null }>>>;
      remove: ReturnType<typeof vi.fn<(paths: string[]) => Promise<{ error: QueryError | null }>>>;
    }
  >();

  const limit = vi.fn<(value: number) => Promise<{ data: DueProfileRow[] | null; error: QueryError | null }>>(
    async () => ({
      data: args.dueProfiles,
      error: null,
    }),
  );
  const order = vi.fn<(column: string, value: { ascending: boolean }) => { limit: typeof limit }>(
    () => ({ limit }),
  );
  const lte = vi.fn<(column: string, value: string) => { order: typeof order }>(() => ({
    order,
  }));
  const is = vi.fn<(column: string, value: null) => { lte: typeof lte }>(() => ({ lte }));
  const eq = vi.fn<(column: string, value: string) => { is: typeof is }>(() => ({ is }));
  const select = vi.fn<(columns: string) => { eq: typeof eq }>(() => ({ eq }));

  const authDeleteUser = vi.fn<
    (userId: string, shouldSoftDelete: boolean) => Promise<{ error: QueryError | null }>
  >(async (userId) => ({
    error: args.deleteUserErrors?.[userId]
      ? { message: args.deleteUserErrors[userId] ?? "delete failed" }
      : null,
  }));

  const client = {
    from: vi.fn<(table: string) => { select: typeof select }>((table) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return { select };
    }),
    storage: {
      from: vi.fn((bucket: string) => {
        const existing = bucketApis.get(bucket);
        if (existing) {
          return existing;
        }

        const list = vi.fn<
          (userId: string, options: ListOptions) => Promise<{ data: StorageEntry[] | null; error: QueryError | null }>
        >(async (userId, options) => {
          storageCalls.push({ type: "list", bucket, userId, options });
          const pagesForBucket = args.listPages?.[bucket];
          const pagesForUser = pagesForBucket?.[userId] ?? [];
          const pageIndex = Math.floor(options.offset / options.limit);
          return {
            data: pagesForUser[pageIndex] ?? [],
            error: null,
          };
        });

        const remove = vi.fn<(paths: string[]) => Promise<{ error: QueryError | null }>>(
          async (paths) => {
            storageCalls.push({ type: "remove", bucket, paths });
            return { error: null };
          },
        );

        const bucketApi = { list, remove };
        bucketApis.set(bucket, bucketApi);
        return bucketApi;
      }),
    },
    auth: {
      admin: {
        deleteUser: authDeleteUser,
      },
    },
  } as ReturnType<typeof createClient>;

  return {
    client,
    query: {
      select,
      eq,
      is,
      lte,
      order,
      limit,
    },
    storageCalls,
    authDeleteUser,
  };
}

describe("account deletion handler", () => {
  it("returns 401 when the purge token is invalid", async () => {
    const handler = createAccountDeletionHandler({
      getEnv: (key) => {
        if (key === "ACCOUNT_DELETION_PURGE_TOKEN") {
          return "expected-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi.fn(),
      getCurrentIsoTime: () => "2026-04-12T00:00:00.000Z",
    });

    const response = await handler(buildRequest("wrong-token"));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Missing or invalid purge token.");
  });

  it("clamps the purge limit, removes due-user storage, and hard deletes the auth user", async () => {
    const mockAdmin = createMockAdminClient({
      dueProfiles: [{ id: "user-1" }],
      listPages: {
        "profile-photos": {
          "user-1": [[{ name: "avatar.jpg" }]],
        },
        "post-photos": {
          "user-1": [[{ name: "day-1.jpg" }, { name: "day-2.jpg" }]],
        },
      },
    });

    const handler = createAccountDeletionHandler({
      getEnv: (key) => {
        if (key === "ACCOUNT_DELETION_PURGE_TOKEN") {
          return "purge-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi.fn().mockReturnValue(mockAdmin.client),
      getCurrentIsoTime: () => "2026-04-12T00:00:00.000Z",
    });

    const response = await handler(buildRequest("purge-token", { limit: 999 }));
    const payload = (await response.json()) as {
      dueCount: number;
      purgedCount: number;
      removedObjectCount: number;
      failureCount: number;
      failures: Array<{ userId: string; error: string }>;
    };

    expect(response.status).toBe(200);
    expect(mockAdmin.query.limit).toHaveBeenCalledWith(100);
    expect(mockAdmin.query.lte).toHaveBeenCalledWith(
      "scheduled_purge_at",
      "2026-04-12T00:00:00.000Z",
    );
    expect(mockAdmin.authDeleteUser).toHaveBeenCalledWith("user-1", false);
    expect(mockAdmin.storageCalls).toContainEqual({
      type: "remove",
      bucket: "profile-photos",
      paths: ["user-1/avatar.jpg"],
    });
    expect(mockAdmin.storageCalls).toContainEqual({
      type: "remove",
      bucket: "post-photos",
      paths: ["user-1/day-1.jpg", "user-1/day-2.jpg"],
    });
    expect(payload).toEqual({
      dueCount: 1,
      purgedCount: 1,
      removedObjectCount: 3,
      failureCount: 0,
      failures: [],
    });
  });

  it("continues purging later accounts when one deletion fails", async () => {
    const mockAdmin = createMockAdminClient({
      dueProfiles: [{ id: "user-1" }, { id: "user-2" }],
      deleteUserErrors: {
        "user-1": "delete failed",
      },
    });

    const handler = createAccountDeletionHandler({
      getEnv: (key) => {
        if (key === "ACCOUNT_DELETION_PURGE_TOKEN") {
          return "purge-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi.fn().mockReturnValue(mockAdmin.client),
      getCurrentIsoTime: () => "2026-04-12T00:00:00.000Z",
    });

    const response = await handler(buildRequest("purge-token"));
    const payload = (await response.json()) as {
      dueCount: number;
      purgedCount: number;
      removedObjectCount: number;
      failureCount: number;
      failures: Array<{ userId: string; error: string }>;
    };

    expect(response.status).toBe(200);
    expect(mockAdmin.authDeleteUser).toHaveBeenCalledTimes(2);
    expect(payload).toEqual({
      dueCount: 2,
      purgedCount: 1,
      removedObjectCount: 0,
      failureCount: 1,
      failures: [{ userId: "user-1", error: "delete failed" }],
    });
  });
});
