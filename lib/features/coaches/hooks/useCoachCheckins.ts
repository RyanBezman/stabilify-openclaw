import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MembershipTier, WeightUnit } from "../../../data/types";
import type { ActiveCoach } from "../types";
import type {
  CoachCheckinsPayload,
  WeeklyCheckin,
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinDifficulty,
  WeeklyCheckinInput,
  WeeklyCheckinRating,
  WeeklyWeightSnapshot,
} from "../types/checkinsTypes";
import {
  hydrateCoachCheckinsWorkflow,
  submitCoachCheckinWorkflow,
} from "../workflows";
import { computeAdherenceScore } from "../models/checkinScoring";
import {
  publishCoachSyncEvent,
  subscribeCoachSyncEvents,
} from "../services/syncEvents";
import { trackCheckinSubmissionEvents } from "../services/funnelTracking";

type UseCoachCheckinsOptions = {
  coach: ActiveCoach | null;
  hydrated: boolean;
  userTier?: MembershipTier | null;
  onTierRequired?: () => void;
};

type WeeklyCheckinV2Form = {
  currentWeight: string;
  waistCm: string;
  progressPhotoPrompted: boolean;
  strengthPRs: string;
  consistencyNotes: string;
  bodyCompChanges: string;
  trainingDifficulty: WeeklyCheckinDifficulty;
  nutritionAdherenceSubjective: WeeklyCheckinAdherenceSubjective | null;
  appetiteCravings: string;
  recoveryRating: WeeklyCheckinRating;
  sleepAvgHours: string;
  sleepQuality: WeeklyCheckinRating;
  stressLevel: WeeklyCheckinRating;
  scheduleConstraintsNextWeek: string;
  injuryHasPain: boolean;
  injuryDetails: string;
  injuryRedFlags: boolean;
};

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.2046226218;
const CURRENT_WEIGHT_INPUT_UNIT: WeightUnit = "lb";
const MIN_CURRENT_WEIGHT_KG = 30;
const MAX_CURRENT_WEIGHT_KG = 350;
const MIN_CURRENT_WEIGHT_LB = Number((MIN_CURRENT_WEIGHT_KG * LB_PER_KG).toFixed(1));
const MAX_CURRENT_WEIGHT_LB = Number((MAX_CURRENT_WEIGHT_KG * LB_PER_KG).toFixed(1));

const DEFAULT_WEIGHT_SNAPSHOT: WeeklyWeightSnapshot = {
  unit: "lb",
  entries: 0,
  startWeight: null,
  endWeight: null,
  delta: null,
  trend: "no_data",
};
const CHECKINS_DEFAULT_ENERGY = 3;
const CHECKINS_DEFAULT_ADHERENCE = "100";
const CHECKINS_DEFAULT_V2_FORM: WeeklyCheckinV2Form = {
  currentWeight: "176.4",
  waistCm: "",
  progressPhotoPrompted: false,
  strengthPRs: "",
  consistencyNotes: "",
  bodyCompChanges: "",
  trainingDifficulty: "right",
  nutritionAdherenceSubjective: null,
  appetiteCravings: "",
  recoveryRating: 3,
  sleepAvgHours: "7",
  sleepQuality: 3,
  stressLevel: 3,
  scheduleConstraintsNextWeek: "",
  injuryHasPain: false,
  injuryDetails: "",
  injuryRedFlags: false,
};

const checkinsPayloadCache = new Map<string, CoachCheckinsPayload>();

function coachCheckinsCacheKey(coach: ActiveCoach | null | undefined): string | null {
  if (!coach) return null;
  return `${coach.specialization}:${coach.gender}:${coach.personality}`;
}

function clampWholeNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function kgToLb(valueKg: number) {
  return Number((valueKg * LB_PER_KG).toFixed(1));
}

function lbToKg(valueLb: number) {
  return Number((valueLb * KG_PER_LB).toFixed(1));
}

function toCurrentWeightInputValue(weightKg: number) {
  if (CURRENT_WEIGHT_INPUT_UNIT === "lb") {
    return String(kgToLb(weightKg));
  }
  return String(Number(weightKg.toFixed(1)));
}

function toCurrentWeightKg(inputWeight: number) {
  if (CURRENT_WEIGHT_INPUT_UNIT === "lb") {
    return lbToKg(inputWeight);
  }
  return Number(inputWeight.toFixed(1));
}

function hasCheckinsSnapshot(payload: CoachCheckinsPayload | null | undefined) {
  if (!payload) return false;
  return Boolean(
    payload.weekStart.length
      || payload.weekEnd.length
      || payload.currentCheckin
      || payload.history.length
  );
}

