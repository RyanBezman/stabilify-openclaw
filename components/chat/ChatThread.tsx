import { Animated, Platform, ScrollView, View } from "react-native";
import AssistantMessage from "./AssistantMessage";
import TypingPulse from "./TypingPulse";
import UserMessageBubble from "./UserMessageBubble";
import type { ChatMessage } from "../../lib/features/coaches";

export default function ChatThread({
  scrollRef,
  messages,
  sending,
  sendError,
  onScrollDistanceFromBottomChange,
  onContentSizeChange,
  revealingMessageId,
  revealedChars,
  cursorOpacity,
  onSkipReveal,
  onAssistantCtaPress,
}: {
  scrollRef: (node: ScrollView | null) => void;
  messages: ChatMessage[];
  sending: boolean;
  sendError: string | null;
  onScrollDistanceFromBottomChange: (distanceFromBottom: number) => void;
  onContentSizeChange: () => void;
  revealingMessageId: string | null;
  revealedChars: number;
  cursorOpacity: Animated.Value;
  onSkipReveal: () => void;
  onAssistantCtaPress?: (message: ChatMessage) => void;
}) {
  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerClassName="px-4 py-4"
      contentContainerStyle={{ paddingBottom: 12 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        onScrollDistanceFromBottomChange(distanceFromBottom);
      }}
      onContentSizeChange={onContentSizeChange}
    >
      {messages.map((m, idx) => {
        const prev = messages[idx - 1];
        const next = messages[idx + 1];
        const firstInGroup = !prev || prev.role !== m.role;
        const isUser = m.role === "user";
        const isRevealing = m.id === revealingMessageId && m.role === "assistant";
        const content = isRevealing ? m.content.slice(0, revealedChars) : m.content;

        if (!isUser) {
          return (
            <AssistantMessage
              key={m.id}
              content={content}
              cta={m.cta}
              firstInGroup={firstInGroup}
              isRevealing={isRevealing}
              cursorOpacity={cursorOpacity}
              onSkipReveal={onSkipReveal}
              onPressCta={
                m.cta
                  ? () => {
                      onAssistantCtaPress?.(m);
                    }
                  : undefined
              }
            />
          );
        }

        const lastInGroup = !next || next.role !== m.role;
        return (
          <UserMessageBubble
            key={m.id}
            content={content}
            firstInGroup={firstInGroup}
            lastInGroup={lastInGroup}
          />
        );
      })}

      {sending && messages[messages.length - 1]?.role === "user" && !sendError ? (
        <View className="mt-3 self-start px-1 py-1">
          <TypingPulse />
        </View>
      ) : null}
    </ScrollView>
  );
}
