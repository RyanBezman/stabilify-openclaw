import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupportNudgePushDispatchHandler } from "./index";

type RpcCall = {
  fn: string;
  args: Record<string, string | number | null> | undefined;
};

function buildRequest(token: string) {
  return new Request("https://example.com/functions/v1/support-nudge-push-dispatch", {
    method: "POST",
    headers: {
      "x-support-dispatch-token": token,
    },
  });
}

function createUpdateBuilder(result: { error: { message: string } | null }) {
  const promise = Promise.resolve(result);
  const builder = {
    eq: vi.fn<(column: string, value: string) => typeof builder>().mockImplementation(() => builder),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
}

describe("support-nudge push dispatch handler", () => {
  it("returns 401 when dispatch token header is invalid", async () => {
    const handler = createSupportNudgePushDispatchHandler({
      getEnv: (key) => {
        if (key === "SUPPORT_PUSH_DISPATCH_TOKEN") {
          return "expected-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi.fn<() => ReturnType<typeof createClient>>(),
      fetchImpl: vi.fn<typeof fetch>(),
    });

    const response = await handler(buildRequest("wrong-token"));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized dispatch token.");
  });

  it("claims deliveries, sends to Expo, and marks sent", async () => {
    const rpcCalls: RpcCall[] = [];
    const supabaseAdmin = {
      rpc: vi
        .fn<(fn: string, args?: Record<string, string | number | null>) => Promise<{ data: object[] | null; error: { message: string } | null }>>()
        .mockImplementation(async (fn, args) => {
          rpcCalls.push({ fn, args });
          if (fn === "claim_support_nudge_push_deliveries") {
            return {
              data: [
                {
                  id: "delivery-1",
                  request_id: "request-1",
                  user_id: "user-1",
                  expo_push_token: "ExponentPushToken[token-1]",
                  message_title: "Title",
                  message_body: "Body",
                  attempt_count: 1,
                },
              ],
              error: null,
            };
          }
          if (fn === "complete_support_nudge_push_delivery") {
            return { data: [], error: null };
          }
          return { data: [], error: null };
        }),
      from: vi.fn(),
    } as ReturnType<typeof createClient>;

    const handler = createSupportNudgePushDispatchHandler({
      getEnv: (key) => {
        if (key === "SUPPORT_PUSH_DISPATCH_TOKEN") {
          return "dispatch-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi
        .fn<(supabaseUrl: string, serviceRoleKey: string) => ReturnType<typeof createClient>>()
        .mockReturnValue(supabaseAdmin),
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ status: "ok", id: "ticket-1" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    });

    const response = await handler(buildRequest("dispatch-token"));
    const payload = (await response.json()) as {
      claimed_count: number;
      sent_count: number;
      failed_count: number;
      deactivated_token_count: number;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      claimed_count: 1,
      sent_count: 1,
      failed_count: 0,
      deactivated_token_count: 0,
    });
    expect(rpcCalls).toContainEqual({
      fn: "complete_support_nudge_push_delivery",
      args: {
        p_delivery_id: "delivery-1",
        p_status: "sent",
        p_error_message: null,
      },
    });
  });

  it("deactivates token when Expo reports DeviceNotRegistered", async () => {
    const rpcCalls: RpcCall[] = [];
    const updateBuilder = createUpdateBuilder({ error: null });
    const supabaseAdmin = {
      rpc: vi
        .fn<(fn: string, args?: Record<string, string | number | null>) => Promise<{ data: object[] | null; error: { message: string } | null }>>()
        .mockImplementation(async (fn, args) => {
          rpcCalls.push({ fn, args });
          if (fn === "claim_support_nudge_push_deliveries") {
            return {
              data: [
                {
                  id: "delivery-2",
                  request_id: "request-2",
                  user_id: "user-2",
                  expo_push_token: "ExponentPushToken[token-2]",
                  message_title: "Title",
                  message_body: "Body",
                  attempt_count: 1,
                },
              ],
              error: null,
            };
          }
          if (fn === "complete_support_nudge_push_delivery") {
            return { data: [], error: null };
          }
          return { data: [], error: null };
        }),
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(updateBuilder),
      }),
    } as ReturnType<typeof createClient>;

    const handler = createSupportNudgePushDispatchHandler({
      getEnv: (key) => {
        if (key === "SUPPORT_PUSH_DISPATCH_TOKEN") {
          return "dispatch-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi
        .fn<(supabaseUrl: string, serviceRoleKey: string) => ReturnType<typeof createClient>>()
        .mockReturnValue(supabaseAdmin),
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                status: "error",
                message: "Device not registered",
                details: { error: "DeviceNotRegistered" },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    });

    const response = await handler(buildRequest("dispatch-token"));
    const payload = (await response.json()) as {
      claimed_count: number;
      sent_count: number;
      failed_count: number;
      deactivated_token_count: number;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      claimed_count: 1,
      sent_count: 0,
      failed_count: 1,
      deactivated_token_count: 1,
    });
    expect(rpcCalls).toContainEqual({
      fn: "complete_support_nudge_push_delivery",
      args: {
        p_delivery_id: "delivery-2",
        p_status: "failed",
        p_error_message: "Device not registered",
      },
    });
    expect(updateBuilder.eq).toHaveBeenCalledWith("user_id", "user-2");
    expect(updateBuilder.eq).toHaveBeenCalledWith("expo_push_token", "ExponentPushToken[token-2]");
  });

  it("returns CLAIM_FAILED when delivery claim RPC fails", async () => {
    const supabaseAdmin = {
      rpc: vi
        .fn<(fn: string, args?: Record<string, string | number | null>) => Promise<{ data: object[] | null; error: { message: string } | null }>>()
        .mockResolvedValue({
          data: null,
          error: { message: "claim failed hard" },
        }),
      from: vi.fn(),
    } as ReturnType<typeof createClient>;

    const handler = createSupportNudgePushDispatchHandler({
      getEnv: (key) => {
        if (key === "SUPPORT_PUSH_DISPATCH_TOKEN") {
          return "dispatch-token";
        }
        if (key === "SUPABASE_URL") {
          return "https://example.supabase.co";
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY") {
          return "service-role-key";
        }
        return undefined;
      },
      createSupabaseAdminClient: vi
        .fn<(supabaseUrl: string, serviceRoleKey: string) => ReturnType<typeof createClient>>()
        .mockReturnValue(supabaseAdmin),
      fetchImpl: vi.fn<typeof fetch>(),
    });

    const response = await handler(buildRequest("dispatch-token"));
    const payload = (await response.json()) as { code: string; details: string };

    expect(response.status).toBe(500);
    expect(payload.code).toBe("CLAIM_FAILED");
    expect(payload.details).toBe("claim failed hard");
  });
});
