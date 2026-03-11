import * as Notifications from "expo-notifications";

export const foregroundNotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
} as const;

let foregroundNotificationHandlerRegistered = false;

export function registerForegroundNotificationHandler() {
  if (foregroundNotificationHandlerRegistered) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => foregroundNotificationBehavior,
  });
  foregroundNotificationHandlerRegistered = true;
}

export function __resetForegroundNotificationHandlerForTests() {
  foregroundNotificationHandlerRegistered = false;
}
