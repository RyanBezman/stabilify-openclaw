import "./global.css";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AuthedTabs from "./screens/AuthedTabs";
import GuestHome from "./screens/GuestHome";
import SignIn from "./screens/SignIn";
import SignUp from "./screens/SignUp";
import Onboarding from "./screens/Onboarding";
import LogWeighIn from "./screens/LogWeighIn";
import GymSettings from "./screens/GymSettings";
import ProfileSettings from "./screens/ProfileSettings";
import BillingPlans from "./screens/BillingPlans";
import CreatePost from "./screens/CreatePost";
import CoachWorkspace from "./screens/CoachWorkspace";
import CoachChat from "./screens/CoachChat";
import CoachProfile from "./screens/CoachProfile";
import CoachCheckins from "./screens/CoachCheckins";
import CoachOnboardingFlow from "./screens/CoachOnboardingFlow";
import UserProfile from "./screens/UserProfile";
import FollowRequests from "./screens/FollowRequests";
import GymValidationRequestDetail from "./screens/GymValidationRequestDetail";
import { supabase } from "./lib/supabase";
import type { RootStackParamList } from "./lib/navigation/types";
import { CoachProvider } from "./lib/features/coaches";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          const message = error.message.toLowerCase();
          if (message.includes("invalid refresh token")) {
            await supabase.auth.signOut({ scope: "local" });
          }
          if (active) {
            setUser(null);
            setSessionChecked(true);
          }
          return;
        }

        if (!active) return;
        setUser(data.session?.user ?? null);
        setSessionChecked(true);
      } catch {
        if (active) {
          setUser(null);
          setSessionChecked(true);
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: session ? "Authed" : "Guest" }],
          });
        }
      }
    );

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (!sessionChecked) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CoachProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName={user ? "Authed" : "Guest"}
            >
              <Stack.Screen name="Guest" component={GuestHome} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen name="SignIn" component={SignIn} />
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="LogWeighIn" component={LogWeighIn} />
              <Stack.Screen name="GymSettings" component={GymSettings} />
              <Stack.Screen name="ProfileSettings" component={ProfileSettings} />
              <Stack.Screen name="UserProfile" component={UserProfile} />
              <Stack.Screen name="FollowRequests" component={FollowRequests} />
              <Stack.Screen
                name="GymValidationRequestDetail"
                component={GymValidationRequestDetail}
              />
              <Stack.Screen name="BillingPlans" component={BillingPlans} />
              <Stack.Screen name="CreatePost" component={CreatePost} />
              <Stack.Screen name="CoachWorkspace" component={CoachWorkspace} />
              <Stack.Screen name="CoachOnboardingFlow" component={CoachOnboardingFlow} />
              <Stack.Screen name="CoachChat" component={CoachChat} />
              <Stack.Screen name="CoachProfile" component={CoachProfile} />
              <Stack.Screen name="CoachCheckins" component={CoachCheckins} />
              <Stack.Screen name="Authed">
                {() => <AuthedTabs user={user} />}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </CoachProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
