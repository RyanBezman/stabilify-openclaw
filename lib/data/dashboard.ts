import { supabase } from "../supabase";
import type {
  AccountVisibility,
  GoalType,
  GymSessionStatusReason,
  MembershipTier,
  ProgressVisibility,
  ShareVisibility,
  WeightUnit,
  WeighInCadence,
  GymSessionStatus,
} from "./types";
import { formatLocalDate, getWeekRange } from "../utils/metrics";
import { getLocalTimeZone } from "../utils/time";
import { fail, ok, type Result } from "../features/shared";

function normalizeAccountVisibility(value: string | null | undefined): AccountVisibility {
  if (value === "public" || value === "followers") {
    return "public";
  }
  return "private";
}

function normalizeMembershipTier(value: string | null | undefined): MembershipTier {
  return value === "pro" ? "pro" : "free";
}

export type ProfileData = {
  username: string | null;
  displayName: string;
  bio: string;
  membershipTier: MembershipTier;
  preferredUnit: WeightUnit;
  timezone: string;
  avatarPath: string | null;
  accountVisibility: AccountVisibility;
  progressVisibility: ProgressVisibility;
  socialEnabled: boolean;
  weighInShareVisibility: ShareVisibility;
  gymEventShareVisibility: ShareVisibility;
  postShareVisibility: ShareVisibility;
  autoSupportEnabled: boolean;
  autoSupportConsentAt: string | null;
  appleHealthStepsEnabled?: boolean;
};

export type GoalData = {
  id: string;
  goalType: GoalType;
  targetMin: number | null;
  targetMax: number | null;
  targetWeight: number | null;
  startWeight: number;
  startDate: string;
};

export type RoutineData = {
  weighInCadence: WeighInCadence;
  customCadence: number | null;
  reminderTime: string | null;
  gymProofEnabled: boolean;
  gymName: string | null;
  gymSessionsTarget: number;
  gymPlaceName: string | null;
  gymLat: number | null;
  gymLng: number | null;
};

export type WeighInData = {
  id: string;
  weight: number;
  unit: WeightUnit;
  recordedAt: string;
  localDate: string;
};

export type GymSessionData = {
  id: string;
  sessionDate: string;
  status: GymSessionStatus;
  statusReason: GymSessionStatusReason | null;
  distanceMeters?: number | null;
};

export type DashboardData = {
  profile: ProfileData | null;
  goal: GoalData | null;
  routine: RoutineData | null;
  weighIns: WeighInData[];
  gymSessions: GymSessionData[];
  gymWeekStart: string;
  gymWeekEnd: string;
};

type DashboardProfileRow = {
  username: string | null;
  display_name: string;
  bio: string | null;
  membership_tier: string | null;
  preferred_unit: WeightUnit;
  timezone: string;
  avatar_path: string | null;
  account_visibility: string | null;
  progress_visibility: ProgressVisibility | null;
  social_enabled: boolean | null;
  weigh_in_share_visibility: ShareVisibility | null;
  gym_event_share_visibility: ShareVisibility | null;
  post_share_visibility: ShareVisibility | null;
  auto_support_enabled: boolean | null;
  auto_support_consent_at: string | null;
  apple_health_steps_enabled: boolean | null;
};

