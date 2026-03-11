import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachGender, CoachPersonality, CoachSpecialization } from "../types";

type CoachProfileRow = {
  id: string;
  specialization: CoachSpecialization;
  gender: CoachGender;
  personality: CoachPersonality;
};

type CoachThreadRow = {
  id: string;
  user_id: string;
  coach_profile_id: string;
  specialization: CoachSpecialization;
  intake_json: Record<string, unknown> | null;
  intake_updated_at: string | null;
  last_message_at: string | null;
};

type CoachPlanStatus = "draft" | "active" | "superseded";

type CoachPlanRow = {
  id: string;
  user_id: string;
  thread_id: string;
  type: CoachSpecialization;
  status: CoachPlanStatus;
  title: string | null;
  plan_json: Record<string, unknown>;
  version: number;
  supersedes_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

type CoachMessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
};

type MockDb = {
  coach_profiles: CoachProfileRow[];
  coach_threads: CoachThreadRow[];
  coach_plans: CoachPlanRow[];
  coach_messages: CoachMessageRow[];
};

type TableName = keyof MockDb;
type TableRow<TTable extends TableName> = MockDb[TTable][number];

function cloneDb(db: MockDb): MockDb {
  return {
    coach_profiles: db.coach_profiles.map((row) => ({ ...row })),
    coach_threads: db.coach_threads.map((row) => ({ ...row })),
    coach_plans: db.coach_plans.map((row) => ({ ...row })),
    coach_messages: db.coach_messages.map((row) => ({ ...row })),
  };
}

