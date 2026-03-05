export type AsyncWorkflowStatus = "idle" | "loading" | "success" | "error" | "retrying";

export type AsyncWorkflowState = {
  status: AsyncWorkflowStatus;
  error: string | null;
};

export type AsyncWorkflowEvent =
  | { type: "start" }
  | { type: "succeed" }
  | { type: "fail"; error: string }
  | { type: "reset" };

export function createAsyncWorkflowState(
  status: AsyncWorkflowStatus = "idle",
): AsyncWorkflowState {
  return {
    status,
    error: null,
  };
}

function nextLoadingStatus(previousStatus: AsyncWorkflowStatus): AsyncWorkflowStatus {
  return previousStatus === "error" || previousStatus === "retrying" ? "retrying" : "loading";
}

export function asyncWorkflowReducer(
  state: AsyncWorkflowState,
  event: AsyncWorkflowEvent,
): AsyncWorkflowState {
  switch (event.type) {
    case "start":
      return {
        status: nextLoadingStatus(state.status),
        error: null,
      };
    case "succeed":
      return {
        status: "success",
        error: null,
      };
    case "fail":
      return {
        status: "error",
        error: event.error,
      };
    case "reset":
      return createAsyncWorkflowState();
    default:
      return state;
  }
}

export function isAsyncWorkflowBusy(state: AsyncWorkflowState) {
  return state.status === "loading" || state.status === "retrying";
}
