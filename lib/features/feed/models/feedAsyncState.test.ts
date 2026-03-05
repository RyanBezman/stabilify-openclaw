import { describe, expect, it } from "vitest";
import { feedAsyncReducer, initialFeedAsyncState } from "./feedAsyncState";

describe("feedAsyncState", () => {
  it("starts initial lane in loading state", () => {
    expect(initialFeedAsyncState.initial.status).toBe("loading");
    expect(initialFeedAsyncState.refresh.status).toBe("idle");
    expect(initialFeedAsyncState.pagination.status).toBe("idle");
  });

  it("sets error on failure and clears it on success", () => {
    let state = feedAsyncReducer(initialFeedAsyncState, {
      type: "pagination/fail",
      error: "pagination failed",
    });
    expect(state.pagination.status).toBe("error");
    expect(state.error).toBe("pagination failed");

    state = feedAsyncReducer(state, { type: "refresh/succeed" });
    expect(state.refresh.status).toBe("success");
    expect(state.error).toBeNull();
  });
});
