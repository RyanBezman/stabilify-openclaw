import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

type VoiceComposerProps = {
  recording: boolean;
  busy: boolean;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onComposerLayout: (height: number) => void;
};

export default function VoiceComposer({
  recording,
  busy,
  error,
  onStartRecording,
  onStopRecording,
  onComposerLayout,
}: VoiceComposerProps) {
  const actionLabel = recording ? "Stop and send" : "Start voice chat";
  const actionBusy = busy && !recording;

  return (
    <View
      className="border-t border-neutral-900 bg-neutral-950/95 px-3 pt-3"
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        onComposerLayout(h);
      }}
      style={{ paddingBottom: 12 }}
    >
      {error ? (
        <View className="mb-2 rounded-2xl border border-rose-900/70 bg-rose-950/30 px-3 py-2">
          <Text className="text-xs leading-relaxed text-rose-300">{error}</Text>
        </View>
      ) : null}

      <View className="rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-3">
        <Text className="text-xs leading-relaxed text-neutral-300">
          {recording
            ? "Listening... tap stop when you're done."
            : "Tap the mic, talk naturally, and I'll send the transcribed message."}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={recording ? onStopRecording : onStartRecording}
          disabled={actionBusy}
          className={`mt-3 h-12 flex-row items-center justify-center gap-2 rounded-xl ${
            actionBusy
              ? "bg-neutral-800"
              : recording
                ? "bg-rose-600"
                : "bg-violet-600"
          }`}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {actionBusy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name={recording ? "stop" : "mic"} size={18} color="#ffffff" />
          )}
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

