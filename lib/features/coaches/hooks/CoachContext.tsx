import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ActiveCoach, CoachSpecialization } from "../types";
import { loadCoachState, saveCoachState } from "../services/storage";
import { fetchActiveCoachFromServer } from "../services/api";
import type { CoachIntake, CoachPlan } from "../types/workspaceTypes";
import type { CoachWorkspaceState } from "../models/workspaceState";
import { invokeCoachChat, mapCoachMessages } from "../services/chatClient";
import { isSameCoach } from "../models/identity";

type SpecializationMap<T> = Record<CoachSpecialization, T>;
type CoachWorkspaceStatePatch = Partial<
  Pick<CoachWorkspaceState, "activeCoach" | "activePlan" | "draftPlan" | "messages" | "intake">
>;
type SetActiveCoachOptions = {
  preserveWorkspace?: "reset" | "keep_active_plan";
};

const specializations: CoachSpecialization[] = ["workout", "nutrition"];
const SERVER_UPDATE_BADGE_MS = 1200;

const defaultBySpecialization = <T,>(factory: (specialization: CoachSpecialization) => T) => ({
  workout: factory("workout"),
  nutrition: factory("nutrition"),
});

type CoachContextValue = {
  authUserId: string | null;
  activeCoaches: SpecializationMap<ActiveCoach | null>;
  getActiveCoach: (specialization: CoachSpecialization) => ActiveCoach | null;
  setActiveCoach: (
    specialization: CoachSpecialization,
    coach: ActiveCoach | null,
    options?: SetActiveCoachOptions
  ) => void;
  hydrated: boolean;
  refreshFromServer: (specialization?: CoachSpecialization) => Promise<void>;
  serverCheckedBySpecialization: SpecializationMap<boolean>;
  serverSyncingBySpecialization: SpecializationMap<boolean>;
  serverMeaningfulSyncBySpecialization: SpecializationMap<boolean>;
  serverErrorBySpecialization: SpecializationMap<string | null>;
};

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({
  children,
  authUserId,
}: {
  children: ReactNode;
  authUserId: string | null;
}) {
  const [activeCoaches, setActiveCoaches] = useState<SpecializationMap<ActiveCoach | null>>(
    defaultBySpecialization(() => null)
  );
  const activeCoachesRef = useRef<SpecializationMap<ActiveCoach | null>>(
    defaultBySpecialization(() => null)
  );
  const [hydrated, setHydrated] = useState(false);
  const [serverCheckedBySpecialization, setServerCheckedBySpecialization] =
    useState<SpecializationMap<boolean>>(defaultBySpecialization(() => false));
  const [serverSyncingBySpecialization, setServerSyncingBySpecialization] =
    useState<SpecializationMap<boolean>>(defaultBySpecialization(() => false));
  const [serverMeaningfulSyncBySpecialization, setServerMeaningfulSyncBySpecialization] =
    useState<SpecializationMap<boolean>>(defaultBySpecialization(() => false));
  const [serverErrorBySpecialization, setServerErrorBySpecialization] =
    useState<SpecializationMap<string | null>>(defaultBySpecialization(() => null));
  const authUserIdRef = useRef(authUserId);
  const clearMeaningfulSyncTimeoutRef = useRef<
    SpecializationMap<ReturnType<typeof setTimeout> | null>
  >(defaultBySpecialization(() => null));

  const prefetchChatHistory = useCallback(
    async (
      specialization: CoachSpecialization,
      coach: ActiveCoach | null,
      requestUserId: string,
      isCurrent: () => boolean
    ) => {
      if (!requestUserId) {
        return;
      }

      try {
        const data = await invokeCoachChat({
          action: "workspace",
          limit: 30,
          specialization,
          ...(coach
            ? {
                coach_gender: coach.gender,
                coach_personality: coach.personality,
              }
            : {}),
        });
        if (!isCurrent()) {
          return;
        }
        if (authUserIdRef.current !== requestUserId) {
          return;
        }
        if (!isSameCoach(activeCoachesRef.current[specialization], coach)) {
          return;
        }

        const mapped = mapCoachMessages(data.messages);
        const activePlan = (data.active_plan ?? null) as CoachPlan | null;
        const draftPlan = (data.draft_plan ?? null) as CoachPlan | null;
        const intake = (data.intake ?? null) as CoachIntake | null;

        if (!mapped.length && !activePlan && !draftPlan && !intake) return;

        // Only seed local cache; CoachWorkspace/CoachChat will still refresh on open.
        await saveCoachState(
          {
            messages: mapped,
            activePlan,
            draftPlan,
            intake,
          },
          specialization,
          requestUserId
        );
      } catch {
        // Best-effort prefetch; ignore.
      }
    },
    []
  );

  useEffect(() => {
    let alive = true;
    setHydrated(false);
    setActiveCoaches(defaultBySpecialization(() => null));
    setServerCheckedBySpecialization(defaultBySpecialization(() => false));
    setServerSyncingBySpecialization(defaultBySpecialization(() => false));
    setServerMeaningfulSyncBySpecialization(defaultBySpecialization(() => false));
    setServerErrorBySpecialization(defaultBySpecialization(() => null));

    specializations.forEach((specialization) => {
      const timeout = clearMeaningfulSyncTimeoutRef.current[specialization];
      if (timeout) {
        clearTimeout(timeout);
        clearMeaningfulSyncTimeoutRef.current[specialization] = null;
      }
    });

    (async () => {
      if (!authUserId) {
        if (!alive) return;
        setHydrated(true);
        return;
      }

      const [workoutState, nutritionState] = await Promise.all([
        loadCoachState("workout", authUserId),
        loadCoachState("nutrition", authUserId),
      ]);
      if (!alive) return;
      setActiveCoaches({
        workout: workoutState.activeCoach,
        nutrition: nutritionState.activeCoach,
      });
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, [authUserId]);

  useEffect(() => {
    activeCoachesRef.current = activeCoaches;
  }, [activeCoaches]);

  useEffect(() => {
    authUserIdRef.current = authUserId;
  }, [authUserId]);

  useEffect(() => {
    return () => {
      specializations.forEach((specialization) => {
        const timeout = clearMeaningfulSyncTimeoutRef.current[specialization];
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const refreshFromServer = useCallback(async (specialization?: CoachSpecialization) => {
    if (!authUserId) {
      return;
    }

    const refreshUserId = authUserId;
    const targets = specialization ? [specialization] : specializations;
    const changedBySpecialization = defaultBySpecialization(() => false);

    targets.forEach((s) => {
      const pendingTimeout = clearMeaningfulSyncTimeoutRef.current[s];
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        clearMeaningfulSyncTimeoutRef.current[s] = null;
      }
      setServerSyncingBySpecialization((prev) => ({ ...prev, [s]: true }));
      setServerMeaningfulSyncBySpecialization((prev) => ({ ...prev, [s]: false }));
      setServerErrorBySpecialization((prev) => ({ ...prev, [s]: null }));
    });

    try {
      for (const s of targets) {
        const result = await fetchActiveCoachFromServer(refreshUserId, s);
        if (authUserIdRef.current !== refreshUserId) {
          return;
        }
        if (result.error) {
          setServerErrorBySpecialization((prev) => ({
            ...prev,
            [s]: result.error ?? "Couldn't sync coach status.",
          }));
          continue;
        }

        const serverCoach = result.data?.coach ?? null;
        const currentCoach = activeCoachesRef.current[s];
        const same = isSameCoach(serverCoach, currentCoach);

        if (same) continue;
        changedBySpecialization[s] = true;
        setServerMeaningfulSyncBySpecialization((prev) => ({ ...prev, [s]: true }));

        setActiveCoaches((prev) => ({ ...prev, [s]: serverCoach }));

        // If server changed the coach (or cleared it), clear local plan/chat to avoid mismatches.
        const resetWorkspacePatch: CoachWorkspaceStatePatch = {
          activeCoach: serverCoach,
          activePlan: null,
          draftPlan: null,
          messages: [],
          intake: null,
        };
        await saveCoachState(
          resetWorkspacePatch,
          s,
          refreshUserId
        );
      }
    } finally {
      if (authUserIdRef.current !== refreshUserId) {
        return;
      }

      targets.forEach((s) => {
        setServerCheckedBySpecialization((prev) => ({ ...prev, [s]: true }));
        setServerSyncingBySpecialization((prev) => ({ ...prev, [s]: false }));

        if (!changedBySpecialization[s]) {
          setServerMeaningfulSyncBySpecialization((prev) => ({ ...prev, [s]: false }));
          return;
        }

        clearMeaningfulSyncTimeoutRef.current[s] = setTimeout(() => {
          setServerMeaningfulSyncBySpecialization((prev) => ({ ...prev, [s]: false }));
          clearMeaningfulSyncTimeoutRef.current[s] = null;
        }, SERVER_UPDATE_BADGE_MS);
      });
    }
  }, [authUserId]);

  // Prefetch chat history after sign-in/coach selection so Messages opens with the old thread ready.
  useEffect(() => {
    if (!hydrated) return;
    if (!authUserId) return;

    let alive = true;
    (async () => {
      const prefetchUserId = authUserId;
      for (const specialization of specializations) {
        const coach = activeCoaches[specialization];
        if (!coach) continue;
        const state = await loadCoachState(specialization, authUserId);
        if (!alive) return;
        if (state.messages.length) continue;
        await prefetchChatHistory(
          specialization,
          coach,
          prefetchUserId,
          () =>
            alive
            && authUserIdRef.current === prefetchUserId
            && isSameCoach(activeCoachesRef.current[specialization], coach)
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeCoaches, authUserId, hydrated, prefetchChatHistory]);

  useEffect(() => {
    if (!hydrated || !authUserId) return;
    void refreshFromServer();
  }, [authUserId, hydrated, refreshFromServer]);

  const setActiveCoachPersisted = useCallback(
    (
      specialization: CoachSpecialization,
      coach: ActiveCoach | null,
      options?: SetActiveCoachOptions
    ) => {
      const current = activeCoaches[specialization];
      const same = isSameCoach(coach, current);
      const preserveWorkspace =
        !same && options?.preserveWorkspace === "keep_active_plan";
      const targetUserId = authUserId;

      setActiveCoaches((prev) => ({ ...prev, [specialization]: coach }));

      void (async () => {
        let nextPatch: CoachWorkspaceStatePatch;
        if (same) {
          nextPatch = { activeCoach: coach } satisfies CoachWorkspaceStatePatch;
        } else if (preserveWorkspace) {
          const currentState = await loadCoachState(specialization, targetUserId);
          nextPatch = {
            activeCoach: coach,
            activePlan: currentState.activePlan,
            draftPlan: null,
            messages: [],
            intake: currentState.intake,
          } satisfies CoachWorkspaceStatePatch;
        } else {
          nextPatch = {
            activeCoach: coach,
            activePlan: null,
            draftPlan: null,
            messages: [],
            intake: null,
          } satisfies CoachWorkspaceStatePatch;
        }

        await saveCoachState(nextPatch, specialization, targetUserId);
      })();
    },
    [activeCoaches, authUserId]
  );

  const value = useMemo<CoachContextValue>(() => {
    return {
      authUserId,
      activeCoaches,
      getActiveCoach: (specialization) => activeCoaches[specialization],
      setActiveCoach: setActiveCoachPersisted,
      hydrated,
      refreshFromServer,
      serverCheckedBySpecialization,
      serverSyncingBySpecialization,
      serverMeaningfulSyncBySpecialization,
      serverErrorBySpecialization,
    };
  }, [
    activeCoaches,
    authUserId,
    hydrated,
    refreshFromServer,
    serverCheckedBySpecialization,
    serverSyncingBySpecialization,
    serverMeaningfulSyncBySpecialization,
    serverErrorBySpecialization,
    setActiveCoachPersisted,
  ]);

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  const ctx = useContext(CoachContext);
  if (!ctx) {
    throw new Error("useCoach must be used within CoachProvider");
  }
  return ctx;
}
