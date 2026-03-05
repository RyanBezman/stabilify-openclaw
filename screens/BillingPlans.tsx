import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/auth/AuthHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { fetchMembershipTier, setMembershipTier } from "../lib/features/billing";
import type { MembershipTier } from "../lib/data/types";
import type { BillingPlansScreenProps, PlanTier } from "../lib/features/billing";
import { isSessionRequired } from "../lib/features/shared";

const PLAN_TIERS: PlanTier[] = [
  {
    id: "free",
    title: "Free",
    price: "$0",
    cadence: "/month",
    features: [
      "Basic profile and post tracking",
      "Standard feed and social visibility controls",
      "Manual progress updates",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: "$9.99",
    cadence: "/month",
    popular: true,
    features: [
      "Personalized AI coaching guidance",
      "Weekly analytics and trend summaries",
      "Priority sync and profile insights",
      "Expanded chat and plan generation limits",
    ],
  },
];

export default function BillingPlans({ navigation }: BillingPlansScreenProps) {
  const [currentTier, setCurrentTier] = useState<MembershipTier>("free");
  const [loadingTier, setLoadingTier] = useState(true);
  const [savingTier, setSavingTier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const formatTierLabel = (tier: MembershipTier) => (tier === "pro" ? "Pro" : "Free");

  const loadTier = useCallback(async () => {
    setLoadingTier(true);
    setError(null);

    const result = await fetchMembershipTier();
    if (isSessionRequired(result)) {
      setError("Please sign in again.");
      setLoadingTier(false);
      return;
    }

    if (result.error || !result.data?.tier) {
      setError(result.error ?? "Couldn't load your current plan.");
      setLoadingTier(false);
      return;
    }

    setCurrentTier(result.data.tier);
    setLoadingTier(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTier();
    }, [loadTier]),
  );

  const handleSwitchTier = useCallback(async (tier: MembershipTier) => {
    if (savingTier || tier === currentTier) return;

    setSavingTier(true);
    setError(null);
    setStatusMessage(null);

    const result = await setMembershipTier(tier);
    setSavingTier(false);

    if (isSessionRequired(result)) {
      setError("Please sign in again.");
      return;
    }
    if (result.error || !result.data?.ok) {
      setError(result.error ?? "Couldn't update your plan.");
      return;
    }

    setCurrentTier(tier);
    setStatusMessage(`Switched to ${formatTierLabel(tier)}.`);
  }, [currentTier, savingTier]);

  const confirmTierChange = useCallback((tier: MembershipTier) => {
    if (tier === currentTier || savingTier) return;

    const nextLabel = formatTierLabel(tier);
    Alert.alert(
      "Switch plan?",
      `Switch your account to ${nextLabel} now? Billing remains preview-only in this version.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: `Switch to ${nextLabel}`, onPress: () => void handleSwitchTier(tier) },
      ],
    );
  }, [currentTier, handleSwitchTier, savingTier]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-6">
        <AuthHeader title="Billing & plans" onBack={navigation.goBack} />

        <Card className="mb-6 p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            Current plan
          </Text>
          <View className="mt-2 min-h-[34px] justify-center">
            {loadingTier ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#a3a3a3" />
                <Text className="ml-2 text-sm font-medium text-neutral-400">Loading plan...</Text>
              </View>
            ) : (
              <Text className="text-2xl font-bold text-white">{formatTierLabel(currentTier)}</Text>
            )}
          </View>
          <Text className="mt-2 text-sm text-neutral-400">
            Switch tiers instantly in this preview. Checkout is not live yet.
          </Text>
        </Card>

        {error ? (
          <Card className="mb-4 border border-rose-500/30 bg-rose-950/20 p-4">
            <Text className="text-sm font-semibold text-rose-300">{error}</Text>
            <Button
              className="mt-3"
              variant="secondary"
              title="Retry"
              onPress={() => void loadTier()}
              disabled={loadingTier || savingTier}
            />
          </Card>
        ) : null}

        {statusMessage ? (
          <Card className="mb-4 border border-emerald-500/30 bg-emerald-950/20 p-4">
            <Text className="text-sm font-semibold text-emerald-200">{statusMessage}</Text>
          </Card>
        ) : null}

        <View className="mb-6 gap-4">
          {PLAN_TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={`p-5 ${tier.popular ? "border-violet-500 bg-violet-950/25" : ""}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="pr-3">
                  <Text className="text-lg font-bold text-white">{tier.title}</Text>
                  {tier.popular ? (
                    <Text className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                      Most popular
                    </Text>
                  ) : null}
                </View>
                <View className="items-end">
                  <Text className="text-xl font-bold text-white">{tier.price}</Text>
                  <Text className="text-xs text-neutral-400">{tier.cadence}</Text>
                </View>
              </View>

              <View className="mt-4 gap-2">
                {tier.features.map((feature) => (
                  <View key={feature} className="flex-row">
                    <Text className="mr-2 text-sm text-violet-300">•</Text>
                    <Text className="flex-1 text-sm text-neutral-200">{feature}</Text>
                  </View>
                ))}
              </View>

              <Button
                title={
                  currentTier === tier.id
                    ? "Current plan"
                    : `Switch to ${tier.title}`
                }
                variant={tier.popular ? "primary" : "secondary"}
                className="mt-5"
                onPress={() => confirmTierChange(tier.id)}
                disabled={loadingTier || savingTier || currentTier === tier.id}
              />
            </Card>
          ))}
        </View>

        <Text className="text-center text-xs text-neutral-500">
          Pricing and checkout are still preview-only in this version.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
