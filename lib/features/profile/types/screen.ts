import type { User } from "@supabase/supabase-js";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthedTabParamList, RootStackParamList } from "../../../navigation/types";

export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AuthedTabParamList, "Profile">,
  NativeStackScreenProps<RootStackParamList>
> & {
  user?: User | null;
};

export type ProfileHeaderProps = {
  title: string;
  onOpenMenu: () => void;
};
