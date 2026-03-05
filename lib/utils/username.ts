export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(input: string) {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function sanitizeUsername(input: string) {
  return normalizeUsername(input)
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

function isValidUsername(input: string) {
  return USERNAME_REGEX.test(normalizeUsername(input));
}

export function getUsernameValidationError(input: string) {
  const value = normalizeUsername(input);

  if (!value) {
    return "Username is required.";
  }
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return "Use lowercase letters, numbers, and underscores only.";
  }

  return null;
}

export function createUsernameCandidate(displayName: string, seed?: string) {
  const fromDisplayName = sanitizeUsername(displayName);
  const fromSeed = sanitizeUsername(seed ?? "");

  if (fromDisplayName.length >= USERNAME_MIN_LENGTH) {
    return fromDisplayName;
  }

  const fallbackBase = sanitizeUsername(`user${fromSeed}`) || "user";
  if (fallbackBase.length >= USERNAME_MIN_LENGTH) {
    return fallbackBase.slice(0, USERNAME_MAX_LENGTH);
  }

  return fallbackBase.padEnd(USERNAME_MIN_LENGTH, "0");
}
