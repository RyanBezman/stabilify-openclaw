import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AuthedHome from "./AuthedHome";
import Feed from "./Feed";
import SearchUsers from "./SearchUsers";
import Coaches from "./Coaches";
import Profile from "./Profile";
import FloatingTabBar from "../components/ui/FloatingTabBar";
import type { AuthedTabsProps } from "../lib/features/auth";
import type { AuthedTabParamList } from "../lib/navigation/types";
import { appSceneStyle } from "../lib/navigation/theme";

const Tab = createBottomTabNavigator<AuthedTabParamList>();

export default function AuthedTabs({ user }: AuthedTabsProps) {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: appSceneStyle,
        tabBarHideOnKeyboard: true,
      }}
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
