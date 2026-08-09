import type { ReactNode } from "react";
import { DovrutAccessGate } from "@/modules/dovrut/components/access-gate";

export default function DovrutLayout({ children }: { children: ReactNode }) {
  return <DovrutAccessGate>{children}</DovrutAccessGate>;
}
