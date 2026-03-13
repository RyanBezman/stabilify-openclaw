import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthHeader from "../components/auth/AuthHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import Button from "../components/ui/Button";
import ConfirmationSheet from "../components/ui/ConfirmationSheet";
import AppScreen from "../components/ui/AppScreen";
import {
  fetchBlockedProfiles,
  unblockUser,
  type BlockedProfile,
} from "../lib/data/relationships";
import { publishRelationshipSyncEvent } from "../lib/features/shared";
import type { RootStackParamList } from "../lib/navigation/types";
import { getProfilePhotoSignedUrl } from "../lib/features/profile";

type BlockedAccountsScreenProps = NativeStackScreenProps<RootStackParamList, "BlockedAccounts">;

export default function BlockedAccounts({ navigation }: BlockedAccountsScreenProps) {
  const mountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedProfile[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [pendingUnblock, setPendingUnblock] = useState<BlockedProfile | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, []);

  const loadBlockedAccounts = useCallback(async (requestId: number) => {
    setLoading(true);
    const result = await fetchBlockedProfiles({ limit: 50, cursor: 0 });

    if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
      return;
    }

    if (result.error) {
      setError(result.error || "Couldn't load blocked accounts.");
      setBlockedAccounts([]);
      setPhotoUrls({});
      setLoading(false);
      return;
    }

    const nextBlockedAccounts = result.data?.items ?? [];
    setBlockedAccounts(nextBlockedAccounts);
    setError(null);

    const nextPhotoUrls: Record<string, string | null> = {};
    await Promise.all(
      nextBlockedAccounts.map(async (entry) => {
        if (!entry.avatarPath) {
          nextPhotoUrls[entry.followedUserId] = null;
          return;
        }

        const signedUrlResult = await getProfilePhotoSignedUrl(entry.avatarPath);
        nextPhotoUrls[entry.followedUserId] = signedUrlResult.data?.signedUrl ?? null;
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
      void loadBlockedAccounts(requestId);

      return () => {
        loadRequestIdRef.current += 1;
      };
    }, [loadBlockedAccounts]),
  );

  useEffect(() => {
    if (blockedAccounts.length === 0) {
      setPhotoUrls({});
    }
  }, [blockedAccounts.length]);

  const handleUnblockPress = useCallback(
    (entry: BlockedProfile) => {
      if (unblockingUserId) {
        return;
      }
      setPendingUnblock(entry);
    },
    [unblockingUserId],
  );

  const dismissUnblockConfirmation = useCallback(() => {
    if (unblockingUserId) {
      return;
    }
    setPendingUnblock(null);
  }, [unblockingUserId]);

  const confirmUnblock = useCallback(async () => {
    if (!pendingUnblock) {
      return;
    }

    const entry = pendingUnblock;
    setPendingUnblock(null);
    setUnblockingUserId(entry.followedUserId);
    const result = await unblockUser(entry.followedUserId);

    if (!mountedRef.current) {
      return;
    }

    setUnblockingUserId(null);

    if (result.error) {
      Alert.alert("Couldn't unblock account", result.error);
      return;
    }

    setBlockedAccounts((current) =>
      current.filter((item) => item.followedUserId !== entry.followedUserId),
    );
    setPhotoUrls((current) => {
      const next = { ...current };
      delete next[entry.followedUserId];
      return next;
    });
    publishRelationshipSyncEvent({
      type: "block_state_changed",
      targetUserId: entry.followedUserId,
      nextState: "none",
    });
  }, [pendingUnblock]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
        <AuthHeader title="Blocked Accounts" onBack={navigation.goBack} />

        <Text className="mb-4 text-sm leading-5 text-neutral-400">
          Blocked accounts stay hidden from your search results and can&apos;t follow you or view your
          searchable social surfaces until you unblock them.
        </Text>

        {loading ? <Text className="text-sm text-neutral-400">Loading blocked accounts...</Text> : null}

        {!loading && error ? (
          <Text className="text-sm text-rose-300">Couldn&apos;t load blocked accounts: {error}</Text>
        ) : null}

        {!loading && !error && blockedAccounts.length === 0 ? (
          <View className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-5">
            <Text className="text-sm text-neutral-300">No blocked accounts.</Text>
            <Text className="mt-1 text-sm leading-5 text-neutral-400">
              When you block someone, they&apos;ll appear here so you can unblock them later.
            </Text>
          </View>
        ) : null}

        {!loading && !error && blockedAccounts.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-neutral-800">
            {blockedAccounts.map((entry, index) => {
              const isUnblocking = unblockingUserId === entry.followedUserId;
              return (
                <View
                  key={entry.id}
                  className={`bg-neutral-900/70 px-4 py-3.5 ${
                    index < blockedAccounts.length - 1 ? "border-b border-neutral-800" : ""
                  }`}
                >
                  <View className="flex-row items-center">
                    <ProfileAvatar
                      displayName={entry.displayName}
                      photoUrl={photoUrls[entry.followedUserId] ?? null}
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
                  </View>

                  <View className="mt-3">
                    <Button
                      title={isUnblocking ? "Unblocking..." : "Unblock"}
                      variant="secondary"
                      size="sm"
                      className="self-start"
                      disabled={Boolean(unblockingUserId)}
                      loading={isUnblocking}
                      onPress={() => handleUnblockPress(entry)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <ConfirmationSheet
        visible={Boolean(pendingUnblock)}
        title="Unblock account"
        message={
          pendingUnblock
            ? `Unblock @${pendingUnblock.username}? They can discover your public profile and send follow requests again.`
            : ""
        }
        confirmLabel="Unblock"
        confirmTone="default"
        loading={Boolean(unblockingUserId)}
        onCancel={dismissUnblockConfirmation}
        onConfirm={() => {
          void confirmUnblock();
        }}
      />
    </AppScreen>
  );
}
