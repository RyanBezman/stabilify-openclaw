import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AuthHeader from "./AuthHeader";

type AuthLayoutProps = {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
};

export default function AuthLayout({
  title,
  onBack,
  children,
  footer,
  scroll = true,
}: AuthLayoutProps) {
  const content = (
    <View className="flex-1 px-5 pt-6">
      <AuthHeader title={title} onBack={onBack} />
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {scroll ? (
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
