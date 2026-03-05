import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../ui/Button";

type GuestFooterProps = {
  onPrimaryPress: () => void;
  visible: boolean;
};

export default function GuestFooter({
  onPrimaryPress,
  visible,
}: GuestFooterProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 180 : 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : 12,
        duration: visible ? 180 : 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  return (
    <Animated.View
      className="absolute inset-x-0 bottom-0 border-t border-neutral-900/70 bg-neutral-950/95 px-4 pt-2"
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={{
        paddingBottom: bottomPad,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Button title="Get Started" onPress={onPrimaryPress} className="mb-0" />
    </Animated.View>
  );
}
