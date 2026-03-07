import { StatusBar, type StatusBarStyle } from "expo-status-bar";
import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { type Edge, useSafeAreaInsets } from "react-native-safe-area-context";
import { appSurfaceStyle } from "../../lib/navigation/theme";

const DEFAULT_SCREEN_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

type AppScreenProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  statusBarStyle?: StatusBarStyle;
  maxContentWidth?: number;
};

function usesEdge(edges: readonly Edge[], edge: Edge) {
  return edges.includes(edge);
}

export default function AppScreen({
  children,
  className,
  style,
  edges = DEFAULT_SCREEN_EDGES,
  statusBarStyle = "light",
  maxContentWidth,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();

  const insetStyle = {
    paddingTop: usesEdge(edges, "top") ? insets.top : 0,
    paddingRight: usesEdge(edges, "right") ? insets.right : 0,
    paddingBottom: usesEdge(edges, "bottom") ? insets.bottom : 0,
    paddingLeft: usesEdge(edges, "left") ? insets.left : 0,
  } satisfies ViewStyle;
  const contentWidthStyle = maxContentWidth
    ? ({
        width: "100%",
        maxWidth: maxContentWidth,
        alignSelf: "center",
      } satisfies ViewStyle)
    : undefined;

  return (
    <View style={appSurfaceStyle}>
      <StatusBar style={statusBarStyle} />
      <View className={className} style={[styles.content, insetStyle, contentWidthStyle, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
