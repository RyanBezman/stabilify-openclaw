import { Ionicons } from "@expo/vector-icons";
import { type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolateColor,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_HORIZONTAL_PADDING,
  FLOATING_TAB_MIN_BOTTOM_PADDING,
  FLOATING_TAB_TOP_PADDING,
} from "../../lib/navigation/useFloatingTabBarLayout";

const TAB_BAR_ACTIVE_COLOR = "#a78bfa";
const TAB_BAR_INACTIVE_COLOR = "#737373";
const TAB_BAR_ROW_HORIZONTAL_PADDING = 6;
const TAB_BAR_PILL_HORIZONTAL_INSET = 8;
const TAB_BAR_PILL_VERTICAL_INSET = 7;
const TAB_BAR_PILL_RADIUS = 24;
const TAB_BAR_LABEL_FONT_SIZE = 11;
const TAB_BAR_LABEL_LINE_HEIGHT = 13;

function getTabLabel(routeName: string) {
  if (routeName === "Today") return "Home";
  if (routeName === "Feed") return "Feed";
  if (routeName === "Search") return "Search";
  if (routeName === "Coaches") return "Coaches";
  return "Profile";
}

type TabIconPair = {
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
};

function getTabIcons(routeName: string): TabIconPair {
  if (routeName === "Today") return { active: "home", inactive: "home-outline" };
  if (routeName === "Feed") return { active: "newspaper", inactive: "newspaper-outline" };
  if (routeName === "Search") return { active: "search", inactive: "search-outline" };
  if (routeName === "Coaches") return { active: "people", inactive: "people-outline" };
  return { active: "person", inactive: "person-outline" };
}

function getTabSelectionProgress(activeIndex: number, itemIndex: number) {
  "worklet";
  return 1 - Math.min(Math.abs(activeIndex - itemIndex), 1);
}

type FloatingTabBarItemProps = {
  accessibilityLabel: string;
  activeIndex: SharedValue<number>;
  index: number;
  isFocused: boolean;
  routeName: string;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
  testID?: string;
};

function FloatingTabBarItem({
  accessibilityLabel,
  activeIndex,
  index,
  isFocused,
  routeName,
  label,
  onLongPress,
  onPress,
  testID,
}: FloatingTabBarItemProps) {
  const iconPair = useMemo(() => getTabIcons(routeName), [routeName]);

  const containerStyle = useAnimatedStyle(() => {
    const progress = getTabSelectionProgress(activeIndex.value, index);
    return {
      transform: [
        { translateY: interpolate(progress, [0, 1], [0, -1.5]) },
        { scale: interpolate(progress, [0, 1], [1, 1.03]) },
      ],
    };
  });

  const activeIconStyle = useAnimatedStyle(() => {
    const progress = getTabSelectionProgress(activeIndex.value, index);
    return { opacity: progress };
  });

  const inactiveIconStyle = useAnimatedStyle(() => {
    const progress = getTabSelectionProgress(activeIndex.value, index);
    return { opacity: 1 - progress };
  });

  const labelStyle = useAnimatedStyle(() => {
    const progress = getTabSelectionProgress(activeIndex.value, index);
    return {
      color: interpolateColor(
        progress,
        [0, 1],
        [TAB_BAR_INACTIVE_COLOR, TAB_BAR_ACTIVE_COLOR],
      ),
      opacity: interpolate(progress, [0, 1], [0.9, 1]),
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <Animated.View
        style={[
          containerStyle,
          {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 2,
          },
        ]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={[
              activeIconStyle,
              { position: "absolute", alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Ionicons name={iconPair.active} size={22} color={TAB_BAR_ACTIVE_COLOR} />
          </Animated.View>
          <Animated.View
            style={[
              inactiveIconStyle,
              { position: "absolute", alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Ionicons name={iconPair.inactive} size={22} color={TAB_BAR_INACTIVE_COLOR} />
          </Animated.View>
        </View>
        <Animated.Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            labelStyle,
            {
              marginTop: 2,
              fontSize: TAB_BAR_LABEL_FONT_SIZE,
              fontWeight: "700",
              lineHeight: TAB_BAR_LABEL_LINE_HEIGHT,
              textAlign: "center",
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, FLOATING_TAB_MIN_BOTTOM_PADDING);
  const [rowWidth, setRowWidth] = useState(0);
  const activeIndex = useSharedValue(props.state.index);
  const routeCount = props.state.routes.length;

  useEffect(() => {
    activeIndex.value = withSpring(props.state.index, {
      damping: 18,
      stiffness: 210,
      mass: 0.72,
    });
  }, [activeIndex, props.state.index]);

  const handleRowLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  const activePillStyle = useAnimatedStyle(() => {
    if (rowWidth === 0 || routeCount === 0) {
      return { opacity: 0 };
    }

    const innerRowWidth = Math.max(rowWidth - TAB_BAR_ROW_HORIZONTAL_PADDING * 2, 0);
    const tabWidth = innerRowWidth / routeCount;
    const pillWidth = Math.max(tabWidth - TAB_BAR_PILL_HORIZONTAL_INSET * 2, 0);

    return {
      opacity: 1,
      width: pillWidth,
      transform: [{ translateX: activeIndex.value * tabWidth }],
    };
  }, [routeCount, rowWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
      }}
    >
      <View
        style={{
          paddingHorizontal: FLOATING_TAB_HORIZONTAL_PADDING,
          paddingTop: FLOATING_TAB_TOP_PADDING,
          paddingBottom: bottomPad,
          backgroundColor: "transparent",
        }}
      >
        <View
          style={{
            width: "100%",
            height: FLOATING_TAB_BAR_HEIGHT,
            borderRadius: 32,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(38, 38, 38, 0.95)", // neutral-800
            backgroundColor: "rgba(10, 10, 10, 0.92)", // neutral-950 translucent
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
            position: "relative",
          }}
        >
          <View
            onLayout={handleRowLayout}
            style={{
              flex: 1,
              width: "100%",
              flexDirection: "row",
              paddingHorizontal: TAB_BAR_ROW_HORIZONTAL_PADDING,
              position: "relative",
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                activePillStyle,
                {
                  position: "absolute",
                  left: TAB_BAR_ROW_HORIZONTAL_PADDING + TAB_BAR_PILL_HORIZONTAL_INSET,
                  top: TAB_BAR_PILL_VERTICAL_INSET,
                  bottom: TAB_BAR_PILL_VERTICAL_INSET,
                  borderRadius: TAB_BAR_PILL_RADIUS,
                  backgroundColor: "rgba(167, 139, 250, 0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(167, 139, 250, 0.22)",
                },
              ]}
            />
            {props.state.routes.map((route, index) => {
              const focused = props.state.index === index;
              const label = getTabLabel(route.name);
              const descriptor = props.descriptors[route.key];

              return (
                <View key={route.key} style={{ flex: 1, minWidth: 0 }}>
                  <FloatingTabBarItem
                    accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? label}
                    activeIndex={activeIndex}
                    index={index}
                    isFocused={focused}
                    routeName={route.name}
                    testID={descriptor.options.tabBarButtonTestID}
                    label={label}
                    onPress={() => {
                      const event = props.navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                      });

                      if (focused || event.defaultPrevented) {
                        return;
                      }

                      props.navigation.navigate(route.name, route.params);
                    }}
                    onLongPress={() => {
                      props.navigation.emit({
                        type: "tabLongPress",
                        target: route.key,
                      });
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
