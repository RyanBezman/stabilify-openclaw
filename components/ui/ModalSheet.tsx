import { type ReactNode } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModalSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  contentClassName?: string;
};

export default function ModalSheet({
  visible,
  onRequestClose,
  children,
  contentClassName,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const topInset = Math.max(insets.top, 16) + 12;
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 16;
  const maxSheetHeight = Math.max(280, screenHeight - topInset);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/60" style={{ paddingTop: topInset }}>
        <View
          className={`rounded-t-3xl border border-neutral-800 bg-neutral-950 px-5 pt-4 ${
            contentClassName ?? ""
          }`}
          style={{
            width: "100%",
            maxWidth: 640,
            maxHeight: maxSheetHeight,
            alignSelf: "center",
            paddingBottom: contentPaddingBottom,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
