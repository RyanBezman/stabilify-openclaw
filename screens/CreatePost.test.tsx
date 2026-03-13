import type { ReactNode } from "react";
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../lib/navigation/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  addKeyboardListener: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  createCurrentUserTextPost: vi.fn(),
  createCurrentUserPhotoPost: vi.fn(),
  resolveCurrentAuthorContext: vi.fn(),
}));

if (globalThis.requestAnimationFrame === undefined) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  };
}

vi.mock("react-native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");

  type MockProps = {
    children?: ReactNode;
    visible?: boolean;
    testID?: string;
  };

  const createMockComponent = (name: string) => {
    const MockComponent = ({ children, ...props }: MockProps) =>
      ReactModule.createElement(name, props, children);
    MockComponent.displayName = name;
    return MockComponent;
  };

  const keyboardSubscription = {
    remove: vi.fn(),
  };

  return {
    Alert: {
      alert: mocks.alert,
    },
    Keyboard: {
      addListener: mocks.addKeyboardListener.mockReturnValue(keyboardSubscription),
    },
    KeyboardAvoidingView: createMockComponent("KeyboardAvoidingView"),
    Platform: {
      OS: "ios",
    },
    ScrollView: createMockComponent("ScrollView"),
    TextInput: createMockComponent("TextInput"),
    View: createMockComponent("View"),
  };
});

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

vi.mock("expo-image-picker", () => ({
  MediaTypeOptions: {
    Images: "Images",
  },
  requestMediaLibraryPermissionsAsync: mocks.requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync: mocks.launchImageLibraryAsync,
}));

vi.mock("../components/posts/PostComposerHeader", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: (props: object) => ReactModule.createElement("PostComposerHeader", props),
  };
});

vi.mock("../components/posts/PostComposerActionBar", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: (props: object) => ReactModule.createElement("PostComposerActionBar", props),
  };
});

vi.mock("../components/posts/PostAudienceSheet", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: (props: object) => ReactModule.createElement("PostAudienceSheet", props),
  };
});

vi.mock("../components/posts/PostComposerPhotosGrid", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: (props: object) => ReactModule.createElement("PostComposerPhotosGrid", props),
  };
});

vi.mock("../components/profile/ProfileAvatar", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: (props: object) => ReactModule.createElement("ProfileAvatar", props),
  };
});

vi.mock("../components/ui/AppScreen", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    default: ({ children, ...props }: { children?: ReactNode }) =>
      ReactModule.createElement("AppScreen", props, children),
  };
});

vi.mock("../lib/data/posts", () => ({
  POST_BODY_MAX_CHARS: 280,
  createCurrentUserTextPost: mocks.createCurrentUserTextPost,
  createCurrentUserPhotoPost: mocks.createCurrentUserPhotoPost,
}));

vi.mock("../lib/features/feed", () => ({
  DEFAULT_AUDIENCE_HINT: "Default audience: followers.",
  resolveCurrentAuthorContext: mocks.resolveCurrentAuthorContext,
}));

import CreatePost from "./CreatePost";

function findByType(root: ReactTestInstance, type: string) {
  const match = root.findAllByType(type)[0];
  if (!match) {
    throw new Error(`Expected to find node of type ${type}.`);
  }
  return match;
}

function getRequiredFunction<T extends (...args: never[]) => void | Promise<void>>(
  props: ReactTestInstance["props"],
  key: string,
): T {
  const value = props[key];
  if (typeof value !== "function") {
    throw new Error(`Expected ${key} to be a function.`);
  }
  return value as T;
}

