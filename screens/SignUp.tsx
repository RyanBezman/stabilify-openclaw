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
import { useSignUp } from "../lib/features/auth";
import { useGoogleOAuth } from "../lib/features/auth";

type SignUpProps = NativeStackScreenProps<RootStackParamList, "SignUp">;

export default function SignUp({ navigation }: SignUpProps) {
  const {
    name,
    setName,
    email,
    setEmail,
    setPhone,
    password,
    setPassword,
    loading,
    formattedPhone,
    signUp,
  } = useSignUp();
  const { loading: googleLoading, signInWithGoogle } = useGoogleOAuth();

  const onSignUp = async () => {
    const result = await signUp();
    if (result.error) {
      Alert.alert("Sign up failed", result.error);
      return;
    }
    if (!result.success) return;

    navigation.navigate("Onboarding", { prefillName: result.data?.prefillName });
  };

  const onGoogleSignUp = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      Alert.alert("Google sign-in failed", result.error);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      onBack={navigation.goBack}
    >
      <View className="mb-8 gap-4">
        <View>
          <FormLabel>Full Name</FormLabel>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
          />
        </View>
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
          <FormLabel>Phone Number</FormLabel>
          <Input
            value={formattedPhone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
        </View>
        <View>
          <FormLabel>Password</FormLabel>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            textContentType="password"
          />
        </View>
      </View>

      <Text className="mb-6 px-4 text-center text-xs text-neutral-500">
        By signing up, you agree to our{" "}
        <Text className="text-violet-400">Terms of Service</Text> and{" "}
        <Text className="text-violet-400">Privacy Policy</Text>
      </Text>

      <Button
        title="Create Account"
        onPress={onSignUp}
        loading={loading}
        className="mb-4"
      />

      <View className="mt-2" pointerEvents={loading ? "none" : "auto"}>
        <AuthFooter
          prompt="Already have an account?"
          actionLabel="Sign in"
          onPress={() => navigation.navigate("SignIn")}
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
        onPress={onGoogleSignUp}
        loading={googleLoading}
        className="mb-10"
      />
    </AuthLayout>
  );
}
