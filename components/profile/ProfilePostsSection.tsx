import { Text, View } from "react-native";
import type { PostRow } from "../../lib/data/types";
import Button from "../ui/Button";
import PostCard from "../posts/PostCard";

type ProfilePostsSectionProps = {
  posts: PostRow[];
  loading: boolean;
  error: string | null;
  emptyText: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onDeletePost?: (postId: string) => void;
  deletingPostId?: string | null;
};

export default function ProfilePostsSection({
  posts,
  loading,
  error,
  emptyText,
  authorDisplayName,
  authorPhotoUrl,
  hasMore,
  loadingMore,
  onLoadMore,
  onDeletePost,
  deletingPostId,
}: ProfilePostsSectionProps) {
  const canDelete = Boolean(onDeletePost);

  return (
    <View className="gap-3">
      {loading ? (
        <Text className="px-5 text-sm text-neutral-400">Loading posts...</Text>
      ) : null}

      {!loading && error ? (
        <Text className="px-5 text-sm text-rose-300">Couldn&apos;t load posts: {error}</Text>
      ) : null}

      {!loading && !error && posts.length === 0 ? (
        <Text className="px-5 text-sm text-neutral-400">{emptyText}</Text>
      ) : null}

      {!loading && posts.length > 0 ? (
        <View className="-mx-5 border-y border-neutral-800/70">
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
                authorDisplayName={authorDisplayName}
                authorPhotoUrl={authorPhotoUrl}
                variant="profile"
                onDelete={canDelete && onDeletePost ? () => onDeletePost(post.id) : undefined}
                deleting={deletingPostId === post.id}
              />
            </View>
          ))}
        </View>
      ) : null}

      {!loading && posts.length > 0 && hasMore ? (
        <View className="px-5">
          <Button
            title={loadingMore ? "Loading..." : "Load more"}
            variant="outline"
            size="sm"
            className="mt-1"
            onPress={onLoadMore}
            disabled={loadingMore}
          />
        </View>
      ) : null}
    </View>
  );
}
