export { CoachProvider, useCoach } from "./hooks/CoachContext";
export { useCoachWorkspace } from "./hooks/useCoachWorkspace";
export { useCoachCheckins } from "./hooks/useCoachCheckins";
export { useCoachAccessGate } from "./hooks/useCoachAccessGate";
export { useCoachDashboard } from "./hooks/useCoachDashboard";

export { coachAvatarModuleByName, preloadCoachAvatars } from "./models/avatars";
export { coachFromSelection } from "./models/catalog";
export { mapCoachChatRouteToWorkspaceParams } from "./models/coachChatRoute";
export { isSameCoach } from "./models/identity";
export { coachPersonalityCopy } from "./models/personalityCopy";
export { resolveCoachVoiceProfile } from "./models/voiceProfile";
export { logCoachRequestDiagnostics, useCoachRenderDiagnostics } from "./models/devDiagnostics";

export {
  clearUnifiedCoachOnServer,
  ensureCoachSelectionProfile,
  fetchCoachOnboardingStatus,
  fetchCoachUserProfileJson,
  setUnifiedCoachOnServer,
  upsertCoachUserProfileJson,
} from "./services/api";
export { preserveUnifiedCoachSetupOnServer } from "./services/preserveSetup";
export { persistUnifiedCoachSelectionOnServer } from "./services/unifiedCoachSelection";

export {
  buildOnboardingResultsSnapshotCandidates,
  buildGeneratedTracksFromPlanStart,
  buildOnboardingResultTracks,
  hydrateOnboardingResultsSnapshot,
  COACH_ONBOARDING_STEPS,
  createInitialCoachOnboardingDraft,
  mapCoachUserProfileJsonToDraft,
  submitCoachOnboardingWorkflow,
  useCoachOnboarding,
  wasTrackGenerated,
} from "./onboarding";
export type {
  CoachOnboardingDraft,
  CoachOnboardingGeneratedTracks,
  CoachOnboardingPlanStart,
  CoachOnboardingResultTrack,
  CoachOnboardingStepId,
  CoachOnboardingTrack,
} from "./onboarding";
export { invokeCoachChat, isTierRestrictedCoachError, mapCoachMessages } from "./services/chatClient";
export { synthesizeCoachSpeech, transcribeCoachAudio } from "./services/voiceClient";
export {
  buildCoachFunnelWeeklyIdempotencyKey,
  trackCheckinSubmissionEvents,
  trackCoachFunnelEvent,
  trackPlanDecisionMadeEvent,
} from "./services/funnelTracking";
export { loadCoachState, saveCoachState } from "./services/storage";
export { hydrateCoachDashboard } from "./services/dashboard";

export type {
  ActiveCoach,
  CoachGender,
  CoachPersonality,
  CoachSpecialization,
} from "./types/types";
export type {
  WeeklyCheckin,
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinDifficulty,
  WeeklyCheckinRating,
  WeeklyCheckinTrend,
} from "./types/checkinsTypes";
export type {
  ChatMessage,
  CoachIntake,
  CoachPlan,
  NutritionGoal,
  NutritionIntake,
  NutritionPlan,
  PlanIntake,
  PlanStatus,
  WorkoutIntake,
  WorkoutPlan,
  WorkspaceTab,
} from "./types/workspaceTypes";
export type {
  CoachWorkspaceScreenProps,
  CoachWorkspaceViewProps,
  CoachesScreenProps,
  UseCoachWorkspaceOptions,
} from "./types/screen";
