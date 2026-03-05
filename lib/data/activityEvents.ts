import { supabase } from "../supabase";
import type { ActivityEventRow, ActivityEventType, ShareVisibility } from "./types";
import {
  fail,
  normalizeCursorPagination,
  ok,
  toPaginatedItems,
  toSupabaseRange,
  type CursorPaginationInput,
  type PaginatedItems,
  type Result,
} from "../features/shared";

type RecordActivityEventInput = {
  actorUserId: string;
  eventType: ActivityEventType;
  eventDate: string;
  sourceTable?: string | null;
  sourceId?: string | null;
  payload?: Record<string, unknown>;
  visibility?: ShareVisibility;
};

type FetchCurrentUserActivityEventsInput = {
  userId?: string;
} & CursorPaginationInput;

export async function recordActivityEvent(
  input: RecordActivityEventInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      actor_user_id: input.actorUserId,
      event_type: input.eventType,
      event_date: input.eventDate,
      source_table: input.sourceTable ?? null,
      source_id: input.sourceId ?? null,
      payload: input.payload ?? {},
      visibility: input.visibility ?? "private",
    })
    .select("id")
    .single();

  if (error) {
    return fail(error);
  }

  return ok({ id: data.id });
}

async function fetchCurrentUserActivityEvents(
  input?: FetchCurrentUserActivityEventsInput,
): Promise<Result<PaginatedItems<ActivityEventRow>>> {
  let resolvedUserId = input?.userId;

  if (!resolvedUserId) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return fail(userError);
    }
    resolvedUserId = userData.user?.id;
  }

  if (!resolvedUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  const pagination = normalizeCursorPagination(input, { defaultLimit: 50, maxLimit: 200 });
  const range = toSupabaseRange(pagination);
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      "id, actor_user_id, event_type, event_date, source_table, source_id, payload, visibility, created_at",
    )
    .eq("actor_user_id", resolvedUserId)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const items =
    data?.map((entry) => ({
      id: entry.id,
      actorUserId: entry.actor_user_id,
      eventType: entry.event_type as ActivityEventType,
      eventDate: entry.event_date,
      sourceTable: entry.source_table ?? null,
      sourceId: entry.source_id ?? null,
      payload: (entry.payload as Record<string, unknown> | null) ?? {},
      visibility: entry.visibility as ShareVisibility,
      createdAt: entry.created_at,
    })) ?? [];

  return ok(toPaginatedItems(items, pagination));
}
