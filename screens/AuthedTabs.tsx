import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AuthedHome from "./AuthedHome";
import Feed from "./Feed";
import SearchUsers from "./SearchUsers";
import Coaches from "./Coaches";
import Profile from "./Profile";
import FloatingTabBar from "../components/ui/FloatingTabBar";
import type { AuthedTabsProps } from "../lib/features/auth";
import { fetchCurrentUserId } from "../lib/features/auth";
import { fetchCoachOnboardingStatus } from "../lib/features/coaches";
import type {
  AuthedTabParamList,
  RootStackNavigationProp,
} from "../lib/navigation/types";
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
      <Tab.Screen
        name="Coaches"
        component={Coaches}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            void (async () => {
              const userIdResult = await fetchCurrentUserId();
              const userId = userIdResult.data?.userId;

              if (!userIdResult.error && userId) {
                const onboardingStatus = await fetchCoachOnboardingStatus(userId);
                if (onboardingStatus.data && !onboardingStatus.data.complete) {
                  const parentNav = navigation.getParent<RootStackNavigationProp>();
                  if (parentNav) {
                    parentNav.navigate("CoachOnboardingFlow", {
                      specialization: "workout",
                    });
                    return;
                  }
                }
              }

              navigation.navigate("Coaches");
            })();
          },
        })}
      />
      <Tab.Screen name="Profile">
        {(props) => <Profile {...props} user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
