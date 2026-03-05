import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/auth/AuthHeader";
import Button from "../components/ui/Button";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import type { RootStackParamList } from "../lib/navigation/types";
import { respondToFollowRequest } from "../lib/data/relationships";
import {
  fetchActionableNotifications,
  type ActionableNotification,
} from "../lib/data/notifications";
import { getProfilePhotoSignedUrl } from "../lib/features/profile";
import { formatShortDate } from "../lib/utils/metrics";

type FollowRequestsProps = NativeStackScreenProps<RootStackParamList, "FollowRequests">;

export default function FollowRequests({ navigation }: FollowRequestsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ActionableNotification[]>([]);
  const [updatingFollowRequestId, setUpdatingFollowRequestId] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const result = await fetchActionableNotifications({ limit: 200 });

    if (result.error) {
      setError(result.error || "Couldn't load notifications.");
      setNotifications([]);
      setLoading(false);
      return;
    }

    const nextNotifications = result.data ?? [];
    setNotifications(nextNotifications);
    setError(null);

    const nextPhotoUrls: Record<string, string | null> = {};
    await Promise.all(
      nextNotifications.map(async (entry) => {
        if (!entry.requesterAvatarPath) {
          nextPhotoUrls[entry.requesterUserId] = null;
          return;
        }

        const signedUrlResult = await getProfilePhotoSignedUrl(entry.requesterAvatarPath);
        if (signedUrlResult.error) {
          nextPhotoUrls[entry.requesterUserId] = null;
          return;
        }

        nextPhotoUrls[entry.requesterUserId] = signedUrlResult.data?.signedUrl ?? null;
      }),
    );

    setPhotoUrls(nextPhotoUrls);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  useEffect(() => {
    if (!notifications.length) {
      setPhotoUrls({});
    }
  }, [notifications.length]);

  const handleFollowResponse = useCallback(
    async (requestId: string, requesterUserId: string, action: "accept" | "reject") => {
      if (updatingFollowRequestId) {
        return;
      }

      setUpdatingFollowRequestId(requestId);
      const result = await respondToFollowRequest(requesterUserId, action);
      setUpdatingFollowRequestId(null);

      if (result.error) {
        Alert.alert(
          `Couldn't ${action === "accept" ? "accept" : "reject"} request`,
          result.error,
        );
        return;
      }

      setNotifications((prev) =>
        prev.filter((entry) => !(entry.type === "follow_request" && entry.requestId === requestId)),
      );
    },
    [updatingFollowRequestId],
  );

  const pendingCount = useMemo(() => notifications.length, [notifications.length]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
        <AuthHeader title="Notifications" onBack={navigation.goBack} />

        {loading ? <Text className="text-sm text-neutral-400">Loading notifications...</Text> : null}

        {!loading && error ? (
          <Text className="text-sm text-rose-300">Couldn't load notifications: {error}</Text>
        ) : null}

        {!loading && !error ? (
          <Text className="mb-4 text-sm text-neutral-400">
            {pendingCount} pending notification{pendingCount === 1 ? "" : "s"}
          </Text>
        ) : null}

        {!loading && !error && pendingCount === 0 ? (
          <View className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-5">
            <Text className="text-sm text-neutral-400">No pending notifications.</Text>
          </View>
        ) : null}

        {!loading && !error && pendingCount > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-neutral-800">
            {notifications.map((entry, index) => (
              <View
                key={entry.id}
                className={`bg-neutral-900/70 px-4 py-3.5 ${
                  index < notifications.length - 1 ? "border-b border-neutral-800" : ""
                }`}
              >
                {entry.type === "follow_request" ? (
                  <>
                    <View className="flex-row items-center">
                      <ProfileAvatar
                        displayName={entry.requesterDisplayName}
                        photoUrl={photoUrls[entry.requesterUserId] ?? null}
                        size={46}
                        className="mr-3"
                      />
                      <View className="min-w-0 flex-1">
                        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-neutral-500">
                          Follow request
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-white" numberOfLines={1}>
                          {entry.requesterDisplayName} wants to follow you
                        </Text>
                        <Text className="mt-0.5 text-xs text-neutral-400" numberOfLines={1}>
                          @{entry.requesterUsername}
                        </Text>
                      </View>
                    </View>

                  <View className="mt-3 flex-row gap-2">
                    <Button
                      title={
                        updatingFollowRequestId === entry.requestId ? "Working..." : "Accept"
                      }
                      size="sm"
                      className="flex-1"
                      onPress={() =>
                        void handleFollowResponse(entry.requestId, entry.requesterUserId, "accept")
                      }
                      disabled={Boolean(updatingFollowRequestId)}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        void handleFollowResponse(entry.requestId, entry.requesterUserId, "reject")
                      }
                      disabled={Boolean(updatingFollowRequestId)}
                      className="flex-1 items-center justify-center rounded-2xl border border-neutral-700 px-4 py-2"
                    >
                      <Text className="text-sm font-semibold text-neutral-200">Reject</Text>
                    </TouchableOpacity>
                  </View>
                  </>
                ) : (
                  <View>
                    <View className="flex-row items-center">
                      <ProfileAvatar
                        displayName={entry.requesterDisplayName}
                        photoUrl={photoUrls[entry.requesterUserId] ?? null}
                        size={46}
                        className="mr-3"
                      />
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                          {entry.requesterDisplayName}
                        </Text>
                        <Text className="mt-0.5 text-xs text-neutral-400" numberOfLines={1}>
                          @{entry.requesterUsername} · {formatShortDate(entry.sessionDate)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-3 rounded-xl bg-violet-600/10 px-3.5 py-2.5">
                      <Text className="text-sm text-neutral-200">
                        Wants you to review their gym session
                      </Text>
                      {entry.requestMessage ? (
                        <Text className="mt-1 text-xs italic text-neutral-400" numberOfLines={2}>
                          {`\u201C${entry.requestMessage}\u201D`}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate("GymValidationRequestDetail", {
                          requestId: entry.requestId,
                        })
                      }
                      className="mt-3 items-center rounded-2xl bg-violet-600 py-2.5"
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold text-white">
                        Review session
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
