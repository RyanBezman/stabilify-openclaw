import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import AuthHeader from "./AuthHeader";
import AppScreen from "../ui/AppScreen";

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
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={480}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {scroll ? (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer}
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
