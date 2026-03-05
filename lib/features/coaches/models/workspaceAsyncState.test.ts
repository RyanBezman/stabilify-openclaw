import { describe, expect, it } from "vitest";
import {
  coachAsyncReducer,
  initialCoachAsyncState,
} from "./workspaceAsyncState";

describe("workspaceAsyncState", () => {
  it("initializes all async lanes as idle", () => {
    expect(initialCoachAsyncState.workspace.status).toBe("idle");
    expect(initialCoachAsyncState.send.status).toBe("idle");
    expect(initialCoachAsyncState.plan.status).toBe("idle");
  });

  it("updates only the targeted lane for start/success/fail/reset transitions", () => {
    let state = coachAsyncReducer(initialCoachAsyncState, {
      type: "workspace/start",
    });
    expect(state.workspace.status).toBe("loading");
    expect(state.send.status).toBe("idle");

    state = coachAsyncReducer(state, {
      type: "workspace/fail",
      error: "load failed",
    });
    expect(state.workspace.status).toBe("error");
    expect(state.workspace.error).toBe("load failed");

    state = coachAsyncReducer(state, { type: "plan/start" });
    expect(state.plan.status).toBe("loading");

    state = coachAsyncReducer(state, { type: "plan/succeed" });
    expect(state.plan.status).toBe("success");

    state = coachAsyncReducer(state, { type: "workspace/reset" });
    expect(state.workspace.status).toBe("idle");
    expect(state.workspace.error).toBeNull();
    expect(state.plan.status).toBe("success");
  });
});
