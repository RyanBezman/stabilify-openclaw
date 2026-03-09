import Constants from "expo-constants";

type ExpoExtraConfig = {
  eas?: {
    projectId?: string | null;
  } | null;
};

export function getExpoProjectId() {
  const envProjectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
  if (envProjectId) {
    return envProjectId;
  }

  const easProjectId = Constants.easConfig?.projectId?.trim();
  if (easProjectId) {
    return easProjectId;
  }

  const extra = Constants.expoConfig?.extra as ExpoExtraConfig | undefined;
  const extraProjectId = extra?.eas?.projectId?.trim();
  if (extraProjectId) {
    return extraProjectId;
  }

  return null;
}
