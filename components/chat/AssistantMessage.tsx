import type { Animated as RNAnimated } from "react-native";
import { Animated, Text, TouchableOpacity, View } from "react-native";

export default function AssistantMessage({
  content,
  cta,
  firstInGroup,
  isRevealing,
  cursorOpacity,
  onSkipReveal,
  onPressCta,
}: {
  content: string;
  cta?: "review_draft_plan";
  firstInGroup: boolean;
  isRevealing: boolean;
  cursorOpacity: RNAnimated.Value;
  onSkipReveal: () => void;
  onPressCta?: () => void;
}) {
  const showReviewDraftCta = cta === "review_draft_plan" && Boolean(onPressCta) && !isRevealing;
  return (
    <View className={`${firstInGroup ? "mt-4" : "mt-2"} self-start pr-10`}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (isRevealing) onSkipReveal();
        }}
      >
        <Text className="text-[16px] leading-[24px] text-neutral-50">
          {content}
          {isRevealing ? (
            <Animated.Text style={{ opacity: cursorOpacity }} className="text-neutral-400">
              |
            </Animated.Text>
          ) : null}
        </Text>
      </TouchableOpacity>

      {showReviewDraftCta ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressCta}
          className="mt-2 self-start rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
        >
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-200">
            Review draft plan
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
