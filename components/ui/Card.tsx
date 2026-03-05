import { View } from "react-native";
import type { ViewProps } from "react-native";

type CardVariant = "default" | "subtle" | "outline";

type CardProps = ViewProps & {
  variant?: CardVariant;
  className?: string;
};

const variantClassName: Record<CardVariant, string> = {
  default: "rounded-2xl border border-neutral-800 bg-neutral-900",
  subtle: "rounded-2xl border border-neutral-800 bg-neutral-950/60",
  outline: "rounded-2xl border border-neutral-800 bg-transparent",
};

export default function Card({
  variant = "default",
  className,
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      className={`${variantClassName[variant]} ${className ?? ""}`}
    />
  );
}
