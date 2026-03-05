import { useState } from "react";
import type { AuthActionResult } from "./types";
import { signInWithEmailPassword } from "./services/auth";

export function useSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (): Promise<AuthActionResult> => {
    if (loading) return { success: false };

    setLoading(true);
    const result = await signInWithEmailPassword(email, password);
    setLoading(false);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    signIn,
  };
}
