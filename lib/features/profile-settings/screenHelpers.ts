import type { ProfileSettingsValues } from "./data";
import {
  profileSettingsEditableFields,
  type EditableProfileSettingsFieldKey,
} from "./editableFields";

type AccountVisibilityPatchKeys =
  | "accountVisibility"
  | "socialEnabled"
  | "weighInShareVisibility"
  | "gymEventShareVisibility"
  | "postShareVisibility";

type ShareVisibilityFieldKey =
  | "weighInShareVisibility"
  | "gymEventShareVisibility"
  | "postShareVisibility";

export type EditableFieldRow = {
  fieldKey: EditableProfileSettingsFieldKey;
  label: string;
  value: string;
  usesPlaceholder: boolean;
};

const EDITABLE_FIELD_ROW_KEYS: EditableProfileSettingsFieldKey[] = [
  "displayName",
  "username",
  "bio",
  "timezone",
  "dailyStepGoal",
];

export function buildEditableFieldRows(values: ProfileSettingsValues): EditableFieldRow[] {
  return EDITABLE_FIELD_ROW_KEYS.map((fieldKey) => {
    const field = profileSettingsEditableFields[fieldKey];
    const preview = field.getPreview(values);
    return {
      fieldKey,
      label: field.label,
      value: preview.value,
      usesPlaceholder: preview.usesPlaceholder,
    };
  });
}

export function buildAccountVisibilityPatch(
  next: "private" | "public",
): Pick<ProfileSettingsValues, AccountVisibilityPatchKeys> {
  if (next === "public") {
    return {
      accountVisibility: next,
      socialEnabled: true,
      weighInShareVisibility: "followers",
      gymEventShareVisibility: "followers",
      postShareVisibility: "followers",
    };
  }

  return {
    accountVisibility: next,
    socialEnabled: false,
    weighInShareVisibility: "private",
    gymEventShareVisibility: "private",
    postShareVisibility: "private",
  };
}

export function buildShareVisibilityPatch(
  fieldKey: ShareVisibilityFieldKey,
  enabled: boolean,
): Partial<Pick<ProfileSettingsValues, ShareVisibilityFieldKey>> {
  const nextVisibility = enabled ? "followers" : "private";

  switch (fieldKey) {
    case "weighInShareVisibility":
      return { weighInShareVisibility: nextVisibility };
    case "gymEventShareVisibility":
      return { gymEventShareVisibility: nextVisibility };
    case "postShareVisibility":
      return { postShareVisibility: nextVisibility };
  }
}

export function isPhoneNudgesPermissionError(message?: string) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("notification permission is required");
}
