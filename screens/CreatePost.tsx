import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import PostComposerActionBar from "../components/posts/PostComposerActionBar";
import PostAudienceSheet from "../components/posts/PostAudienceSheet";
import PostComposerHeader from "../components/posts/PostComposerHeader";
import PostComposerPhotosGrid from "../components/posts/PostComposerPhotosGrid";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import {
  createCurrentUserPhotoPost,
  createCurrentUserTextPost,
  POST_BODY_MAX_CHARS,
} from "../lib/data/posts";
import {
  inferPostVisibilityFromAudienceHint,
  normalizePostAudienceAccountVisibility,
} from "../lib/data/postVisibility";
import type { AccountVisibility, ShareVisibility } from "../lib/data/types";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";
import {
  DEFAULT_AUDIENCE_HINT,
  resolveCurrentAuthorContext,
  type AuthorContext,
} from "../lib/features/feed";

const MAX_POST_PHOTOS = 4;

type CreatePostProps = NativeStackScreenProps<RootStackParamList, "CreatePost">;

export default function CreatePost({ navigation, route }: CreatePostProps) {
  const insets = useSafeAreaInsets();
  const allowNavigationRef = useRef(false);
  const inputRef = useRef<TextInput | null>(null);
  const keyboardLockPausedRef = useRef(false);
  const audienceSelectionDirtyRef = useRef(false);

  const [newPostBody, setNewPostBody] = useState("");
  const [newPostPhotoAssets, setNewPostPhotoAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [savingPost, setSavingPost] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const [authorContext, setAuthorContext] = useState<AuthorContext | null>(null);
  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<ShareVisibility>(() =>
    inferPostVisibilityFromAudienceHint(route.params?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT),
  );

  const pendingPhotoUris = useMemo(
    () => newPostPhotoAssets.map((asset) => asset.uri).filter((uri) => Boolean(uri)),
    [newPostPhotoAssets],
  );
  const trimmedBody = newPostBody.trim();
  const postCharacterCount = newPostBody.length;
  const hasPendingPhotos = pendingPhotoUris.length > 0;
  const canPost = Boolean(trimmedBody || hasPendingPhotos);
  const isDirty = Boolean(trimmedBody || hasPendingPhotos);
  const defaultAudienceHint = route.params?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT;
  const authorDisplayName = authorContext?.displayName ?? "You";
  const accountVisibility: AccountVisibility =
    authorContext?.accountVisibility ??
    normalizePostAudienceAccountVisibility(
      defaultAudienceHint.toLowerCase().includes("everyone") ? "public" : "private",
    );

  const confirmDiscardIfDirty = useCallback(
    (onDiscard: () => void) => {
      if (savingPost) {
        return;
      }
      if (!isDirty) {
        onDiscard();
        return;
      }

      keyboardLockPausedRef.current = true;
      Alert.alert("Discard post?", "You have unsent changes.", [
        {
          text: "Keep editing",
          style: "cancel",
          onPress: () => {
            keyboardLockPausedRef.current = false;
            requestAnimationFrame(() => inputRef.current?.focus());
          },
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: onDiscard,
        },
      ]);
    },
    [isDirty, savingPost],
  );

  const focusComposer = useCallback(() => {
    setKeyboardVisible(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      focusComposer();
    }, 120);
    return () => clearTimeout(timer);
  }, [focusComposer]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      if (keyboardLockPausedRef.current || allowNavigationRef.current || savingPost) {
        return;
      }
      focusComposer();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [focusComposer, savingPost]);

  useEffect(() => {
    let active = true;

    const loadAuthorContext = async () => {
      const result = await resolveCurrentAuthorContext();
      if (!active) {
        return;
      }
      setAuthorContext(result);
    };

    void loadAuthorContext();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (audienceSelectionDirtyRef.current) {
      return;
    }

    const fallbackVisibility = inferPostVisibilityFromAudienceHint(defaultAudienceHint);
    setSelectedVisibility(authorContext?.defaultPostVisibility ?? fallbackVisibility);
  }, [authorContext?.defaultPostVisibility, defaultAudienceHint]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowNavigationRef.current || savingPost) {
        return;
      }

      if (!isDirty) {
        return;
      }

      event.preventDefault();
      confirmDiscardIfDirty(() => {
        allowNavigationRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [confirmDiscardIfDirty, isDirty, navigation, savingPost]);

  const handleCancel = useCallback(() => {
    confirmDiscardIfDirty(() => {
      keyboardLockPausedRef.current = true;
      allowNavigationRef.current = true;
      navigation.goBack();
    });
  }, [confirmDiscardIfDirty, navigation]);

  const handleAddPhotos = useCallback(async () => {
    if (newPostPhotoAssets.length >= MAX_POST_PHOTOS) {
      Alert.alert("Photo limit reached", `You can attach up to ${MAX_POST_PHOTOS} photos.`);
      return;
    }

    keyboardLockPausedRef.current = true;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      keyboardLockPausedRef.current = false;
      Alert.alert("Photos permission needed", "Allow photo library access to create photo posts.");
      setTimeout(() => {
        focusComposer();
      }, 120);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_POST_PHOTOS - newPostPhotoAssets.length,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      keyboardLockPausedRef.current = false;
      setTimeout(() => {
        focusComposer();
      }, 120);
      return;
    }

    setNewPostPhotoAssets((prev) => {
      const merged = [...prev];
      for (const asset of result.assets) {
        const uri = asset.uri?.trim();
        if (!uri) continue;
        if (merged.some((existing) => existing.uri === uri)) continue;
        merged.push(asset);
        if (merged.length >= MAX_POST_PHOTOS) break;
      }
      return merged;
    });

    keyboardLockPausedRef.current = false;
    setTimeout(() => {
      focusComposer();
    }, 120);
  }, [focusComposer, newPostPhotoAssets.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setNewPostPhotoAssets((prev) => prev.filter((_, assetIndex) => assetIndex !== index));
  }, []);

  const handleSelectVisibility = useCallback(
    (visibility: ShareVisibility) => {
      keyboardLockPausedRef.current = false;
      audienceSelectionDirtyRef.current = true;
      setSelectedVisibility(visibility);
      setAudienceSheetVisible(false);
      focusComposer();
    },
    [focusComposer],
  );

  const handleSubmitPost = useCallback(async () => {
    if (savingPost || !canPost) {
      return;
    }
    keyboardLockPausedRef.current = true;

    const body = newPostBody.trim();
    const selectedPhotos = newPostPhotoAssets
      .map((asset) => ({
        uri: asset.uri?.trim() ?? "",
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        base64: asset.base64 ?? null,
      }))
      .filter((asset) => asset.uri.length > 0)
      .slice(0, MAX_POST_PHOTOS);

    const hasPhotos = selectedPhotos.length > 0;

    setSavingPost(true);
    const result = hasPhotos
      ? await createCurrentUserPhotoPost({
          photos: selectedPhotos,
          caption: body,
          visibility: selectedVisibility,
        })
      : await createCurrentUserTextPost(body, { visibility: selectedVisibility });

    if (result.error || !result.data?.post) {
      keyboardLockPausedRef.current = false;
      setSavingPost(false);
      Alert.alert("Couldn't save post", result.error ?? "Please try again.");
      setTimeout(() => {
        focusComposer();
      }, 120);
      return;
    }

    allowNavigationRef.current = true;
    navigation.navigate("Authed", {
      screen: "Feed",
      params: {
        createdPost: result.data.post,
      },
    });
  }, [
    canPost,
    focusComposer,
    navigation,
    newPostBody,
    newPostPhotoAssets,
    savingPost,
    selectedVisibility,
  ]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={760}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
        className="flex-1"
      >
        <PostComposerHeader
          canPost={canPost}
          saving={savingPost}
          onCancel={handleCancel}
          onSubmit={() => void handleSubmitPost()}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 116 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-start">
            <ProfileAvatar
              displayName={authorDisplayName}
              photoUrl={authorContext?.photoUrl ?? null}
              size={44}
              className="mt-1"
            />

            <View className="ml-3 min-w-0 flex-1">
              <TextInput
                ref={inputRef}
                value={newPostBody}
                onChangeText={setNewPostBody}
                placeholder="What kept your streak alive today?"
                placeholderTextColor="#525252"
                multiline
                numberOfLines={8}
                maxLength={POST_BODY_MAX_CHARS}
                accessibilityLabel="Post content"
                autoFocus
                textAlignVertical="top"
                className="text-white"
                onBlur={() => {
                  if (keyboardLockPausedRef.current || allowNavigationRef.current || savingPost) {
                    return;
                  }
                  focusComposer();
                }}
                style={{
                  minHeight: 280,
                  fontSize: 20,
                  lineHeight: 28,
                  includeFontPadding: false,
                }}
              />

              <PostComposerPhotosGrid
                uris={pendingPhotoUris}
                onRemovePhoto={handleRemovePhoto}
              />
            </View>
          </View>
        </ScrollView>

        <PostComposerActionBar
          saving={savingPost}
          photoCount={pendingPhotoUris.length}
          canAddPhotos={pendingPhotoUris.length < MAX_POST_PHOTOS}
          onAddPhotos={() => void handleAddPhotos()}
          onOpenAudiencePicker={() => {
            keyboardLockPausedRef.current = true;
            setAudienceSheetVisible(true);
          }}
          keyboardVisible={keyboardVisible}
          overlayVisible={audienceSheetVisible}
          insets={insets}
          selectedVisibility={selectedVisibility}
          characterCount={postCharacterCount}
          characterLimit={POST_BODY_MAX_CHARS}
        />

        <PostAudienceSheet
          visible={audienceSheetVisible}
          accountVisibility={accountVisibility}
          selectedVisibility={selectedVisibility}
          onSelectVisibility={handleSelectVisibility}
          onClose={() => {
            keyboardLockPausedRef.current = false;
            setAudienceSheetVisible(false);
            focusComposer();
          }}
        />
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
