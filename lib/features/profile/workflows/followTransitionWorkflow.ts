import {
  cancelFollowRequest,
  followUser,
  unfollowUser,
  type ViewerFollowState,
} from "../../../data/relationships";

type FollowTransitionWorkflowOptions = {
  targetUserId: string;
  currentState: ViewerFollowState;
};

export type FollowTransitionWorkflowResult = {
  nextState: ViewerFollowState;
  followersDelta: number;
  error?: string;
};

export async function followTransitionWorkflow({
  targetUserId,
  currentState,
}: FollowTransitionWorkflowOptions): Promise<FollowTransitionWorkflowResult> {
  if (currentState === "blocked") {
    return { nextState: "blocked", followersDelta: 0 };
  }

  if (currentState === "accepted") {
    const result = await unfollowUser(targetUserId);
    if (result.error) {
      return { nextState: currentState, followersDelta: 0, error: result.error };
    }

    return { nextState: "none", followersDelta: -1 };
  }

  if (currentState === "pending") {
    const result = await cancelFollowRequest(targetUserId);
    if (result.error) {
      return { nextState: currentState, followersDelta: 0, error: result.error };
    }

    return { nextState: "none", followersDelta: 0 };
  }

  const result = await followUser(targetUserId);
  if (result.error) {
    return { nextState: currentState, followersDelta: 0, error: result.error };
  }

  const nextState = result.data?.status ?? "pending";
  return {
    nextState,
    followersDelta: nextState === "accepted" ? 1 : 0,
  };
}
