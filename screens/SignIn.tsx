import {
  Alert,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import FormLabel from "../components/ui/FormLabel";
import AuthLayout from "../components/auth/AuthLayout";
import AuthFooter from "../components/auth/AuthFooter";
import GoogleIcon from "../components/icons/GoogleIcon";
import type { RootStackParamList } from "../lib/navigation/types";
import { useSignIn } from "../lib/features/auth";
import { useGoogleOAuth } from "../lib/features/auth";

type SignInProps = NativeStackScreenProps<RootStackParamList, "SignIn">;

export default function SignIn({ navigation }: SignInProps) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    signIn,
  } = useSignIn();
  const { loading: googleLoading, signInWithGoogle } = useGoogleOAuth();

  const onSignIn = async () => {
    const result = await signIn();
    if (result.error) {
      Alert.alert("Sign in failed", result.error);
      return;
    }
    if (!result.success) return;

    navigation.reset({ index: 0, routes: [{ name: "Authed" }] });
  };

  const onGoogleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      Alert.alert("Google sign-in failed", result.error);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      onBack={navigation.goBack}
    >
      <View className="mb-8 gap-4">
        <View>
          <FormLabel>Email</FormLabel>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View>
          <FormLabel>Password</FormLabel>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            textContentType="password"
          />
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-center text-sm font-medium text-violet-400">
          Forgot password?
        </Text>
      </View>

      <Button
        title="Sign In"
        onPress={onSignIn}
        loading={loading}
        className="mb-4"
      />

      <View className="mt-2" pointerEvents={loading ? "none" : "auto"}>
        <AuthFooter
          prompt="Don't have an account?"
          actionLabel="Sign up"
          onPress={() => navigation.navigate("SignUp")}
        />
      </View>

      <View className="my-6 flex-row items-center">
        <View className="h-px flex-1 bg-neutral-800" />
        <Text className="mx-3 text-xs font-semibold text-neutral-500">OR</Text>
        <View className="h-px flex-1 bg-neutral-800" />
      </View>

      <Button
        title="Continue with Google"
        variant="secondary"
        leftIcon={<GoogleIcon />}
        onPress={onGoogleSignIn}
        loading={googleLoading}
        className="mb-10"
      />
    </AuthLayout>
  );
}
