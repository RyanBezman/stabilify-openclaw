/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "@supabase/supabase-js";

type ClaimedDelivery = {
  id: string;
  request_id: string;
  user_id: string;
  expo_push_token: string;
  message_title: string;
  message_body: string;
  attempt_count: number;
};

type ExpoTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushResponse = {
  data?: ExpoTicket[];
  errors?: Array<Record<string, string>>;
};

type SupabaseAdminClient = ReturnType<typeof createClient>;

type EnvironmentReader = (key: string) => string | undefined;
type SupabaseAdminClientFactory = (
  supabaseUrl: string,
  serviceRoleKey: string,
) => SupabaseAdminClient;

type DispatchHandlerDependencies = {
  getEnv: EnvironmentReader;
  createSupabaseAdminClient: SupabaseAdminClientFactory;
  fetchImpl: typeof fetch;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-support-dispatch-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: object | string | number | boolean | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function completeDelivery(args: {
  supabaseAdmin: SupabaseAdminClient;
  deliveryId: string;
  status: "sent" | "failed";
  errorMessage?: string;
}) {
  const { error } = await args.supabaseAdmin.rpc("complete_support_nudge_push_delivery", {
    p_delivery_id: args.deliveryId,
    p_status: args.status,
    p_error_message: args.errorMessage ?? null,
  });

  if (error) {
    throw new Error(
      `Failed to update support_nudge_push_delivery ${args.deliveryId}: ${error.message}`,
    );
  }
}

async function deactivateInvalidToken(args: {
  supabaseAdmin: SupabaseAdminClient;
  userId: string;
  expoPushToken: string;
  errorMessage: string;
}) {
  const { error } = await args.supabaseAdmin
    .from("push_notification_devices")
    .update({
      is_active: false,
      last_error: args.errorMessage,
    })
    .eq("user_id", args.userId)
    .eq("expo_push_token", args.expoPushToken);

  if (error) {
    throw new Error(
      `Failed to deactivate token for user ${args.userId}: ${error.message}`,
    );
  }
}

async function dispatchToExpo(args: {
  delivery: ClaimedDelivery;
  fetchImpl: typeof fetch;
}): Promise<{ success: true } | { success: false; errorMessage: string; permanentTokenError: boolean }> {
  const body = {
    to: args.delivery.expo_push_token,
    title: args.delivery.message_title,
    body: args.delivery.message_body,
    sound: "default",
    data: {
      type: "support_nudge",
      requestId: args.delivery.request_id,
    },
  };

  try {
    const response = await args.fetchImpl("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await response.text();
      return {
        success: false,
        errorMessage: `Expo push HTTP ${response.status}: ${details.slice(0, 250)}`,
        permanentTokenError: false,
      };
    }

    const payload = (await response.json()) as ExpoPushResponse;
    const ticket = payload.data?.[0];

    if (ticket?.status === "ok") {
      return { success: true };
    }

    const errorCode = ticket?.details?.error?.trim() ?? "";
    const errorMessage = ticket?.message?.trim() || errorCode || "Expo push ticket returned error.";

    return {
      success: false,
      errorMessage,
      permanentTokenError: errorCode === "DeviceNotRegistered",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Expo dispatch failed.";
    return {
      success: false,
      errorMessage,
      permanentTokenError: false,
    };
  }
}

function getDefaultEnvironmentValue(key: string): string | undefined {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(key);
  }
  if (typeof process !== "undefined") {
    return process.env[key];
  }
  return undefined;
}

function createDefaultSupabaseAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createSupportNudgePushDispatchHandler(
  dependencies?: Partial<DispatchHandlerDependencies>,
) {
  const getEnv = dependencies?.getEnv ?? getDefaultEnvironmentValue;
  const createSupabaseAdminClient =
    dependencies?.createSupabaseAdminClient ?? createDefaultSupabaseAdminClient;
  const fetchImpl = dependencies?.fetchImpl ?? fetch;

  return async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const dispatchToken = getEnv("SUPPORT_PUSH_DISPATCH_TOKEN")?.trim() ?? "";
  if (!dispatchToken) {
    return json(500, {
      error: "Missing SUPPORT_PUSH_DISPATCH_TOKEN secret.",
      code: "DISPATCH_TOKEN_NOT_CONFIGURED",
    });
  }

  const providedToken = req.headers.get("x-support-dispatch-token")?.trim() ?? "";
  if (!providedToken || providedToken !== dispatchToken) {
    return json(401, { error: "Unauthorized dispatch token." });
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error: "Missing Supabase runtime env vars.",
      code: "SUPABASE_ENV_MISSING",
    });
  }

  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabaseAdmin.rpc("claim_support_nudge_push_deliveries", {
    limit_count: 100,
  });

  if (error) {
    return json(500, {
      error: "Failed to claim push deliveries.",
      details: error.message,
      code: "CLAIM_FAILED",
    });
  }

  const claimedDeliveries = (data ?? []) as ClaimedDelivery[];

  let sentCount = 0;
  let failedCount = 0;
  let deactivatedTokenCount = 0;
  const internalErrors: string[] = [];

  for (const delivery of claimedDeliveries) {
    const dispatchResult = await dispatchToExpo({ delivery, fetchImpl });

    if (dispatchResult.success) {
      try {
        await completeDelivery({
          supabaseAdmin,
          deliveryId: delivery.id,
          status: "sent",
        });
        sentCount += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to complete sent delivery.";
        internalErrors.push(errorMessage);
      }
      continue;
    }

    try {
      await completeDelivery({
        supabaseAdmin,
        deliveryId: delivery.id,
        status: "failed",
        errorMessage: dispatchResult.errorMessage,
      });
      failedCount += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to complete failed delivery.";
      internalErrors.push(errorMessage);
      continue;
    }

    if (dispatchResult.permanentTokenError) {
      try {
        await deactivateInvalidToken({
          supabaseAdmin,
          userId: delivery.user_id,
          expoPushToken: delivery.expo_push_token,
          errorMessage: dispatchResult.errorMessage,
        });
        deactivatedTokenCount += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to deactivate invalid push token.";
        internalErrors.push(errorMessage);
      }
    }
  }

  if (internalErrors.length > 0) {
    return json(500, {
      error: "Dispatch completed with internal errors.",
      claimed_count: claimedDeliveries.length,
      sent_count: sentCount,
      failed_count: failedCount,
      deactivated_token_count: deactivatedTokenCount,
      internal_errors: internalErrors.slice(0, 10),
    });
  }

  return json(200, {
    claimed_count: claimedDeliveries.length,
    sent_count: sentCount,
    failed_count: failedCount,
    deactivated_token_count: deactivatedTokenCount,
  });
  };
}

export const supportNudgePushDispatchHandler = createSupportNudgePushDispatchHandler();

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(supportNudgePushDispatchHandler);
}
