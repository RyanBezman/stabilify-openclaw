import type { PushRegistrationOutcome } from "./pushNotifications";
import type { Result } from "./result";

export {
  fail,
  isSessionRequired,
  normalizeCursorPagination,
  normalizeErrorMessage,
  ok,
  toPaginatedItems,
  toSupabaseRange,
} from "./result";
export type {
  CursorPagination,
  CursorPaginationInput,
  PaginatedItems,
  Result,
  ServiceErrorCode,
} from "./result";
export {
  asyncWorkflowReducer,
  createAsyncWorkflowState,
  isAsyncWorkflowBusy,
} from "./asyncStateMachine";
export async function registerCurrentPushDevice(
  userId?: string | null,
): Promise<Result<PushRegistrationOutcome>> {
  const pushNotifications = await import("./pushNotifications");
  return pushNotifications.registerCurrentPushDevice(userId);
}
export type { PushRegistrationOutcome };
export { deriveSurfaceLoadState } from "./surfaceLoadState";
export type { SurfaceLoadState } from "./surfaceLoadState";
export {
  __resetRelationshipSyncEventsForTests,
  publishRelationshipSyncEvent,
  subscribeRelationshipSyncEvents,
} from "./relationshipSyncEvents";
export type {
  RelationshipFollowState,
  RelationshipSyncEvent,
} from "./relationshipSyncEvents";
export async function requestForegroundLocationPermissionWithPrimer() {
  const locationPermission = await import("./locationPermission");
  return locationPermission.requestForegroundLocationPermissionWithPrimer();
}
export type {
  AsyncWorkflowEvent,
  AsyncWorkflowState,
  AsyncWorkflowStatus,
} from "./asyncStateMachine";
