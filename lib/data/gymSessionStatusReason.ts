import type { GymSessionStatusReason } from "./types";

export type GymSessionStatusReasonCopy = {
  reasonText: string;
  actionText: string | null;
};

type StatusReasonCopyAudience = "session_owner" | "reviewer";

const OWNER_STATUS_REASON_COPY: Record<GymSessionStatusReason, GymSessionStatusReasonCopy> = {
  outside_radius: {
    reasonText: "You were outside your gym verification range.",
    actionText: "Retry at your gym location to verify this session.",
  },
  missing_photo: {
    reasonText: "A photo wasn't captured, so we couldn't verify this session.",
    actionText: "Retake your gym photo and save again.",
  },
  missing_location: {
    reasonText: "Location wasn't captured, so we couldn't verify this session.",
    actionText: "Capture location before saving your next session.",
  },
  missing_gym_setup: {
    reasonText: "Your gym location isn't set, so we couldn't verify this session.",
    actionText: "Set your gym location in Gym settings, then retry.",
  },
  permission_denied: {
    reasonText: "Location permission was denied, so we couldn't verify this session.",
    actionText: "Enable location permission in Settings, then retry.",
  },
  manual_override: {
    reasonText: "This session was manually reviewed.",
    actionText: null,
  },
};

const REVIEWER_ACTION_COPY: Record<GymSessionStatusReason, string | null> = {
  outside_radius: "This session was recorded outside the saved gym verification range.",
  missing_photo: "No proof photo was saved for this session.",
  missing_location: "No location reading was saved for this session.",
  missing_gym_setup: "The requester had not set a gym location when this session was logged.",
  permission_denied: "Location permission was not granted when this session was logged.",
  manual_override: null,
};

export function getGymSessionStatusReasonCopy(
  reason: GymSessionStatusReason | null | undefined,
  options?: { audience?: StatusReasonCopyAudience },
): GymSessionStatusReasonCopy | null {
  if (!reason) {
    return null;
  }

  const audience = options?.audience ?? "session_owner";
  const ownerCopy = OWNER_STATUS_REASON_COPY[reason];

  if (audience === "reviewer") {
    return {
      reasonText: ownerCopy.reasonText,
      actionText: REVIEWER_ACTION_COPY[reason],
    };
  }

  return ownerCopy;
}
