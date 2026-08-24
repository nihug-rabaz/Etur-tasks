import type { ReactNode } from "react";
import { AgamAccessGate } from "@/modules/agam/components/access-gate";

export default function AgamLayout({ children }: { children: ReactNode }) {
  return <AgamAccessGate>{children}</AgamAccessGate>;
}
