import type { User } from "@supabase/supabase-js";

export type AuthActionResult<TData = void> = {
  success: boolean;
  error?: string;
  data?: TData;
};

export type AuthedTabsProps = {
  user?: User | null;
};
