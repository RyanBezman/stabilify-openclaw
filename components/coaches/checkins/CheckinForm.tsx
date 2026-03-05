import type { ReactNode } from "react";
import Card from "../../ui/Card";

type CheckinFormProps = {
  children: ReactNode;
};

export default function CheckinForm({ children }: CheckinFormProps) {
  return <Card className="p-5">{children}</Card>;
}
