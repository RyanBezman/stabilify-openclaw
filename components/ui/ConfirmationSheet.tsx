import { Text, TouchableOpacity, View } from "react-native";
import ModalSheet from "./ModalSheet";
import Button from "./Button";

type ConfirmationSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmTone?: "default" | "destructive";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmationSheet({
  visible,
  title,
  message,
  confirmLabel,
  confirmTone = "default",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmationSheetProps) {
  return (
    <ModalSheet visible={visible} onRequestClose={onCancel} contentClassName="pb-2">
      <View className="items-center pb-2 pt-1">
        <View className="h-1.5 w-12 rounded-full bg-neutral-800" />
      </View>

      <Text className="mt-3 text-xl font-bold text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-neutral-400">{message}</Text>

      <View className="mt-6 gap-3">
        <Button
          title={confirmLabel}
          size="sm"
          variant={confirmTone === "destructive" ? "ghost" : "primary"}
          className={confirmTone === "destructive" ? "border border-rose-500/30" : undefined}
          textClassName={confirmTone === "destructive" ? "text-rose-300" : undefined}
          loading={loading}
          disabled={loading}
          onPress={onConfirm}
          testID="confirmation-confirm-button"
        />
        <TouchableOpacity
          accessibilityRole="button"
          className="items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-2"
          disabled={loading}
          onPress={onCancel}
          testID="confirmation-cancel-button"
        >
          <Text className="text-sm font-semibold text-neutral-200">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ModalSheet>
  );
}
