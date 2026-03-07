import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";

export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_TOP_PADDING = 12;
export const FLOATING_TAB_MIN_BOTTOM_PADDING = 12;
export const FLOATING_TAB_HORIZONTAL_PADDING = 16;
export const FLOATING_TAB_CONTENT_GAP = 20;
export const FLOATING_TAB_SCREEN_SAFE_AREA_EDGES: readonly Edge[] = ["top", "right", "left"];

export function useFloatingTabBarLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, FLOATING_TAB_MIN_BOTTOM_PADDING);
  const overlayHeight = FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_TOP_PADDING + bottomPadding;

  return {
    bottomPadding,
    contentBottomPadding: overlayHeight + FLOATING_TAB_CONTENT_GAP,
    overlayHeight,
    tabBarHeight: FLOATING_TAB_BAR_HEIGHT,
  };
}
