import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import PostComposerActionBar from "../components/posts/PostComposerActionBar";
import PostComposerHeader from "../components/posts/PostComposerHeader";
import PostComposerPhotosGrid from "../components/posts/PostComposerPhotosGrid";
import Input from "../components/ui/Input";
import {
  createCurrentUserPhotoPost,
  createCurrentUserTextPost,
  POST_BODY_MAX_CHARS,
} from "../lib/data/posts";
import type { RootStackParamList } from "../lib/navigation/types";
import AppScreen from "../components/ui/AppScreen";

const MAX_POST_PHOTOS = 4;

type CreatePostProps = NativeStackScreenProps<RootStackParamList, "CreatePost">;

export default function CreatePost({ navigation }: CreatePostProps) {
  const insets = useSafeAreaInsets();
  const allowNavigationRef = useRef(false);
  const inputRef = useRef<TextInput | null>(null);

  const [newPostBody, setNewPostBody] = useState("");
  const [newPostPhotoAssets, setNewPostPhotoAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [savingPost, setSavingPost] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const pendingPhotoUris = useMemo(
    () => newPostPhotoAssets.map((asset) => asset.uri).filter((uri) => Boolean(uri)),
    [newPostPhotoAssets],
  );
  const trimmedBody = newPostBody.trim();
  const hasPendingPhotos = pendingPhotoUris.length > 0;
  const canPost = Boolean(trimmedBody || hasPendingPhotos);
  const isDirty = Boolean(trimmedBody || hasPendingPhotos);

  const confirmDiscardIfDirty = useCallback(
    (onDiscard: () => void) => {
      if (savingPost) {
        return;
      }
      if (!isDirty) {
        onDiscard();
        return;
      }

      Alert.alert("Discard post?", "You have unsent changes.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: onDiscard,
        },
      ]);
    },
    [isDirty, savingPost],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      allowNavigationRef.current = true;
      navigation.goBack();
    });
  }, [confirmDiscardIfDirty, navigation]);

  const handleAddPhotos = useCallback(async () => {
    if (newPostPhotoAssets.length >= MAX_POST_PHOTOS) {
      Alert.alert("Photo limit reached", `You can attach up to ${MAX_POST_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Photos permission needed", "Allow photo library access to create photo posts.");
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
      setTimeout(() => {
        inputRef.current?.focus();
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

    setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [newPostPhotoAssets.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setNewPostPhotoAssets((prev) => prev.filter((_, assetIndex) => assetIndex !== index));
  }, []);

  const handleSubmitPost = useCallback(async () => {
    if (savingPost || !canPost) {
      return;
    }

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
          closeFriendsOnly: false,
        })
      : await createCurrentUserTextPost(body, { closeFriendsOnly: false });

    if (result.error || !result.data?.post) {
      setSavingPost(false);
      Alert.alert("Couldn't save post", result.error ?? "Please try again.");
      return;
    }

    allowNavigationRef.current = true;
    navigation.navigate("Authed", {
      screen: "Feed",
      params: {
        createdPost: result.data.post,
      },
    });
  }, [canPost, navigation, newPostBody, newPostPhotoAssets, savingPost]);

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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 116 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            ref={inputRef}
            value={newPostBody}
            onChangeText={setNewPostBody}
            placeholder="What do you want to share?"
            multiline
            numberOfLines={5}
            maxLength={POST_BODY_MAX_CHARS}
            className="min-h-[140px]"
            accessibilityLabel="Post content"
            autoFocus
          />
          <Text className="mt-2 text-right text-xs text-neutral-500">
            {trimmedBody.length}/{POST_BODY_MAX_CHARS}
          </Text>

          <PostComposerPhotosGrid
            uris={pendingPhotoUris}
            maxPhotos={MAX_POST_PHOTOS}
            onRemovePhoto={handleRemovePhoto}
            onClearAll={() => setNewPostPhotoAssets([])}
          />
        </ScrollView>

        <PostComposerActionBar
          saving={savingPost}
          canPost={canPost}
          photoCount={pendingPhotoUris.length}
          canAddPhotos={pendingPhotoUris.length < MAX_POST_PHOTOS}
          onAddPhotos={() => void handleAddPhotos()}
          keyboardVisible={keyboardVisible}
          insets={insets}
          onSubmit={() => void handleSubmitPost()}
        />
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
