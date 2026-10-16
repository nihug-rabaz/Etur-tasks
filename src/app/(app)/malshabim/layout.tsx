import type { ReactNode } from "react";
import { MalshabimWaitlistReminder } from "@/modules/malshabim/components/waitlist-reminder";

export default function MalshabimLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <MalshabimWaitlistReminder />
    </>
  );
}