function deriveLegacyFormValues(checkin: WeeklyCheckin | null) {
  if (!checkin) {
    return {
      energy: CHECKINS_DEFAULT_ENERGY,
      adherencePercent: CHECKINS_DEFAULT_ADHERENCE,
      blockers: "",
    };
  }

  return {
    energy: clampWholeNumber(checkin.energy, 1, 5, CHECKINS_DEFAULT_ENERGY),
    adherencePercent: String(
      clampWholeNumber(checkin.adherencePercent, 0, 100, 0)
    ),
    blockers: checkin.blockers,
  };
}

function deriveV2FormValues(checkin: WeeklyCheckin | null): WeeklyCheckinV2Form {
  const artifact = checkin?.checkinArtifact;
  if (!artifact) {
    return {
      ...CHECKINS_DEFAULT_V2_FORM,
      consistencyNotes: checkin?.blockers ?? "",
      recoveryRating: clampWholeNumber(
        checkin?.energy ?? CHECKINS_DEFAULT_V2_FORM.recoveryRating,
        1,
        5,
        CHECKINS_DEFAULT_V2_FORM.recoveryRating
      ) as WeeklyCheckinRating,
    };
  }

  return {
    currentWeight: toCurrentWeightInputValue(artifact.currentWeightKg),
    waistCm: artifact.waistCm === null || artifact.waistCm === undefined
      ? ""
      : String(artifact.waistCm),
    progressPhotoPrompted: artifact.progressPhotoPrompted,
    strengthPRs: artifact.strengthPRs,
    consistencyNotes: artifact.consistencyNotes,
    bodyCompChanges: artifact.bodyCompChanges,
    trainingDifficulty: artifact.trainingDifficulty,
    nutritionAdherenceSubjective: artifact.nutritionAdherenceSubjective ?? null,
    appetiteCravings: artifact.appetiteCravings,
    recoveryRating: artifact.recoveryRating,
    sleepAvgHours: String(artifact.sleepAvgHours),
    sleepQuality: artifact.sleepQuality,
    stressLevel: artifact.stressLevel,
    scheduleConstraintsNextWeek: artifact.scheduleConstraintsNextWeek,
    injuryHasPain: artifact.injuryPain.hasPain,
    injuryDetails: artifact.injuryPain.details,
    injuryRedFlags: artifact.injuryPain.redFlags,
  };
}

function buildSubmitInput(args: {
  energy: number;
  adherencePercent: string;
  blockers: string;
  v2Form: WeeklyCheckinV2Form;
}): { input: WeeklyCheckinInput | null; validationMessage: string | null } {
  const normalizedEnergy = Math.round(args.energy);
  const parsedAdherence = Number(args.adherencePercent);
  const normalizedBlockers = args.blockers.trim();

  if (!Number.isFinite(normalizedEnergy) || normalizedEnergy < 1 || normalizedEnergy > 5) {
    return {
      input: null,
      validationMessage: "Energy must be a whole number from 1 to 5.",
    };
  }

  if (!Number.isFinite(parsedAdherence) || parsedAdherence < 0 || parsedAdherence > 100) {
    return {
      input: null,
      validationMessage: "Adherence must be a whole number from 0 to 100.",
    };
  }

  const parsedCurrentWeight = Number(args.v2Form.currentWeight);
  const minCurrentWeight =
    CURRENT_WEIGHT_INPUT_UNIT === "lb" ? MIN_CURRENT_WEIGHT_LB : MIN_CURRENT_WEIGHT_KG;
  const maxCurrentWeight =
    CURRENT_WEIGHT_INPUT_UNIT === "lb" ? MAX_CURRENT_WEIGHT_LB : MAX_CURRENT_WEIGHT_KG;
  if (
    !Number.isFinite(parsedCurrentWeight)
    || parsedCurrentWeight < minCurrentWeight
    || parsedCurrentWeight > maxCurrentWeight
  ) {
    return {
      input: null,
      validationMessage: `Current weight must be between ${minCurrentWeight} and ${maxCurrentWeight} ${CURRENT_WEIGHT_INPUT_UNIT}.`,
    };
  }

  const parsedSleepAvgHours = Number(args.v2Form.sleepAvgHours);
  if (!Number.isFinite(parsedSleepAvgHours) || parsedSleepAvgHours < 0 || parsedSleepAvgHours > 24) {
    return {
      input: null,
      validationMessage: "Sleep average hours must be between 0 and 24.",
    };
  }

  const parsedWaist = parseNullableNumber(args.v2Form.waistCm);
  const injuryHasPain = args.v2Form.injuryHasPain || args.v2Form.injuryRedFlags;
  const computedAdherenceScore = computeAdherenceScore({
    adherencePercent: parsedAdherence,
    subjective: args.v2Form.nutritionAdherenceSubjective,
    energyRating: normalizedEnergy,
    recoveryRating: args.v2Form.recoveryRating,
    sleepAvgHours: parsedSleepAvgHours,
    sleepQuality: args.v2Form.sleepQuality,
    stressLevel: args.v2Form.stressLevel,
  });

  return {
    input: {
      energy: normalizedEnergy,
      adherencePercent: clampWholeNumber(parsedAdherence, 0, 100, 0),
      blockers: normalizedBlockers,
      currentWeightKg: toCurrentWeightKg(parsedCurrentWeight),
      waistCm: parsedWaist === null ? null : Number(parsedWaist.toFixed(1)),
      progressPhotoPrompted: args.v2Form.progressPhotoPrompted,
      strengthPRs: args.v2Form.strengthPRs.trim(),
      consistencyNotes: args.v2Form.consistencyNotes.trim() || normalizedBlockers,
      bodyCompChanges: args.v2Form.bodyCompChanges.trim(),
      trainingDifficulty: args.v2Form.trainingDifficulty,
      nutritionAdherencePercent: clampWholeNumber(parsedAdherence, 0, 100, 0),
      nutritionAdherenceSubjective: args.v2Form.nutritionAdherenceSubjective,
      appetiteCravings: args.v2Form.appetiteCravings.trim(),
      energyRating: normalizedEnergy as WeeklyCheckinRating,
      recoveryRating: args.v2Form.recoveryRating,
      sleepAvgHours: Number(parsedSleepAvgHours.toFixed(1)),
      sleepQuality: args.v2Form.sleepQuality,
      stressLevel: args.v2Form.stressLevel,
      scheduleConstraintsNextWeek: args.v2Form.scheduleConstraintsNextWeek.trim(),
      injuryPain: {
        hasPain: injuryHasPain,
        details: args.v2Form.injuryDetails.trim(),
        redFlags: args.v2Form.injuryRedFlags,
      },
      computedAdherenceScore,
    },
    validationMessage: null,
  };
}