function buildInitialDb(): MockDb {
  return {
    coach_profiles: [
      {
        id: "workout_woman_strict",
        specialization: "workout",
        gender: "woman",
        personality: "strict",
      },
      {
        id: "nutrition_woman_strict",
        specialization: "nutrition",
        gender: "woman",
        personality: "strict",
      },
      {
        id: "workout_woman_sweet",
        specialization: "workout",
        gender: "woman",
        personality: "sweet",
      },
      {
        id: "nutrition_woman_sweet",
        specialization: "nutrition",
        gender: "woman",
        personality: "sweet",
      },
    ],
    coach_threads: [
      {
        id: "thread-workout-source",
        user_id: "user-1",
        coach_profile_id: "workout_woman_strict",
        specialization: "workout",
        intake_json: { daysPerWeek: 4, goal: "fat_loss" },
        intake_updated_at: "2026-03-10T12:00:00.000Z",
        last_message_at: "2026-03-10T12:05:00.000Z",
      },
      {
        id: "thread-workout-target",
        user_id: "user-1",
        coach_profile_id: "workout_woman_sweet",
        specialization: "workout",
        intake_json: { daysPerWeek: 2, goal: "strength" },
        intake_updated_at: "2026-03-09T08:00:00.000Z",
        last_message_at: "2026-03-09T08:10:00.000Z",
      },
      {
        id: "thread-nutrition-source",
        user_id: "user-1",
        coach_profile_id: "nutrition_woman_strict",
        specialization: "nutrition",
        intake_json: { goal: "lose", calories: 1800 },
        intake_updated_at: "2026-03-10T12:00:00.000Z",
        last_message_at: "2026-03-10T12:05:00.000Z",
      },
      {
        id: "thread-nutrition-target",
        user_id: "user-1",
        coach_profile_id: "nutrition_woman_sweet",
        specialization: "nutrition",
        intake_json: { goal: "maintain", calories: 2200 },
        intake_updated_at: "2026-03-09T08:00:00.000Z",
        last_message_at: "2026-03-09T08:10:00.000Z",
      },
    ],
    coach_plans: [
      {
        id: "workout-active-source",
        user_id: "user-1",
        thread_id: "thread-workout-source",
        type: "workout",
        status: "active",
        title: "Workout A",
        plan_json: { daysPerWeek: 4 },
        version: 3,
        supersedes_plan_id: null,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-10T12:00:00.000Z",
      },
      {
        id: "workout-draft-source",
        user_id: "user-1",
        thread_id: "thread-workout-source",
        type: "workout",
        status: "draft",
        title: "Workout Draft",
        plan_json: { daysPerWeek: 5 },
        version: 4,
        supersedes_plan_id: "workout-active-source",
        created_at: "2026-03-10T11:00:00.000Z",
        updated_at: "2026-03-10T11:00:00.000Z",
      },
      {
        id: "workout-active-target",
        user_id: "user-1",
        thread_id: "thread-workout-target",
        type: "workout",
        status: "active",
        title: "Old Target Workout",
        plan_json: { daysPerWeek: 2 },
        version: 2,
        supersedes_plan_id: null,
        created_at: "2026-03-09T08:00:00.000Z",
        updated_at: "2026-03-09T08:00:00.000Z",
      },
      {
        id: "workout-draft-target",
        user_id: "user-1",
        thread_id: "thread-workout-target",
        type: "workout",
        status: "draft",
        title: "Old Target Workout Draft",
        plan_json: { daysPerWeek: 3 },
        version: 3,
        supersedes_plan_id: "workout-active-target",
        created_at: "2026-03-09T08:05:00.000Z",
        updated_at: "2026-03-09T08:05:00.000Z",
      },
      {
        id: "nutrition-active-source",
        user_id: "user-1",
        thread_id: "thread-nutrition-source",
        type: "nutrition",
        status: "active",
        title: "Nutrition A",
        plan_json: { calories: 1800 },
        version: 6,
        supersedes_plan_id: null,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-10T12:00:00.000Z",
      },
      {
        id: "nutrition-active-target",
        user_id: "user-1",
        thread_id: "thread-nutrition-target",
        type: "nutrition",
        status: "active",
        title: "Old Target Nutrition",
        plan_json: { calories: 2200 },
        version: 1,
        supersedes_plan_id: null,
        created_at: "2026-03-09T08:00:00.000Z",
        updated_at: "2026-03-09T08:00:00.000Z",
      },
      {
        id: "nutrition-draft-target",
        user_id: "user-1",
        thread_id: "thread-nutrition-target",
        type: "nutrition",
        status: "draft",
        title: "Old Target Nutrition Draft",
        plan_json: { calories: 2100 },
        version: 2,
        supersedes_plan_id: "nutrition-active-target",
        created_at: "2026-03-09T08:05:00.000Z",
        updated_at: "2026-03-09T08:05:00.000Z",
      },
    ],
    coach_messages: [
      {
        id: "message-workout-target",
        thread_id: "thread-workout-target",
        role: "assistant",
        content: "Old target workout chat",
      },
      {
        id: "message-nutrition-target",
        thread_id: "thread-nutrition-target",
        role: "assistant",
        content: "Old target nutrition chat",
      },
    ],
  };
}

const state = vi.hoisted(() => ({
  db: buildInitialDb(),
}));

