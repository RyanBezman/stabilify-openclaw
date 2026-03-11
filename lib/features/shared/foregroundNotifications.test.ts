import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
}));

vi.mock("expo-notifications", () => ({
  setNotificationHandler: mocks.setNotificationHandler,
}));

import {
  __resetForegroundNotificationHandlerForTests,
  foregroundNotificationBehavior,
  registerForegroundNotificationHandler,
} from "./foregroundNotifications";

describe("foregroundNotifications", () => {
  beforeEach(() => {
    mocks.setNotificationHandler.mockReset();
    __resetForegroundNotificationHandlerForTests();
  });

  it("registers the foreground notification handler once", async () => {
    registerForegroundNotificationHandler();
    registerForegroundNotificationHandler();

    expect(mocks.setNotificationHandler).toHaveBeenCalledTimes(1);

    const handler = mocks.setNotificationHandler.mock.calls[0]?.[0];
    const behavior = await handler.handleNotification();
    expect(behavior).toEqual(foregroundNotificationBehavior);
  });
});
