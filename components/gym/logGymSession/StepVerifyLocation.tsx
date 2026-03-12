import { Image, Text, TouchableOpacity, View } from "react-native";

type StepVerifyLocationProps = {
  photoUri: string | null;
  locationError: string | null;
  canContinueWithoutLocation: boolean;
  onCaptureLocation: () => void | Promise<void>;
  onContinueWithoutLocation: () => void;
  onReset: () => void;
};

export default function StepVerifyLocation({
  photoUri,
  locationError,
  canContinueWithoutLocation,
  onCaptureLocation,
  onContinueWithoutLocation,
  onReset,
}: StepVerifyLocationProps) {
  return (
    <>
      {photoUri ? (
        <View className="mb-5 flex-row items-center rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3">
          <View className="relative">
            <Image
              source={{ uri: photoUri }}
              style={{ width: 56, height: 56, borderRadius: 12 }}
              resizeMode="cover"
            />
            <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-900 bg-emerald-500">
              <Text className="text-[10px] font-bold text-white">✓</Text>
            </View>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-white">
              Photo captured
            </Text>
            <Text className="mt-0.5 text-xs text-neutral-500">
              Now verify your location below
            </Text>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onCaptureLocation}
        className="mb-4 items-center rounded-2xl bg-violet-600/10 px-4 py-6"
        activeOpacity={0.7}
      >
        <View className="mb-2.5 h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
          <Text className="text-xl">📍</Text>
        </View>
        <Text className="text-sm font-semibold text-white">
          Tap to capture location
        </Text>
        <Text className="mt-1 text-xs text-neutral-400">
          Used only for this check-in, never in the background
        </Text>
      </TouchableOpacity>

      {locationError ? (
        <View className="mb-3 rounded-2xl bg-rose-950/40 px-4 py-3">
          <Text className="text-sm text-rose-300">{locationError}</Text>
        </View>
      ) : null}

      {canContinueWithoutLocation ? (
        <TouchableOpacity
          onPress={onContinueWithoutLocation}
          activeOpacity={0.7}
          className="mb-4 items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-amber-200">
            Continue without location
          </Text>
          <Text className="mt-1 text-xs text-amber-100/70">
            This session will save as partial instead of verified.
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={onReset}
        activeOpacity={0.7}
        className="self-center py-2"
      >
        <Text className="text-sm text-neutral-500">Retake photo</Text>
      </TouchableOpacity>
    </>
  );
}
