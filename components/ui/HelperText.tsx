import { Text } from "react-native";
import type { TextProps } from "react-native";

type HelperTextProps = TextProps & {
  className?: string;
};

export default function HelperText({ className, ...props }: HelperTextProps) {
  return (
    <Text
      {...props}
      className={`text-xs text-neutral-500 ${className ?? ""}`}
    />
  );
}
