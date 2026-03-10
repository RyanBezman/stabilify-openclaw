import CoachFlowHero from "../flow/CoachFlowHero";

type Props = {
  title: string;
  subtitle?: string;
  showReadyBadge: boolean;
};

export default function OnboardingHero({ title, subtitle, showReadyBadge }: Props) {
  return (
    <CoachFlowHero
      title={title}
      subtitle={subtitle}
      badgeLabel={showReadyBadge ? "ready to generate" : null}
    />
  );
}
