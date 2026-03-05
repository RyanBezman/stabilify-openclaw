import type { ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { TouchableOpacityProps } from "react-native";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "md" | "sm";

type ButtonProps = TouchableOpacityProps & {
  title?: string;
  leftIcon?: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
};

const baseClassName = "max-w-full items-center justify-center rounded-2xl";
const sizeClassName: Record<ButtonSize, string> = {
  md: "py-4",
  sm: "px-4 py-2",
};
const variantClassName: Record<ButtonVariant, string> = {
  primary: "bg-violet-600",
  secondary: "border border-neutral-800 bg-neutral-900",
  outline: "border border-neutral-800 bg-transparent",
  ghost: "bg-transparent",
};
const variantTextClassName: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-neutral-200",
  outline: "text-neutral-300",
  ghost: "text-neutral-300",
};
const spinnerColor: Record<ButtonVariant, string> = {
  primary: "white",
  secondary: "#e5e5e5",
  outline: "#d4d4d4",
  ghost: "#d4d4d4",
};

export default function Button({
  title,
  leftIcon,
  loading = false,
  variant = "primary",
  size = "md",
  className,
  textClassName,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      {...props}
      disabled={isDisabled}
      className={`${baseClassName} ${sizeClassName[size]} ${
        variantClassName[variant]
      } ${isDisabled ? "opacity-60" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : children ? (
        children
      ) : (
        <View className="max-w-full flex-row items-center justify-center">
          {leftIcon ? <View className="mr-2 shrink-0">{leftIcon}</View> : null}
          <Text
            numberOfLines={1}
            className={`text-base font-bold ${
              variantTextClassName[variant]
            } shrink ${textClassName ?? ""}`}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
