import type { ReactNode } from "react";
import Card from "../../ui/Card";

type PlanSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export default function PlanSurface({
  children,
  className,
}: PlanSurfaceProps) {
  return (
    <Card className={`overflow-hidden bg-neutral-900/60 ${className ?? ""}`}>
      {children}
    </Card>
  );
}
