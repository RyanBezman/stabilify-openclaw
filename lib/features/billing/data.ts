import type { MembershipTier } from "../../data/types";
import { supabase } from "../../supabase";
import type { AuthedBillingUser, BillingServiceResult } from "./types";
import { fail, ok } from "../shared";

async function getAuthedUser(): Promise<
  BillingServiceResult<{ user?: AuthedBillingUser }>
> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }
  return ok({ user: data.user as AuthedBillingUser });
}

export async function fetchMembershipTier(): Promise<
  BillingServiceResult<{ tier: MembershipTier }>
> {
  const { data: authData } = await getAuthedUser();
  if (!authData?.user) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) {
    return fail(error);
  }
  if (!data) {
    return fail("Profile not found. Complete onboarding first.", { code: "NOT_FOUND" });
  }

  return ok({ tier: data.membership_tier === "pro" ? "pro" : "free" });
}

export async function setMembershipTier(
  tier: MembershipTier,
): Promise<BillingServiceResult<{ ok: true }>> {
  const { data: authData } = await getAuthedUser();
  if (!authData?.user) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  if (tier !== "free" && tier !== "pro") {
    return fail("Unsupported membership tier.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ membership_tier: tier })
    .eq("id", authData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail(error);
  }
  if (!data) {
    return fail("Couldn't update plan. Complete onboarding first.", { code: "NOT_FOUND" });
  }

  return ok({ ok: true });
}
