import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ChatComposer({
  value,
  onChangeText,
  sending,
  onSend,
  sendError,
  onRetryFromError,
  onComposerLayout,
  inputRef,
}: {
  value: string;
  onChangeText: (next: string) => void;
  sending: boolean;
  onSend: () => void;
  sendError: string | null;
  onRetryFromError: () => void;
  onComposerLayout: (height: number) => void;
  inputRef: (node: TextInput | null) => void;
}) {
  return (
    <View
      className="border-t border-neutral-900 bg-neutral-950/95 px-3 pt-3"
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        onComposerLayout(h);
      }}
      style={{ paddingBottom: 12 }}
    >
      {sendError ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRetryFromError}
          className="mb-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2"
        >
          <Text className="text-xs leading-relaxed text-rose-300">
            Couldn't send. Tap to retry.
          </Text>
        </TouchableOpacity>
      ) : null}

      <View className="flex-row items-end gap-2">
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="What do you want to work on today?"
          placeholderTextColor="#737373"
          multiline
          textAlignVertical="top"
          keyboardType="default"
          autoCorrect={true}
          spellCheck={true}
          autoCapitalize="sentences"
          blurOnSubmit={false}
          returnKeyType="default"
          className="flex-1 rounded-3xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-base text-white"
          style={{ minHeight: 48, maxHeight: 140, includeFontPadding: false }}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSend}
          disabled={sending || !value.trim()}
          className={`h-11 w-11 items-center justify-center rounded-full ${
            sending || !value.trim() ? "bg-neutral-800" : "bg-violet-600"
          }`}
          accessibilityRole="button"
          accessibilityLabel={sending ? "Sending message" : "Send message"}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
