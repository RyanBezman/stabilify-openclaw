import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchActionableNotificationCount } from "../../../data/notifications";
import { fetchRelationshipCounts } from "../../../data/relationships";
import { buildProfileProgressModel } from "../models/progressModel";
import { canShowProgressTab } from "../models/visibility";
import { deriveOwnProfileIdentity } from "../models/ownProfileIdentity";
import {
  initialOwnProfileAsyncState,
  ownProfileAsyncReducer,
} from "../models/ownProfileAsyncState";
import {
  loadOwnProfileWorkflow,
  refreshOwnProfile,
  refreshOwnProfileProgressWorkflow,
} from "../workflows/ownProfileWorkflow";
import {
  isAsyncWorkflowBusy,
  subscribeRelationshipSyncEvents,
} from "../../shared";

type DashboardState = Awaited<ReturnType<typeof refreshOwnProfile>>["dashboard"];

type UseOwnProfileQueryParams = {
  user?: User | null;
  postCount: number;
  refreshPostCount?: () => Promise<{ error?: string }>;
};

export function useOwnProfileQuery({
  user,
  postCount,
  refreshPostCount,
}: UseOwnProfileQueryParams) {
  const mountedRef = useRef(true);
  const [dashboard, setDashboard] = useState<DashboardState>(null);
  const [asyncState, dispatchAsync] = useReducer(ownProfileAsyncReducer, initialOwnProfileAsyncState);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pendingFollowRequestsCount, setPendingFollowRequestsCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const dashboardLoading = isAsyncWorkflowBusy(asyncState.dashboard);
  const refreshingProgress = isAsyncWorkflowBusy(asyncState.progressRefresh);
  const progressRefreshError = asyncState.progressRefresh.error;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshProfile = useCallback(
    async (options?: { preserveOnError?: boolean }): Promise<{ error?: string }> => {
      const result = await refreshOwnProfile({
        userId: user?.id,
        preserveOnError: options?.preserveOnError,
      });
      if (result.error) {
        if (!result.preserveExistingOnError) {
          setDashboard(result.dashboard);
          setPhotoUrl(result.photoUrl);
        } else if (result.dashboard !== null) {
          // Preserve stale photo, but still apply fresh dashboard/profile data.
          setDashboard(result.dashboard);
        }
        return { error: result.error };
      }

      setDashboard(result.dashboard);
      setPhotoUrl(result.photoUrl);
      return {};
    },
    [user?.id],
  );

  useEffect(() => {
    let active = true;
    dispatchAsync({ type: "dashboard/start" });

    const load = async () => {
      const workflowResult = await loadOwnProfileWorkflow({ userId: user?.id });
      if (!active) return;

      setFollowersCount(workflowResult.followersCount);
      setFollowingCount(workflowResult.followingCount);
      setPendingFollowRequestsCount(workflowResult.pendingFollowRequestsCount);

      if (workflowResult.profileResult.error && !workflowResult.profileResult.dashboard) {
        setDashboard(null);
        setPhotoUrl(null);
        dispatchAsync({
          type: "dashboard/fail",
          error: workflowResult.profileResult.error ?? "Couldn't load profile.",
        });
        return;
      }

      setDashboard(workflowResult.profileResult.dashboard);
      setPhotoUrl(workflowResult.profileResult.photoUrl);
      dispatchAsync({ type: "dashboard/succeed" });
    };

    void load();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const { displayName, usernameLabel, profileHeaderTitle } = deriveOwnProfileIdentity(
    dashboard,
    user,
  );

  const progressModel = useMemo(() => buildProfileProgressModel(dashboard ?? null), [dashboard]);

  const showProgressTab = canShowProgressTab({
    isOwner: true,
    accountVisibility: dashboard?.profile?.accountVisibility ?? "private",
    progressVisibility: dashboard?.profile?.progressVisibility ?? "public",
  });

  const socialStats = useMemo(
    () => [
      { label: "Posts", value: String(postCount) },
      { label: "Followers", value: String(followersCount) },
      { label: "Following", value: String(followingCount) },
    ],
    [followersCount, followingCount, postCount],
  );

  const refreshProfileProgress = useCallback(async () => {
    if (refreshingProgress) return;

    dispatchAsync({ type: "progress/start" });

    const workflowResult = await refreshOwnProfileProgressWorkflow({
      userId: user?.id,
      refreshProfile,
      refreshPostCount,
    });

    if (workflowResult.followersCount !== null) {
      setFollowersCount(workflowResult.followersCount);
    }
    if (workflowResult.followingCount !== null) {
      setFollowingCount(workflowResult.followingCount);
    }

    if (workflowResult.error) {
      dispatchAsync({
        type: "progress/fail",
        error: workflowResult.error,
      });
      return;
    }

    dispatchAsync({ type: "progress/succeed" });
  }, [refreshPostCount, refreshProfile, refreshingProgress, user?.id]);

  const refreshRelationshipSummary = useCallback(async () => {
    const [relationshipCountsResult, notificationCountResult] = await Promise.all([
      fetchRelationshipCounts(user?.id ?? undefined),
      fetchActionableNotificationCount(user?.id ?? undefined),
    ]);

    if (!mountedRef.current) {
      return;
    }

    if (relationshipCountsResult.data && !relationshipCountsResult.error) {
      setFollowersCount(relationshipCountsResult.data.followers);
      setFollowingCount(relationshipCountsResult.data.following);
    }

    if (notificationCountResult.data && !notificationCountResult.error) {
      setPendingFollowRequestsCount(notificationCountResult.data.count);
    }
  }, [user?.id]);

  useEffect(() => {
    return subscribeRelationshipSyncEvents(() => {
      void refreshRelationshipSummary();
    });
  }, [refreshRelationshipSummary]);

  // Backward-compatible aliases while callers migrate to explicit action names.
  const handleRefreshProgress = refreshProfileProgress;
  const refreshDashboard = refreshProfile;

  return {
    dashboard,
    dashboardLoading,
    dashboardStatus: asyncState.dashboard.status,
    progressRefreshError,
    refreshingProgress,
    progressRefreshStatus: asyncState.progressRefresh.status,
    pendingFollowRequestsCount,
    photoUrl,
    displayName,
    usernameLabel,
    profileHeaderTitle,
    showProgressTab,
    socialStats,
    progressModel,
    refreshProfileProgress,
    refreshProfile,
    handleRefreshProgress,
    refreshDashboard,
  };
}
