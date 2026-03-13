import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import AppScreen from "../components/ui/AppScreen";
import Button from "../components/ui/Button";
import HelperText from "../components/ui/HelperText";
import {
  ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS,
  restorePendingAccountDeletion,
} from "../lib/features/account-lifecycle";
import { signOutCurrentUser } from "../lib/features/auth";

type AccountDeletionRecoveryProps = {
  scheduledPurgeAt: string | null;
  onRestored: () => Promise<void> | void;
};

function formatScheduledPurgeDate(value: string | null) {
  if (!value) {
    return `${ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS} days`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return `${ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS} days`;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AccountDeletionRecovery({
  scheduledPurgeAt,
  onRestored,
}: AccountDeletionRecoveryProps) {
  const [restoring, setRestoring] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const restoreDeadlineLabel = useMemo(
    () => formatScheduledPurgeDate(scheduledPurgeAt),
    [scheduledPurgeAt],
  );

  const handleRestore = async () => {
    if (restoring) {
      return;
    }

    setRestoring(true);
    try {
      const result = await restorePendingAccountDeletion();
      if (result.error) {
        Alert.alert("Couldn't restore your account", result.error);
        return;
      }

      await onRestored();
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      const result = await signOutCurrentUser({ scope: "local" });
      if (result.error) {
        Alert.alert("Couldn't sign out", result.error);
      }
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={640}>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-[32px] font-semibold text-white">
          Account scheduled for deletion
        </Text>
        <Text className="mt-4 text-base leading-7 text-neutral-200">
          Your profile is hidden now. Restore it by {restoreDeadlineLabel} to keep your
          history, coach chats, and uploads. After that deadline, Stabilify permanently
          deletes your account data unless a legal hold is required.
        </Text>
        <HelperText className="mt-3">
          Sign back in on this device during the recovery window, then choose restore.
        </HelperText>

        <View className="mt-10">
          <Button
            title={restoring ? "Restoring account..." : "Restore account"}
            loading={restoring}
            disabled={restoring || signingOut}
            onPress={() => {
              void handleRestore();
            }}
          />
        </View>
        <View className="mt-3">
          <Button
            title={signingOut ? "Signing out..." : "Sign out"}
            variant="secondary"
            loading={signingOut}
            disabled={restoring || signingOut}
            onPress={() => {
              void handleSignOut();
            }}
          />
        </View>
      </View>
    </AppScreen>
  );
}
