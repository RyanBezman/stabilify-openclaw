import { DarkTheme, type Theme } from "@react-navigation/native";
import type { ViewStyle } from "react-native";

export const APP_SURFACE_BACKGROUND_COLOR = "#0a0a0a";

export const appSurfaceStyle = {
  flex: 1,
  backgroundColor: APP_SURFACE_BACKGROUND_COLOR,
} satisfies ViewStyle;

export const appSceneStyle = {
  backgroundColor: APP_SURFACE_BACKGROUND_COLOR,
} satisfies ViewStyle;

export const appNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_SURFACE_BACKGROUND_COLOR,
    card: APP_SURFACE_BACKGROUND_COLOR,
    border: "#262626",
    primary: "#a78bfa",
    text: "#ffffff",
    notification: "#a78bfa",
  },
};
