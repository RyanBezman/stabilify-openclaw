import {
  asyncWorkflowReducer,
  createAsyncWorkflowState,
  type AsyncWorkflowEvent,
} from "../../shared";

type CoachAsyncScope = "workspace" | "send" | "plan";
type CoachAsyncTransition = AsyncWorkflowEvent["type"];

export type CoachAsyncState = {
  workspace: ReturnType<typeof createAsyncWorkflowState>;
  send: ReturnType<typeof createAsyncWorkflowState>;
  plan: ReturnType<typeof createAsyncWorkflowState>;
};

export type CoachAsyncAction =
  | { type: `${CoachAsyncScope}/start` }
  | { type: `${CoachAsyncScope}/succeed` }
  | { type: `${CoachAsyncScope}/fail`; error: string }
  | { type: `${CoachAsyncScope}/reset` };

export const initialCoachAsyncState: CoachAsyncState = {
  workspace: createAsyncWorkflowState(),
  send: createAsyncWorkflowState(),
  plan: createAsyncWorkflowState(),
};

function isCoachAsyncScope(value: string): value is CoachAsyncScope {
  return value === "workspace" || value === "send" || value === "plan";
}

function isCoachAsyncTransition(value: string): value is CoachAsyncTransition {
  return value === "start" || value === "succeed" || value === "fail" || value === "reset";
}

export function coachAsyncReducer(state: CoachAsyncState, action: CoachAsyncAction): CoachAsyncState {
  const [scope, transition] = action.type.split("/");
  if (!isCoachAsyncScope(scope) || !isCoachAsyncTransition(transition)) {
    return state;
  }

  if (transition === "fail" && "error" in action) {
    return {
      ...state,
      [scope]: asyncWorkflowReducer(state[scope], { type: "fail", error: action.error }),
    };
  }

  if (transition !== "start" && transition !== "succeed" && transition !== "reset") {
    return state;
  }

  return {
    ...state,
    [scope]: asyncWorkflowReducer(state[scope], { type: transition }),
  };
}
