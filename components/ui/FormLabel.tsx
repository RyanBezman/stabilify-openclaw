import { Text } from "react-native";
import type { TextProps } from "react-native";

type FormLabelProps = TextProps & {
  className?: string;
};

export default function FormLabel({ className, ...props }: FormLabelProps) {
  return (
    <Text
      {...props}
      className={`mb-2 ml-1 text-sm text-neutral-400 ${className ?? ""}`}
    />
  );
}