function applyCurrentCheckinForm(
  checkin: WeeklyCheckin | null,
  setEnergy: (energy: number) => void,
  setAdherence: (adherence: string) => void,
  setBlockers: (blockers: string) => void,
  setV2Form: (form: WeeklyCheckinV2Form) => void
) {
  const legacy = deriveLegacyFormValues(checkin);
  setEnergy(legacy.energy);
  setAdherence(legacy.adherencePercent);
  setBlockers(legacy.blockers);
  setV2Form(deriveV2FormValues(checkin));
}

export function useCoachCheckins({
  coach,
  hydrated,
  userTier,
  onTierRequired,
}: UseCoachCheckinsOptions) {
  const cacheKey = useMemo(
    () => coachCheckinsCacheKey(coach),
    [coach?.gender, coach?.personality, coach?.specialization]
  );
  const cachedPayload = cacheKey ? (checkinsPayloadCache.get(cacheKey) ?? null) : null;
  const hasCachedSnapshot = hasCheckinsSnapshot(cachedPayload);
  const initialLegacyForm = deriveLegacyFormValues(cachedPayload?.currentCheckin ?? null);
  const initialV2Form = deriveV2FormValues(cachedPayload?.currentCheckin ?? null);

  const [historyLoading, setHistoryLoading] = useState(
    () => Boolean(cacheKey && hydrated && !hasCachedSnapshot)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [threadId, setThreadId] = useState<string | null>(() => cachedPayload?.threadId ?? null);
  const [weekStart, setWeekStart] = useState(() => cachedPayload?.weekStart ?? "");
  const [weekEnd, setWeekEnd] = useState(() => cachedPayload?.weekEnd ?? "");
  const [weightSnapshot, setWeightSnapshot] = useState<WeeklyWeightSnapshot>(
    () => cachedPayload?.weightSnapshot ?? DEFAULT_WEIGHT_SNAPSHOT
  );
  const [currentCheckin, setCurrentCheckin] = useState<WeeklyCheckin | null>(
    () => cachedPayload?.currentCheckin ?? null
  );
  const [history, setHistory] = useState<WeeklyCheckin[]>(() => cachedPayload?.history ?? []);
  const [planUpdatedForReview, setPlanUpdatedForReview] = useState(
    () => cachedPayload?.planUpdatedForReview ?? false
  );
  const [planUpdateError, setPlanUpdateError] = useState<string | null>(
    () => cachedPayload?.planUpdateError ?? null
  );
  const [checkinArtifact, setCheckinArtifact] = useState(() => cachedPayload?.checkinArtifact ?? null);
  const [adjustmentRecommendations, setAdjustmentRecommendations] = useState(
    () => cachedPayload?.adjustmentRecommendations ?? null
  );
  const [coachMessage, setCoachMessage] = useState(
    () => cachedPayload?.coachMessage ?? null
  );
  const [guardrailNotes, setGuardrailNotes] = useState<string[]>(
    () => cachedPayload?.guardrailNotes ?? []
  );

  const [energy, setEnergy] = useState(() => initialLegacyForm.energy);
  const [adherencePercent, setAdherencePercent] = useState(() => initialLegacyForm.adherencePercent);
  const [blockers, setBlockers] = useState(() => initialLegacyForm.blockers);
  const [v2Form, setV2Form] = useState<WeeklyCheckinV2Form>(() => initialV2Form);

  const hasSeedDataRef = useRef(hasCheckinsSnapshot(cachedPayload));
  const hydrateRequestIdRef = useRef(0);
  const submitRequestIdRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const mutationTokenRef = useRef(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccessMessage = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSaveSuccessMessage(null);
  }, []);

  const showSaveSuccessMessage = useCallback((message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSaveSuccessMessage(message);
    successTimerRef.current = setTimeout(() => {
      setSaveSuccessMessage(null);
      successTimerRef.current = null;
    }, 2200);
  }, []);

  const updateV2Field = useCallback(
    <K extends keyof WeeklyCheckinV2Form>(key: K, value: WeeklyCheckinV2Form[K]) => {
      setV2Form((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setThreadId(null);
    setWeekStart("");
    setWeekEnd("");
    setWeightSnapshot(DEFAULT_WEIGHT_SNAPSHOT);
    setCurrentCheckin(null);
    setHistory([]);
    setPlanUpdatedForReview(false);
    setPlanUpdateError(null);
    setCheckinArtifact(null);
    setAdjustmentRecommendations(null);
    setCoachMessage(null);
    setGuardrailNotes([]);
    applyCurrentCheckinForm(
      null,
      setEnergy,
      setAdherencePercent,
      setBlockers,
      setV2Form
    );
    hasSeedDataRef.current = false;
  }, []);

  const applyPayload = useCallback((payload: CoachCheckinsPayload, syncForm: boolean) => {
    setThreadId(payload.threadId);
    setWeekStart(payload.weekStart);
    setWeekEnd(payload.weekEnd);
    setWeightSnapshot(payload.weightSnapshot);
    setCurrentCheckin(payload.currentCheckin);
    setHistory(payload.history);
    setPlanUpdatedForReview(payload.planUpdatedForReview ?? false);
    setPlanUpdateError(payload.planUpdateError ?? null);
    setCheckinArtifact(payload.checkinArtifact ?? null);
    setAdjustmentRecommendations(payload.adjustmentRecommendations ?? null);
    setCoachMessage(payload.coachMessage ?? null);
    setGuardrailNotes(payload.guardrailNotes ?? []);
    hasSeedDataRef.current = hasCheckinsSnapshot(payload);

    if (cacheKey) {
      checkinsPayloadCache.set(cacheKey, payload);
    }

    if (syncForm) {
      applyCurrentCheckinForm(
        payload.currentCheckin,
        setEnergy,
        setAdherencePercent,
        setBlockers,
        setV2Form
      );
    }
  }, [cacheKey]);

  useEffect(() => {
    setRefreshing(false);
    setSaving(false);
    setSyncError(null);
    setSaveError(null);
    setValidationMessage(null);
    clearSaveSuccessMessage();
    submitInFlightRef.current = false;
    mutationTokenRef.current = 0;
    hydrateRequestIdRef.current = 0;
    submitRequestIdRef.current = 0;

    if (!cacheKey) {
      setHistoryLoading(false);
      resetToDefaults();
      return;
    }

    const cached = checkinsPayloadCache.get(cacheKey) ?? null;
    if (cached) {
      setHistoryLoading(false);
      applyPayload(cached, true);
      return;
    }

    setHistoryLoading(hydrated);
    resetToDefaults();
  }, [applyPayload, cacheKey, clearSaveSuccessMessage, hydrated, resetToDefaults]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCoachSyncEvents((event) => {
      if (event.type !== "nutrition_draft_resolved") {
        return;
      }
      setPlanUpdatedForReview(false);
      setPlanUpdateError(null);
    });
    return unsubscribe;
  }, []);

  const hydrateCheckins = useCallback(async () => {
    if (!hydrated || !coach) return;

    const requestId = hydrateRequestIdRef.current + 1;
    hydrateRequestIdRef.current = requestId;
    const mutationTokenAtStart = mutationTokenRef.current;
    const shouldBlock = !hasSeedDataRef.current;

    if (shouldBlock) {
      setHistoryLoading(true);
      setRefreshing(false);
    } else {
      setHistoryLoading(false);
      setRefreshing(true);
    }
    setSyncError(null);

    try {
      const result = await hydrateCoachCheckinsWorkflow({
        coach,
        limit: 26,
      });

      if (requestId !== hydrateRequestIdRef.current) return;
      if (mutationTokenAtStart !== mutationTokenRef.current) return;

      if (result.status === "tier_required") {
        onTierRequired?.();
        return;
      }

      if (result.status === "error") {
        setSyncError(result.error.message);
        return;
      }

      applyPayload(result.payload, true);
    } finally {
      if (requestId === hydrateRequestIdRef.current) {
        setHistoryLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyPayload, coach, hydrated, onTierRequired]);

  const submitCheckin = useCallback(async () => {
    if (!hydrated || !coach) return { saved: false } as const;
    if (submitInFlightRef.current) return { saved: false } as const;

    clearSaveSuccessMessage();
    setSaveError(null);
    setValidationMessage(null);
    setSyncError(null);

    const normalized = buildSubmitInput({
      energy,
      adherencePercent,
      blockers,
      v2Form,
    });

    if (!normalized.input) {
      setValidationMessage(normalized.validationMessage);
      return { saved: false } as const;
    }

    const wasEditingCurrentWeek = Boolean(currentCheckin && currentCheckin.weekStart === weekStart);
    const requestId = submitRequestIdRef.current + 1;
    submitRequestIdRef.current = requestId;
    submitInFlightRef.current = true;
    setSaving(true);

    try {
      const result = await submitCoachCheckinWorkflow({
        coach,
        limit: 26,
        input: normalized.input,
      });

      if (requestId !== submitRequestIdRef.current) {
        return { saved: false } as const;
      }

      if (result.status === "tier_required") {
        onTierRequired?.();
        return { saved: false } as const;
      }

      if (result.status === "error") {
        setSaveError(result.error.message);
        return { saved: false, error: result.error.message } as const;
      }

      mutationTokenRef.current += 1;
      applyPayload(result.payload, true);
      publishCoachSyncEvent({
        type: "checkin_submitted",
        specialization: "nutrition",
        planUpdatedForReview: Boolean(result.payload.planUpdatedForReview),
        submittedAt: Date.now(),
      });
      void trackCheckinSubmissionEvents({
        coach,
        userTier,
        weekStart: result.payload.weekStart || weekStart || null,
        checkinId: result.payload.currentCheckin?.id ?? null,
        saveMode: wasEditingCurrentWeek ? "update" : "create",
        planUpdatedForReview: Boolean(result.payload.planUpdatedForReview),
      });
      showSaveSuccessMessage(
        wasEditingCurrentWeek ? "Weekly check-in updated." : "Weekly check-in saved."
      );
      return { saved: true } as const;
    } finally {
      if (requestId === submitRequestIdRef.current) {
        setSaving(false);
      }
      submitInFlightRef.current = false;
    }
  }, [
    adherencePercent,
    applyPayload,
    blockers,
    clearSaveSuccessMessage,
    coach,
    currentCheckin,
    energy,
    hydrated,
    onTierRequired,
    showSaveSuccessMessage,
    userTier,
    v2Form,
    weekStart,
  ]);

  const isEditingCurrentWeek = useMemo(() => {
    return Boolean(currentCheckin && currentCheckin.weekStart === weekStart);
  }, [currentCheckin, weekStart]);

  return {
    threadId,
    historyLoading,
    refreshing,
    saving,
    syncError,
    saveError,
    validationMessage,
    saveSuccessMessage,
    weekStart,
    weekEnd,
    weightSnapshot,
    currentCheckin,
    history,
    planUpdatedForReview,
    planUpdateError,
    checkinArtifact,
    adjustmentRecommendations,
    coachMessage,
    guardrailNotes,
    energy,
    setEnergy,
    adherencePercent,
    setAdherencePercent,
    blockers,
    setBlockers,
    currentWeightInputUnit: CURRENT_WEIGHT_INPUT_UNIT,
    v2Form,
    setV2Form,
    updateV2Field,
    isEditingCurrentWeek,
    hydrateCheckins,
    submitCheckin,
    clearSaveSuccessMessage,
  };
}

export function __resetCoachCheckinsCacheForTests() {
  checkinsPayloadCache.clear();
}
