import { useMemo, useState } from "react";
import type { AuthActionResult } from "./types";
import { signUpWithEmailPassword } from "./services/auth";

const getPhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const formatPhoneDisplay = (value: string) => {
  const digits = getPhoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export function useSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const formattedPhone = useMemo(() => formatPhoneDisplay(phone), [phone]);

  const signUp = async (): Promise<AuthActionResult<{ prefillName: string }>> => {
    if (loading) return { success: false };

    setLoading(true);
    const phoneDigits = getPhoneDigits(phone);

    const result = await signUpWithEmailPassword({
      email,
      password,
      fullName: name,
      phone: phoneDigits,
    });

    setLoading(false);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: { prefillName: name },
    };
  };

  return {
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    loading,
    formattedPhone,
    signUp,
  };
}
