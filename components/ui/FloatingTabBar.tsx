import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps, useEffect, useState } from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  StyleSheet,
} from "react-native";
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_HORIZONTAL_PADDING,
  FLOATING_TAB_MIN_BOTTOM_PADDING,
  FLOATING_TAB_TOP_PADDING,
} from "../../lib/navigation/useFloatingTabBarLayout";

const TAB_ROW_HORIZONTAL_PADDING = 6;
const ACTIVE_TAB_INDICATOR_VERTICAL_INSET = 5;
const ACTIVE_TAB_INDICATOR_COLOR = "rgba(167, 139, 250, 0.16)";
const ACTIVE_TAB_INDICATOR_BORDER_COLOR = "rgba(167, 139, 250, 0.24)";
const ACTIVE_TAB_COLOR = "#a78bfa";
const INACTIVE_TAB_COLOR = "#737373";

function getTabLabel(routeName: string) {
  if (routeName === "Today") return "Home";
  if (routeName === "Feed") return "Feed";
  if (routeName === "Search") return "Search";
  if (routeName === "Coaches") return "Coaches";
  return "Profile";
}

type TabIconName = ComponentProps<typeof Ionicons>["name"];

function getTabIcon(routeName: string, focused: boolean): TabIconName {
  if (routeName === "Today") return focused ? "home" : "home-outline";
  if (routeName === "Feed") return focused ? "newspaper" : "newspaper-outline";
  if (routeName === "Search") return focused ? "search" : "search-outline";
  if (routeName === "Coaches") return focused ? "people" : "people-outline";
  return focused ? "person" : "person-outline";
}

type FloatingTabBarButtonProps = {
  accessibilityLabel?: string;
  animatedIndex: SharedValue<number>;
  focused: boolean;
  iconName: TabIconName;
  index: number;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
  testID?: string;
};

function FloatingTabBarButton({
  accessibilityLabel,
  animatedIndex,
  focused,
  iconName,
  index,
  label,
  onLongPress,
  onPress,
  testID,
}: FloatingTabBarButtonProps) {
  const color = focused ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR;
  const contentAnimatedStyle = useAnimatedStyle(() => {
    const distanceFromActive = Math.min(Math.abs(animatedIndex.value - index), 1);

    return {
      opacity: interpolate(distanceFromActive, [0, 1], [1, 0.78]),
      transform: [
        { translateY: interpolate(distanceFromActive, [0, 1], [-2, 0]) },
        { scale: interpolate(distanceFromActive, [0, 1], [1.04, 1]) },
      ],
    };
  }, [animatedIndex, index]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, contentAnimatedStyle]}>
        <Ionicons name={iconName} size={22} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const animatedIndex = useSharedValue(props.state.index);
  const bottomPad = Math.max(insets.bottom, FLOATING_TAB_MIN_BOTTOM_PADDING);
  const [tabRowWidth, setTabRowWidth] = useState(0);
  const routeCount = props.state.routes.length;

  useEffect(() => {
    animatedIndex.value = withSpring(props.state.index, {
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    });
  }, [animatedIndex, props.state.index]);

  const handleTabRowLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth !== tabRowWidth) {
      setTabRowWidth(nextWidth);
    }
  };

  const activeIndicatorAnimatedStyle = useAnimatedStyle(() => {
    const innerWidth = Math.max(tabRowWidth - TAB_ROW_HORIZONTAL_PADDING * 2, 0);
    const indicatorWidth = routeCount > 0 ? innerWidth / routeCount : 0;

    return {
      opacity: indicatorWidth > 0 ? 1 : 0,
      transform: [{ translateX: animatedIndex.value * indicatorWidth }],
      width: indicatorWidth,
    };
  }, [animatedIndex, routeCount, tabRowWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={styles.container}
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
          style={styles.shell}
        >
          <View style={styles.tabRow} onLayout={handleTabRowLayout}>
            <Animated.View
              pointerEvents="none"
              style={[styles.activeIndicator, activeIndicatorAnimatedStyle]}
            />
            {props.state.routes.map((route, index) => {
              const focused = props.state.index === index;
              const label = getTabLabel(route.name);
              const iconName = getTabIcon(route.name, focused);
              const descriptor = props.descriptors[route.key];

              return (
                <FloatingTabBarButton
                  key={route.key}
                  animatedIndex={animatedIndex}
                  focused={focused}
                  iconName={iconName}
                  index={index}
                  label={label}
                  accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? label}
                  testID={descriptor.options.tabBarButtonTestID}
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
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: ACTIVE_TAB_INDICATOR_COLOR,
    borderColor: ACTIVE_TAB_INDICATOR_BORDER_COLOR,
    borderRadius: 26,
    borderWidth: 1,
    bottom: ACTIVE_TAB_INDICATOR_VERTICAL_INSET,
    left: TAB_ROW_HORIZONTAL_PADDING,
    position: "absolute",
    top: ACTIVE_TAB_INDICATOR_VERTICAL_INSET,
  },
  container: {
    bottom: 0,
    elevation: 20,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  shell: {
    backgroundColor: "rgba(10, 10, 10, 0.92)",
    borderColor: "rgba(38, 38, 38, 0.95)",
    borderRadius: 32,
    borderWidth: 1,
    elevation: 8,
    height: FLOATING_TAB_BAR_HEIGHT,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
    marginTop: 2,
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: TAB_ROW_HORIZONTAL_PADDING,
    position: "relative",
  },
});
