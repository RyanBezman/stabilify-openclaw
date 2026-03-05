import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import type { ViewStyle } from "react-native";
import type { PostType, ShareVisibility } from "../../lib/data/types";
import ProfileAvatar from "../profile/ProfileAvatar";

type PostCardProps = {
  postType: PostType;
  body: string | null;
  mediaUrls?: string[];
  createdAt: string;
  visibility: ShareVisibility;
  authorDisplayName?: string;
  authorPhotoUrl?: string | null;
  onPressAuthor?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  variant?: "feed" | "profile";
};

const POST_PREVIEW_CHARS = 240;
const PHOTO_POST_MAX_MEDIA = 4;

function formatPostCreatedAt(dateInput: string) {
  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    const sameYear = parsedDate.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat("en-US", sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }).format(parsedDate);
  } catch {
    return parsedDate.toDateString();
  }
}

function getVisibilityLabel(visibility: ShareVisibility) {
  if (visibility === "public") return "Public";
  if (visibility === "followers") return "Followers";
  if (visibility === "close_friends") return "Close friends";
  return "Private";
}

function getVisibilityBadgeClassName(visibility: ShareVisibility) {
  if (visibility === "public") return "border-emerald-700/40 bg-emerald-500/10";
  if (visibility === "followers") return "border-violet-700/40 bg-violet-500/10";
  if (visibility === "close_friends") return "border-amber-700/40 bg-amber-500/10";
  return "border-neutral-700 bg-neutral-900";
}

function getVisibilityTextClassName(visibility: ShareVisibility) {
  if (visibility === "public") return "text-emerald-300";
  if (visibility === "followers") return "text-violet-300";
  if (visibility === "close_friends") return "text-amber-300";
  return "text-neutral-400";
}

type ExpandableTextProps = {
  text: string | null;
  textClassName: string;
};

function ExpandableText({ text, textClassName }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const rawText = text ?? "";
  const shouldTruncate = rawText.length > POST_PREVIEW_CHARS;
  const visibleText = shouldTruncate && !expanded
    ? `${rawText.slice(0, POST_PREVIEW_CHARS).trimEnd()}...`
    : rawText;

  return (
    <>
      <Text className={textClassName}>{visibleText}</Text>
      {shouldTruncate ? (
        <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} className="mt-1 self-start">
          <Text className="text-xs font-medium text-neutral-400">
            {expanded ? "Show less" : "Show more"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function PhotoMediaGrid({ mediaUris }: { mediaUris: string[] }) {
  if (mediaUris.length === 0) {
    return null;
  }

  return (
    <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
      {mediaUris.map((uri, index) => {
        const isSingle = mediaUris.length === 1;
        const isTwoUp = mediaUris.length === 2;
        const isHero = mediaUris.length > 2 && index === 0;
        const tileStyle: ViewStyle = isSingle || isHero
          ? { width: "100%" as const, aspectRatio: 4 / 5 }
          : isTwoUp
            ? { width: "49.2%" as const, aspectRatio: 1 }
            : { width: "49.2%" as const, aspectRatio: 1 };

        return (
          <View
            key={`${uri}-${index}`}
            className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
            style={tileStyle}
          >
            <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
          </View>
        );
      })}
    </View>
  );
}

export default function PostCard({
  postType,
  body,
  mediaUrls = [],
  createdAt,
  visibility,
  authorDisplayName,
  authorPhotoUrl,
  onPressAuthor,
  onDelete,
  deleting = false,
  variant = "feed",
}: PostCardProps) {
  const isProfileVariant = variant === "profile";
  const containerClassName = isProfileVariant ? "w-full px-5 py-3.5" : "w-full px-4 py-3.5";
  const avatarSize = isProfileVariant ? 48 : 52;
  const metaTextClassName = isProfileVariant ? "text-[12px] text-neutral-500" : "text-[13px] text-neutral-500";
  const visibilityBadgeClassName = getVisibilityBadgeClassName(visibility);
  const photoMediaUris = mediaUrls.slice(0, PHOTO_POST_MAX_MEDIA);
  const hasRenderablePhotoMedia = postType === "photo" && photoMediaUris.length > 0;
  const canDelete = isProfileVariant && Boolean(onDelete);

  return (
    <View className={containerClassName}>
      <View className="flex-row">
        {authorDisplayName ? (
          onPressAuthor ? (
            <TouchableOpacity
              onPress={onPressAuthor}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Open ${authorDisplayName}'s profile`}
              className="mr-3"
            >
              <ProfileAvatar
                displayName={authorDisplayName}
                photoUrl={authorPhotoUrl ?? null}
                size={avatarSize}
              />
            </TouchableOpacity>
          ) : (
            <ProfileAvatar
              displayName={authorDisplayName}
              photoUrl={authorPhotoUrl ?? null}
              size={avatarSize}
              className="mr-3"
            />
          )
        ) : (
          <View className="mr-3 h-10 w-10 rounded-full bg-neutral-800" />
        )}

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              {authorDisplayName ? (
                onPressAuthor ? (
                  <TouchableOpacity
                    onPress={onPressAuthor}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${authorDisplayName}'s profile`}
                  >
                    <Text className={isProfileVariant ? "text-[14px] font-semibold text-white" : "text-[15px] font-semibold text-white"}>
                      {authorDisplayName}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text className={isProfileVariant ? "text-[14px] font-semibold text-white" : "text-[15px] font-semibold text-white"}>
                    {authorDisplayName}
                  </Text>
                )
              ) : null}
              <Text className={`ml-1.5 ${metaTextClassName}`}>{formatPostCreatedAt(createdAt)}</Text>
            </View>

            {canDelete ? (
              <TouchableOpacity onPress={onDelete} disabled={deleting} className="px-1 py-0.5">
                <Text className="text-xs font-medium text-rose-300">
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {postType === "photo" ? (
            <>
              {hasRenderablePhotoMedia ? (
                <PhotoMediaGrid mediaUris={photoMediaUris} />
              ) : null}
              {body ? (
                <ExpandableText text={body} textClassName="mt-2 text-base leading-6 text-neutral-100" />
              ) : null}
              {!hasRenderablePhotoMedia && !body ? (
                <ExpandableText text="Photo post" textClassName="mt-1 text-lg leading-7 text-neutral-100" />
              ) : null}
            </>
          ) : (
            <ExpandableText text={body} textClassName="mt-1 text-lg leading-7 text-neutral-100" />
          )}

          <View className="mt-2 flex-row items-center">
            <View className={`rounded-full border px-2 py-0.5 ${visibilityBadgeClassName}`}>
              <Text className={`text-[10px] font-medium uppercase tracking-wide ${getVisibilityTextClassName(visibility)}`}>
                {getVisibilityLabel(visibility)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
