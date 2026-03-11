import { sanitizeUsername } from "../../utils/username";
import type { ProfileSettingsValues } from "./data";

export type EditableProfileSettingsFieldKey =
  | "displayName"
  | "username"
  | "bio"
  | "timezone"
  | "dailyStepGoal";

type EditableProfileSettingsFieldPreview = {
  value: string;
  usesPlaceholder: boolean;
};

export type EditableProfileSettingsFieldDefinition = {
  label: string;
  editTitle: string;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words";
  autoCorrect?: boolean;
  multiline?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric";
  keyboardType?: "default" | "number-pad";
  description?: string;
  helperText?: (draft: string) => string;
  getDraft: (values: ProfileSettingsValues) => string;
  getPreview: (values: ProfileSettingsValues) => EditableProfileSettingsFieldPreview;
  normalizeDraft?: (value: string) => string;
  buildNextValues: (values: ProfileSettingsValues, draft: string) => ProfileSettingsValues;
};

const stepGoalFormatter = new Intl.NumberFormat("en-US");

function buildPreview(value: string, placeholder: string): EditableProfileSettingsFieldPreview {
  if (!value.trim()) {
    return {
      value: placeholder,
      usesPlaceholder: true,
    };
  }

  return {
    value,
    usesPlaceholder: false,
  };
}

function normalizeDailyStepGoalDraft(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 5);
}

function parseDailyStepGoalDraft(value: string) {
  const parsed = Number(normalizeDailyStepGoalDraft(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

export const profileSettingsEditableFields: Record<
  EditableProfileSettingsFieldKey,
  EditableProfileSettingsFieldDefinition
> = {
  displayName: {
    label: "Name",
    editTitle: "Edit name",
    placeholder: "Jordan",
    autoCapitalize: "words",
    autoCorrect: false,
    getDraft: (values) => values.displayName,
    getPreview: (values) => buildPreview(values.displayName, "Add your name"),
    buildNextValues: (values, draft) => ({
      ...values,
      displayName: draft.trim(),
    }),
  },
  username: {
    label: "Username",
    editTitle: "Edit username",
    placeholder: "jordan_fit",
    autoCapitalize: "none",
    autoCorrect: false,
    description: "Letters, numbers, and underscores only.",
    getDraft: (values) => sanitizeUsername(values.username),
    getPreview: (values) => buildPreview(sanitizeUsername(values.username), "Add a username"),
    normalizeDraft: sanitizeUsername,
    buildNextValues: (values, draft) => ({
      ...values,
      username: sanitizeUsername(draft),
    }),
  },
  bio: {
    label: "Bio",
    editTitle: "Edit bio",
    placeholder: "Add a short bio",
    autoCapitalize: "sentences",
    autoCorrect: true,
    multiline: true,
    maxLength: 160,
    helperText: (draft) => `${draft.length}/160 characters`,
    getDraft: (values) => values.bio,
    getPreview: (values) => buildPreview(values.bio, "Add a short bio"),
    buildNextValues: (values, draft) => ({
      ...values,
      bio: draft,
    }),
  },
  timezone: {
    label: "Timezone",
    editTitle: "Edit timezone",
    placeholder: "America/Los_Angeles",
    autoCapitalize: "none",
    autoCorrect: false,
    description: "Use your IANA timezone, like America/New_York.",
    getDraft: (values) => values.timezone,
    getPreview: (values) => buildPreview(values.timezone, "Add your timezone"),
    buildNextValues: (values, draft) => ({
      ...values,
      timezone: draft.trim(),
    }),
  },
  dailyStepGoal: {
    label: "Steps",
    editTitle: "Edit daily step goal",
    placeholder: "10000",
    autoCapitalize: "none",
    autoCorrect: false,
    maxLength: 5,
    inputMode: "numeric",
    keyboardType: "number-pad",
    description: "Used for your progress card and Apple Health step sync.",
    getDraft: (values) => String(values.dailyStepGoal),
    getPreview: (values) => ({
      value: stepGoalFormatter.format(values.dailyStepGoal),
      usesPlaceholder: false,
    }),
    normalizeDraft: normalizeDailyStepGoalDraft,
    buildNextValues: (values, draft) => ({
      ...values,
      dailyStepGoal: parseDailyStepGoalDraft(draft),
    }),
  },
};
