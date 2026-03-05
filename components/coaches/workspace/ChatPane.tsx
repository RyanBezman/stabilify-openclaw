import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Animated, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ScrollView } from "react-native";
import ChatComposer from "../../chat/ChatComposer";
import VoiceComposer from "../../chat/VoiceComposer";
import ChatSyncErrorBanner from "../../chat/ChatSyncErrorBanner";
import ChatThread from "../../chat/ChatThread";
import ScrollToBottomButton from "../../chat/ScrollToBottomButton";
import PlanQuickActions from "../../chat/PlanQuickActions";
import { useCoachVoiceComposer } from "../../../lib/features/coaches/hooks/useCoachVoiceComposer";
import type {
  ActiveCoach,
  ChatMessage,
} from "../../../lib/features/coaches";

type ChatPaneProps = {
  coach: ActiveCoach;
  messages: ChatMessage[];
  syncError: string | null;
  sendError: string | null;
  sending: boolean;
  assistantBusy: boolean;
  hydrateWorkspace: () => Promise<void>;
  chatScrollRef: MutableRefObject<ScrollView | null>;
  composerRef: MutableRefObject<TextInput | null>;
  revealingMessageId: string | null;
  revealedChars: number;
  cursorOpacity: Animated.Value;
  finishReveal: () => void;
  handleScrollDistanceFromBottomChange: (distanceFromBottom: number) => void;
  handleChatContentSizeChange: () => void;
  onAssistantReviewDraftPlan: () => void;
  showScrollToBottom: boolean;
  composerHeight: number;
  setComposerHeight: Dispatch<SetStateAction<number>>;
  scrollToBottom: (animated?: boolean) => void;
  isWorkout: boolean;
  draft: string;
  setDraft: (next: string) => void;
  handleSend: () => Promise<void>;
  retryLastSend: () => void;
  sendMessage: (content: string, clearDraft: boolean) => Promise<void>;
  setSendError: (nextError: string | null) => void;
  initialInputMode?: "text" | "voice";
};

export default function ChatPane({
  coach,
  messages,
  syncError,
  sendError,
  sending,
  assistantBusy,
  hydrateWorkspace,
  chatScrollRef,
  composerRef,
  revealingMessageId,
  revealedChars,
  cursorOpacity,
  finishReveal,
  handleScrollDistanceFromBottomChange,
  handleChatContentSizeChange,
  onAssistantReviewDraftPlan,
  showScrollToBottom,
  composerHeight,
  setComposerHeight,
  scrollToBottom,
  isWorkout,
  draft,
  setDraft,
  handleSend,
  retryLastSend,
  sendMessage,
  setSendError,
  initialInputMode = "text",
}: ChatPaneProps) {
  const {
    inputMode,
    setInputMode,
    voiceBusy,
    voiceRecording,
    voiceError,
    startVoiceRecording,
    stopVoiceRecordingAndSend,
  } = useCoachVoiceComposer({
    coach,
    enabled: true,
    assistantBusy,
    messages,
    initialInputMode,
    onClearSendError: () => setSendError(null),
    onSendTranscript: async (transcript) => {
      await sendMessage(transcript, false);
    },
  });

  const interactionBusy = assistantBusy || voiceBusy;

  return (
    <View className="flex-1">
      <ChatSyncErrorBanner error={syncError} onRetry={() => void hydrateWorkspace()} />

      <View className="border-b border-neutral-900 bg-neutral-950 px-4 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Chat mode
          </Text>
          <View className="flex-row items-center rounded-full border border-neutral-800 bg-neutral-900/70 p-1">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setInputMode("text")}
              className={`h-7 w-7 items-center justify-center rounded-full ${
                inputMode === "text" ? "bg-violet-600" : "bg-transparent"
              }`}
              accessibilityRole="button"
              accessibilityLabel="Switch to text chat mode"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={inputMode === "text" ? "#ffffff" : "#a3a3a3"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setInputMode("voice")}
              className={`h-7 w-7 items-center justify-center rounded-full ${
                inputMode === "voice" ? "bg-violet-600" : "bg-transparent"
              }`}
              accessibilityRole="button"
              accessibilityLabel="Switch to voice chat mode"
            >
              <Ionicons
                name="mic-outline"
                size={14}
                color={inputMode === "voice" ? "#ffffff" : "#a3a3a3"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ChatThread
        scrollRef={(node) => {
          chatScrollRef.current = node;
        }}
        messages={messages}
        sending={sending || voiceBusy}
        sendError={sendError}
        onScrollDistanceFromBottomChange={handleScrollDistanceFromBottomChange}
        onContentSizeChange={handleChatContentSizeChange}
        revealingMessageId={revealingMessageId}
        revealedChars={revealedChars}
        cursorOpacity={cursorOpacity}
        onSkipReveal={finishReveal}
        onAssistantCtaPress={(message) => {
          if (message.cta !== "review_draft_plan") return;
          onAssistantReviewDraftPlan();
        }}
      />

      <ScrollToBottomButton
        visible={showScrollToBottom}
        bottom={(composerHeight || 84) + 88}
        onPress={() => scrollToBottom(true)}
      />

      {isWorkout && inputMode === "text" ? (
        <PlanQuickActions
          disabled={interactionBusy || voiceRecording}
          onPickDays={(days) => {
            void sendMessage(`Please revise my workout plan to ${days} days/week.`, false);
          }}
          onPickFocus={(goal) => {
            const goalLabel =
              goal === "fat_loss" ? "fat loss" : goal === "recomp" ? "recomp" : "strength";
            void sendMessage(`Please change my workout plan focus to ${goalLabel}.`, false);
          }}
        />
      ) : null}

      {inputMode === "voice" ? (
        <VoiceComposer
          recording={voiceRecording}
          busy={interactionBusy}
          error={voiceError ?? sendError}
          onStartRecording={() => {
            void startVoiceRecording();
          }}
          onStopRecording={() => {
            void stopVoiceRecordingAndSend();
          }}
          onComposerLayout={(h) => setComposerHeight((prev) => (prev !== h ? h : prev))}
        />
      ) : (
        <ChatComposer
          value={draft}
          onChangeText={setDraft}
          sending={interactionBusy}
          onSend={() => {
            void handleSend();
            composerRef.current?.focus();
          }}
          sendError={sendError}
          onRetryFromError={retryLastSend}
          onComposerLayout={(h) => setComposerHeight((prev) => (prev !== h ? h : prev))}
          inputRef={(node) => {
            composerRef.current = node;
          }}
        />
      )}
    </View>
  );
}
