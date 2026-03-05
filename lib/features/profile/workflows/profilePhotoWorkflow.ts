import type * as ImagePicker from "expo-image-picker";
import { removeProfilePhoto, uploadProfilePhoto } from "../services/photo";

type RefreshOwnProfile = (options?: { preserveOnError?: boolean }) => Promise<{ error?: string }>;

type UpdateProfilePhotoWorkflowOptions =
  | {
      mode: "upload";
      asset: ImagePicker.ImagePickerAsset;
      refreshProfile: RefreshOwnProfile;
    }
  | {
      mode: "remove";
      refreshProfile: RefreshOwnProfile;
    };

export type UpdateProfilePhotoWorkflowResult = {
  operationError?: string;
  refreshError?: string;
};

export async function updateProfilePhotoWorkflow(
  options: UpdateProfilePhotoWorkflowOptions,
): Promise<UpdateProfilePhotoWorkflowResult> {
  if (options.mode === "upload") {
    const uploadResult = await uploadProfilePhoto(options.asset.uri, {
      mimeType: options.asset.mimeType,
      fileName: options.asset.fileName ?? null,
      base64: options.asset.base64 ?? null,
    });
    if (uploadResult.error) {
      return { operationError: uploadResult.error };
    }
  } else {
    const removeResult = await removeProfilePhoto();
    if (removeResult.error) {
      return { operationError: removeResult.error };
    }
  }

  const refreshResult = await options.refreshProfile();
  return { refreshError: refreshResult.error };
}
