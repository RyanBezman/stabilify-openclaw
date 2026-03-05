import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

export const coachAvatarModuleByName: Record<string, ImageSourcePropType> = {
  Cindy: require("../../../../graphics/avatars/cindy.jpg"),
  Ruth: require("../../../../graphics/avatars/ruth.jpg"),
  Mia: require("../../../../graphics/avatars/mia.jpg"),
  Nora: require("../../../../graphics/avatars/nora.jpg"),
  Zoe: require("../../../../graphics/avatars/zoe.jpg"),
  Iris: require("../../../../graphics/avatars/iris.jpg"),
  Dante: require("../../../../graphics/avatars/dante.jpg"),
  Viktor: require("../../../../graphics/avatars/viktor.jpg"),
  Eli: require("../../../../graphics/avatars/eli.jpg"),
  Sam: require("../../../../graphics/avatars/sam.jpg"),
  Leo: require("../../../../graphics/avatars/leo.jpg"),
  Noah: require("../../../../graphics/avatars/noah.jpg"),
};

let preloadPromise: Promise<void> | null = null;

export function preloadCoachAvatars() {
  if (preloadPromise) return preloadPromise;

  const modules = Object.values(coachAvatarModuleByName);
  preloadPromise = Promise.all(
    modules.map(async (m) => {
      try {
        const uri = Image.resolveAssetSource(m)?.uri;
        if (!uri) return;
        await Image.prefetch(uri);
      } catch {
        // Best-effort cache warmup.
      }
    })
  ).then(() => undefined);

  return preloadPromise;
}
