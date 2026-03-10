import { useCallback, useEffect, useState } from "react";
import { getGymSessionStatusReasonCopy } from "../../data/gymSessionStatusReason";
import {
  requestGymSessionValidation,
} from "../../data/gymSessionValidation";
import type {
  GymSessionStatus,
  GymSessionStatusReason,
} from "../../data/types";
import { formatDistance } from "../../utils/distance";

const ANALYSIS_INITIAL_PROGRESS = 0.17;
const ANALYSIS_PENDING_CAP = 0.92;
const ANALYSIS_RAMP_MS = 3200;

type GymSessionAnalysisState = {
  photoUri: string;
  startedAtMs: number;
  progress: number;
  result:
    | {
        phase: "verified" | "rejected";
        reason: string;
        sessionId: string | null;
        canRequestCloseFriendValidation: boolean;
        validationRequested: boolean;
      }
    | null;
};

type UseAuthedHomeGymFlowArgs = {
  analyzeRequest?: {
    photoUri: string;
    startedAt: string;
  };
  clearAnalyzeRequest: () => void;
  hasGymLocation: boolean;
  refreshDashboard: (options?: { preserveOnError?: boolean }) => Promise<{ error?: string }>;
  requestGymValidationForToday: (
    message?: string | null,
  ) => Promise<{ success: boolean; error?: string }>;
  todayGymSession?: {
    id: string;
    status: GymSessionStatus;
  } | null;
  unit: "lb" | "kg";
  userId?: string | null;
};

