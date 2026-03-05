import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../supabase";
import { fail, ok, type Result } from "../../shared";

export type AuthUser = Pick<User, "id" | "email" | "user_metadata">;

export async function fetchCurrentAuthUser(): Promise<Result<{ user: AuthUser | null }>> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return fail(error);
  }

  if (!data.user) {
    return ok({ user: null });
  }

  return ok({
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    },
  });
}

export async function fetchCurrentUserId(): Promise<Result<{ userId: string | null }>> {
  const result = await fetchCurrentAuthUser();
  if (result.error) {
    return fail(result.error);
  }
  return ok({ userId: result.data?.user?.id ?? null });
}

export async function signOutCurrentUser(): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

export async function signUpWithEmailPassword(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        phone: params.phone,
      },
    },
  });

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

export async function beginGoogleOAuthSignIn(
  redirectTo: string,
): Promise<Result<{ url: string }>> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return fail(error);
  }

  if (!data?.url) {
    return fail("Missing Google auth URL.");
  }

  return ok({ url: data.url });
}

export async function exchangeOAuthCodeForSession(
  code: string,
): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return fail(error);
  }
  return ok({ ok: true });
}

export function subscribeToAuthStateChanges(
  onSessionChange: (session: Session | null) => void | Promise<void>,
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void onSessionChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
