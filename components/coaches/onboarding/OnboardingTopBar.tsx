import { Animated } from "react-native";
import CoachFlowTopBar from "../flow/CoachFlowTopBar";

type Props = {
  stepIndex: number;
  totalSteps: number;
  progressAnim: Animated.Value;
  currentStepLabel: string;
  onBack: () => void;
  onClose?: () => void;
};

export default function OnboardingTopBar({
  stepIndex,
  totalSteps,
  progressAnim,
  currentStepLabel,
  onBack,
  onClose,
}: Props) {
  return (
    <CoachFlowTopBar
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      progressAnim={progressAnim}
      currentStepLabel={currentStepLabel}
      onBack={onBack}
      onClose={onClose}
    />
  );
}
