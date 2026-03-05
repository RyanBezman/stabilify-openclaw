import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { fetchMembershipTier } from "../../billing";
import { isSessionRequired } from "../../shared";
import type { MembershipTier } from "../../../data/types";

export type CoachAccessViewState = "gating" | "ready" | "locked";

type RefreshMembershipTierOptions = {
  blocking?: boolean;
};

let cachedMembershipTier: MembershipTier | null = null;
let cachedTierLoading = true;
let cachedTierError: string | null = null;

export function useCoachAccessGate() {
  const [membershipTier, setMembershipTier] = useState<MembershipTier | null>(cachedMembershipTier);
  const [tierLoading, setTierLoading] = useState(cachedTierLoading);
  const [tierError, setTierError] = useState<string | null>(cachedTierError);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const membershipTierRef = useRef<MembershipTier | null>(cachedMembershipTier);
  const initialCheckCompleteRef = useRef(false);
  const tierRequestRef = useRef(0);

  const refreshMembershipTier = useCallback(async (options?: RefreshMembershipTierOptions) => {
    const blocking = options?.blocking ?? false;
    const requestId = ++tierRequestRef.current;
    const currentTier = membershipTierRef.current;

    if (blocking) {
      setTierLoading(true);
      cachedTierLoading = true;
    }
    setTierError(null);
    cachedTierError = null;

    const result = await fetchMembershipTier();
    if (requestId !== tierRequestRef.current) return;

    const shouldResetTier = blocking || currentTier === null;

    if (isSessionRequired(result)) {
      if (shouldResetTier) {
        membershipTierRef.current = null;
        setMembershipTier(null);
        cachedMembershipTier = null;
      }
      setTierError("Please sign in again.");
      cachedTierError = "Please sign in again.";
      if (blocking) {
        setTierLoading(false);
        cachedTierLoading = false;
      }
      initialCheckCompleteRef.current = true;
      setInitialCheckComplete(true);
      return;
    }

    if (result.error || !result.data?.tier) {
      if (shouldResetTier) {
        membershipTierRef.current = null;
        setMembershipTier(null);
        cachedMembershipTier = null;
      }
      setTierError(result.error ?? "Couldn't load membership tier.");
      cachedTierError = result.error ?? "Couldn't load membership tier.";
      if (blocking) {
        setTierLoading(false);
        cachedTierLoading = false;
      }
      initialCheckCompleteRef.current = true;
      setInitialCheckComplete(true);
      return;
    }

    membershipTierRef.current = result.data.tier;
    setMembershipTier(result.data.tier);
    cachedMembershipTier = result.data.tier;
    if (blocking) {
      setTierLoading(false);
      cachedTierLoading = false;
    }
    initialCheckCompleteRef.current = true;
    setInitialCheckComplete(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshMembershipTier({
        blocking: !initialCheckCompleteRef.current,
      });
    }, [refreshMembershipTier])
  );

  const lockToFreeTier = useCallback(() => {
    membershipTierRef.current = "free";
    setMembershipTier("free");
    setTierLoading(false);
    setTierError(null);
    cachedMembershipTier = "free";
    cachedTierLoading = false;
    cachedTierError = null;
    initialCheckCompleteRef.current = true;
    setInitialCheckComplete(true);
  }, []);

  const viewState: CoachAccessViewState = !initialCheckComplete || tierLoading
    ? "gating"
    : membershipTier === "pro"
      ? "ready"
      : "locked";

  return {
    membershipTier,
    tierLoading,
    tierError,
    viewState,
    isPro: viewState === "ready",
    refreshMembershipTier,
    lockToFreeTier,
  };
}

export function __resetCoachAccessGateCacheForTests() {
  cachedMembershipTier = null;
  cachedTierLoading = true;
  cachedTierError = null;
}
