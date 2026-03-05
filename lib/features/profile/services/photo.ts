import { supabase } from "../../../supabase";
import { getLocalTimeZone } from "../../../utils/time";
import { createUsernameCandidate } from "../../../utils/username";
import { fail, ok, type Result } from "../../shared";

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type AuthedUser = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
};

type UploadOptions = {
  mimeType?: string | null;
  fileName?: string | null;
  base64?: string | null;
};

function resolveUploadMeta(options?: UploadOptions) {
  const normalizedMime =
    typeof options?.mimeType === "string" && options.mimeType.startsWith("image/")
      ? options.mimeType
      : "image/jpeg";

  const fileName = options?.fileName?.trim() ?? "";
  const fileExtFromName = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : null;
  const fileExtFromMime = normalizedMime.replace("image/", "").toLowerCase();

  const rawExt = fileExtFromName || fileExtFromMime || "jpg";
  const extension = rawExt === "jpeg" ? "jpg" : rawExt;

  return {
    contentType: normalizedMime,
    extension,
  };
}

function base64ToBytes(base64: string): Uint8Array | null {
  const clean = base64.trim();
  if (!clean) return null;

  const decoder = globalThis.atob;
  if (!decoder) return null;

  const binary = decoder(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getAuthedUser(): Promise<Result<{ user: AuthedUser }>> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return fail(error);
  }
  if (!data.user?.id) {
    return fail("You must be signed in to manage your profile photo.", {
      code: "SESSION_REQUIRED",
    });
  }
  return ok({ user: data.user as AuthedUser });
}

function buildFallbackDisplayName(user: AuthedUser) {
  const fullName = user.user_metadata?.full_name?.trim();
  if (fullName) return fullName;
  const email = user.email?.trim();
  if (email) return email;
  return "User";
}

async function ensureProfileRow(user: AuthedUser): Promise<Result<{ ok: true }>> {
  const fallbackDisplayName = buildFallbackDisplayName(user);
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: fallbackDisplayName,
        username: createUsernameCandidate(`${fallbackDisplayName}_${user.id.slice(0, 8)}`),
        preferred_unit: "lb",
        timezone: getLocalTimeZone(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

export async function getProfilePhotoSignedUrl(
  path: string,
): Promise<Result<{ signedUrl: string | null }>> {
  try {
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return fail("Missing profile photo path.", { code: "VALIDATION" });
    }

    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .createSignedUrl(trimmedPath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      return fail(error);
    }

    return ok({ signedUrl: data.signedUrl ?? null });
  } catch (error) {
    return fail(error, { fallback: "Couldn't load your profile photo." });
  }
}

export async function uploadProfilePhoto(
  uri: string,
  options?: UploadOptions,
): Promise<Result<{ avatarPath: string }>> {
  try {
    const trimmedUri = uri.trim();
    if (!trimmedUri) {
      return fail("Missing photo URI.", { code: "VALIDATION" });
    }

    const userResult = await getAuthedUser();
    const user = userResult.data?.user;
    if (userResult.error || !user) {
      return fail(userResult.error ?? "You must be signed in to manage your profile photo.", {
        code: "SESSION_REQUIRED",
      });
    }

    const ensureRes = await ensureProfileRow(user);
    if (ensureRes.error) {
      return fail(ensureRes.error);
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    if (existingProfileError) {
      return fail(existingProfileError);
    }

    const existingAvatarPath = existingProfile?.avatar_path ?? null;

    const fileMeta = resolveUploadMeta(options);
    const nextPath = `${user.id}/avatar-${Date.now()}.${fileMeta.extension}`;
    let uploadBody: Blob | Uint8Array | null = null;

    const base64 = options?.base64?.trim();
    if (base64) {
      const bytes = base64ToBytes(base64);
      if (!bytes || bytes.byteLength === 0) {
        return fail("Couldn't decode selected photo bytes.");
      }
      uploadBody = bytes;
    } else {
      const response = await fetch(trimmedUri);
      if (!response.ok) {
        return fail(`Couldn't read selected photo (status ${response.status}).`);
      }
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        return fail("Selected photo is empty (0 bytes).");
      }
      uploadBody = blob;
    }

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(nextPath, uploadBody, {
        contentType: fileMeta.contentType,
        upsert: true,
      });

    if (uploadError) {
      return fail(uploadError);
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_path: nextPath,
        avatar_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (profileError) {
      return fail(profileError);
    }
    if (!updatedProfile?.id) {
      return fail("Couldn't link uploaded photo to your profile row.");
    }

    if (existingAvatarPath && existingAvatarPath !== nextPath) {
      await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([existingAvatarPath]);
    }

    return ok({ avatarPath: nextPath });
  } catch (error) {
    return fail(error, { fallback: "Couldn't upload your profile photo." });
  }
}

export async function removeProfilePhoto(): Promise<Result<{ removed: true }>> {
  try {
    const userResult = await getAuthedUser();
    const user = userResult.data?.user;
    if (userResult.error || !user) {
      return fail(userResult.error ?? "You must be signed in to manage your profile photo.", {
        code: "SESSION_REQUIRED",
      });
    }

    const { data: profileRow, error: profileQueryError } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    if (profileQueryError) {
      return fail(profileQueryError);
    }

    const avatarPath = profileRow?.avatar_path ?? null;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_path: null,
        avatar_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    if (updateError) {
      return fail(updateError);
    }
    if (!updatedProfile?.id) {
      return fail("Couldn't update your profile row.");
    }

    if (avatarPath) {
      const { error: removeError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([avatarPath]);
      if (removeError) {
        return fail(removeError);
      }
    }

    return ok({ removed: true });
  } catch (error) {
    return fail(error, { fallback: "Couldn't remove your profile photo." });
  }
}
