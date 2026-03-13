import {
  blockUser,
  unblockUser,
  type ViewerFollowState,
} from "../../../data/relationships";

type BlockTransitionWorkflowOptions = {
  targetUserId: string;
  currentState: ViewerFollowState;
};

export type BlockTransitionWorkflowResult = {
  nextState: ViewerFollowState;
  followersDelta: number;
  error?: string;
};

export async function blockTransitionWorkflow({
  targetUserId,
  currentState,
}: BlockTransitionWorkflowOptions): Promise<BlockTransitionWorkflowResult> {
  if (currentState === "blocked") {
    const result = await unblockUser(targetUserId);
    if (result.error) {
      return { nextState: currentState, followersDelta: 0, error: result.error };
    }

    return { nextState: "none", followersDelta: 0 };
  }

  const result = await blockUser(targetUserId);
  if (result.error) {
    return { nextState: currentState, followersDelta: 0, error: result.error };
  }

  return {
    nextState: "blocked",
    followersDelta: currentState === "accepted" ? -1 : 0,
  };
}
