import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProfileSkeleton from "../components/profile/ProfileSkeleton";
import ProfileHero from "../components/profile/ProfileHero";
import ProfileTabPicker, { type ProfileContentTab } from "../components/profile/ProfileTabPicker";
import ProfilePostsSection from "../components/profile/ProfilePostsSection";
import ProfileProgressSection from "../components/profile/ProfileProgressSection";
import ProfileMenuSheet from "../components/profile/ProfileMenuSheet";
import {
  useOwnProfilePhotoActions,
  useOwnProfilePosts,
  useOwnProfileQuery,
  useProfilePhotoActionHandlers,
} from "../lib/features/profile";
import { signOutCurrentUser } from "../lib/features/auth";
import type {
  ProfileHeaderProps,
  ProfileScreenProps,
} from "../lib/features/profile";

function ProfileHeader({ title, onOpenMenu }: ProfileHeaderProps) {
  return (
    <View className="mb-5 flex-row items-center justify-between">
      <View className="min-w-0 flex-row items-center">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onOpenMenu}
        className="h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/80"
        accessibilityRole="button"
        accessibilityLabel="Open profile menu"
        testID="profile-menu-button"
      >
        <Ionicons name="settings-outline" size={20} color="#e5e5e5" />
      </TouchableOpacity>
    </View>
  );
}

const PROFILE_REFRESH_OFFSET = 72;

