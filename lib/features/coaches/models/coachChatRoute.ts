import type { RootStackParamList } from "../../../navigation/types";

export function mapCoachChatRouteToWorkspaceParams(
  params: RootStackParamList["CoachChat"],
): NonNullable<RootStackParamList["CoachWorkspace"]> {
  const specialization =
    params?.specialization ?? params?.initialDomain ?? params?.coach?.specialization ?? "workout";

  return {
    specialization,
    coach: params?.coach,
    tab: "chat",
    prefill: params?.prefill,
    inputMode: "text",
  };
}
