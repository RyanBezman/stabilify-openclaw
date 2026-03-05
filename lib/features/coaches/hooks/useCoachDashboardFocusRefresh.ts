import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export function useCoachDashboardFocusRefresh(args: {
  coachIdentityKey: string | null;
  forcePicker: boolean;
  refreshDashboard: (mode: "load" | "refresh") => Promise<void>;
}) {
  useFocusEffect(
    useCallback(() => {
      if (!args.coachIdentityKey || args.forcePicker) return;
      void args.refreshDashboard("refresh");
    }, [args.coachIdentityKey, args.forcePicker, args.refreshDashboard]),
  );
}