function getRequiredString(props: ReactTestInstance["props"], key: string): string {
  const value = props[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}

function buildProps() {
  type CreatePostNavigation = NativeStackNavigationProp<RootStackParamList, "CreatePost">;

  const getParent: CreatePostNavigation["getParent"] = <T,>() => undefined as T;
  const getState: CreatePostNavigation["getState"] = () => ({
    key: "root",
    index: 0,
    routeNames: ["CreatePost"],
    routes: [{ key: "create-post", name: "CreatePost", params: undefined }],
    stale: false,
    type: "stack",
    preloadedRoutes: [],
  });

  const navigation: CreatePostNavigation = {
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

  return {
    navigation,
    route: {
      key: "create-post",
      name: "CreatePost" as const,
      params: {
        defaultAudienceHint: "Default audience: followers.",
      },
    },
  };
}

describe("CreatePost", () => {
  beforeEach(() => {
    mocks.alert.mockReset();
    mocks.addKeyboardListener.mockReset();
    mocks.requestMediaLibraryPermissionsAsync.mockReset();
    mocks.launchImageLibraryAsync.mockReset();
    mocks.createCurrentUserTextPost.mockReset();
    mocks.createCurrentUserPhotoPost.mockReset();
    mocks.resolveCurrentAuthorContext.mockReset();
    mocks.addKeyboardListener.mockReturnValue({
      remove: vi.fn(),
    });

    mocks.resolveCurrentAuthorContext.mockResolvedValue({
      userId: "user-1",
      displayName: "User One",
      avatarPath: null,
      photoUrl: null,
      accountVisibility: "public",
      defaultPostVisibility: "public",
      defaultAudienceHint: "Default audience: everyone.",
    });
    mocks.createCurrentUserTextPost.mockResolvedValue({
      data: {
        post: {
          id: "post-1",
          authorUserId: "user-1",
          postType: "text",
          body: "hello world",
          mediaUrls: [],
          visibility: "close_friends",
          createdAt: "2026-03-13T12:00:00.000Z",
        },
      },
    });
    mocks.createCurrentUserPhotoPost.mockResolvedValue({
      data: {
        post: {
          id: "post-2",
          authorUserId: "user-1",
          postType: "photo",
          body: "photo caption",
          mediaUrls: [],
          visibility: "public",
          createdAt: "2026-03-13T12:00:00.000Z",
        },
      },
    });
    mocks.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    mocks.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///photo-1.jpg",
          mimeType: "image/jpeg",
          fileName: "photo-1.jpg",
          base64: "ZmFrZQ==",
        },
      ],
    });
  });

  it("submits a text post with the audience selected in the composer", async () => {
    const props = buildProps();
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(CreatePost, props));
      await Promise.resolve();
    });

    const root = renderer!.root;
    const textInput = findByType(root, "TextInput");
    const actionBar = findByType(root, "PostComposerActionBar");
    const audienceSheet = findByType(root, "PostAudienceSheet");
    const onChangeText = getRequiredFunction<(value: string) => void>(
      textInput.props,
      "onChangeText",
    );
    const selectedVisibility = getRequiredString(actionBar.props, "selectedVisibility");
    const onOpenAudiencePicker = getRequiredFunction<() => void>(
      actionBar.props,
      "onOpenAudiencePicker",
    );
    const onSelectVisibility = getRequiredFunction<(visibility: string) => void>(
      audienceSheet.props,
      "onSelectVisibility",
    );

    expect(selectedVisibility).toBe("public");

    await act(async () => {
      onChangeText("hello world");
    });

    await act(async () => {
      onOpenAudiencePicker();
    });

    await act(async () => {
      onSelectVisibility("close_friends");
    });

    const header = findByType(root, "PostComposerHeader");
    const onSubmit = getRequiredFunction<() => void>(header.props, "onSubmit");

    await act(async () => {
      onSubmit();
    });

    expect(mocks.createCurrentUserTextPost).toHaveBeenCalledWith("hello world", {
      visibility: "close_friends",
    });
    expect(props.navigation.navigate).toHaveBeenCalledWith("Authed", {
      screen: "Feed",
      params: {
        createdPost: {
          id: "post-1",
          authorUserId: "user-1",
          postType: "text",
          body: "hello world",
          mediaUrls: [],
          visibility: "close_friends",
          createdAt: "2026-03-13T12:00:00.000Z",
        },
      },
    });
  });

  it("submits a photo post with the resolved public default audience", async () => {
    const props = buildProps();
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(React.createElement(CreatePost, props));
      await Promise.resolve();
    });

    const root = renderer!.root;
    const textInput = findByType(root, "TextInput");
    const onChangeText = getRequiredFunction<(value: string) => void>(
      textInput.props,
      "onChangeText",
    );

    await act(async () => {
      onChangeText("photo caption");
    });

    const actionBar = findByType(root, "PostComposerActionBar");
    const onAddPhotos = getRequiredFunction<() => Promise<void>>(
      actionBar.props,
      "onAddPhotos",
    );

    await act(async () => {
      await onAddPhotos();
    });

    const header = findByType(root, "PostComposerHeader");
    const onSubmit = getRequiredFunction<() => void>(header.props, "onSubmit");

    await act(async () => {
      onSubmit();
    });

    expect(mocks.createCurrentUserPhotoPost).toHaveBeenCalledWith({
      photos: [
        {
          uri: "file:///photo-1.jpg",
          mimeType: "image/jpeg",
          fileName: "photo-1.jpg",
          base64: "ZmFrZQ==",
        },
      ],
      caption: "photo caption",
      visibility: "public",
    });
  });
});
