import * as SQLite from "expo-sqlite";
import type { ActiveCoach, CoachSpecialization } from "../types";
import type {
  ChatMessage,
  CoachIntake,
  CoachPlan,
  PlanStatus,
} from "../types/workspaceTypes";
import type { CoachWorkspaceState } from "../models/workspaceState";

type PersistedCoachStateV1 = {
  version: 1;
  activeCoach: (Omit<ActiveCoach, "specialization"> & { specialization?: CoachSpecialization }) | null;
  plan: CoachPlan | null;
  planStatus: PlanStatus;
  messages: ChatMessage[];
  intake: CoachIntake | null;
  updatedAt: number;
};

type PersistedCoachStateV2 = {
  version: 2;
  activeCoach: (Omit<ActiveCoach, "specialization"> & { specialization?: CoachSpecialization }) | null;
  activePlan: CoachPlan | null;
  draftPlan: CoachPlan | null;
  messages: ChatMessage[];
  intake: CoachIntake | null;
  updatedAt: number;
};

type PersistedCoachWorkspaceState = CoachWorkspaceState;

type PersistedCoachStateV3 = {
  version: 3;
  bySpecialization: Record<CoachSpecialization, CoachWorkspaceState>;
  updatedAt: number;
};

const DB_NAME = "stabilify.db";
const TABLE_INIT_SQL = `
create table if not exists coach_state (
  id integer primary key not null,
  json text not null,
  updated_at integer not null
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(TABLE_INIT_SQL);
      return db;
    })();
  }
  return dbPromise;
}

function withSpecialization(
  coach: (Omit<ActiveCoach, "specialization"> & { specialization?: CoachSpecialization }) | null | undefined,
  specialization: CoachSpecialization
): ActiveCoach | null {
  if (!coach) return null;
  return {
    ...coach,
    specialization: coach.specialization ?? specialization,
  };
}

function defaultStateV1(): PersistedCoachStateV1 {
  return {
    version: 1,
    activeCoach: null,
    plan: null,
    planStatus: "none",
    messages: [],
    intake: null,
    updatedAt: Date.now(),
  };
}

function defaultStateV2(): PersistedCoachStateV2 {
  return {
    version: 2,
    activeCoach: null,
    activePlan: null,
    draftPlan: null,
    messages: [],
    intake: null,
    updatedAt: Date.now(),
  };
}

function defaultWorkspaceState(
  specialization: CoachSpecialization
): CoachWorkspaceState {
  return {
    activeCoach: null,
    activePlan: null,
    draftPlan: null,
    messages: [],
    intake: null,
    updatedAt: Date.now(),
  };
}

function defaultStateV3(): PersistedCoachStateV3 {
  return {
    version: 3,
    bySpecialization: {
      workout: defaultWorkspaceState("workout"),
      nutrition: defaultWorkspaceState("nutrition"),
    },
    updatedAt: Date.now(),
  };
}

function migrateToV2(state: PersistedCoachStateV1): PersistedCoachStateV2 {
  const next = defaultStateV2();
  next.activeCoach = withSpecialization(state.activeCoach, "workout");
  next.messages = Array.isArray(state.messages) ? state.messages : [];
  next.intake = state.intake ?? null;
  next.updatedAt = state.updatedAt ?? Date.now();

  if (state.plan && state.planStatus === "active") {
    next.activePlan = state.plan;
    next.draftPlan = null;
  } else if (state.plan && state.planStatus === "draft") {
    next.activePlan = null;
    next.draftPlan = state.plan;
  } else {
    next.activePlan = null;
    next.draftPlan = null;
  }

  return next;
}

function migrateToV3(state: PersistedCoachStateV2): PersistedCoachStateV3 {
  const next = defaultStateV3();
  const workout = next.bySpecialization.workout;
  workout.activeCoach = withSpecialization(state.activeCoach, "workout");
  workout.activePlan = state.activePlan ?? null;
  workout.draftPlan = state.draftPlan ?? null;
  workout.messages = Array.isArray(state.messages) ? state.messages : [];
  workout.intake = state.intake ?? null;
  workout.updatedAt = state.updatedAt ?? Date.now();
  next.updatedAt = state.updatedAt ?? Date.now();
  return next;
}

function normalizeWorkspaceState(
  input: Partial<CoachWorkspaceState> | null | undefined,
  specialization: CoachSpecialization
): CoachWorkspaceState {
  const next = defaultWorkspaceState(specialization);
  if (!input || typeof input !== "object") return next;

  next.activeCoach = withSpecialization(
    input.activeCoach as
      | (Omit<ActiveCoach, "specialization"> & { specialization?: CoachSpecialization })
      | null
      | undefined,
    specialization
  );
  next.activePlan = (input.activePlan as CoachPlan | null | undefined) ?? null;
  next.draftPlan = (input.draftPlan as CoachPlan | null | undefined) ?? null;
  next.messages = Array.isArray(input.messages) ? input.messages : [];
  next.intake = (input.intake as CoachIntake | null | undefined) ?? null;
  next.updatedAt =
    typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
      ? input.updatedAt
      : Date.now();
  return next;
}

function normalizeStateV3(
  input: Partial<PersistedCoachStateV3> | null | undefined
): PersistedCoachStateV3 {
  const next = defaultStateV3();
  if (!input || typeof input !== "object") return next;

  const bySpecialization = input.bySpecialization as
    | Partial<Record<CoachSpecialization, Partial<CoachWorkspaceState>>>
    | undefined;

  next.bySpecialization.workout = normalizeWorkspaceState(
    bySpecialization?.workout,
    "workout"
  );
  next.bySpecialization.nutrition = normalizeWorkspaceState(
    bySpecialization?.nutrition,
    "nutrition"
  );
  next.updatedAt =
    typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
      ? input.updatedAt
      : Date.now();
  return next;
}

async function readAllStates(): Promise<PersistedCoachStateV3> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>(
    "select json from coach_state where id = 1"
  );
  if (!row?.json) return defaultStateV3();

  try {
    const parsed = JSON.parse(row.json) as
      | PersistedCoachStateV1
      | PersistedCoachStateV2
      | PersistedCoachStateV3;

    if (!parsed) return defaultStateV3();

    if ((parsed as PersistedCoachStateV3).version === 3) {
      return normalizeStateV3(parsed as PersistedCoachStateV3);
    }

    if ((parsed as PersistedCoachStateV2).version === 2) {
      return migrateToV3(parsed as PersistedCoachStateV2);
    }

    if ((parsed as PersistedCoachStateV1).version === 1) {
      return migrateToV3(migrateToV2(parsed as PersistedCoachStateV1));
    }

    return defaultStateV3();
  } catch {
    return defaultStateV3();
  }
}

export async function loadCoachState(
  specialization: CoachSpecialization = "workout"
): Promise<CoachWorkspaceState> {
  const states = await readAllStates();
  return normalizeWorkspaceState(states.bySpecialization[specialization], specialization);
}

export async function saveCoachState(
  partial: Partial<CoachWorkspaceState>,
  specialization: CoachSpecialization = "workout"
) {
  const db = await getDb();
  const current = await readAllStates();
  const currentWorkspace = normalizeWorkspaceState(
    current.bySpecialization[specialization],
    specialization
  );

  const nextWorkspace: CoachWorkspaceState = {
    ...currentWorkspace,
    ...partial,
    activeCoach: withSpecialization(
      (partial.activeCoach ?? currentWorkspace.activeCoach) as
        | (Omit<ActiveCoach, "specialization"> & { specialization?: CoachSpecialization })
        | null,
      specialization
    ),
    updatedAt: Date.now(),
  };

  const nextState: PersistedCoachStateV3 = {
    version: 3,
    bySpecialization: {
      ...current.bySpecialization,
      [specialization]: nextWorkspace,
    },
    updatedAt: Date.now(),
  };

  await db.runAsync(
    "insert into coach_state(id, json, updated_at) values(1, ?, ?) on conflict(id) do update set json = excluded.json, updated_at = excluded.updated_at",
    JSON.stringify(nextState),
    nextState.updatedAt
  );
}
