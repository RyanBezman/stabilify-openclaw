/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "@supabase/supabase-js";

type PurgeRequestBody = {
  limit?: number;
};

type DueProfileRow = {
  id: string;
};

type SupabaseAdminClient = ReturnType<typeof createClient>;
type EnvironmentReader = (key: string) => string | undefined;
type SupabaseAdminClientFactory = (
  supabaseUrl: string,
  serviceRoleKey: string,
) => SupabaseAdminClient;
type CurrentIsoTimeFactory = () => string;

type AccountDeletionHandlerDependencies = {
  getEnv: EnvironmentReader;
  createSupabaseAdminClient: SupabaseAdminClientFactory;
  getCurrentIsoTime: CurrentIsoTimeFactory;
};

const TOKEN_HEADER_NAME = "x-account-deletion-token";
const STORAGE_BUCKETS = ["profile-photos", "post-photos", "gym-proofs"] as const;
const DEFAULT_PURGE_LIMIT = 20;
const MAX_PURGE_LIMIT = 100;
const STORAGE_LIST_PAGE_SIZE = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": `authorization, x-client-info, apikey, content-type, ${TOKEN_HEADER_NAME}`,
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

function serverError(message: string) {
  return json(500, { error: message });
}

function unauthorized(message: string) {
  return json(401, { error: message });
}

function normalizeLimit(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PURGE_LIMIT;
  }

  return Math.max(1, Math.min(Math.floor(value), MAX_PURGE_LIMIT));
}

async function readJson(req: Request): Promise<PurgeRequestBody> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {};
    }

    const withLimit = body as { limit?: number };
    return {
      limit: typeof withLimit.limit === "number" ? withLimit.limit : undefined,
    };
  } catch {
    return {};
  }
}

async function listBucketObjectPaths(args: {
  supabaseAdmin: SupabaseAdminClient;
  bucket: (typeof STORAGE_BUCKETS)[number];
  userId: string;
}) {
  const objectPaths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await args.supabaseAdmin.storage
      .from(args.bucket)
      .list(args.userId, {
        limit: STORAGE_LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(`Couldn't list ${args.bucket} objects for ${args.userId}: ${error.message}`);
    }

    const names = (data ?? [])
      .map((entry) => entry.name?.trim() ?? "")
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      break;
    }

    objectPaths.push(...names.map((name) => `${args.userId}/${name}`));

    if (names.length < STORAGE_LIST_PAGE_SIZE) {
      break;
    }

    offset += names.length;
  }

  return objectPaths;
}

async function removeBucketObjects(args: {
  supabaseAdmin: SupabaseAdminClient;
  bucket: (typeof STORAGE_BUCKETS)[number];
  userId: string;
}) {
  const objectPaths = await listBucketObjectPaths(args);
  if (objectPaths.length === 0) {
    return 0;
  }

  let removedCount = 0;
  for (let index = 0; index < objectPaths.length; index += STORAGE_LIST_PAGE_SIZE) {
    const chunk = objectPaths.slice(index, index + STORAGE_LIST_PAGE_SIZE);
    const { error } = await args.supabaseAdmin.storage.from(args.bucket).remove(chunk);
    if (error) {
      throw new Error(`Couldn't remove ${args.bucket} objects for ${args.userId}: ${error.message}`);
    }
    removedCount += chunk.length;
  }

  return removedCount;
}

async function purgeUserStorage(args: {
  supabaseAdmin: SupabaseAdminClient;
  userId: string;
}) {
  let removedObjectCount = 0;
  for (const bucket of STORAGE_BUCKETS) {
    removedObjectCount += await removeBucketObjects({
      supabaseAdmin: args.supabaseAdmin,
      bucket,
      userId: args.userId,
    });
  }
  return removedObjectCount;
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
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getDefaultCurrentIsoTime() {
  return new Date().toISOString();
}

export function createAccountDeletionHandler(
  dependencies?: Partial<AccountDeletionHandlerDependencies>,
) {
  const getEnv = dependencies?.getEnv ?? getDefaultEnvironmentValue;
  const createSupabaseAdminClient =
    dependencies?.createSupabaseAdminClient ?? createDefaultSupabaseAdminClient;
  const getCurrentIsoTime = dependencies?.getCurrentIsoTime ?? getDefaultCurrentIsoTime;

  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const expectedToken = getEnv("ACCOUNT_DELETION_PURGE_TOKEN");
    if (!expectedToken) {
      return serverError("Missing ACCOUNT_DELETION_PURGE_TOKEN in function runtime.");
    }

    const providedToken = req.headers.get(TOKEN_HEADER_NAME)?.trim() ?? "";
    if (!providedToken || providedToken !== expectedToken) {
      return unauthorized("Missing or invalid purge token.");
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return serverError("Missing Supabase env vars in function runtime.");
    }

    const body = await readJson(req);
    const limit = normalizeLimit(body.limit);
    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("account_status", "pending_deletion")
      .is("deletion_legal_hold_at", null)
      .lte("scheduled_purge_at", getCurrentIsoTime())
      .order("scheduled_purge_at", { ascending: true })
      .limit(limit);

    if (error) {
      return serverError(`Couldn't load due account deletions: ${error.message}`);
    }

    const dueProfiles = (data ?? []) as DueProfileRow[];
    const failures: Array<{ userId: string; error: string }> = [];
    let purgedCount = 0;
    let removedObjectCount = 0;

    for (const profile of dueProfiles) {
      try {
        removedObjectCount += await purgeUserStorage({
          supabaseAdmin,
          userId: profile.id,
        });

        const deleteResult = await supabaseAdmin.auth.admin.deleteUser(profile.id, false);
        if (deleteResult.error) {
          throw new Error(deleteResult.error.message);
        }

        purgedCount += 1;
      } catch (purgeError) {
        const message =
          purgeError instanceof Error
            ? purgeError.message
            : "Unknown account deletion purge failure.";
        failures.push({ userId: profile.id, error: message });
      }
    }

    return json(200, {
      dueCount: dueProfiles.length,
      purgedCount,
      removedObjectCount,
      failureCount: failures.length,
      failures,
    });
  };
}

export const accountDeletionHandler = createAccountDeletionHandler();

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(accountDeletionHandler);
}
