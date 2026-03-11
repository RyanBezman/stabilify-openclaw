import type { ActiveCoach } from "../types";
import type { CoachAccessViewState } from "./useCoachAccessGate";

export function resolveCoachWorkspaceEntryState(args: {
  activeCoach: ActiveCoach | null;
  routeCoach?: ActiveCoach | null;
  hydrated: boolean;
  allowRouteCoachFallback?: boolean;
}) {
  const routeCoachFallbackAllowed = !args.hydrated || Boolean(args.allowRouteCoachFallback);
  const coach = args.activeCoach ?? (routeCoachFallbackAllowed ? (args.routeCoach ?? null) : null);

  return {
    coach,
    selectionHydrated: args.hydrated || Boolean(coach),
  };
}

export function shouldShowCoachWorkspaceBlockingSkeleton(args: {
  viewState: CoachAccessViewState;
  isPro: boolean;
  hydrated: boolean;
  checkingOnboarding: boolean;
  hasCoach: boolean;
}) {
  return (
    args.viewState === "gating"
    || (args.viewState === "ready" && args.isPro && !args.hydrated)
    || (args.checkingOnboarding && !args.hasCoach)
  );
}

export function shouldShowCoachCheckinsLoadingState(args: {
  viewState: CoachAccessViewState;
  isPro: boolean;
  hydrated: boolean;
}) {
  return args.viewState === "gating" || (args.viewState === "ready" && args.isPro && !args.hydrated);
}
