import { asyncWorkflowReducer, createAsyncWorkflowState } from "../../shared";

export type FeedAsyncState = {
  initial: ReturnType<typeof createAsyncWorkflowState>;
  refresh: ReturnType<typeof createAsyncWorkflowState>;
  pagination: ReturnType<typeof createAsyncWorkflowState>;
  error: string | null;
};

export type FeedAsyncAction =
  | { type: "initial/start" }
  | { type: "initial/succeed" }
  | { type: "initial/fail"; error: string }
  | { type: "refresh/start" }
  | { type: "refresh/succeed" }
  | { type: "refresh/fail"; error: string }
  | { type: "pagination/start" }
  | { type: "pagination/succeed" }
  | { type: "pagination/fail"; error: string }
  | { type: "clearError" };

export const initialFeedAsyncState: FeedAsyncState = {
  initial: createAsyncWorkflowState("loading"),
  refresh: createAsyncWorkflowState(),
  pagination: createAsyncWorkflowState(),
  error: null,
};

export function feedAsyncReducer(state: FeedAsyncState, action: FeedAsyncAction): FeedAsyncState {
  switch (action.type) {
    case "initial/start":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "start" }),
      };
    case "initial/succeed":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "succeed" }),
        error: null,
      };
    case "initial/fail":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "fail", error: action.error }),
        error: action.error,
      };
    case "refresh/start":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "start" }),
      };
    case "refresh/succeed":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "succeed" }),
        error: null,
      };
    case "refresh/fail":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "fail", error: action.error }),
        error: action.error,
      };
    case "pagination/start":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, { type: "start" }),
      };
    case "pagination/succeed":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, { type: "succeed" }),
        error: null,
      };
    case "pagination/fail":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, {
          type: "fail",
          error: action.error,
        }),
        error: action.error,
      };
    case "clearError":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}
