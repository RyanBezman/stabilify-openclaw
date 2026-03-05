import { View } from "react-native";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const tabInsets = {
    top: props.insets.top,
    right: props.insets.right,
    left: props.insets.left,
    bottom: 0,
  };

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomPad }}>
        <View
          style={{
            borderRadius: 32,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(38, 38, 38, 0.95)", // neutral-800
            backgroundColor: "rgba(10, 10, 10, 0.98)", // neutral-950 translucent
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <BottomTabBar {...props} insets={tabInsets} />
        </View>
      </View>
    </View>
  );
}
