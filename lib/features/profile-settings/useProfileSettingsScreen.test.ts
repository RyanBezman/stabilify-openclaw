import { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { renderTestHook } from "../../../test/utils/renderHook";
import type { RootStackParamList } from "../../navigation/types";

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  openSettings: vi.fn(),
  useProfileSettings: vi.fn(),
  useProfileSettingsNotifications: vi.fn(),
  useProfileSettingsPhoto: vi.fn(),
}));

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Alert: {
      alert: mocks.alert,
    },
    Linking: {
      openSettings: mocks.openSettings,
    },
  };
});

vi.mock("./useProfileSettings", () => ({
  useProfileSettings: mocks.useProfileSettings,
}));

vi.mock("./useProfileSettingsNotifications", () => ({
  useProfileSettingsNotifications: mocks.useProfileSettingsNotifications,
}));

vi.mock("./useProfileSettingsPhoto", () => ({
  useProfileSettingsPhoto: mocks.useProfileSettingsPhoto,
}));

import { useProfileSettingsScreen } from "./useProfileSettingsScreen";

type ProfileSettingsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "ProfileSettings"
>;

type ProfileSettingsState = ReturnType<typeof import("./useProfileSettings").useProfileSettings>;

function buildProfileSettingsState(
  overrides: Partial<ProfileSettingsState> = {},
): ProfileSettingsState {
  const updateProfileValues = vi.fn().mockResolvedValue({ success: true });
  const setPhoneNudgesEnabled = vi.fn().mockResolvedValue({ success: true });
  const setAppleHealthStepsEnabled = vi.fn().mockResolvedValue({ success: true });
  const refresh = vi.fn().mockResolvedValue({});
  const grantAutoSupportConsent = vi.fn().mockResolvedValue({ success: true });
  const save = vi.fn().mockResolvedValue({ success: true });

  return {
    loading: false,
    blockingLoad: false,
    hydrated: true,
    refreshing: false,
    hasUsableSnapshot: true,
    mutating: false,
    saving: false,
    updatingPhoneNudges: false,
    updatingAppleHealthSteps: false,
    grantingAutoSupportConsent: false,
    loadError: null,
    refresh,
    displayName: "User One",
    setDisplayName: vi.fn(),
    username: "user_one",
    setUsername: vi.fn(),
    bio: "Training hard",
    setBio: vi.fn(),
    avatarPath: null,
    setAvatarPath: vi.fn(),
    preferredUnit: "lb",
    setPreferredUnit: vi.fn(),
    timezone: "America/New_York",
    setTimezone: vi.fn(),
    accountVisibility: "private",
    setAccountVisibility: vi.fn(),
    progressVisibility: "public",
    setProgressVisibility: vi.fn(),
    socialEnabled: false,
    setSocialEnabled: vi.fn(),
    weighInShareVisibility: "private",
    setWeighInShareVisibility: vi.fn(),
    gymEventShareVisibility: "private",
    setGymEventShareVisibility: vi.fn(),
    postShareVisibility: "private",
    setPostShareVisibility: vi.fn(),
    autoSupportEnabled: false,
    setAutoSupportEnabled: vi.fn(),
    autoSupportConsentedAt: null,
    phoneNudgesEnabled: false,
    setPhoneNudgesEnabled,
    appleHealthStepsEnabled: false,
    setAppleHealthStepsEnabled,
    dailyStepGoal: 10000,
    setDailyStepGoal: vi.fn(),
    grantAutoSupportConsent,
    updateProfileValues,
    save,
    ...overrides,
  };
}

function buildNavigation(): ProfileSettingsNavigation {
  const getParent: ProfileSettingsNavigation["getParent"] = <T>() => undefined as T;
  const getState: ProfileSettingsNavigation["getState"] = () => ({
    key: "root",
    index: 0,
    routeNames: ["ProfileSettings"],
    routes: [{ key: "profile-settings", name: "ProfileSettings", params: undefined }],
    stale: false,
    type: "stack",
    preloadedRoutes: [],
  });

  return {
    addListener: vi.fn(() => vi.fn()),
    canGoBack: vi.fn(() => true),
    dispatch: vi.fn(),
    getId: vi.fn(() => "root"),
    getParent,
    getState,
    goBack: vi.fn(),
    isFocused: vi.fn(() => true),
    navigate: vi.fn(),
    navigateDeprecated: vi.fn(),
    pop: vi.fn(),
    popTo: vi.fn(),
    popToTop: vi.fn(),
    preload: vi.fn(),
    push: vi.fn(),
    removeListener: vi.fn(),
    replace: vi.fn(),
    replaceParams: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    setParams: vi.fn(),
  };
}

describe("useProfileSettingsScreen", () => {
  beforeEach(() => {
    mocks.alert.mockReset();
    mocks.openSettings.mockReset();
    mocks.useProfileSettings.mockReset();
    mocks.useProfileSettingsNotifications.mockReset();
    mocks.useProfileSettingsPhoto.mockReset();

    mocks.useProfileSettings.mockReturnValue(buildProfileSettingsState());
    mocks.useProfileSettingsNotifications.mockReturnValue({
      handleSendDelayedTestNotification: vi.fn(),
      handleSendTestNotification: vi.fn(),
      handleSetPhoneNudgesEnabled: vi.fn(),
      handleShowPushDebugInfo: vi.fn(),
      loadingPushDebugInfo: false,
      sendingDelayedTestNotification: false,
      sendingTestNotification: false,
    });
    mocks.useProfileSettingsPhoto.mockReturnValue({
      openPhotoActions: vi.fn(),
      photoLoading: false,
      photoUrl: null,
    });
  });

  it("updates dependent visibility settings when making a profile public", async () => {
    const updateProfileValues = vi.fn().mockResolvedValue({ success: true });
    mocks.useProfileSettings.mockReturnValue(
      buildProfileSettingsState({
        updateProfileValues,
      }),
    );

    const hook = renderTestHook(() => useProfileSettingsScreen(buildNavigation()));

    await act(async () => {
      await hook.result.current.handleAccountVisibilityChange("public");
    });

    expect(updateProfileValues).toHaveBeenCalledWith({
      accountVisibility: "public",
      socialEnabled: true,
      weighInShareVisibility: "followers",
      gymEventShareVisibility: "followers",
      postShareVisibility: "followers",
    });
  });

  it("collapses advanced privacy and updates dependent visibility settings when making a profile private", async () => {
    const updateProfileValues = vi.fn().mockResolvedValue({ success: true });
    mocks.useProfileSettings.mockReturnValue(
      buildProfileSettingsState({
        updateProfileValues,
      }),
    );

    const hook = renderTestHook(() => useProfileSettingsScreen(buildNavigation()));

    act(() => {
      hook.result.current.setShowAdvancedPrivacy(true);
    });

    await act(async () => {
      await hook.result.current.handleAccountVisibilityChange("private");
    });

    expect(hook.result.current.showAdvancedPrivacy).toBe(false);
    expect(updateProfileValues).toHaveBeenCalledWith({
      accountVisibility: "private",
      socialEnabled: false,
      weighInShareVisibility: "private",
      gymEventShareVisibility: "private",
      postShareVisibility: "private",
    });
  });

  it("routes editable fields into the text edit screen", () => {
    const navigation = buildNavigation();
    const hook = renderTestHook(() => useProfileSettingsScreen(navigation));

    hook.result.current.openEditableField("timezone");

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileSettingsTextEdit", {
      fieldKey: "timezone",
    });
  });
});