class MockQuery<TTable extends TableName> {
  private filters: Array<(row: TableRow<TTable>) => boolean> = [];
  private orders: Array<{ field: keyof TableRow<TTable>; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private expectSingle: "single" | "maybeSingle" | null = null;

  constructor(
    private db: MockDb,
    private table: TTable,
    private action: "select" | "insert" | "update" | "delete",
    private payload:
      | Partial<TableRow<TTable>>
      | Array<Partial<TableRow<TTable>>>
      | null = null,
  ) {}

  select(_columns: string) {
    return this;
  }

  eq(field: keyof TableRow<TTable>, value: TableRow<TTable>[keyof TableRow<TTable>]) {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  not(field: keyof TableRow<TTable>, operator: string, value: null) {
    if (operator === "is" && value === null) {
      this.filters.push((row) => row[field] !== null);
    }
    return this;
  }

  order(field: keyof TableRow<TTable>, options?: { ascending?: boolean }) {
    this.orders.push({
      field,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  maybeSingle<TValue>() {
    this.expectSingle = "maybeSingle";
    return this.execute<TValue>();
  }

  single<TValue>() {
    this.expectSingle = "single";
    return this.execute<TValue>();
  }

  then<TResult1, TResult2>(
    onfulfilled?:
      | ((value: { data: TableRow<TTable>[] | null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute<TableRow<TTable>[] | null>().then(onfulfilled, onrejected);
  }

  private execute<TValue>() {
    if (this.action === "select") {
      return Promise.resolve(this.executeSelect<TValue>());
    }
    if (this.action === "insert") {
      return Promise.resolve(this.executeInsert<TValue>());
    }
    if (this.action === "update") {
      return Promise.resolve(this.executeUpdate<TValue>());
    }
    return Promise.resolve(this.executeDelete<TValue>());
  }

  private getRows() {
    return this.db[this.table] as Array<TableRow<TTable>>;
  }

  private applyFilters(rows: Array<TableRow<TTable>>) {
    return rows.filter((row) => this.filters.every((filter) => filter(row)));
  }

  private applyOrdering(rows: Array<TableRow<TTable>>) {
    return rows.slice().sort((left, right) => {
      for (const order of this.orders) {
        const leftValue = left[order.field];
        const rightValue = right[order.field];
        if (leftValue === rightValue) {
          continue;
        }
        if (leftValue === null) {
          return order.ascending ? 1 : -1;
        }
        if (rightValue === null) {
          return order.ascending ? -1 : 1;
        }
        if ((leftValue as string | number) < (rightValue as string | number)) {
          return order.ascending ? -1 : 1;
        }
        if ((leftValue as string | number) > (rightValue as string | number)) {
          return order.ascending ? 1 : -1;
        }
      }
      return 0;
    });
  }

  private finalizeRows(rows: Array<TableRow<TTable>>) {
    const ordered = this.orders.length ? this.applyOrdering(rows) : rows.slice();
    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }

  private executeSelect<TValue>() {
    const rows = this.finalizeRows(this.applyFilters(this.getRows()));
    if (this.expectSingle === "single") {
      return { data: (rows[0] ?? null) as TValue, error: null };
    }
    if (this.expectSingle === "maybeSingle") {
      return { data: (rows[0] ?? null) as TValue, error: null };
    }
    return { data: rows as TValue, error: null };
  }

  private executeInsert<TValue>() {
    const now = new Date().toISOString();
    const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    const inserted = payloadRows.map((payload, index) => {
      const row = { ...payload } as TableRow<TTable>;
      if (!("id" in row) || !row.id) {
        (row as { id: string }).id = `${String(this.table)}-${this.getRows().length + index + 1}`;
      }
      if (this.table === "coach_plans") {
        const typedRow = row as CoachPlanRow;
        typedRow.created_at = typedRow.created_at ?? now;
        typedRow.updated_at = typedRow.updated_at ?? now;
        typedRow.supersedes_plan_id = typedRow.supersedes_plan_id ?? null;
      }
      this.getRows().push(row);
      return row;
    });

    if (this.expectSingle === "single" || this.expectSingle === "maybeSingle") {
      return { data: (inserted[0] ?? null) as TValue, error: null };
    }
    return { data: inserted as TValue, error: null };
  }

  private executeUpdate<TValue>() {
    const now = new Date().toISOString();
    const rows = this.applyFilters(this.getRows());
    for (const row of rows) {
      Object.assign(row, this.payload ?? {});
      if ("updated_at" in row) {
        (row as { updated_at: string }).updated_at = now;
      }
    }
    return { data: null as TValue, error: null };
  }

  private executeDelete<TValue>() {
    const rows = this.getRows();
    const keep = rows.filter((row) => !this.filters.every((filter) => filter(row)));
    this.db[this.table] = keep as MockDb[TTable];
    return { data: null as TValue, error: null };
  }
}

vi.mock("../../../supabase", () => ({
  supabase: {
    from: (table: TableName) => ({
      select: (_columns: string) => new MockQuery(state.db, table, "select"),
      insert: (payload: object | object[]) =>
        new MockQuery(state.db, table, "insert", payload as Array<Partial<TableRow<typeof table>>>),
      update: (payload: object) =>
        new MockQuery(state.db, table, "update", payload as Partial<TableRow<typeof table>>),
      delete: () => new MockQuery(state.db, table, "delete"),
    }),
  },
}));

import { preserveUnifiedCoachSetupOnServer } from "./preserveSetup";

describe("preserveUnifiedCoachSetupOnServer", () => {
  beforeEach(() => {
    state.db = cloneDb(buildInitialDb());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("moves accepted plans and intake onto the newly selected coach threads while clearing target draft/chat state", async () => {
    const result = await preserveUnifiedCoachSetupOnServer({
      userId: "user-1",
      sourceSelection: {
        workout: {
          specialization: "workout",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
        nutrition: {
          specialization: "nutrition",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
      },
      targetSelection: {
        workout: {
          specialization: "workout",
          gender: "woman",
          personality: "sweet",
          displayName: "Mia",
          tagline: "Warm",
        },
        nutrition: {
          specialization: "nutrition",
          gender: "woman",
          personality: "sweet",
          displayName: "Mia",
          tagline: "Warm",
        },
      },
    });

    expect(result.error).toBeUndefined();

    const workoutTargetThread = state.db.coach_threads.find(
      (row) => row.id === "thread-workout-target",
    );
    const nutritionTargetThread = state.db.coach_threads.find(
      (row) => row.id === "thread-nutrition-target",
    );

    expect(workoutTargetThread?.intake_json).toEqual({
      daysPerWeek: 4,
      goal: "fat_loss",
    });
    expect(workoutTargetThread?.last_message_at).toBeNull();
    expect(nutritionTargetThread?.intake_json).toEqual({
      goal: "lose",
      calories: 1800,
    });
    expect(nutritionTargetThread?.last_message_at).toBeNull();

    expect(
      state.db.coach_messages.filter((row) => row.thread_id === "thread-workout-target"),
    ).toEqual([]);
    expect(
      state.db.coach_messages.filter((row) => row.thread_id === "thread-nutrition-target"),
    ).toEqual([]);

    expect(state.db.coach_plans.find((row) => row.id === "workout-draft-source")).toBeUndefined();
    expect(state.db.coach_plans.find((row) => row.id === "workout-draft-target")).toBeUndefined();
    expect(state.db.coach_plans.find((row) => row.id === "nutrition-draft-target")).toBeUndefined();

    expect(
      state.db.coach_plans.find((row) => row.id === "workout-active-source")?.status,
    ).toBe("superseded");
    expect(
      state.db.coach_plans.find((row) => row.id === "workout-active-target")?.status,
    ).toBe("superseded");
    expect(
      state.db.coach_plans.find((row) => row.id === "nutrition-active-source")?.status,
    ).toBe("superseded");
    expect(
      state.db.coach_plans.find((row) => row.id === "nutrition-active-target")?.status,
    ).toBe("superseded");

    const copiedWorkoutPlan = state.db.coach_plans.find(
      (row) =>
        row.thread_id === "thread-workout-target" &&
        row.status === "active" &&
        row.title === "Workout A",
    );
    const copiedNutritionPlan = state.db.coach_plans.find(
      (row) =>
        row.thread_id === "thread-nutrition-target" &&
        row.status === "active" &&
        row.title === "Nutrition A",
    );

    expect(copiedWorkoutPlan?.plan_json).toEqual({ daysPerWeek: 4 });
    expect(copiedWorkoutPlan?.version).toBe(3);
    expect(copiedNutritionPlan?.plan_json).toEqual({ calories: 1800 });
    expect(copiedNutritionPlan?.version).toBe(2);
  });

  it("does not clear chat or drafts when preserve resolves to the same target thread", async () => {
    const before = cloneDb(state.db);

    const result = await preserveUnifiedCoachSetupOnServer({
      userId: "user-1",
      sourceSelection: {
        workout: {
          specialization: "workout",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
        nutrition: {
          specialization: "nutrition",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
      },
      targetSelection: {
        workout: {
          specialization: "workout",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
        nutrition: {
          specialization: "nutrition",
          gender: "woman",
          personality: "strict",
          displayName: "Ruth",
          tagline: "Direct",
        },
      },
    });

    expect(result.error).toBeUndefined();
    expect(state.db).toEqual(before);
  });
});
