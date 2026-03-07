import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_HORIZONTAL_PADDING,
  FLOATING_TAB_MIN_BOTTOM_PADDING,
  FLOATING_TAB_TOP_PADDING,
} from "../../lib/navigation/useFloatingTabBarLayout";

function getTabLabel(routeName: string) {
  if (routeName === "Today") return "Home";
  if (routeName === "Feed") return "Feed";
  if (routeName === "Search") return "Search";
  if (routeName === "Coaches") return "Coaches";
  return "Profile";
}

function getTabIcon(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === "Today") return focused ? "home" : "home-outline";
  if (routeName === "Feed") return focused ? "newspaper" : "newspaper-outline";
  if (routeName === "Search") return focused ? "search" : "search-outline";
  if (routeName === "Coaches") return focused ? "people" : "people-outline";
  return focused ? "person" : "person-outline";
}

export default function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, FLOATING_TAB_MIN_BOTTOM_PADDING);

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
          }}
        >
          <View className="flex-1 flex-row px-1.5">
            {props.state.routes.map((route, index) => {
              const focused = props.state.index === index;
              const label = getTabLabel(route.name);
              const iconName = getTabIcon(route.name, focused);
              const activeColor = "#a78bfa";
              const inactiveColor = "#737373";
              const color = focused ? activeColor : inactiveColor;
              const descriptor = props.descriptors[route.key];

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
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
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 2,
                  }}
                >
                  <Ionicons name={iconName} size={22} color={color} />
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      fontWeight: "700",
                      lineHeight: 13,
                      color,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
