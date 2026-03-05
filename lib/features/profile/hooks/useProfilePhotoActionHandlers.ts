import { useCallback } from "react";
import { Alert, type AlertButton } from "react-native";
import * as ImagePicker from "expo-image-picker";

type UploadPhoto = (
  asset: ImagePicker.ImagePickerAsset,
) => Promise<{ uploadError?: string; refreshError?: string }>;
type RemovePhoto = () => Promise<{ error?: string }>;

type UseProfilePhotoActionHandlersOptions = {
  photoUrl: string | null;
  photoLoading: boolean;
  uploadPhoto: UploadPhoto;
  removePhoto: RemovePhoto;
};

export function useProfilePhotoActionHandlers({
  photoUrl,
  photoLoading,
  uploadPhoto,
  removePhoto,
}: UseProfilePhotoActionHandlersOptions) {
  const handlePhotoResult = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const result = await uploadPhoto(asset);
      if (result.uploadError) {
        Alert.alert("Photo upload failed", result.uploadError);
        return;
      }
      if (result.refreshError) {
        Alert.alert("Photo saved, but display failed", result.refreshError);
      }
    },
    [uploadPhoto],
  );

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Camera permission needed", "Allow camera access to take a profile photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;

    await handlePhotoResult(result.assets[0]);
  }, [handlePhotoResult]);

  const openLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Photos permission needed",
        "Allow photo library access to choose a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) return;

    await handlePhotoResult(result.assets[0]);
  }, [handlePhotoResult]);

  const handleRemovePhoto = useCallback(async () => {
    if (photoLoading) return;

    const result = await removePhoto();
    if (result.error) {
      Alert.alert("Remove failed", result.error);
    }
  }, [photoLoading, removePhoto]);

  const openPhotoActions = useCallback(() => {
    const buttons: AlertButton[] = [
      { text: "Take photo", onPress: () => void openCamera() },
      { text: "Choose from library", onPress: () => void openLibrary() },
      ...(photoUrl
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => void handleRemovePhoto(),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];

    Alert.alert("Profile photo", "Choose an option.", buttons);
  }, [handleRemovePhoto, openCamera, openLibrary, photoUrl]);

  return {
    openPhotoActions,
  };
}
