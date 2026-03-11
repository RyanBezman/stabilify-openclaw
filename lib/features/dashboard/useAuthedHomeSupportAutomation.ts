import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  allowAutoSupportWithConsent,
  deferSupportNudge,
  fetchCurrentWeekSupportRequest,
  fetchHasActivePushNotificationDevice,
  setAutoSupportEnabled,
  type CurrentWeekSupportRequest,
} from "../../data/supportAutomation";
import { registerCurrentPushDevice } from "../shared";

type SupportActionResult = {
  success: boolean;
  error?: string;
};

export type SupportNudgeDisplayVariant =
  | "suppressed_prompt"
  | "suppressed_acknowledged"
  | "disabled"
  | "published";

type UseAuthedHomeSupportAutomationOptions = {
  profileAutoSupportConsentAt?: string | null;
  profileAutoSupportEnabled?: boolean | null;
  setPhoneNudgesEnabled: Dispatch<SetStateAction<boolean>>;
  setSupportRequest: Dispatch<SetStateAction<CurrentWeekSupportRequest | null>>;
  supportRequest: CurrentWeekSupportRequest | null;
  updateDashboardAutoSupportState: (next: {
    autoSupportConsentedAt: string | null;
    autoSupportEnabled: boolean;
  }) => void;
  userId?: string | null;
};

function resolveSupportNudgeVariant(args: {
  profileAutoSupportConsentAt?: string | null;
  profileAutoSupportEnabled?: boolean | null;
  supportRequest: CurrentWeekSupportRequest | null;
}): SupportNudgeDisplayVariant | null {
  const { profileAutoSupportConsentAt, profileAutoSupportEnabled, supportRequest } = args;
  if (!supportRequest) {
    return null;
  }

  if (supportRequest.status === "suppressed_no_consent") {
    const consentedAtMs = profileAutoSupportConsentAt
      ? Date.parse(profileAutoSupportConsentAt)
      : Number.NaN;
    const requestCreatedAtMs = Date.parse(supportRequest.createdAt);
    const hasPersistedAcknowledgedConsent =
      profileAutoSupportEnabled === true &&
      !Number.isNaN(consentedAtMs) &&
      !Number.isNaN(requestCreatedAtMs) &&
      consentedAtMs >= requestCreatedAtMs;

    if (hasPersistedAcknowledgedConsent) {
      return "suppressed_acknowledged";
    }

    return "suppressed_prompt";
  }

  if (supportRequest.status === "disabled") {
    return "disabled";
  }

  return "published";
}

export function useAuthedHomeSupportAutomation({
  profileAutoSupportConsentAt,
  profileAutoSupportEnabled,
  setPhoneNudgesEnabled,
  setSupportRequest,
  supportRequest,
  updateDashboardAutoSupportState,
  userId,
}: UseAuthedHomeSupportAutomationOptions) {
  const [supportActionBusy, setSupportActionBusy] = useState(false);
  const [enablingPhoneNudges, setEnablingPhoneNudges] = useState(false);
  const supportActionBusyRef = useRef(false);

  const refreshSupportAutomation = useCallback(async () => {
    const [supportResult, pushDeviceResult] = await Promise.all([
      fetchCurrentWeekSupportRequest(),
      fetchHasActivePushNotificationDevice(userId ?? undefined),
    ]);

    if (!supportResult.error) {
      setSupportRequest(supportResult.data ?? null);
    }

    if (!pushDeviceResult.error) {
      setPhoneNudgesEnabled(pushDeviceResult.data?.hasActiveDevice ?? false);
    }
  }, [setPhoneNudgesEnabled, setSupportRequest, userId]);

  const startSupportAction = useCallback(() => {
    if (supportActionBusyRef.current) {
      return false;
    }

    supportActionBusyRef.current = true;
    setSupportActionBusy(true);
    return true;
  }, []);

  const finishSupportAction = useCallback(() => {
    supportActionBusyRef.current = false;
    setSupportActionBusy(false);
  }, []);

  const allowAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const result = await allowAutoSupportWithConsent();
      if (result.error || !result.data) {
        return {
          success: false,
          error: result.error ?? "Couldn't update support consent.",
        };
      }

      updateDashboardAutoSupportState({
        autoSupportConsentedAt: result.data.autoSupportConsentedAt,
        autoSupportEnabled: result.data.autoSupportEnabled,
      });

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [
    finishSupportAction,
    refreshSupportAutomation,
    startSupportAction,
    updateDashboardAutoSupportState,
  ]);

  const reEnableAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const result = await setAutoSupportEnabled(true);
      if (result.error) {
        return { success: false, error: result.error };
      }

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [finishSupportAction, refreshSupportAutomation, startSupportAction]);

  const deferAutoSupportFromNudge = useCallback(async (): Promise<SupportActionResult> => {
    if (!startSupportAction()) {
      return { success: false };
    }

    try {
      const requestId = supportRequest?.id?.trim() ?? "";
      if (!requestId) {
        return { success: false, error: "No support nudge is available to defer." };
      }

      const result = await deferSupportNudge({
        requestId,
        surface: "home",
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      await refreshSupportAutomation();
      return { success: true };
    } finally {
      finishSupportAction();
    }
  }, [finishSupportAction, refreshSupportAutomation, startSupportAction, supportRequest?.id]);

  const enablePhoneNudges = useCallback(async (): Promise<SupportActionResult> => {
    if (enablingPhoneNudges) {
      return { success: false };
    }

    setEnablingPhoneNudges(true);
    const registrationResult = await registerCurrentPushDevice(userId);
    if (registrationResult.error) {
      setEnablingPhoneNudges(false);
      return {
        success: false,
        error: registrationResult.error,
      };
    }
    setEnablingPhoneNudges(false);

    await refreshSupportAutomation();
    return { success: true };
  }, [enablingPhoneNudges, refreshSupportAutomation, userId]);

  const supportNudgeVariant = useMemo(
    () =>
      resolveSupportNudgeVariant({
        profileAutoSupportConsentAt,
        profileAutoSupportEnabled,
        supportRequest,
      }),
    [profileAutoSupportConsentAt, profileAutoSupportEnabled, supportRequest],
  );

  return {
    allowAutoSupportFromNudge,
    deferAutoSupportFromNudge,
    enablePhoneNudges,
    enablingPhoneNudges,
    reEnableAutoSupportFromNudge,
    supportActionBusy,
    supportNudgeVariant,
  };
}
