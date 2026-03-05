import { useCallback, useState } from "react";
import type * as ImagePicker from "expo-image-picker";
import { updateProfilePhotoWorkflow } from "../workflows/profilePhotoWorkflow";

type UseOwnProfilePhotoActionsParams = {
  refreshProfile?: (options?: { preserveOnError?: boolean }) => Promise<{ error?: string }>;
  refreshDashboard?: (options?: { preserveOnError?: boolean }) => Promise<{ error?: string }>;
};

export function useOwnProfilePhotoActions({
  refreshProfile,
  refreshDashboard,
}: UseOwnProfilePhotoActionsParams) {
  const [photoLoading, setPhotoLoading] = useState(false);
  const refreshOwnProfile = refreshProfile ?? refreshDashboard;

  const uploadPhoto = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
    ): Promise<{ uploadError?: string; refreshError?: string }> => {
      setPhotoLoading(true);
      if (!refreshOwnProfile) {
        setPhotoLoading(false);
        return { refreshError: "Missing profile refresh action." };
      }

      const result = await updateProfilePhotoWorkflow({
        mode: "upload",
        asset,
        refreshProfile: refreshOwnProfile,
      });
      setPhotoLoading(false);
      return {
        uploadError: result.operationError,
        refreshError: result.refreshError,
      };
    },
    [refreshOwnProfile],
  );

  const removePhoto = useCallback(async (): Promise<{ error?: string }> => {
    if (photoLoading) return { error: "Photo update already in progress." };

    setPhotoLoading(true);
    if (!refreshOwnProfile) {
      setPhotoLoading(false);
      return { error: "Missing profile refresh action." };
    }

    const result = await updateProfilePhotoWorkflow({
      mode: "remove",
      refreshProfile: refreshOwnProfile,
    });
    setPhotoLoading(false);
    return { error: result.operationError ?? result.refreshError };
  }, [photoLoading, refreshOwnProfile]);

  return {
    photoLoading,
    uploadPhoto,
    removePhoto,
  };
}
