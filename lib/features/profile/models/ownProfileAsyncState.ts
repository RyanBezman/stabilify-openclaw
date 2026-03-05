import { asyncWorkflowReducer, createAsyncWorkflowState } from "../../shared";

export type OwnProfileAsyncState = {
  dashboard: ReturnType<typeof createAsyncWorkflowState>;
  progressRefresh: ReturnType<typeof createAsyncWorkflowState>;
};

export type OwnProfileAsyncAction =
  | { type: "dashboard/start" }
  | { type: "dashboard/succeed" }
  | { type: "dashboard/fail"; error: string }
  | { type: "dashboard/reset" }
  | { type: "progress/start" }
  | { type: "progress/succeed" }
  | { type: "progress/fail"; error: string }
  | { type: "progress/reset" };

export const initialOwnProfileAsyncState: OwnProfileAsyncState = {
  dashboard: createAsyncWorkflowState("loading"),
  progressRefresh: createAsyncWorkflowState(),
};

export function ownProfileAsyncReducer(
  state: OwnProfileAsyncState,
  action: OwnProfileAsyncAction,
): OwnProfileAsyncState {
  switch (action.type) {
    case "dashboard/start":
      return {
        ...state,
        dashboard: asyncWorkflowReducer(state.dashboard, { type: "start" }),
      };
    case "dashboard/succeed":
      return {
        ...state,
        dashboard: asyncWorkflowReducer(state.dashboard, { type: "succeed" }),
      };
    case "dashboard/fail":
      return {
        ...state,
        dashboard: asyncWorkflowReducer(state.dashboard, { type: "fail", error: action.error }),
      };
    case "dashboard/reset":
      return {
        ...state,
        dashboard: asyncWorkflowReducer(state.dashboard, { type: "reset" }),
      };
    case "progress/start":
      return {
        ...state,
        progressRefresh: asyncWorkflowReducer(state.progressRefresh, { type: "start" }),
      };
    case "progress/succeed":
      return {
        ...state,
        progressRefresh: asyncWorkflowReducer(state.progressRefresh, { type: "succeed" }),
      };
    case "progress/fail":
      return {
        ...state,
        progressRefresh: asyncWorkflowReducer(state.progressRefresh, {
          type: "fail",
          error: action.error,
        }),
      };
    case "progress/reset":
      return {
        ...state,
        progressRefresh: asyncWorkflowReducer(state.progressRefresh, { type: "reset" }),
      };
    default:
      return state;
  }
}
