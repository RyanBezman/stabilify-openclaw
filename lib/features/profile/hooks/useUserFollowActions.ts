import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";
import { type ViewerFollowState } from "../../../data/relationships";
import type { UserDirectoryRow } from "../../../data/userDirectory";
import { followTransitionWorkflow } from "../workflows/followTransitionWorkflow";

type UseUserFollowActionsParams = {
  targetUserId: string;
  profile: UserDirectoryRow | null;
  followState: ViewerFollowState;
  setFollowState: Dispatch<SetStateAction<ViewerFollowState>>;
  setFollowersCount: Dispatch<SetStateAction<number>>;
};

export function useUserFollowActions({
  targetUserId,
  profile,
  followState,
  setFollowState,
  setFollowersCount,
}: UseUserFollowActionsParams) {
  const [followLoading, setFollowLoading] = useState(false);

  const applyFollowTransition = useCallback(
    async (actionErrors: {
      accepted: string;
      pending: string;
      none: string;
    }) => {
      setFollowLoading(true);
      const result = await followTransitionWorkflow({
        targetUserId,
        currentState: followState,
      });
      setFollowLoading(false);
      if (result.error) {
        const title =
          followState === "accepted"
            ? actionErrors.accepted
            : followState === "pending"
              ? actionErrors.pending
              : actionErrors.none;
        Alert.alert(title, result.error);
        return;
      }

      setFollowState(result.nextState);
      if (result.followersDelta !== 0) {
        setFollowersCount((value) => Math.max(0, value + result.followersDelta));
      }
    },
    [followState, setFollowState, setFollowersCount, targetUserId],
  );

  const handleFollowPress = useCallback(async () => {
    if (followLoading || !profile) {
      return;
    }

    if (followState === "accepted") {
      Alert.alert(`Unfollow`, `Unfollow @${profile.username}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: async () => {
            await applyFollowTransition({
              accepted: "Couldn't unfollow",
              pending: "Couldn't cancel request",
              none: "Couldn't follow",
            });
          },
        },
      ]);
      return;
    }

    if (followState === "pending") {
      Alert.alert("Cancel request", `Cancel follow request to @${profile.username}?`, [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            await applyFollowTransition({
              accepted: "Couldn't unfollow",
              pending: "Couldn't cancel request",
              none: "Couldn't follow",
            });
          },
        },
      ]);
      return;
    }

    if (followState === "blocked") {
      return;
    }

    await applyFollowTransition({
      accepted: "Couldn't unfollow",
      pending: "Couldn't cancel request",
      none: "Couldn't follow",
    });
  }, [applyFollowTransition, followLoading, followState, profile]);

  const followButtonLabel =
    followState === "accepted"
      ? "Following"
      : followState === "pending"
        ? "Requested"
        : followState === "blocked"
          ? "Unavailable"
          : "Follow";

  return {
    followLoading,
    followButtonLabel,
    handleFollowPress,
  };
}
