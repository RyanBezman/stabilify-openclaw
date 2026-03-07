import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ScrollView,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GuestHeader from "../components/guest/GuestHeader";
import GuestCtaRow from "../components/guest/GuestCtaRow";
import GuestHowItWorks from "../components/guest/GuestHowItWorks";
import GuestFooter from "../components/guest/GuestFooter";
import GuestPreviewCard from "../components/guest/GuestPreviewCard";
import GuestPremiumTeaser from "../components/guest/GuestPremiumTeaser";
import type { RootStackParamList } from "../lib/navigation/types";
import { GUEST_HOW_IT_WORKS_ITEMS } from "../lib/features/guest-home";
import AppScreen from "../components/ui/AppScreen";

type GuestHomeProps = NativeStackScreenProps<RootStackParamList, "Guest">;

export default function GuestHome({ navigation }: GuestHomeProps) {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = Math.max(insets.bottom, 12) + 88;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const previewTranslateY = useRef(new Animated.Value(10)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(10)).current;
  const howItWorksOpacity = useRef(new Animated.Value(0)).current;
  const howItWorksTranslateY = useRef(new Animated.Value(10)).current;
  const premiumOpacity = useRef(new Animated.Value(0)).current;
  const premiumTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    let isMounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    const runAnimation = async () => {
      const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled().catch(
        () => false,
      );

      if (!isMounted) {
        return;
      }

      if (reduceMotionEnabled) {
        previewOpacity.setValue(1);
        previewTranslateY.setValue(0);
        ctaOpacity.setValue(1);
        ctaTranslateY.setValue(0);
        howItWorksOpacity.setValue(1);
        howItWorksTranslateY.setValue(0);
        premiumOpacity.setValue(1);
        premiumTranslateY.setValue(0);
        return;
      }

      previewOpacity.setValue(0);
      previewTranslateY.setValue(10);
      ctaOpacity.setValue(0);
      ctaTranslateY.setValue(10);
      howItWorksOpacity.setValue(0);
      howItWorksTranslateY.setValue(10);
      premiumOpacity.setValue(0);
      premiumTranslateY.setValue(10);

      const baseConfig = {
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      } as const;

      animation = Animated.sequence([
        Animated.delay(180),
        Animated.stagger(90, [
          Animated.parallel([
            Animated.timing(previewOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(previewTranslateY, { toValue: 0, ...baseConfig }),
          ]),
          Animated.parallel([
            Animated.timing(ctaOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(ctaTranslateY, { toValue: 0, ...baseConfig }),
          ]),
          Animated.parallel([
            Animated.timing(howItWorksOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(howItWorksTranslateY, { toValue: 0, ...baseConfig }),
          ]),
          Animated.parallel([
            Animated.timing(premiumOpacity, { toValue: 1, ...baseConfig }),
            Animated.timing(premiumTranslateY, { toValue: 0, ...baseConfig }),
          ]),
        ]),
      ]);
      animation.start();
    };

    runAnimation();

    return () => {
      isMounted = false;
      animation?.stop();
    };
  }, [
    ctaOpacity,
    ctaTranslateY,
    howItWorksOpacity,
    howItWorksTranslateY,
    premiumOpacity,
    premiumTranslateY,
    previewOpacity,
    previewTranslateY,
  ]);

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={760}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-6"
          contentContainerStyle={{ paddingBottom: contentBottomPadding }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GuestHeader onProfilePress={() => navigation.navigate("SignIn")} />

          <Animated.View
            style={{
              opacity: previewOpacity,
              transform: [{ translateY: previewTranslateY }],
            }}
          >
            <GuestPreviewCard />
          </Animated.View>

          <Animated.View
            style={{
              opacity: ctaOpacity,
              transform: [{ translateY: ctaTranslateY }],
            }}
          >
            <GuestCtaRow
              label="Start tracking today"
              onPress={() => navigation.navigate("SignUp")}
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: howItWorksOpacity,
              transform: [{ translateY: howItWorksTranslateY }],
            }}
          >
            <GuestHowItWorks items={GUEST_HOW_IT_WORKS_ITEMS} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: premiumOpacity,
              transform: [{ translateY: premiumTranslateY }],
            }}
          >
            <GuestPremiumTeaser onPress={() => navigation.navigate("SignUp")} />
          </Animated.View>
        </ScrollView>

        <GuestFooter
          onPrimaryPress={() => navigation.navigate("SignUp")}
          visible
        />
      </View>
    </AppScreen>
  );
}