export async function fetchDashboardData(userId?: string): Promise<Result<DashboardData>> {
  let resolvedUserId = userId;

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

  const [profileRes, goalRes, routineRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, display_name, bio, membership_tier, preferred_unit, timezone, avatar_path, account_visibility, progress_visibility, social_enabled, weigh_in_share_visibility, gym_event_share_visibility, post_share_visibility, auto_support_enabled, auto_support_consent_at, apple_health_steps_enabled",
      )
      .eq("id", resolvedUserId)
      .maybeSingle(),
    supabase
      .from("goals")
      .select(
        "id, goal_type, target_min, target_max, target_weight, start_weight, start_date"
      )
      .eq("user_id", resolvedUserId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("routines")
      .select(
        "weigh_in_cadence, custom_cadence, reminder_time, gym_proof_enabled, gym_name, gym_sessions_target, gym_place_name, gym_lat, gym_lng"
      )
      .eq("user_id", resolvedUserId)
      .maybeSingle(),
  ]);

  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const { data: weighInsData, error: weighInsError } = await supabase
    .from("weigh_ins")
    .select("id, weight, unit, recorded_at, local_date")
    .eq("user_id", resolvedUserId)
    .gte("recorded_at", oneYearAgo.toISOString())
    .order("recorded_at", { ascending: false })
    .limit(400);

  const timeZone = profileRes.data?.timezone ?? getLocalTimeZone();
  const todayLocal = formatLocalDate(new Date(), timeZone);
  const { weekStart, weekEnd } = getWeekRange(todayLocal);
  const oneYearAgoLocal = formatLocalDate(oneYearAgo, timeZone);
  const { data: gymSessionsData, error: gymSessionsError } = await supabase
    .from("gym_sessions")
    .select("id, session_date, status, status_reason, distance_meters")
    .eq("user_id", resolvedUserId)
    .gte("session_date", oneYearAgoLocal)
    .lte("session_date", todayLocal)
    .order("session_date", { ascending: true });

  if (profileRes.error) {
    return fail(profileRes.error);
  }
  if (goalRes.error) {
    return fail(goalRes.error);
  }
  if (routineRes.error) {
    return fail(routineRes.error);
  }
  if (weighInsError) {
    return fail(weighInsError);
  }
  if (gymSessionsError) {
    return fail(gymSessionsError);
  }

  const profileRow = (profileRes.data as DashboardProfileRow | null) ?? null;

  const profile = profileRow
    ? {
        username: profileRow.username ?? null,
        displayName: profileRow.display_name,
        bio: profileRow.bio ?? "",
        membershipTier: normalizeMembershipTier(profileRow.membership_tier),
        preferredUnit: profileRow.preferred_unit,
        timezone: profileRow.timezone,
        avatarPath: profileRow.avatar_path ?? null,
        accountVisibility: normalizeAccountVisibility(profileRow.account_visibility),
        progressVisibility: profileRow.progress_visibility ?? "public",
        socialEnabled: profileRow.social_enabled ?? false,
        weighInShareVisibility: profileRow.weigh_in_share_visibility ?? "private",
        gymEventShareVisibility: profileRow.gym_event_share_visibility ?? "private",
        postShareVisibility: profileRow.post_share_visibility ?? "private",
        autoSupportEnabled: profileRow.auto_support_enabled ?? true,
        autoSupportConsentAt: profileRow.auto_support_consent_at ?? null,
        appleHealthStepsEnabled: profileRow.apple_health_steps_enabled ?? false,
      }
    : null;

  const goal = goalRes.data
    ? {
        id: goalRes.data.id,
        goalType: goalRes.data.goal_type as GoalType,
        targetMin: goalRes.data.target_min,
        targetMax: goalRes.data.target_max,
        targetWeight: goalRes.data.target_weight,
        startWeight: goalRes.data.start_weight,
        startDate: goalRes.data.start_date,
      }
    : null;

  const routine = routineRes.data
    ? {
        weighInCadence: routineRes.data.weigh_in_cadence as WeighInCadence,
        customCadence: routineRes.data.custom_cadence,
        reminderTime: routineRes.data.reminder_time,
        gymProofEnabled: routineRes.data.gym_proof_enabled,
        gymName: routineRes.data.gym_name,
        gymSessionsTarget: routineRes.data.gym_sessions_target ?? 4,
        gymPlaceName: routineRes.data.gym_place_name ?? null,
        gymLat:
          routineRes.data.gym_lat === null ? null : Number(routineRes.data.gym_lat),
        gymLng:
          routineRes.data.gym_lng === null ? null : Number(routineRes.data.gym_lng),
      }
    : null;

  const weighIns =
    weighInsData?.map((entry) => ({
      id: entry.id,
      weight: entry.weight,
      unit: entry.unit as WeightUnit,
      recordedAt: entry.recorded_at,
      localDate: entry.local_date,
    })) ?? [];

  const gymSessions =
    gymSessionsData?.map((entry) => ({
      id: entry.id,
      sessionDate: entry.session_date,
      status: entry.status as GymSessionStatus,
      statusReason: (entry.status_reason as GymSessionStatusReason | null) ?? null,
      distanceMeters: entry.distance_meters ?? null,
    })) ?? [];

  return ok({
    profile,
    goal,
    routine,
    weighIns,
    gymSessions,
    gymWeekStart: weekStart,
    gymWeekEnd: weekEnd,
  });
}
