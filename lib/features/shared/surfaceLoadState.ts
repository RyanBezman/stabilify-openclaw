export type SurfaceLoadState = {
  blockingLoad: boolean;
  hydrated: boolean;
  refreshing: boolean;
  hasUsableSnapshot: boolean;
  mutating: boolean;
};

type DeriveSurfaceLoadStateArgs = {
  blockingLoad: boolean;
  hydrated: boolean;
  refreshing: boolean;
  hasUsableSnapshot: boolean;
  mutating?: boolean;
};

export function deriveSurfaceLoadState({
  blockingLoad,
  hydrated,
  refreshing,
  hasUsableSnapshot,
  mutating = false,
}: DeriveSurfaceLoadStateArgs): SurfaceLoadState {
  return {
    blockingLoad: blockingLoad && !hasUsableSnapshot,
    hydrated,
    refreshing: refreshing && hasUsableSnapshot,
    hasUsableSnapshot,
    mutating,
  };
}
