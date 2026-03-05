import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ImageErrorEventData,
  type NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/auth/AuthHeader";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import Card from "../components/ui/Card";
import type { RootStackParamList } from "../lib/navigation/types";
import {
  fetchGymSessionValidationRequestDetail,
  submitGymSessionValidation,
  type GymSessionValidationRequestDetail,
} from "../lib/data/gymSessionValidation";
import { getProfilePhotoSignedUrl } from "../lib/features/profile";
import { getGymSessionStatusReasonCopy } from "../lib/data/gymSessionStatusReason";
import { formatShortDate } from "../lib/utils/metrics";

type GymValidationRequestDetailProps = NativeStackScreenProps<
  RootStackParamList,
  "GymValidationRequestDetail"
>;

function formatRoundedDistanceText(meters: number | null): string {
  if (meters === null) {
    return "\u2014";
  }

  const roundedMiles = Math.round(meters * 0.000621371 * 10) / 10;
  return `~${roundedMiles.toFixed(1)} mi from gym`;
}

function formatRecordedTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleString("en-US", {
    timeStyle: "short",
  });
}

export default function GymValidationRequestDetail({
  navigation,
  route,
}: GymValidationRequestDetailProps) {
  const requestId = route.params.requestId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<GymSessionValidationRequestDetail | null>(null);
  const [requesterPhotoUrl, setRequesterPhotoUrl] = useState<string | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState<"accept" | "decline" | null>(null);
  const [proofPhotoLoadError, setProofPhotoLoadError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadDetail = async () => {
        setLoading(true);
        const detailResult = await fetchGymSessionValidationRequestDetail(requestId);
        if (!active) {
          return;
        }

        if (detailResult.error || !detailResult.data) {
          if (detailResult.code === "NOT_FOUND") {
            setError(null);
            setStaleMessage("This request is no longer open. The session was already verified or the request expired.");
          } else {
            setError(detailResult.error ?? "Couldn't load validation request details.");
            setStaleMessage(null);
          }
          setDetail(null);
          setRequesterPhotoUrl(null);
          setLoading(false);
          return;
        }

        const nextDetail = detailResult.data;
        setDetail(nextDetail);
        setError(null);
        setStaleMessage(null);

        if (!nextDetail.requesterAvatarPath) {
          setRequesterPhotoUrl(null);
          setLoading(false);
          return;
        }

        const avatarResult = await getProfilePhotoSignedUrl(nextDetail.requesterAvatarPath);
        if (!active) {
          return;
        }

        setRequesterPhotoUrl(avatarResult.data?.signedUrl ?? null);
        setLoading(false);
      };

      void loadDetail();

      return () => {
        active = false;
      };
    }, [requestId]),
  );

  const reasonCopy = useMemo(
    () =>
      getGymSessionStatusReasonCopy(detail?.sessionStatusReason ?? null, {
        audience: "reviewer",
      }),
    [detail?.sessionStatusReason],
  );
  const reasonSummary = useMemo(() => {
    if (!reasonCopy) {
      return null;
    }
    return reasonCopy.actionText ?? reasonCopy.reasonText;
  }, [reasonCopy]);
  useEffect(() => {
    setProofPhotoLoadError(null);
  }, [detail?.proofPhotoUrl, requestId]);

  const canVote = detail?.request.status === "open";
  const hasProofPhoto = Boolean(detail?.proofPhotoUrl) && !proofPhotoLoadError;
  const disableAccept = !canVote || !hasProofPhoto || Boolean(submittingDecision);
  const disableDecline = !canVote || Boolean(submittingDecision);

  const handleProofPhotoError = useCallback(
    (event: NativeSyntheticEvent<ImageErrorEventData>) => {
      const imageError = event.nativeEvent.error?.trim();
      setProofPhotoLoadError(imageError || "Image failed to load.");
    },
    [],
  );

  const handleVote = useCallback(
    async (decision: "accept" | "decline") => {
      if (!detail || submittingDecision) {
        return;
      }

      if (decision === "accept" && !hasProofPhoto) {
        Alert.alert(
          "Photo required",
          "This request is missing a proof photo, so accept is unavailable.",
        );
        return;
      }

      setSubmittingDecision(decision);
      const result = await submitGymSessionValidation(detail.request.id, decision);
      setSubmittingDecision(null);

      if (result.error) {
        Alert.alert(
          `Couldn't ${decision === "accept" ? "accept" : "decline"} validation`,
          result.error,
        );
        return;
      }

      Alert.alert(
        decision === "accept" ? "Validation accepted" : "Validation declined",
        decision === "accept"
          ? "Session was upgraded to verified."
          : "Request has been declined.",
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    },
    [detail, hasProofPhoto, navigation, submittingDecision],
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-20 pt-6">
        <AuthHeader title="Validation review" onBack={navigation.goBack} />

        {loading ? <Text className="text-sm text-neutral-400">Loading request...</Text> : null}

        {!loading && error ? (
          <Card className="border-rose-500/40 bg-rose-500/10 p-5">
            <Text className="text-sm font-semibold text-rose-200">Couldn't load request</Text>
            <Text className="mt-2 text-sm text-rose-200/70">{error}</Text>
          </Card>
        ) : null}

        {!loading && !error && staleMessage ? (
          <Card className="border-neutral-800 bg-neutral-900/50 p-5">
            <Text className="text-sm font-semibold text-white">No action needed</Text>
            <Text className="mt-2 text-sm text-neutral-300">{staleMessage}</Text>
          </Card>
        ) : null}

        {!loading && !error && !staleMessage && detail ? (
          <>
            <View className="mb-5 flex-row items-center">
              <ProfileAvatar
                displayName={detail.requesterDisplayName}
                photoUrl={requesterPhotoUrl}
                size={48}
                className="mr-3"
              />
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-white" numberOfLines={1}>
                  {detail.requesterDisplayName}
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-400" numberOfLines={1}>
                  @{detail.requesterUsername} · {formatShortDate(detail.sessionDate)}
                </Text>
              </View>
            </View>

            {detail.proofPhotoUrl && !proofPhotoLoadError ? (
              <View className="mb-4 overflow-hidden rounded-2xl border border-neutral-800">
                <Image
                  source={{ uri: detail.proofPhotoUrl }}
                  className="h-72 w-full"
                  resizeMode="cover"
                  onError={handleProofPhotoError}
                />
              </View>
            ) : (
              <View className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <Text className="text-sm font-medium text-amber-200">
                  Proof photo unavailable
                </Text>
                {proofPhotoLoadError ? (
                  <Text className="mt-1 text-xs text-amber-200/80">{proofPhotoLoadError}</Text>
                ) : null}
                {detail.proofPhotoError ? (
                  <Text className="mt-1 text-xs text-amber-200/80">{detail.proofPhotoError}</Text>
                ) : null}
              </View>
            )}

            <Card className="mb-4 p-4">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Session details
              </Text>
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-400">Time</Text>
                  <Text className="text-sm font-medium text-white">
                    {formatRecordedTimestamp(detail.sessionRecordedAt)}
                  </Text>
                </View>
                <View className="h-px bg-neutral-800/60" />
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-400">Distance</Text>
                  <Text className="text-sm font-medium text-white">
                    {formatRoundedDistanceText(detail.sessionDistanceMeters)}
                  </Text>
                </View>
                {reasonSummary ? (
                  <>
                    <View className="h-px bg-neutral-800/60" />
                    <View className="flex-row items-start justify-between">
                      <Text className="text-sm text-neutral-400">Reason</Text>
                      <Text className="ml-6 flex-1 text-right text-sm font-medium text-neutral-200">
                        {reasonSummary}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            </Card>

            {detail.request.requestMessage ? (
              <View className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
                  Requester note
                </Text>
                <Text className="mt-2 text-sm leading-6 text-neutral-100">
                  “{detail.request.requestMessage}”
                </Text>
              </View>
            ) : null}

            {canVote ? (
              <View className="gap-2">
                <TouchableOpacity
                  onPress={() => void handleVote("accept")}
                  disabled={disableAccept}
                  className={`items-center justify-center rounded-2xl py-4 ${
                    disableAccept ? "bg-emerald-800/30" : "bg-emerald-600"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-base font-semibold ${
                      disableAccept ? "text-white/40" : "text-white"
                    }`}
                  >
                    {submittingDecision === "accept" ? "Accepting..." : "Accept & verify"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleVote("decline")}
                  disabled={disableDecline}
                  className={`items-center justify-center rounded-2xl border py-4 ${
                    disableDecline
                      ? "border-neutral-800 bg-neutral-900/30"
                      : "border-neutral-700 bg-neutral-900"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-base font-semibold ${
                      disableDecline ? "text-neutral-600" : "text-neutral-200"
                    }`}
                  >
                    {submittingDecision === "decline" ? "Declining..." : "Decline"}
                  </Text>
                </TouchableOpacity>
                {!hasProofPhoto ? (
                  <Text className="mt-1 text-center text-xs text-amber-300">
                    Accept is disabled — proof photo is unavailable.
                  </Text>
                ) : null}
              </View>
            ) : (
              <View className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                <Text className="text-center text-sm text-neutral-400">
                  This request is no longer open for voting.
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
