import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

type StoredRow = {
  json: string;
  updatedAt: number;
} | null;

const sqliteMocks = vi.hoisted(() => {
  let storedRow: StoredRow = null;

  const commitRow = (json: string, updatedAt: number) => {
    storedRow = {
      json,
      updatedAt,
    };
  };

  const execAsync = vi.fn(async (_sql: string) => {});
  const getFirstAsync = vi.fn(async (_sql: string) => {
    return storedRow ? { json: storedRow.json } : null;
  });
  const runAsync = vi.fn(async (_sql: string, json: string, updatedAt: number) => {
    commitRow(json, updatedAt);
  });
  const openDatabaseAsync = vi.fn(async (_dbName: string) => ({
    execAsync,
    getFirstAsync,
    runAsync,
  }));

  return {
    execAsync,
    getFirstAsync,
    runAsync,
    openDatabaseAsync,
    commitRow,
    reset() {
      storedRow = null;
      execAsync.mockClear();
      getFirstAsync.mockClear();
      runAsync.mockClear();
      openDatabaseAsync.mockClear();
    },
    seed(json: string, updatedAt = Date.now()) {
      storedRow = {
        json,
        updatedAt,
      };
    },
  };
});

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: sqliteMocks.openDatabaseAsync,
}));

function buildCoach(displayName: string, specialization: "workout" | "nutrition"): ActiveCoach {
  return {
    specialization,
    gender: "woman",
    personality: "hype",
    displayName,
    tagline: `${displayName} coach`,
  };
}

function createDeferred<T = void>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve(value: T) {
      if (!resolve) {
        throw new Error("Deferred promise already settled.");
      }
      resolve(value);
    },
  };
}

async function importStorageModule() {
  return import("./storage");
}

describe("coach storage", () => {
  beforeEach(() => {
    sqliteMocks.reset();
    vi.resetModules();
  });

  it("keeps cached coach state isolated per user id", async () => {
    const { loadCoachState, saveCoachState } = await importStorageModule();

    await saveCoachState(
      {
        activeCoach: buildCoach("Coach Alpha", "workout"),
      },
      "workout",
      "user-1"
    );
    await saveCoachState(
      {
        activeCoach: buildCoach("Coach Beta", "workout"),
      },
      "workout",
      "user-2"
    );

    const userOneState = await loadCoachState("workout", "user-1");
    const userTwoState = await loadCoachState("workout", "user-2");
    const signedOutState = await loadCoachState("workout", null);

    expect(userOneState.activeCoach?.displayName).toBe("Coach Alpha");
    expect(userTwoState.activeCoach?.displayName).toBe("Coach Beta");
    expect(signedOutState.activeCoach).toBeNull();
  });

  it("discards legacy global cache during migration instead of attaching it to a user", async () => {
    sqliteMocks.seed(
      JSON.stringify({
        version: 3,
        bySpecialization: {
          workout: {
            activeCoach: buildCoach("Legacy Coach", "workout"),
            activePlan: null,
            draftPlan: null,
            messages: [],
            intake: null,
            updatedAt: 111,
          },
          nutrition: {
            activeCoach: null,
            activePlan: null,
            draftPlan: null,
            messages: [],
            intake: null,
            updatedAt: 111,
          },
        },
        updatedAt: 111,
      }),
      111
    );

    const { loadCoachState } = await importStorageModule();

    const firstUserState = await loadCoachState("workout", "user-1");
    const secondUserState = await loadCoachState("workout", "user-2");

    expect(firstUserState.activeCoach).toBeNull();
    expect(secondUserState.activeCoach).toBeNull();
  });

  it("serializes concurrent specialization saves so unified coach writes do not overwrite each other", async () => {
    const firstWriteStarted = createDeferred();
    const releaseFirstWrite = createDeferred();
    let writeCount = 0;

    sqliteMocks.runAsync.mockImplementation(async (_sql: string, json: string, updatedAt: number) => {
      writeCount += 1;
      if (writeCount === 1) {
        firstWriteStarted.resolve();
        await releaseFirstWrite.promise;
      }
      sqliteMocks.commitRow(json, updatedAt);
    });

    const { loadCoachState, saveCoachState } = await importStorageModule();

    const saveWorkout = saveCoachState(
      {
        activeCoach: buildCoach("Coach Alpha", "workout"),
      },
      "workout",
      "user-1"
    );
    await firstWriteStarted.promise;

    const saveNutrition = saveCoachState(
      {
        activeCoach: buildCoach("Coach Beta", "nutrition"),
      },
      "nutrition",
      "user-1"
    );

    releaseFirstWrite.resolve();
    await Promise.all([saveWorkout, saveNutrition]);

    const workoutState = await loadCoachState("workout", "user-1");
    const nutritionState = await loadCoachState("nutrition", "user-1");

    expect(workoutState.activeCoach?.displayName).toBe("Coach Alpha");
    expect(nutritionState.activeCoach?.displayName).toBe("Coach Beta");
  });
});
