import { useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { AuthActionResult } from "./types";
import { beginGoogleOAuthSignIn, exchangeOAuthCodeForSession } from "./services/auth";

WebBrowser.maybeCompleteAuthSession();

function getQueryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getAuthSessionError(result: WebBrowser.WebBrowserAuthSessionResult): string | undefined {
  const withPossibleError = result as WebBrowser.WebBrowserAuthSessionResult & {
    error?: string;
  };
  return typeof withPossibleError.error === "string" ? withPossibleError.error : undefined;
}

export function useGoogleOAuth() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async (): Promise<AuthActionResult> => {
    if (loading) return { success: false };

    const expoOwner = process.env.EXPO_PUBLIC_EXPO_OWNER?.trim();
    if (!expoOwner) {
      return {
        success: false,
        error:
          "Missing EXPO_PUBLIC_EXPO_OWNER. Run `npx expo whoami` and set EXPO_PUBLIC_EXPO_OWNER in .env (e.g. ryanbezman).",
      };
    }

    // Expo Go + Supabase: Supabase often rejects `exp://...` redirects and falls back to Site URL
    // (which is usually localhost). The Expo AuthSession proxy provides an HTTPS redirect that
    // can then bounce back into Expo Go.
    //
    // This is a dev-time solution for Expo Go. For production, use a dev build / standalone app
    // and a custom scheme like `stabilify://auth/callback`.
    const proxyBase = `https://auth.expo.io/@${expoOwner}/stabilify`;
    const returnUrl = AuthSession.makeRedirectUri({ path: "auth/callback" });

    setLoading(true);
    const startResult = await beginGoogleOAuthSignIn(proxyBase);

    if (startResult.error) {
      setLoading(false);
      return { success: false, error: startResult.error };
    }

    const url = startResult.data?.url;
    if (!url) {
      setLoading(false);
      return { success: false, error: "Missing Google auth URL." };
    }

    try {
      const startUrl = `${proxyBase}/start?authUrl=${encodeURIComponent(
        url
      )}&returnUrl=${encodeURIComponent(returnUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

      if (result.type !== "success") {
        setLoading(false);
        const webError = getAuthSessionError(result);
        return {
          success: false,
          error:
            webError ??
            (result.type === "cancel"
              ? "Canceled Google sign-in."
              : "Google sign-in did not complete."),
        };
      }

      if (!result.url) {
        setLoading(false);
        return { success: false, error: "Missing callback URL from Google sign-in." };
      }

      const proxiedUrl = getQueryParam(result.url, "url");
      const callbackUrl = proxiedUrl ?? result.url;

      const errorDescription = getQueryParam(callbackUrl, "error_description");
      if (errorDescription) {
        setLoading(false);
        return { success: false, error: errorDescription };
      }

      const code = getQueryParam(callbackUrl, "code");
      if (!code) {
        setLoading(false);
        return {
          success: false,
          error:
            "Missing auth code from callback. (Check Supabase redirect URLs allowlist for the Expo proxy URL.)",
        };
      }

      const exchange = await exchangeOAuthCodeForSession(code);
      setLoading(false);

      if (exchange.error) {
        return { success: false, error: exchange.error };
      }

      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: "Could not open browser for Google sign-in." };
    }
  };

  return {
    loading,
    signInWithGoogle,
  };
}
