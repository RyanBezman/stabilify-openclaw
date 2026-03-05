import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AuthedHome from "./AuthedHome";
import Feed from "./Feed";
import SearchUsers from "./SearchUsers";
import Coaches from "./Coaches";
import Profile from "./Profile";
import FloatingTabBar from "../components/ui/FloatingTabBar";
import type { AuthedTabsProps } from "../lib/features/auth";
import type { AuthedTabParamList } from "../lib/navigation/types";

const Tab = createBottomTabNavigator<AuthedTabParamList>();

export default function AuthedTabs({ user }: AuthedTabsProps) {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: 64,
          paddingVertical: 0,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 2,
          marginHorizontal: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 13,
          marginTop: 0,
        },
        tabBarActiveTintColor: "#a78bfa", // violet-400
        tabBarInactiveTintColor: "#737373", // neutral-500
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = Math.max(18, Math.min(size, 22));
          const iconColor = focused ? "#a78bfa" : color;

          let name: keyof typeof Ionicons.glyphMap = "home-outline";
          if (route.name === "Today") name = focused ? "home" : "home-outline";
          if (route.name === "Feed") name = focused ? "newspaper" : "newspaper-outline";
          if (route.name === "Search") name = focused ? "search" : "search-outline";
          if (route.name === "Coaches") name = focused ? "people" : "people-outline";
          if (route.name === "Profile") name = focused ? "person" : "person-outline";

          return <Ionicons name={name} size={iconSize} color={iconColor} />;
        },
      })}
    >
      <Tab.Screen name="Today" options={{ tabBarLabel: "Home" }}>
        {(props) => <AuthedHome {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Search" component={SearchUsers} />
      <Tab.Screen name="Coaches" component={Coaches} />
      <Tab.Screen name="Profile">
        {(props) => <Profile {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
