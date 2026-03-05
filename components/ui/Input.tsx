import { forwardRef } from "react";
import { Keyboard, TextInput } from "react-native";
import type { TextInputProps } from "react-native";

type InputProps = TextInputProps & {
  className?: string;
};

const baseClassName =
  "rounded-2xl border border-neutral-800 bg-neutral-900 px-5 text-white";

const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    className,
    placeholderTextColor = "#525252",
    textAlignVertical,
    returnKeyType,
    blurOnSubmit,
    onSubmitEditing,
    style,
    multiline,
    ...props
  },
  ref,
) {
  const effectiveTextAlignVertical =
    textAlignVertical ?? (multiline ? "top" : "center");
  const effectiveReturnKeyType =
    returnKeyType ?? (multiline ? "default" : "done");
  const effectiveBlurOnSubmit =
    blurOnSubmit ?? (multiline ? false : true);

  const controlClassName = multiline ? "py-4" : "h-14";
  const singleLineStyle = multiline
    ? null
    : {
        height: 56,
        paddingTop: 0,
        paddingBottom: 0,
      };
  const textMetricsStyle = {
    fontSize: 16,
    ...(multiline ? { lineHeight: 22 } : null),
  };

  return (
    <TextInput
      ref={ref}
      {...props}
      multiline={multiline}
      placeholderTextColor={placeholderTextColor}
      underlineColorAndroid="transparent"
      textAlignVertical={effectiveTextAlignVertical}
      returnKeyType={effectiveReturnKeyType}
      blurOnSubmit={effectiveBlurOnSubmit}
      onSubmitEditing={onSubmitEditing ?? Keyboard.dismiss}
      style={[
        { includeFontPadding: false },
        textMetricsStyle,
        singleLineStyle,
        style,
      ]}
      className={`${baseClassName} ${controlClassName} ${className ?? ""}`}
    />
  );
});

export default Input;
