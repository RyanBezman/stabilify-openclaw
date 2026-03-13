import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Modal, PanResponder, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModalSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  closeOnBackdropPress?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  showBorder?: boolean;
  enableSwipeToDismiss?: boolean;
};

export default function ModalSheet({
  visible,
  onRequestClose,
  children,
  contentClassName,
  closeOnBackdropPress = false,
  backdropClassName,
  panelClassName,
  showBorder = true,
  enableSwipeToDismiss = false,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const topInset = Math.max(insets.top, 16) + 12;
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 16;
  const maxSheetHeight = Math.max(280, screenHeight - topInset);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      sheetTranslateY.setValue(0);
    }
  }, [sheetTranslateY, visible]);

  const dismissSheet = useMemo(
    () => () => {
      Animated.timing(sheetTranslateY, {
        toValue: maxSheetHeight,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        sheetTranslateY.setValue(0);
        onRequestClose();
      });
    },
    [maxSheetHeight, onRequestClose, sheetTranslateY],
  );

  const resetSheetPosition = useMemo(
    () => () => {
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }).start();
    },
    [sheetTranslateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          enableSwipeToDismiss &&
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (!enableSwipeToDismiss) {
            return;
          }
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!enableSwipeToDismiss) {
            return;
          }
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            dismissSheet();
            return;
          }
          resetSheetPosition();
        },
        onPanResponderTerminate: () => {
          if (!enableSwipeToDismiss) {
            return;
          }
          resetSheetPosition();
        },
      }),
    [dismissSheet, enableSwipeToDismiss, resetSheetPosition, sheetTranslateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View className="flex-1" style={{ paddingTop: topInset }}>
        {closeOnBackdropPress ? (
          <Pressable
            className={`absolute inset-0 ${backdropClassName ?? "bg-black/60"}`}
            onPress={onRequestClose}
          />
        ) : (
          <View className={`absolute inset-0 ${backdropClassName ?? "bg-black/60"}`} />
        )}

        <View className="flex-1 justify-end">
          <Animated.View
            {...(enableSwipeToDismiss ? panResponder.panHandlers : {})}
            className={`rounded-t-3xl bg-neutral-950 px-5 pt-4 ${
              showBorder ? "border border-neutral-800" : ""
            } ${panelClassName ?? ""} ${contentClassName ?? ""}`}
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: maxSheetHeight,
              alignSelf: "center",
              paddingBottom: contentPaddingBottom,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
