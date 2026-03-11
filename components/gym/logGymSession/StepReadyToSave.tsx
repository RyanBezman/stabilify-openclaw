import { Image, Text, TouchableOpacity, View } from "react-native";
import Button from "../../ui/Button";

type StepReadyToSaveProps = {
  saving: boolean;
  photoUri: string | null;
  locationCaptured: boolean;
  savingPartial?: boolean;
  onSave: () => void | Promise<void>;
  onReset: () => void;
  hideSaveLoadingState?: boolean;
};

export default function StepReadyToSave({
  saving,
  photoUri,
  locationCaptured,
  savingPartial = false,
  onSave,
  onReset,
  hideSaveLoadingState = false,
}: StepReadyToSaveProps) {
  const showSaveLoading = saving && !hideSaveLoadingState;

  return (
    <>
      <View className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-4">
        <View className="flex-row items-center">
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 56, height: 56, borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : null}
          <View className="ml-4 flex-1 gap-2.5">
            <View className="flex-row items-center gap-2">
              <View className="h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <Text className="text-[10px] font-bold text-white">✓</Text>
              </View>
              <Text className="text-sm text-white">Photo captured</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-5 w-5 items-center justify-center rounded-full ${
                  locationCaptured ? "bg-emerald-500" : "bg-amber-500"
                }`}
              >
                <Text className="text-[10px] font-bold text-white">
                  {locationCaptured ? "✓" : "!"}
                </Text>
              </View>
              <Text className="text-sm text-white">
                {locationCaptured
                  ? "Location captured"
                  : savingPartial
                    ? "Location unavailable, this will save as partial"
                    : "Location still needed"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Button
        title={showSaveLoading ? "Saving..." : "Save gym session"}
        onPress={onSave}
        loading={showSaveLoading}
        disabled={saving}
        className="mb-3"
      />

      <TouchableOpacity
        onPress={onReset}
        activeOpacity={0.7}
        className="self-center py-2"
      >
        <Text className="text-sm text-neutral-500">Start over</Text>
      </TouchableOpacity>
    </>
  );
}
