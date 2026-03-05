import { describe, expect, it } from "vitest";
import {
  initialOwnProfileAsyncState,
  ownProfileAsyncReducer,
} from "./ownProfileAsyncState";

describe("ownProfileAsyncState", () => {
  it("starts with dashboard loading and progress idle", () => {
    expect(initialOwnProfileAsyncState.dashboard.status).toBe("loading");
    expect(initialOwnProfileAsyncState.progressRefresh.status).toBe("idle");
  });

  it("handles progress refresh transitions without mutating dashboard lane", () => {
    let state = ownProfileAsyncReducer(initialOwnProfileAsyncState, { type: "progress/start" });
    expect(state.progressRefresh.status).toBe("loading");
    expect(state.dashboard.status).toBe("loading");

    state = ownProfileAsyncReducer(state, {
      type: "progress/fail",
      error: "refresh failed",
    });
    expect(state.progressRefresh.status).toBe("error");
    expect(state.progressRefresh.error).toBe("refresh failed");

    state = ownProfileAsyncReducer(state, { type: "progress/reset" });
    expect(state.progressRefresh.status).toBe("idle");
    expect(state.progressRefresh.error).toBeNull();
  });
});
