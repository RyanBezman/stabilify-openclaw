import { Platform } from "react-native";
import type { MembershipTier } from "../../../data/types";
import { supabase } from "../../../supabase";
import type { ActiveCoach, CoachGender, CoachPersonality, CoachSpecialization } from "../types";

export const COACH_FUNNEL_EVENT_NAMES = [
  "checkin_opened",
  "checkin_submitted",
  "plan_review_opened",
  "plan_decision_made",
  "next_checkin_submitted",
] as const;

export type CoachFunnelEventName = (typeof COACH_FUNNEL_EVENT_NAMES)[number];

export const COACH_PLAN_DECISIONS = ["accept", "not_now", "ask_coach"] as const;
export type CoachPlanDecision = (typeof COACH_PLAN_DECISIONS)[number];

type CoachIdentity = Pick<ActiveCoach, "specialization" | "gender" | "personality">;

type FunnelMetadata = Record<string, unknown>;

type ResolvedUserContext = {
  userId: string;
  userTier: MembershipTier;
  usedTierFallback: boolean;
};

type TrackCoachFunnelEventInput = {
  eventName: CoachFunnelEventName;
  coach: CoachIdentity;
  userTier?: MembershipTier | null;
  decision?: CoachPlanDecision | null;
  weekStart?: string | null;
  occurredAt?: string;
  idempotencyKey?: string | null;
  metadata?: FunnelMetadata;
};

type TrackCheckinSubmissionEventsInput = {
  coach: CoachIdentity;
  userTier?: MembershipTier | null;
  weekStart?: string | null;
  checkinId?: string | null;
  saveMode: "create" | "update";
  planUpdatedForReview: boolean;
};

type AcceptedPlanFeedbackRow = {
  id: string;
  week_start: string;
  created_at: string;
};

const TIER_CACHE_TTL_MS = 5 * 60 * 1000;
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? null;
const SESSION_ID = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let cachedTier: {
  userId: string;
  tier: MembershipTier;
  cachedAt: number;
} | null = null;

function warnTrackingIssue(message: string, error?: unknown) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.warn(`[funnel-tracking] ${message}`, error);
}

function coachPersonaFromIdentity(coach: CoachIdentity) {
  return `${coach.gender}:${coach.personality}`;
}

function normalizeWeekStart(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeOccurredAt(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string } | null | undefined)?.code === "23505";
}

function defaultUserTierForTracking() {
  return "free" as MembershipTier;
}

async function resolveUserTierFromProfile(
  userId: string
): Promise<{ tier: MembershipTier; usedFallback: boolean }> {
  const now = Date.now();
  if (cachedTier?.userId === userId && now - cachedTier.cachedAt <= TIER_CACHE_TTL_MS) {
    return { tier: cachedTier.tier, usedFallback: false };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    warnTrackingIssue("Couldn't resolve membership_tier from profiles.", error);
    return { tier: defaultUserTierForTracking(), usedFallback: true };
  }

  const tier: MembershipTier = data?.membership_tier === "pro" ? "pro" : "free";
  cachedTier = {
    userId,
    tier,
    cachedAt: now,
  };
  return { tier, usedFallback: false };
}

async function resolveCurrentUserContext(
  providedTier?: MembershipTier | null
): Promise<ResolvedUserContext | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    warnTrackingIssue("No authenticated user available for tracking.", userError);
    return null;
  }

  const userId = userData.user.id;
  if (providedTier === "free" || providedTier === "pro") {
    cachedTier = {
      userId,
      tier: providedTier,
      cachedAt: Date.now(),
    };
    return {
      userId,
      userTier: providedTier,
      usedTierFallback: false,
    };
  }

  const tierResult = await resolveUserTierFromProfile(userId);
  return {
    userId,
    userTier: tierResult.tier,
    usedTierFallback: tierResult.usedFallback,
  };
}

function buildDefaultWeeklyIdempotencyKey(args: {
  eventName: CoachFunnelEventName;
  coach: CoachIdentity;
  weekStart: string | null;
}) {
  if (!args.weekStart) return null;
  return `${args.eventName}:${args.coach.specialization}:${coachPersonaFromIdentity(args.coach)}:${args.weekStart}`;
}

export function buildCoachFunnelWeeklyIdempotencyKey(args: {
  eventName: CoachFunnelEventName;
  coach: CoachIdentity;
  weekStart?: string | null;
}) {
  return buildDefaultWeeklyIdempotencyKey({
    eventName: args.eventName,
    coach: args.coach,
    weekStart: normalizeWeekStart(args.weekStart),
  });
}

