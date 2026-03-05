import type { ActiveCoach } from "../types";
import type {
  CoachCheckinsPayload,
  WeeklyCheckinInput,
} from "../types/checkinsTypes";
import {
  fetchNutritionCheckins,
  submitWeeklyCheckinV2,
} from "../services/checkins";
import { isTierRestrictedCoachError } from "../services/chatClient";

type WorkflowErrorInfo = {
  message: string;
  status?: number;
  code?: string;
};

type WorkflowResultWithPayload<T> =
  | { status: "success"; payload: T }
  | { status: "tier_required" }
  | { status: "error"; error: WorkflowErrorInfo };

function parseErrorCodeFromDetails(details: unknown): string | undefined {
  if (typeof details !== "string" || !details.trim()) return undefined;
  try {
    const parsed = JSON.parse(details);
    return typeof parsed?.code === "string" ? parsed.code : undefined;
  } catch {
    return undefined;
  }
}

function normalizeWorkflowErrorMessage(args: {
  rawMessage: string;
  status?: number;
  code?: string;
}) {
  if (args.rawMessage.includes("No active nutrition coach could be resolved")) {
    return "No active nutrition coach is selected. Please re-select your coach and retry.";
  }
  if (args.rawMessage.includes("No active coach selected")) {
    return "No active nutrition coach is selected. Please re-select your coach and retry.";
  }
  if (args.code === "CHECKIN_VALIDATION" || args.status === 400) {
    return "Please review your weekly check-in values and try again.";
  }
  if (args.code === "CHECKIN_AUTH" || args.status === 401) {
    return "Your session expired. Please sign in again and retry.";
  }
  if (args.code === "CHECKIN_CONFIG" || args.status === 503) {
    return "Weekly check-ins are temporarily unavailable. Please retry shortly.";
  }
  if (
    args.code === "CHECKIN_DATABASE"
    || args.code === "CHECKIN_UNKNOWN"
    || (typeof args.status === "number" && args.status >= 500)
  ) {
    return "Couldn't sync weekly check-ins right now. Please retry.";
  }
  return "Couldn't complete the weekly check-in request. Please retry.";
}

function toWorkflowErrorInfo(error: unknown): WorkflowErrorInfo {
  const err = error as Error & { status?: number; code?: string; details?: string };
  const status = typeof err.status === "number" ? err.status : undefined;
  const code = err.code ?? parseErrorCodeFromDetails(err.details);
  const rawMessage = String(err.message ?? error ?? "");
  return {
    message: normalizeWorkflowErrorMessage({ rawMessage, status, code }),
    status,
    code,
  };
}

type CoachCheckinsWorkflowOptions = {
  coach?: ActiveCoach | null;
  limit?: number;
};

type SubmitCoachCheckinWorkflowOptions = CoachCheckinsWorkflowOptions & {
  input: WeeklyCheckinInput;
};

export async function hydrateCoachCheckinsWorkflow({
  coach,
  limit,
}: CoachCheckinsWorkflowOptions): Promise<WorkflowResultWithPayload<CoachCheckinsPayload>> {
  try {
    const payload = await fetchNutritionCheckins({ coach, limit });
    return { status: "success", payload };
  } catch (error) {
    if (isTierRestrictedCoachError(error)) {
      return { status: "tier_required" };
    }
    return {
      status: "error",
      error: toWorkflowErrorInfo(error),
    };
  }
}

export async function submitCoachCheckinWorkflow({
  coach,
  limit,
  input,
}: SubmitCoachCheckinWorkflowOptions): Promise<WorkflowResultWithPayload<CoachCheckinsPayload>> {
  try {
    const payload = await submitWeeklyCheckinV2(input, { coach, limit });
    return { status: "success", payload };
  } catch (error) {
    if (isTierRestrictedCoachError(error)) {
      return { status: "tier_required" };
    }
    return {
      status: "error",
      error: toWorkflowErrorInfo(error),
    };
  }
}
