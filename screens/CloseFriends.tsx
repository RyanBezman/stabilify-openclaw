import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthHeader from "../components/auth/AuthHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import Button from "../components/ui/Button";
import ConfirmationSheet from "../components/ui/ConfirmationSheet";
import AppScreen from "../components/ui/AppScreen";
import {
  fetchCloseFriendProfiles,
  removeCloseFriend,
  type CloseFriendProfile,
} from "../lib/data/relationships";
import { publishRelationshipSyncEvent } from "../lib/features/shared";
import type { RootStackParamList } from "../lib/navigation/types";
import { getProfilePhotoSignedUrl } from "../lib/features/profile";

type CloseFriendsScreenProps = NativeStackScreenProps<RootStackParamList, "CloseFriends">;

export default function CloseFriends({ navigation }: CloseFriendsScreenProps) {
  const mountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closeFriends, setCloseFriends] = useState<CloseFriendProfile[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
  const [removingFriendUserId, setRemovingFriendUserId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CloseFriendProfile | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, []);

  const loadCloseFriends = useCallback(async (requestId: number) => {
    setLoading(true);
    const result = await fetchCloseFriendProfiles({ limit: 50, cursor: 0 });

    if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setError(result.error || "Couldn't load close friends.");
      setCloseFriends([]);
      setPhotoUrls({});
      setLoading(false);
      return;
    }

    const nextCloseFriends = result.data?.items ?? [];
    setCloseFriends(nextCloseFriends);
    setError(null);

    const nextPhotoUrls: Record<string, string | null> = {};
    await Promise.all(
      nextCloseFriends.map(async (entry) => {
        if (!entry.avatarPath) {
          nextPhotoUrls[entry.friendUserId] = null;
          return;
        }

        const signedUrlResult = await getProfilePhotoSignedUrl(entry.avatarPath);
        nextPhotoUrls[entry.friendUserId] = signedUrlResult.data?.signedUrl ?? null;
      }),
    );

    if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
      return;
    }

    setPhotoUrls(nextPhotoUrls);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      void loadCloseFriends(requestId);

      return () => {
        loadRequestIdRef.current += 1;
      };
    }, [loadCloseFriends]),
  );

  useEffect(() => {
    if (closeFriends.length === 0) {
      setPhotoUrls({});
    }
  }, [closeFriends.length]);

  const handleRemovePress = useCallback(
    (entry: CloseFriendProfile) => {
      if (removingFriendUserId) {
        return;
      }
      setPendingRemoval(entry);
    },
    [removingFriendUserId],
  );

  const dismissRemovalConfirmation = useCallback(() => {
    if (removingFriendUserId) {
      return;
    }
    setPendingRemoval(null);
  }, [removingFriendUserId]);

  const confirmRemoval = useCallback(async () => {
    if (!pendingRemoval) {
      return;
    }

    const entry = pendingRemoval;
    setPendingRemoval(null);
    setRemovingFriendUserId(entry.friendUserId);
    const result = await removeCloseFriend(entry.friendUserId);

    if (!mountedRef.current) {
      return;
    }

    setRemovingFriendUserId(null);

    if (result.error) {
      Alert.alert("Couldn't remove close friend", result.error);
      return;
    }

    setCloseFriends((current) =>
      current.filter((item) => item.friendUserId !== entry.friendUserId),
    );
    setPhotoUrls((current) => {
      const next = { ...current };
      delete next[entry.friendUserId];
      return next;
    });
    publishRelationshipSyncEvent({
      type: "close_friend_removed",
      friendUserId: entry.friendUserId,
    });
  }, [pendingRemoval]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
        <AuthHeader title="Close Friends" onBack={navigation.goBack} />

        <Text className="mb-4 text-sm leading-5 text-neutral-400">
          Close friends can receive your private support posts and review provisional gym sessions.
        </Text>

        {loading ? <Text className="text-sm text-neutral-400">Loading close friends...</Text> : null}

        {!loading && error ? (
          <Text className="text-sm text-rose-300">Couldn't load close friends: {error}</Text>
        ) : null}

        {!loading && !error && closeFriends.length === 0 ? (
          <View className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-5">
            <Text className="text-sm text-neutral-300">No close friends yet.</Text>
            <Text className="mt-1 text-sm leading-5 text-neutral-400">
              When you add people to close friends, they&apos;ll appear here and you can remove them anytime.
            </Text>
          </View>
        ) : null}

        {!loading && !error && closeFriends.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-neutral-800">
            {closeFriends.map((entry, index) => {
              const isRemoving = removingFriendUserId === entry.friendUserId;
              return (
                <View
                  key={entry.id}
                  className={`bg-neutral-900/70 px-4 py-3.5 ${
                    index < closeFriends.length - 1 ? "border-b border-neutral-800" : ""
                  }`}
                >
                  <TouchableOpacity
                    activeOpacity={0.82}
                    className="flex-row items-center"
                    onPress={() => navigation.navigate("UserProfile", { userId: entry.friendUserId })}
                  >
                    <ProfileAvatar
                      displayName={entry.displayName}
                      photoUrl={photoUrls[entry.friendUserId] ?? null}
                      size={46}
                      className="mr-3"
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                        {entry.displayName}
                      </Text>
                      <Text className="mt-0.5 text-xs text-neutral-400" numberOfLines={1}>
                        @{entry.username}
                      </Text>
                      {entry.bio ? (
                        <Text className="mt-1 text-xs leading-5 text-neutral-500" numberOfLines={2}>
                          {entry.bio}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  <View className="mt-3 flex-row gap-2">
                    <Button
                      title="View profile"
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      disabled={Boolean(removingFriendUserId)}
                      onPress={() => navigation.navigate("UserProfile", { userId: entry.friendUserId })}
                    />
                    <Button
                      title={isRemoving ? "Removing..." : "Remove"}
                      variant="ghost"
                      size="sm"
                      className="flex-1 border border-rose-500/30"
                      textClassName="text-rose-300"
                      disabled={Boolean(removingFriendUserId)}
                      loading={isRemoving}
                      onPress={() => handleRemovePress(entry)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <ConfirmationSheet
        visible={Boolean(pendingRemoval)}
        title="Remove close friend"
        message={
          pendingRemoval
            ? `Remove @${pendingRemoval.username} from your close friends? They won't receive future private support posts or gym validation requests.`
            : ""
        }
        confirmLabel="Remove"
        confirmTone="destructive"
        loading={Boolean(removingFriendUserId)}
        onCancel={dismissRemovalConfirmation}
        onConfirm={() => {
          void confirmRemoval();
        }}
      />
    </AppScreen>
  );
}