async function insertCoachFunnelEvent(
  input: TrackCoachFunnelEventInput,
  context: ResolvedUserContext
) {
  const normalizedWeekStart = normalizeWeekStart(input.weekStart);
  const metadata: FunnelMetadata = {
    ...(input.metadata ?? {}),
    ...(context.usedTierFallback ? { tier_resolution: "fallback_free" } : {}),
  };
  const idempotencyKey = normalizeIdempotencyKey(
    input.idempotencyKey
      ?? buildDefaultWeeklyIdempotencyKey({
        eventName: input.eventName,
        coach: input.coach,
        weekStart: normalizedWeekStart,
      })
  );

  if (idempotencyKey) {
    const { data: existingEvent, error: existingEventError } = await supabase
      .from("analytics_events")
      .select("id")
      .eq("user_id", context.userId)
      .eq("idempotency_key", idempotencyKey)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingEventError) {
      warnTrackingIssue(`Failed to check duplicate analytics event: ${input.eventName}.`, existingEventError);
    } else if (existingEvent?.id) {
      return;
    }
  }

  const payload = {
    user_id: context.userId,
    event_name: input.eventName,
    occurred_at: normalizeOccurredAt(input.occurredAt),
    coach_persona: coachPersonaFromIdentity(input.coach),
    specialization: input.coach.specialization,
    user_tier: context.userTier,
    decision: input.decision ?? null,
    week_start: normalizedWeekStart,
    idempotency_key: idempotencyKey,
    source: "mobile",
    platform: Platform.OS,
    app_version: APP_VERSION,
    session_id: SESSION_ID,
    metadata,
  };
  const { error } = await supabase.from("analytics_events").insert(payload);

  if (error && !isUniqueViolation(error)) {
    warnTrackingIssue(`Failed to insert analytics event: ${input.eventName}.`, error);
  }
}

export async function trackCoachFunnelEvent(input: TrackCoachFunnelEventInput) {
  const context = await resolveCurrentUserContext(input.userTier);
  if (!context) return;
  await insertCoachFunnelEvent(input, context);
}

async function fetchLatestAcceptedPlanFeedback(
  userId: string
): Promise<AcceptedPlanFeedbackRow | null> {
  const { data, error } = await supabase
    .from("coach_nutrition_plan_feedback")
    .select("id, week_start, created_at")
    .eq("user_id", userId)
    .eq("decision", "accept")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    warnTrackingIssue("Couldn't load latest accepted nutrition plan feedback.", error);
    return null;
  }
  return data;
}

export async function trackCheckinSubmissionEvents(
  input: TrackCheckinSubmissionEventsInput
) {
  const context = await resolveCurrentUserContext(input.userTier);
  if (!context) return;

  await insertCoachFunnelEvent(
    {
      eventName: "checkin_submitted",
      coach: input.coach,
      userTier: context.userTier,
      weekStart: input.weekStart,
      metadata: {
        checkin_id: input.checkinId ?? null,
        save_mode: input.saveMode,
        plan_updated_for_review: input.planUpdatedForReview,
      },
    },
    context
  );

  const acceptedFeedback = await fetchLatestAcceptedPlanFeedback(context.userId);
  if (!acceptedFeedback) return;

  await insertCoachFunnelEvent(
    {
      eventName: "next_checkin_submitted",
      coach: input.coach,
      userTier: context.userTier,
      weekStart: input.weekStart,
      idempotencyKey: `next_checkin_submitted:${acceptedFeedback.id}`,
      metadata: {
        checkin_id: input.checkinId ?? null,
        accepted_feedback_id: acceptedFeedback.id,
        accepted_feedback_week_start: acceptedFeedback.week_start,
        accepted_feedback_created_at: acceptedFeedback.created_at,
      },
    },
    context
  );
}

export async function trackPlanDecisionMadeEvent(args: {
  coach: CoachIdentity;
  decision: CoachPlanDecision;
  userTier?: MembershipTier | null;
  weekStart?: string | null;
  context?: string;
}) {
  await trackCoachFunnelEvent({
    eventName: "plan_decision_made",
    coach: args.coach,
    userTier: args.userTier,
    decision: args.decision,
    weekStart: args.weekStart,
    metadata: {
      feedback_context: args.context ?? "checkin_review",
    },
  });
}

export function __resetCoachFunnelTrackingCacheForTests() {
  cachedTier = null;
}
