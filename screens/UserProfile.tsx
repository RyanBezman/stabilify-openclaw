import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../lib/navigation/types";
import AuthHeader from "../components/auth/AuthHeader";
import ProfileSkeleton from "../components/profile/ProfileSkeleton";
import ProfileHero from "../components/profile/ProfileHero";
import ProfilePostsSection from "../components/profile/ProfilePostsSection";
import ProfileProgressSection from "../components/profile/ProfileProgressSection";
import ProfileTabPicker, { type ProfileContentTab } from "../components/profile/ProfileTabPicker";
import ProfileLockedState from "../components/profile/ProfileLockedState";
import Button from "../components/ui/Button";
import { useUserFollowActions } from "../lib/features/profile";
import { useUserProfileQuery } from "../lib/features/profile";

type UserProfileProps = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export default function UserProfile({ navigation, route }: UserProfileProps) {
  const targetUserId = route.params.userId;
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("posts");

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
    shouldRedirectToOwnProfile,
    contentOpacity,
    isOwner,
    isPrivateAndLocked,
    showProgressTab,
    socialStats,
    progressModel,
    handleLoadMorePosts,
  } = useUserProfileQuery({ targetUserId });

  const { followLoading, followButtonLabel, handleFollowPress } = useUserFollowActions({
    targetUserId,
    profile,
    followState,
    setFollowState,
    setFollowersCount,
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-950">
        <StatusBar style="light" />
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
          <AuthHeader title="Profile" onBack={navigation.goBack} />
          <ProfileSkeleton variant="public" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-950">
        <StatusBar style="light" />
        <View className="flex-1 px-5 pt-6">
          <AuthHeader title="Profile" onBack={navigation.goBack} />
          <Text className="text-sm text-rose-300">{error ?? "Couldn't load profile."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title={profile.displayName} onBack={navigation.goBack} />

        <Animated.View style={{ opacity: contentOpacity }}>
          <ProfileHero
            displayName={profile.displayName}
            subtitle={`@${profile.username}`}
            bio={profile.bio}
            photoUrl={profilePhotoUrl}
            socialStats={socialStats}
          />

          {!isOwner ? (
            <Button
              title={followButtonLabel}
              variant={followState === "none" ? "primary" : "secondary"}
              size="sm"
              className="mb-4"
              disabled={followLoading || followState === "blocked"}
              loading={followLoading}
              onPress={handleFollowPress}
            />
          ) : null}

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
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
