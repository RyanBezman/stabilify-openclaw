import type { NavigatorScreenParams } from "@react-navigation/native";
import type { ActiveCoach, CoachSpecialization } from "../features/coaches";
import type { PostRow } from "../data/types";

export type AuthedTabParamList = {
  Today:
    | {
        gymSessionAnalyze?: {
          photoUri: string;
          startedAt: string;
        };
      }
    | undefined;
  Feed: { createdPost?: PostRow } | undefined;
  Search: undefined;
  Coaches: { specialization?: CoachSpecialization } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Guest: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Onboarding: { prefillName?: string } | undefined;
  Authed: NavigatorScreenParams<AuthedTabParamList> | undefined;
  LogWeighIn: undefined;
  GymSettings: undefined;
  ProfileSettings: undefined;
  UserProfile: { userId: string };
  FollowRequests: undefined;
  GymValidationRequestDetail: { requestId: string };
  BillingPlans: undefined;
  CreatePost: { defaultAudienceHint?: string } | undefined;
  CoachWorkspace:
    | {
        coach?: ActiveCoach;
        tab?: "plan" | "chat";
        openIntake?: boolean;
        openDraft?: boolean;
        requirePlanFeedbackChoice?: boolean;
        feedbackContext?: string;
        specialization?: CoachSpecialization;
        prefill?: string;
        inputMode?: "text" | "voice";
      }
    | undefined;
  CoachOnboardingFlow:
    | {
        specialization?: CoachSpecialization;
      }
    | undefined;
  CoachChat:
    | {
        coach?: ActiveCoach;
        prefill?: string;
        initialDomain?: CoachSpecialization;
        specialization?: CoachSpecialization;
      }
    | undefined;
  CoachProfile:
    | {
        coach?: ActiveCoach;
        specialization?: CoachSpecialization;
      }
    | undefined;
  CoachCheckins:
    | {
        specialization?: CoachSpecialization;
      }
    | undefined;
};
