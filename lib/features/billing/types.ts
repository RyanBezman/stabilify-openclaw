import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MembershipTier } from "../../data/types";
import type { RootStackParamList } from "../../navigation/types";
import type { Result } from "../shared";

export type BillingPlansScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "BillingPlans"
>;

export type PlanTier = {
  id: MembershipTier;
  title: string;
  price: string;
  cadence: string;
  popular?: boolean;
  features: string[];
};

export type BillingServiceResult<T> = Result<T>;

export type AuthedBillingUser = {
  id: string;
};
