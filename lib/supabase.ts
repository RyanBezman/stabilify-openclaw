import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const isVitest = process.env.VITEST === "true";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? (isVitest ? "https://example.supabase.co" : "");
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? (isVitest ? "test-anon-key" : "");

if ((!supabaseUrl || !supabasePublishableKey) && !isVitest) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: !isVitest,
    persistSession: !isVitest,
    detectSessionInUrl: false,
    // Required for mobile OAuth when using `exchangeCodeForSession`.
    flowType: "pkce",
  },
});
