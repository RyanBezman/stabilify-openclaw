import { supabase } from "../../../supabase";
import type {
  ChatMessage,
  CoachIntake,
  CoachPlan,
  NutritionGoal,
} from "../types/workspaceTypes";
import type { WeeklyWeightSnapshot } from "../types/checkinsTypes";

export type CoachChatMessageRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: { cta?: "review_draft_plan" } | null;
  created_at: string;
};

export type CoachWorkspaceResponse = {
  thread_id?: string;
  messages?: CoachChatMessageRow[];
  active_plan?: CoachPlan | null;
  draft_plan?: CoachPlan | null;
  intake?: CoachIntake | null;
  default_nutrition_goal?: NutritionGoal;
  assistant_text?: string;
  dashboard_snapshot?: Record<string, unknown>;
  checkin_week_start?: string;
  checkin_week_end?: string;
  checkin_weight_snapshot?: WeeklyWeightSnapshot;
  checkin_current?: CoachWeeklyCheckinRow | null;
  checkin_history?: CoachWeeklyCheckinRow[];
  checkin_artifact?: Record<string, unknown> | null;
  adjustment_recommendations?: Record<string, unknown> | null;
  plan_updated_for_review?: boolean;
  plan_update_error?: string | null;
  coach_message?: Record<string, unknown> | null;
  guardrail_notes?: string[];
};

export type CoachWeeklyCheckinRow = {
  id: string;
  week_start: string;
  week_end: string;
  energy: number;
  adherence_percent: number;
  blockers: string;
  weight_snapshot: WeeklyWeightSnapshot;
  checkin_json?: Record<string, unknown> | null;
  adherence_score?: number | null;
  workout_plan_version?: number | null;
  nutrition_plan_version?: number | null;
  adjustment_json?: Record<string, unknown> | null;
  coach_summary?: string | null;
  summary_model?: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachChatError = Error & {
  status?: number;
  code?: string;
  details?: string;
};

function parseErrorCode(details: string): string | undefined {
  if (!details) return undefined;
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed?.code === "string" && parsed.code.trim().length > 0) {
      return parsed.code;
    }
  } catch {
    // Ignore JSON parse failures.
  }
  return undefined;
}

async function getAccessToken() {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw new Error(sessionErr.message ?? "Couldn't load session.");

  let session = sessionData?.session ?? null;
  if (!session?.access_token) {
    throw new Error("You're not signed in. Please sign out and sign back in.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt - now < 60) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) throw new Error(refreshErr.message ?? "Session refresh failed.");
    session = refreshed.session ?? session;
  }

  return session.access_token;
}

async function toCoachChatError(error: unknown): Promise<CoachChatError> {
  const invokeError = error as { message?: string; context?: unknown } | null;
  const ctx = invokeError?.context as
    | {
        status?: number;
        text?: () => Promise<string>;
      }
    | undefined;

  const status = typeof ctx?.status === "number" ? ctx.status : 0;
  let details = "";
  if (ctx && typeof ctx.text === "function") {
    try {
      details = (await ctx.text()) || "";
    } catch {
      // Ignore response body parse issues.
    }
  }

  const code = parseErrorCode(details);
  const message = `${invokeError?.message ?? "Request failed."}${status ? ` (HTTP ${status})` : ""}${details ? `\n${details}` : ""}`;
  const err = new Error(message) as CoachChatError;
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

export function isTierRestrictedCoachError(error: unknown) {
  const err = error as { status?: number; code?: string; details?: string } | null;
  if (err?.code === "TIER_REQUIRES_PRO") return true;
  if (err?.status !== 403) return false;
  if (!err?.details) return true;
  if (err.details.includes("TIER_REQUIRES_PRO")) return true;
  const parsedCode = parseErrorCode(err.details);
  return parsedCode === "TIER_REQUIRES_PRO" || parsedCode === undefined;
}

export async function invokeCoachChat(body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    throw await toCoachChatError(error);
  }

  return data as CoachWorkspaceResponse;
}

export function mapCoachMessages(rows: CoachWorkspaceResponse["messages"]): ChatMessage[] {
  return (rows ?? [])
    .filter(
      (
        message
      ): message is {
        id: string;
        role: "user" | "assistant";
        content: string;
        metadata?: { cta?: "review_draft_plan" } | null;
        created_at: string;
      } => Boolean(message) && (message.role === "user" || message.role === "assistant")
    )
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      cta:
        message.metadata?.cta === "review_draft_plan"
          ? "review_draft_plan"
          : undefined,
      createdAt: message.created_at,
    }));
}
