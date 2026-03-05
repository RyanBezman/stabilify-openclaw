export type WeightUnit = "lb" | "kg";
export type MembershipTier = "free" | "pro";
export type GoalType = "maintain" | "lose" | "gain";
export type WeighInCadence = "daily" | "three_per_week" | "custom";
export type GymSessionStatus = "verified" | "partial" | "provisional";
export type GymSessionStatusReason =
  | "outside_radius"
  | "missing_photo"
  | "missing_location"
  | "missing_gym_setup"
  | "permission_denied"
  | "manual_override";
export type GymSessionValidationRequestStatus =
  | "open"
  | "accepted"
  | "declined"
  | "expired";
export type GymSessionValidationDecision = "accept" | "decline";
export type AccountVisibility = "private" | "public";
export type ProgressVisibility = "private" | "public";
export type ShareVisibility = "private" | "close_friends" | "followers" | "public";
export type SupportTriggerReason =
  | "miss_trajectory_3_days"
  | "missed_weekly_target"
  | "two_consecutive_missed_weeks";
export type SupportRequestStatus =
  | "published"
  | "suppressed_no_consent"
  | "disabled";
export type SupportNudgeSurface = "home";
export type ActivityEventType =
  | "weigh_in_logged"
  | "gym_session_verified"
  | "gym_session_validation_requested"
  | "gym_session_validation_submitted"
  | "gym_session_upgraded_verified"
  | "gym_session_validation_expired"
  | "streak_milestone"
  | "support_request";
export type FollowStatus = "pending" | "accepted" | "rejected" | "blocked";
export type PostType = "text" | "photo";

export type ActivityEventRow = {
  id: string;
  actorUserId: string;
  eventType: ActivityEventType;
  eventDate: string;
  sourceTable: string | null;
  sourceId: string | null;
  payload: Record<string, unknown>;
  visibility: ShareVisibility;
  createdAt: string;
};

export type FollowRow = {
  id: string;
  followerUserId: string;
  followedUserId: string;
  status: FollowStatus;
  createdAt: string;
  updatedAt: string;
};

export type CloseFriendRow = {
  id: string;
  userId: string;
  friendUserId: string;
  createdAt: string;
};

export type PostRow = {
  id: string;
  authorUserId: string;
  postType: PostType;
  body: string | null;
  mediaUrls: string[];
  visibility: ShareVisibility;
  createdAt: string;
};
