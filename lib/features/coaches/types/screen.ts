import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthedTabParamList, RootStackParamList } from "../../../navigation/types";
import type { MembershipTier } from "../../../data/types";
import type { ActiveCoach, CoachSpecialization } from "./types";
import type { WorkspaceTab } from "./workspaceTypes";

export type CoachesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AuthedTabParamList, "Coaches">,
  NativeStackScreenProps<RootStackParamList>
>;

export type CoachWorkspaceScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CoachWorkspace"
>;

export type CoachWorkspaceViewProps = {
  coach: ActiveCoach | null;
  specialization: CoachSpecialization;
  hydrated: boolean;
  initialTab?: WorkspaceTab;
  openIntakeOnMount?: boolean;
  openDraftOnMount?: boolean;
  requirePlanFeedbackChoice?: boolean;
  feedbackContext?: string;
  prefill?: string;
  initialInputMode?: "text" | "voice";
  userTier?: MembershipTier | null;
  showBack?: boolean;
  onBack?: () => void;
  onRequestChangeCoach?: () => void;
  onRequestRemoveCoach?: () => void;
  onTierRequired?: () => void;
};

export type UseCoachWorkspaceOptions = Pick<
  CoachWorkspaceViewProps,
  | "coach"
  | "specialization"
  | "hydrated"
  | "initialTab"
  | "openIntakeOnMount"
  | "openDraftOnMount"
  | "requirePlanFeedbackChoice"
  | "feedbackContext"
  | "prefill"
  | "userTier"
  | "onTierRequired"
>;
