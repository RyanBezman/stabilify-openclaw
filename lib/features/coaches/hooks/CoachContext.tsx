import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ActiveCoach, CoachSpecialization } from "../types";
import { loadCoachState, saveCoachState } from "../services/storage";
import { fetchActiveCoachFromServer } from "../services/api";
import type { CoachIntake, CoachPlan } from "../types/workspaceTypes";
import type { CoachWorkspaceState } from "../models/workspaceState";
import { invokeCoachChat, mapCoachMessages } from "../services/chatClient";
import { isSameCoach } from "../models/identity";
import { fetchCurrentUserId, subscribeToAuthStateChanges } from "../../auth";

type SpecializationMap<T> = Record<CoachSpecialization, T>;
type CoachWorkspaceStatePatch = Partial<
  Pick<CoachWorkspaceState, "activeCoach" | "activePlan" | "draftPlan" | "messages" | "intake">
>;

const specializations: CoachSpecialization[] = ["workout", "nutrition"];
const SERVER_UPDATE_BADGE_MS = 1200;

const defaultBySpecialization = <T,>(factory: (specialization: CoachSpecialization) => T) => ({
  workout: factory("workout"),
  nutrition: factory("nutrition"),
});

type CoachContextValue = {
  activeCoaches: SpecializationMap<ActiveCoach | null>;
  getActiveCoach: (specialization: CoachSpecialization) => ActiveCoach | null;
  setActiveCoach: (specialization: CoachSpecialization, coach: ActiveCoach | null) => void;
  hydrated: boolean;
  refreshFromServer: (specialization?: CoachSpecialization) => Promise<void>;
  serverCheckedBySpecialization: SpecializationMap<boolean>;
  serverSyncingBySpecialization: SpecializationMap<boolean>;
  serverMeaningfulSyncBySpecialization: SpecializationMap<boolean>;
  serverErrorBySpecialization: SpecializationMap<string | null>;
};

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
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
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const clearMeaningfulSyncTimeoutRef = useRef<
    SpecializationMap<ReturnType<typeof setTimeout> | null>
  >(defaultBySpecialization(() => null));

  const prefetchChatHistory = useCallback(
    async (specialization: CoachSpecialization, coach?: ActiveCoach | null) => {
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
          specialization
        );
      } catch {
        // Best-effort prefetch; ignore.
      }
    },
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const [workoutState, nutritionState] = await Promise.all([
        loadCoachState("workout"),
        loadCoachState("nutrition"),
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
  }, []);

  useEffect(() => {
    activeCoachesRef.current = activeCoaches;
  }, [activeCoaches]);

  useEffect(() => {
    return () => {
      specializations.forEach((specialization) => {
        const timeout = clearMeaningfulSyncTimeoutRef.current[specialization];
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const refreshFromServer = useCallback(async (specialization?: CoachSpecialization) => {
    const targets = specialization ? [specialization] : specializations;
    const changedBySpecialization = defaultBySpecialization(() => false);
    let hasResolvedUser = false;

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
      const authResult = await fetchCurrentUserId();
      const userId = authResult.data?.userId;
      if (!userId) return;
      hasResolvedUser = true;
      setAuthUserId(userId);

      for (const s of targets) {
        const result = await fetchActiveCoachFromServer(userId, s);
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
          s
        );
      }
    } finally {
      targets.forEach((s) => {
        if (hasResolvedUser) {
          setServerCheckedBySpecialization((prev) => ({ ...prev, [s]: true }));
        }
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
  }, []);

  // Prefetch chat history after sign-in/coach selection so Messages opens with the old thread ready.
  useEffect(() => {
    if (!hydrated) return;
    if (!authUserId) return;

    let alive = true;
    (async () => {
      for (const specialization of specializations) {
        if (!activeCoaches[specialization]) continue;
        const state = await loadCoachState(specialization);
        if (!alive) return;
        if (state.messages.length) continue;
        await prefetchChatHistory(specialization, activeCoaches[specialization]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeCoaches, authUserId, hydrated, prefetchChatHistory]);

  // Clear local coach cache on auth changes so accounts don't leak coach selection into each other.
  useEffect(() => {
    const unsubscribe = subscribeToAuthStateChanges(async (session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId === authUserId) return;

      // Initial auth bootstrap (null -> signed-in user) should keep local coach cache
      // and let server sync reconcile, instead of clearing and causing transient UI flashes.
      if (authUserId === null && nextUserId !== null) {
        setAuthUserId(nextUserId);
        void refreshFromServer();
        return;
      }

      specializations.forEach((specialization) => {
        const timeout = clearMeaningfulSyncTimeoutRef.current[specialization];
        if (timeout) {
          clearTimeout(timeout);
          clearMeaningfulSyncTimeoutRef.current[specialization] = null;
        }
      });

      setAuthUserId(nextUserId);
      setServerCheckedBySpecialization(defaultBySpecialization(() => false));
      setServerMeaningfulSyncBySpecialization(defaultBySpecialization(() => false));
      setServerErrorBySpecialization(defaultBySpecialization(() => null));
      setActiveCoaches(defaultBySpecialization(() => null));

      await Promise.all(
        specializations.map((specialization) =>
          saveCoachState(
            {
              activeCoach: null,
              activePlan: null,
              draftPlan: null,
              messages: [],
              intake: null,
            } satisfies CoachWorkspaceStatePatch,
            specialization
          )
        )
      );

      // If signed in, sync the server coach for the new user.
      if (nextUserId) {
        void refreshFromServer();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authUserId, refreshFromServer]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshFromServer();
  }, [hydrated, refreshFromServer]);

  const setActiveCoachPersisted = useCallback(
    (specialization: CoachSpecialization, coach: ActiveCoach | null) => {
      const current = activeCoaches[specialization];
      const same = isSameCoach(coach, current);

      setActiveCoaches((prev) => ({ ...prev, [specialization]: coach }));
      void saveCoachState(
        same
          ? ({ activeCoach: coach } satisfies CoachWorkspaceStatePatch)
          : ({
              activeCoach: coach,
              activePlan: null,
              draftPlan: null,
              messages: [],
              intake: null,
            } satisfies CoachWorkspaceStatePatch),
        specialization
      );
    },
    [activeCoaches]
  );

  const value = useMemo<CoachContextValue>(() => {
    return {
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
