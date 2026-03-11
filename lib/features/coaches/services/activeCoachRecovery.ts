import { setActiveCoachOnServer } from "./api";
import type { ActiveCoach, CoachSpecialization } from "../types";

export function hasNoActiveCoachSelectedError(error: unknown) {
  const raw = String((error as Error)?.message ?? error);
  return raw.includes("No active coach selected");
}

type InvokeCoachChatWithActiveCoachRecoveryOptions<T> = {
  authUserId: string | null;
  body: Record<string, unknown>;
  coach?: ActiveCoach | null;
  invokeCoachChat: (body: Record<string, unknown>) => Promise<T>;
  repairFailureMessage: string;
  specialization: CoachSpecialization;
  unresolvedCoachMessage: string;
};

export async function invokeCoachChatWithActiveCoachRecovery<T>({
  authUserId,
  body,
  coach,
  invokeCoachChat,
  repairFailureMessage,
  specialization,
  unresolvedCoachMessage,
}: InvokeCoachChatWithActiveCoachRecoveryOptions<T>): Promise<T> {
  try {
    return await invokeCoachChat(body);
  } catch (error) {
    if (!coach || !authUserId || !hasNoActiveCoachSelectedError(error)) {
      throw error;
    }

    const repair = await setActiveCoachOnServer(authUserId, specialization, coach);
    if (repair.error) {
      throw new Error(repair.error ?? repairFailureMessage);
    }

    try {
      return await invokeCoachChat(body);
    } catch (retryError) {
      if (!hasNoActiveCoachSelectedError(retryError)) {
        throw retryError;
      }
      throw new Error(unresolvedCoachMessage);
    }
  }
}
