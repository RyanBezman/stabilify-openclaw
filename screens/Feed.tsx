import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PostCard from "../components/posts/PostCard";
import FeedPostsSkeleton from "../components/posts/FeedPostsSkeleton";
import type { AuthedTabParamList, RootStackParamList } from "../lib/navigation/types";
import { useFeed } from "../lib/features/feed";
import {
  FLOATING_TAB_HORIZONTAL_PADDING,
  FLOATING_TAB_SCREEN_SAFE_AREA_EDGES,
  useFloatingTabBarLayout,
} from "../lib/navigation/useFloatingTabBarLayout";
import AppScreen from "../components/ui/AppScreen";

const FAB_TAB_GAP = 20;
const REFRESH_OFFSET = 72;
const TAB_COUNT = 5;
const PROFILE_TAB_INDEX = 4;
const FAB_SIZE = 56;
const FEED_MAX_CONTENT_WIDTH = 820;

type FeedProps = CompositeScreenProps<
  BottomTabScreenProps<AuthedTabParamList, "Feed">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function Feed({ navigation, route }: FeedProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { overlayHeight } = useFloatingTabBarLayout();

  const {
    posts,
    loading,
    error,
    loadingMore,
    authorPhotoUrls,
    refreshing,
    defaultAudienceHint,
    currentAuthorContext,
    refreshFeed,
    handleFeedScroll,
    handlePostCreated,
  } = useFeed();

  useEffect(() => {
    const createdPost = route.params?.createdPost;
    if (!createdPost) {
      return;
    }

    void handlePostCreated(createdPost);
    navigation.setParams({ createdPost: undefined });
  }, [handlePostCreated, navigation, route.params?.createdPost]);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) {
      contentOpacity.setValue(0);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, contentOpacity]);

  const fabBottom = overlayHeight + FAB_TAB_GAP;
  const contentHorizontalOffset = Math.max(0, (width - FEED_MAX_CONTENT_WIDTH) / 2);
  const tabBarInnerWidth = Math.max(
    0,
    width - FLOATING_TAB_HORIZONTAL_PADDING * 2 - insets.left - insets.right,
  );
  const profileTabCenterX =
    FLOATING_TAB_HORIZONTAL_PADDING +
    insets.left +
    tabBarInnerWidth * ((PROFILE_TAB_INDEX + 0.5) / TAB_COUNT);
  const fabLeft = profileTabCenterX - contentHorizontalOffset - FAB_SIZE / 2;
  const contentBottomPadding = fabBottom + FAB_SIZE + 24;

  return (
    <AppScreen
      className="flex-1 bg-neutral-950"
      edges={FLOATING_TAB_SCREEN_SAFE_AREA_EDGES}
      maxContentWidth={FEED_MAX_CONTENT_WIDTH}
    >
      <View className="px-4 pb-2 pt-4">
        <Text className="text-3xl font-bold tracking-tight text-white">Feed</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pt-2"
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshFeed()}
            tintColor="#a3a3a3"
            progressViewOffset={REFRESH_OFFSET}
          />
        }
      >
        {refreshing && !loading ? (
          <View className="mb-3 flex-row items-center justify-center px-4">
            <ActivityIndicator size="small" color="#a3a3a3" />
          </View>
        ) : null}

        {loading ? <FeedPostsSkeleton /> : null}

        {!loading ? (
          <Animated.View style={{ opacity: contentOpacity }}>
            {error ? (
              <View className="mx-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <Text className="text-sm text-rose-200">Couldn&apos;t load feed: {error}</Text>
              </View>
            ) : null}

            {!error && posts.length === 0 ? (
              <View className="mx-4 items-center rounded-2xl border border-neutral-800 bg-neutral-900/60 px-6 py-10">
                <Ionicons name="chatbubble-outline" size={36} color="#525252" />
                <Text className="mt-4 text-base font-semibold text-neutral-200">
                  No posts yet
                </Text>
                <Text className="mt-1 text-center text-sm leading-relaxed text-neutral-500">
                  Share your first update with the community. Tap the + button below to get started.
                </Text>
              </View>
            ) : null}

            {posts.length > 0 ? (
              <View className={`border-t border-neutral-800/70 ${loadingMore ? "" : "border-b"}`}>
                {posts.map((post, index) => (
                  <View
                    key={post.id}
                    className={index < posts.length - 1 ? "border-b border-neutral-800/70" : ""}
                  >
                    <PostCard
                      postType={post.postType}
                      body={post.body}
                      mediaUrls={post.mediaUrls}
                      createdAt={post.createdAt}
                      visibility={post.visibility}
                      authorDisplayName={post.authorDisplayName}
                      authorPhotoUrl={authorPhotoUrls[post.authorUserId] ?? null}
                      onPressAuthor={() => {
                        if (currentAuthorContext?.userId === post.authorUserId) {
                          navigation.navigate("Profile");
                          return;
                        }
                        navigation.navigate("UserProfile", { userId: post.authorUserId });
                      }}
                      variant="feed"
                    />
                  </View>
                ))}
              </View>
            ) : null}

            {posts.length > 0 && loadingMore ? (
              <View className="mt-4 flex-row items-center justify-center px-4">
                <ActivityIndicator size="small" color="#a3a3a3" />
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("CreatePost", {
            defaultAudienceHint,
          })
        }
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create post"
        className="absolute h-14 w-14 items-center justify-center rounded-full bg-violet-600"
        style={{
          left: fabLeft,
          bottom: fabBottom,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.28,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
    </AppScreen>
  );
}
