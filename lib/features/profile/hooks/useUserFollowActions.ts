import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";
import { fetchPublicRelationshipCounts, type ViewerFollowState } from "../../../data/relationships";
import type { UserDirectoryRow } from "../../../data/userDirectory";
import { blockTransitionWorkflow } from "../workflows/blockTransitionWorkflow";
import { followTransitionWorkflow } from "../workflows/followTransitionWorkflow";
import { publishRelationshipSyncEvent } from "../../shared";

type FollowActionConfirmation = {
  confirmLabel: string;
  confirmTone: "default" | "destructive";
  message: string;
  onConfirm: () => Promise<void>;
  title: string;
};

type UseUserFollowActionsParams = {
  targetUserId: string;
  profile: UserDirectoryRow | null;
  followState: ViewerFollowState;
  setFollowState: Dispatch<SetStateAction<ViewerFollowState>>;
  setFollowersCount: Dispatch<SetStateAction<number>>;
  setFollowingCount: Dispatch<SetStateAction<number>>;
};

export function useUserFollowActions({
  targetUserId,
  profile,
  followState,
  setFollowState,
  setFollowersCount,
  setFollowingCount,
}: UseUserFollowActionsParams) {
  const mountedRef = useRef(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<FollowActionConfirmation | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyFollowTransition = useCallback(
    async (actionErrors: {
      accepted: string;
      pending: string;
      none: string;
    }) => {
      if (!mountedRef.current) {
        return;
      }

      setFollowLoading(true);
      const result = await followTransitionWorkflow({
        targetUserId,
        currentState: followState,
      });

      if (!mountedRef.current) {
        return;
      }

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
      publishRelationshipSyncEvent({
        type: "follow_state_changed",
        targetUserId,
        nextState: result.nextState,
      });
    },
    [followState, setFollowState, setFollowersCount, targetUserId],
  );

  const applyBlockTransition = useCallback(
    async (actionErrors: { block: string; unblock: string }) => {
      if (!mountedRef.current) {
        return;
      }

      setBlockLoading(true);
      const result = await blockTransitionWorkflow({
        targetUserId,
        currentState: followState,
      });

      if (!mountedRef.current) {
        return;
      }

      setBlockLoading(false);

      if (result.error) {
        Alert.alert(followState === "blocked" ? actionErrors.unblock : actionErrors.block, result.error);
        return;
      }

      setFollowState(result.nextState);
      const countsResult = await fetchPublicRelationshipCounts(targetUserId);
      if (!mountedRef.current) {
        return;
      }

      if (countsResult.data && !countsResult.error) {
        setFollowersCount(countsResult.data.followers);
        setFollowingCount(countsResult.data.following);
      } else if (result.followersDelta !== 0) {
        setFollowersCount((value) => Math.max(0, value + result.followersDelta));
      }

      publishRelationshipSyncEvent({
        type: "block_state_changed",
        targetUserId,
        nextState: result.nextState === "blocked" ? "blocked" : "none",
      });
      if (result.nextState === "blocked") {
        publishRelationshipSyncEvent({
          type: "close_friend_removed",
          friendUserId: targetUserId,
        });
      }
    },
    [followState, setFollowState, setFollowersCount, setFollowingCount, targetUserId],
  );

  const handleFollowPress = useCallback(async () => {
    if (followLoading || blockLoading || !profile) {
      return;
    }

    if (followState === "accepted") {
      setConfirmation({
        title: "Unfollow",
        message: `Unfollow @${profile.username}?`,
        confirmLabel: "Unfollow",
        confirmTone: "destructive",
        onConfirm: async () => {
          await applyFollowTransition({
            accepted: "Couldn't unfollow",
            pending: "Couldn't cancel request",
            none: "Couldn't follow",
          });
        },
      });
      return;
    }

    if (followState === "pending") {
      setConfirmation({
        title: "Cancel request",
        message: `Cancel follow request to @${profile.username}?`,
        confirmLabel: "Cancel request",
        confirmTone: "destructive",
        onConfirm: async () => {
          await applyFollowTransition({
            accepted: "Couldn't unfollow",
            pending: "Couldn't cancel request",
            none: "Couldn't follow",
          });
        },
      });
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
  }, [applyFollowTransition, blockLoading, followLoading, followState, profile]);

  const handleBlockPress = useCallback(async () => {
    if (followLoading || blockLoading || !profile) {
      return;
    }

    if (followState === "blocked") {
      setConfirmation({
        title: "Unblock user",
        message: `Unblock @${profile.username}?`,
        confirmLabel: "Unblock",
        confirmTone: "default",
        onConfirm: async () => {
          await applyBlockTransition({
            block: "Couldn't block user",
            unblock: "Couldn't unblock user",
          });
        },
      });
      return;
    }

    setConfirmation({
      title: "Block user",
      message: `Block @${profile.username}? They won't be able to follow you or see your profile updates.`,
      confirmLabel: "Block",
      confirmTone: "destructive",
      onConfirm: async () => {
        await applyBlockTransition({
          block: "Couldn't block user",
          unblock: "Couldn't unblock user",
        });
      },
    });
  }, [applyBlockTransition, blockLoading, followLoading, followState, profile]);

  const dismissConfirmation = useCallback(() => {
    if (followLoading || blockLoading) {
      return;
    }
    setConfirmation(null);
  }, [blockLoading, followLoading]);

  const confirmAction = useCallback(async () => {
    if (!confirmation) {
      return;
    }

    const action = confirmation.onConfirm;
    setConfirmation(null);
    await action();
  }, [confirmation]);

  const followButtonLabel =
    followState === "accepted"
      ? "Following"
      : followState === "pending"
        ? "Requested"
        : followState === "blocked"
          ? "Unavailable"
          : "Follow";

  const blockButtonLabel = followState === "blocked" ? "Unblock user" : "Block user";
  const isBlocked = followState === "blocked";

  return {
    blockButtonLabel,
    blockLoading,
    confirmation,
    confirmAction,
    dismissConfirmation,
    followLoading,
    followButtonLabel,
    handleBlockPress,
    handleFollowPress,
    isBlocked,
  };
}
