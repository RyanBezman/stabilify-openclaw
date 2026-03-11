import { useEffect, useState } from "react";
import {
  getProfilePhotoSignedUrl,
  useOwnProfilePhotoActions,
  useProfilePhotoActionHandlers,
} from "../profile";

type RefreshProfileResult = {
  error?: string;
};

type UseProfileSettingsPhotoOptions = {
  avatarPath: string | null;
  refreshProfile: () => Promise<RefreshProfileResult>;
};

export function useProfileSettingsPhoto({
  avatarPath,
  refreshProfile,
}: UseProfileSettingsPhotoOptions) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { photoLoading, uploadPhoto, removePhoto } = useOwnProfilePhotoActions({
    refreshProfile,
  });
  const { openPhotoActions } = useProfilePhotoActionHandlers({
    photoUrl,
    photoLoading,
    uploadPhoto,
    removePhoto,
  });

  useEffect(() => {
    let active = true;

    const loadPhotoUrl = async () => {
      if (!avatarPath) {
        if (active) {
          setPhotoUrl(null);
        }
        return;
      }

      const result = await getProfilePhotoSignedUrl(avatarPath);
      if (!active) {
        return;
      }

      setPhotoUrl(result.data?.signedUrl ?? null);
    };

    void loadPhotoUrl();

    return () => {
      active = false;
    };
  }, [avatarPath]);

  return {
    openPhotoActions,
    photoLoading,
    photoUrl,
  };
}
