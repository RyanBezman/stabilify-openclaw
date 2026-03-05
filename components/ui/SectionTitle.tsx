import { Text } from "react-native";
import type { TextProps } from "react-native";

type SectionTitleProps = TextProps & {
  className?: string;
};

export default function SectionTitle({
  className,
  ...props
}: SectionTitleProps) {
  return (
    <Text
      {...props}
      className={`text-sm font-semibold uppercase tracking-[2px] text-neutral-500 ${
        className ?? ""
      }`}
    />
  );
}