export default function Profile({ navigation, user }: ProfileScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("posts");
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profileMenuMounted, setProfileMenuMounted] = useState(false);
  const profileMenuAnimation = useRef(new Animated.Value(0)).current;

  const {
    postCount,
    posts,
    postsLoading,
    postsError,
    refreshingPosts,
    hasMorePosts,
    loadingMorePosts,
    deletingPostId,
    handleDeletePost,
    handleLoadMorePosts,
    refreshPosts,
    refreshPostCount,
  } = useOwnProfilePosts({ userId: user?.id });

  const {
    dashboard,
    dashboardLoading,
    progressRefreshError,
    refreshingProgress,
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
  } = useOwnProfileQuery({ user, postCount, refreshPostCount });

  const { photoLoading, uploadPhoto, removePhoto } = useOwnProfilePhotoActions({
    refreshProfile,
  });
  const { openPhotoActions } = useProfilePhotoActionHandlers({
    photoUrl: photoUrl ?? null,
    photoLoading,
    uploadPhoto,
    removePhoto,
  });

  useEffect(() => {
    if (showProgressTab) return;
    if (activeTab === "progress") {
      setActiveTab("posts");
    }
  }, [activeTab, showProgressTab]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    const result = await signOutCurrentUser();
    setSigningOut(false);
    if (result.error) {
      Alert.alert("Sign out failed", result.error);
    }
  }, [signingOut]);

  const handleDeletePostPress = useCallback(
    async (postId: string) => {
      const result = await handleDeletePost(postId);
      if (result.error) {
        Alert.alert("Couldn't delete post", result.error);
      }
    },
    [handleDeletePost],
  );

  const openProfileMenu = useCallback(() => {
    setProfileMenuMounted(true);
    setProfileMenuVisible(true);
  }, []);

  const closeProfileMenu = useCallback(() => {
    setProfileMenuVisible(false);
  }, []);

  const openProfileSettings = useCallback(() => {
    setProfileMenuVisible(false);
    navigation.navigate("ProfileSettings");
  }, [navigation]);

  const openUpgradePlan = useCallback(() => {
    setProfileMenuVisible(false);
    navigation.navigate("BillingPlans");
  }, [navigation]);

  const openFollowRequests = useCallback(() => {
    setProfileMenuVisible(false);
    navigation.navigate("FollowRequests");
  }, [navigation]);

  const handleMenuSignOut = useCallback(() => {
    setProfileMenuVisible(false);
    void handleSignOut();
  }, [handleSignOut]);

  useEffect(() => {
    if (profileMenuVisible) {
      profileMenuAnimation.setValue(0);
      Animated.timing(profileMenuAnimation, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!profileMenuMounted) return;

    Animated.timing(profileMenuAnimation, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setProfileMenuMounted(false);
    });
  }, [profileMenuAnimation, profileMenuMounted, profileMenuVisible]);

  const menuBackdropStyle = useMemo(
    () => ({
      opacity: profileMenuAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.45],
      }),
    }),
    [profileMenuAnimation],
  );

  const profileMenuWidth = useMemo(
    () => Math.min(420, Math.max(260, Math.round(screenWidth * 0.9))),
    [screenWidth],
  );

  const menuPanelStyle = useMemo(
    () => ({
      width: profileMenuWidth,
      transform: [
        {
          translateX: profileMenuAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [profileMenuWidth, 0],
          }),
        },
      ],
    }),
    [profileMenuAnimation, profileMenuWidth],
  );

  const profileContentOpacity = useRef(new Animated.Value(0)).current;
  const showSkeleton = dashboardLoading && !dashboard;

  useEffect(() => {
    if (!showSkeleton) {
      profileContentOpacity.setValue(0);
      Animated.timing(profileContentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showSkeleton, profileContentOpacity]);

  const handlePullRefresh = useCallback(async () => {
    if (pullRefreshing) return;

    setPullRefreshing(true);
    try {
      if (activeTab === "progress") {
        await refreshProfileProgress();
        return;
      }
      await refreshPosts();
    } finally {
      setPullRefreshing(false);
    }
  }, [activeTab, pullRefreshing, refreshPosts, refreshProfileProgress]);

  const activeRefreshState =
    pullRefreshing || (activeTab === "progress" ? refreshingProgress : refreshingPosts);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeRefreshState}
            onRefresh={() => {
              void handlePullRefresh();
            }}
            tintColor="#a3a3a3"
            colors={["#a3a3a3"]}
            progressViewOffset={PROFILE_REFRESH_OFFSET}
          />
        }
      >
        {activeRefreshState && !showSkeleton ? (
          <View className="mb-3 flex-row items-center justify-center">
            <ActivityIndicator size="small" color="#a3a3a3" />
          </View>
        ) : null}

        <ProfileHeader title={profileHeaderTitle} onOpenMenu={openProfileMenu} />

        {showSkeleton ? (
          <ProfileSkeleton />
        ) : (
          <Animated.View style={{ opacity: profileContentOpacity }}>
            <ProfileHero
              displayName={displayName}
              subtitle={usernameLabel ?? undefined}
              bio={dashboard?.profile?.bio ?? ""}
              photoUrl={photoUrl}
              membershipTier={dashboard?.profile?.membershipTier}
              photoLoading={photoLoading}
              socialStats={socialStats}
              onPressPhotoAction={openPhotoActions}
            />
            <ProfileTabPicker
              value={activeTab}
              onChange={setActiveTab}
              showProgressTab={showProgressTab}
            />

            {activeTab === "posts" ? (
              <View className="gap-3">
                <ProfilePostsSection
                  posts={posts}
                  loading={postsLoading}
                  error={postsError}
                  emptyText="No posts yet. Create your first post from Feed."
                  authorDisplayName={displayName}
                  authorPhotoUrl={photoUrl}
                  hasMore={hasMorePosts}
                  loadingMore={loadingMorePosts}
                  deletingPostId={deletingPostId}
                  onDeletePost={handleDeletePostPress}
                  onLoadMore={handleLoadMorePosts}
                />
              </View>
            ) : (
              <ProfileProgressSection
                refreshError={progressRefreshError}
                progressModel={progressModel}
              />
            )}
          </Animated.View>
        )}
      </ScrollView>

      <ProfileMenuSheet
        mounted={profileMenuMounted}
        topInset={insets.top}
        bottomInset={insets.bottom}
        backdropStyle={menuBackdropStyle}
        panelStyle={menuPanelStyle}
        pendingFollowRequestsCount={pendingFollowRequestsCount}
        signingOut={signingOut}
        onClose={closeProfileMenu}
        onOpenSettings={openProfileSettings}
        onOpenFollowRequests={openFollowRequests}
        onOpenUpgradePlan={openUpgradePlan}
        onSignOut={handleMenuSignOut}
      />
    </SafeAreaView>
  );
}
