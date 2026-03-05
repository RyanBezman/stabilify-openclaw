import { Text, View } from "react-native";
import Button from "../../ui/Button";
import HelperText from "../../ui/HelperText";

type PermissionLike = { granted: boolean };

type StepTakePhotoProps = {
  permission: PermissionLike | null;
  onRequestPermission: () => void | Promise<unknown>;
  onOpenCamera: () => void | Promise<void>;
};

export default function StepTakePhoto({
  permission,
  onRequestPermission,
  onOpenCamera,
}: StepTakePhotoProps) {
  return (
    <>
      <HelperText className="mb-4">
        Capture a quick gym photo to verify your session.
      </HelperText>

      {!permission ? (
        <HelperText>Checking camera access...</HelperText>
      ) : !permission.granted ? (
        <>
          <Text className="mb-4 text-sm text-neutral-300">
            Camera access is required to log a session.
          </Text>
          <Button title="Allow camera access" onPress={onRequestPermission} />
        </>
      ) : (
        <View className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <View className="items-center justify-center px-4 py-10">
            <Text className="mb-4 text-center text-sm text-neutral-400">
              Start on step one, then tap below when you&apos;re ready to capture.
            </Text>
            <Button
              title="Open camera"
              onPress={onOpenCamera}
              className="w-full px-4"
              textClassName="text-sm"
            />
          </View>
        </View>
      )}
    </>
  );
}