export function useAuthedHomeGymFlow({
  analyzeRequest,
  clearAnalyzeRequest,
  hasGymLocation,
  refreshDashboard,
  requestGymValidationForToday,
  todayGymSession,
  unit,
  userId,
}: UseAuthedHomeGymFlowArgs) {
  const [showValidationNoteModal, setShowValidationNoteModal] = useState(false);
  const [validationNote, setValidationNote] = useState("");
  const [showInlineGymCapture, setShowInlineGymCapture] = useState(false);
  const [requestingCloseFriendValidation, setRequestingCloseFriendValidation] = useState(false);
  const [gymSessionAnalysis, setGymSessionAnalysis] = useState<GymSessionAnalysisState | null>(
    null,
  );

  const hasVerifiedGymSessionToday = todayGymSession?.status === "verified";
  const canStartGymSessionCapture = hasGymLocation && !hasVerifiedGymSessionToday;
  const isGymFlowActive = showInlineGymCapture || Boolean(gymSessionAnalysis);

  const startGymSessionAnalysis = useCallback((photoUri: string, startedAtMs?: number) => {
    setGymSessionAnalysis({
      photoUri,
      startedAtMs: startedAtMs ?? Date.now(),
      progress: ANALYSIS_INITIAL_PROGRESS,
      result: null,
    });
  }, []);

  const resolveGymSessionAnalysis = useCallback(
    (
      sessionId: string,
      status: GymSessionStatus,
      statusReason: GymSessionStatusReason | null,
      distanceMeters: number | null,
    ) => {
      const reasonCopy = getGymSessionStatusReasonCopy(statusReason);
      const reason =
        status === "verified"
          ? "Your session is verified and counts toward your weekly progress."
          : statusReason === "outside_radius" && distanceMeters !== null
            ? `You're ${formatDistance(distanceMeters, unit)} from your gym. Ask close friends to validate or retry at your gym location.`
            : reasonCopy?.actionText
              ? `${reasonCopy.reasonText} ${reasonCopy.actionText}`
              : reasonCopy?.reasonText ?? "We couldn't verify this session.";

      setGymSessionAnalysis((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          progress: 1,
          result: {
            phase: status === "verified" ? "verified" : "rejected",
            reason,
            sessionId,
            canRequestCloseFriendValidation: status === "provisional",
            validationRequested: false,
          },
        };
      });
    },
    [unit],
  );

  const requestCloseFriendValidationFromAnalysis = useCallback(async () => {
    if (requestingCloseFriendValidation) {
      return { success: false } as const;
    }

    const sessionId = gymSessionAnalysis?.result?.sessionId;
    if (!sessionId) {
      return { success: false } as const;
    }

    setRequestingCloseFriendValidation(true);
    try {
      const result = await requestGymSessionValidation(sessionId, {
        userId: userId ?? undefined,
      });
      if (result.error) {
        return { success: false, error: result.error } as const;
      }

      setGymSessionAnalysis((previous) => {
        if (!previous?.result) {
          return previous;
        }

        return {
          ...previous,
          result: {
            ...previous.result,
            validationRequested: true,
            canRequestCloseFriendValidation: false,
          },
        };
      });

      return { success: true } as const;
    } finally {
      setRequestingCloseFriendValidation(false);
    }
  }, [gymSessionAnalysis?.result?.sessionId, requestingCloseFriendValidation, userId]);

  const submitGymValidationRequest = useCallback(async () => {
    const result = await requestGymValidationForToday(validationNote);
    if (!result.success) {
      return result;
    }

    setShowValidationNoteModal(false);
    setValidationNote("");
    return result;
  }, [requestGymValidationForToday, validationNote]);

  const closeGymSessionAnalysisCard = useCallback(async () => {
    const shouldRefreshProgress = Boolean(gymSessionAnalysis?.result);
    setGymSessionAnalysis(null);

    if (!shouldRefreshProgress) {
      return {};
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 220);
    });

    return refreshDashboard({ preserveOnError: true });
  }, [gymSessionAnalysis?.result, refreshDashboard]);

  useEffect(() => {
    if (!analyzeRequest?.photoUri) {
      return;
    }

    const parsedStartedAt = Date.parse(analyzeRequest.startedAt);
    startGymSessionAnalysis(
      analyzeRequest.photoUri,
      Number.isNaN(parsedStartedAt) ? undefined : parsedStartedAt,
    );
    clearAnalyzeRequest();
  }, [analyzeRequest, clearAnalyzeRequest, startGymSessionAnalysis]);

  useEffect(() => {
    if (!gymSessionAnalysis || gymSessionAnalysis.result) {
      return;
    }

    const intervalId = setInterval(() => {
      setGymSessionAnalysis((previous) => {
        if (!previous) {
          return previous;
        }

        const elapsedMs = Math.max(0, Date.now() - previous.startedAtMs);
        const projectedProgress =
          ANALYSIS_INITIAL_PROGRESS +
          (elapsedMs / ANALYSIS_RAMP_MS) *
            (ANALYSIS_PENDING_CAP - ANALYSIS_INITIAL_PROGRESS);
        const nextProgress = Math.min(
          ANALYSIS_PENDING_CAP,
          Math.max(previous.progress, projectedProgress),
        );

        if (nextProgress === previous.progress) {
          return previous;
        }

        return {
          ...previous,
          progress: nextProgress,
        };
      });
    }, 250);

    return () => clearInterval(intervalId);
  }, [gymSessionAnalysis?.result, gymSessionAnalysis?.startedAtMs]);

  return {
    canStartGymSessionCapture,
    closeGymSessionAnalysisCard,
    gymSessionAnalysis,
    isGymFlowActive,
    openInlineGymCapture: () => setShowInlineGymCapture(true),
    openValidationNoteModal: () => setShowValidationNoteModal(true),
    requestingCloseFriendValidation,
    requestCloseFriendValidationFromAnalysis,
    resolveGymSessionAnalysis,
    setShowInlineGymCapture,
    setValidationNote,
    showInlineGymCapture,
    showValidationNoteModal,
    startGymSessionAnalysis,
    submitGymValidationRequest,
    validationNote,
    closeValidationNoteModal: () => setShowValidationNoteModal(false),
  };
}
