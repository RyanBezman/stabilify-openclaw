import { Text, View } from "react-native";

export default function UserMessageBubble({
  content,
  firstInGroup,
  lastInGroup,
}: {
  content: string;
  firstInGroup: boolean;
  lastInGroup: boolean;
}) {
  const bubbleRadius = 22;
  const groupRadius = 16;
  const tailRadius = 7;

  const bubbleStyle = {
    borderTopLeftRadius: bubbleRadius,
    borderTopRightRadius: firstInGroup ? bubbleRadius : groupRadius,
    borderBottomLeftRadius: bubbleRadius,
    borderBottomRightRadius: lastInGroup ? tailRadius : bubbleRadius,
  };

  return (
    <View
      style={bubbleStyle}
      className={`max-w-[78%] self-end bg-violet-600 px-4 py-2.5 ${
        firstInGroup ? "mt-3" : "mt-1"
      }`}
    >
      <Text className="text-[16px] leading-[22px] text-white">{content}</Text>
    </View>
  );
}

