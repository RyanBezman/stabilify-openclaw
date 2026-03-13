import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../lib/navigation/types";
import AuthHeader from "../components/auth/AuthHeader";
import ProfileSkeleton from "../components/profile/ProfileSkeleton";
import ProfileHero from "../components/profile/ProfileHero";
import ProfilePostsSection from "../components/profile/ProfilePostsSection";
import ProfileProgressSection from "../components/profile/ProfileProgressSection";
import ProfileTabPicker, { type ProfileContentTab } from "../components/profile/ProfileTabPicker";
import ProfileLockedState from "../components/profile/ProfileLockedState";
import Button from "../components/ui/Button";
import ConfirmationSheet from "../components/ui/ConfirmationSheet";
import ModalSheet from "../components/ui/ModalSheet";
import { useUserFollowActions } from "../lib/features/profile";
import { useUserProfileQuery } from "../lib/features/profile";
import AppScreen from "../components/ui/AppScreen";

type UserProfileProps = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export default function UserProfile({ navigation, route }: UserProfileProps) {
  const targetUserId = route.params.userId;
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("posts");
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  const {
    profile,
    profilePhotoUrl,
    loading,
    error,
    progressError,
    posts,
    postsLoading,
    postsError,
    hasMorePosts,
    loadingMorePosts,
    followState,
    setFollowState,
    setFollowersCount,
    setFollowingCount,
    shouldRedirectToOwnProfile,
    contentOpacity,
    isOwner,
    isPrivateAndLocked,
    showProgressTab,
    socialStats,
    progressModel,
    handleLoadMorePosts,
  } = useUserProfileQuery({ targetUserId });

  const {
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
  } = useUserFollowActions({
    targetUserId,
    profile,
    followState,
    setFollowState,
    setFollowersCount,
    setFollowingCount,
  });

  useEffect(() => {
    if (!shouldRedirectToOwnProfile) return;
    navigation.navigate("Authed", { screen: "Profile" });
  }, [navigation, shouldRedirectToOwnProfile]);

  useEffect(() => {
    if (showProgressTab) return;
    if (activeTab === "progress") {
      setActiveTab("posts");
    }
  }, [activeTab, showProgressTab]);

  useEffect(() => {
    if (isBlocked) {
      setActionMenuVisible(false);
    }
  }, [isBlocked]);

  const openActionMenu = useCallback(() => {
    if (isOwner || !profile || isBlocked) {
      return;
    }
    setActionMenuVisible(true);
  }, [isBlocked, isOwner, profile]);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const handleBlockMenuPress = useCallback(() => {
    setActionMenuVisible(false);
    void handleBlockPress();
  }, [handleBlockPress]);

  if (loading) {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={760}>
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
          <AuthHeader title="Profile" onBack={navigation.goBack} />
          <ProfileSkeleton variant="public" />
        </ScrollView>
      </AppScreen>
    );
  }

  if (error || !profile) {
    return (
      <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={760}>
        <View className="flex-1 px-5 pt-6">
          <AuthHeader title="Profile" onBack={navigation.goBack} />
          <Text className="text-sm text-rose-300">{error ?? "Couldn't load profile."}</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={760}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title={profile.displayName}
          onBack={navigation.goBack}
          rightAction={
            !isOwner && !isBlocked ? (
              <TouchableOpacity
                onPress={openActionMenu}
                className="h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900"
                accessibilityRole="button"
                accessibilityLabel="Open profile actions"
                testID="user-profile-actions-button"
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#e5e5e5" />
              </TouchableOpacity>
            ) : null
          }
        />

        <Animated.View style={{ opacity: contentOpacity }}>
          <ProfileHero
            displayName={profile.displayName}
            subtitle={`@${profile.username}`}
            bio={profile.bio}
            photoUrl={profilePhotoUrl}
            socialStats={socialStats}
          />

          {!isOwner ? (
            isBlocked ? (
              <Button
                title={blockButtonLabel}
                variant="secondary"
                size="sm"
                className="mb-4"
                disabled={blockLoading}
                loading={blockLoading}
                onPress={handleBlockPress}
              />
            ) : (
              <>
                <Button
                  title={followButtonLabel}
                  variant={followState === "none" ? "primary" : "secondary"}
                  size="sm"
                  className="mb-4"
                  disabled={followLoading || blockLoading}
                  loading={followLoading}
                  onPress={handleFollowPress}
                />
              </>
            )
          ) : null}

          {isBlocked ? (
            <ProfileLockedState
              title="User blocked"
              message="You blocked this user. Unblock them to view their posts and progress again."
            />
          ) : (
            <>
              <ProfileTabPicker
                value={activeTab}
                onChange={setActiveTab}
                showProgressTab={showProgressTab}
              />

              {activeTab === "posts" ? (
                isPrivateAndLocked ? (
                  <ProfileLockedState
                    title="Private account"
                    message="Follow this account to view their posts and progress."
                  />
                ) : (
                  <ProfilePostsSection
                    posts={posts}
                    loading={postsLoading}
                    error={postsError}
                    emptyText="No posts to show yet."
                    authorDisplayName={profile.displayName}
                    authorPhotoUrl={profilePhotoUrl}
                    hasMore={hasMorePosts}
                    loadingMore={loadingMorePosts}
                    onLoadMore={handleLoadMorePosts}
                  />
                )
              ) : showProgressTab ? (
                <ProfileProgressSection
                  refreshError={progressError}
                  progressModel={progressModel}
                />
              ) : (
                <ProfileLockedState
                  title="Progress hidden"
                  message="This user has disabled public progress visibility."
                />
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
      <ConfirmationSheet
        visible={Boolean(confirmation)}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? "Confirm"}
        confirmTone={confirmation?.confirmTone ?? "default"}
        loading={followLoading || blockLoading}
        onCancel={dismissConfirmation}
        onConfirm={() => {
          void confirmAction();
        }}
      />
      <ModalSheet visible={actionMenuVisible} onRequestClose={closeActionMenu} contentClassName="pb-2">
        <View className="items-center pb-2 pt-1">
          <View className="h-1.5 w-12 rounded-full bg-neutral-800" />
        </View>
        <Text className="mt-3 text-xl font-bold text-white">Profile actions</Text>
        <Text className="mt-2 text-sm leading-6 text-neutral-400">
          Manage how you interact with @{profile.username}.
        </Text>
        <View className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
          <TouchableOpacity
            accessibilityRole="button"
            className="flex-row items-center justify-between bg-neutral-900 px-4 py-4"
            disabled={followLoading || blockLoading}
            onPress={handleBlockMenuPress}
            testID="user-profile-block-menu-row"
          >
            <Text className="text-base font-semibold text-rose-300">{blockButtonLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fda4af" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          className="mt-3 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
          disabled={followLoading || blockLoading}
          onPress={closeActionMenu}
        >
          <Text className="text-sm font-semibold text-neutral-200">Cancel</Text>
        </TouchableOpacity>
      </ModalSheet>
    </AppScreen>
  );
}
